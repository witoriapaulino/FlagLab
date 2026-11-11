# FlagLab

Servidor de **feature flags** com **configuração versionada**. É um laboratório para praticar Gerência de Configuração (GC) com código de verdade.

Uma *feature flag* é um interruptor que liga ou desliga uma funcionalidade **sem publicar código novo**. Por exemplo, a "tela nova de checkout" fica ligada em `DEV` para testes, em `PROD` só para 10% dos clientes e, depois de aprovada, para 100%.

## Por que é um laboratório de GC

| Conceito de GC | Onde aparece no FlagLab |
|---|---|
| **Item de configuração (IC)** | Cada flag é um item controlado, com chave única |
| **Controle de versão** | Toda mudança cria uma versão nova (`v1`, `v2`…) por ambiente |
| **Controle de mudança** | Nenhuma mudança é aceita sem **motivo**. O **autor** vem do login e não pode ser forjado |
| **Auditoria** | `GET /flags/:chave/historico` e o painel mostram quem mudou, o quê, quando e por quê |
| **Baseline / rollback** | Voltar a uma versão anterior cria uma versão **nova**. O histórico nunca é apagado |
| **Ambientes** | `DEV`, `HOMOLOG` e `PROD` têm configurações independentes |
| **Liberação controlada** | Uma mudança pode valer para só X% dos usuários antes de ir para todos |

Requisitos, regras de negócio e rastreabilidade estão em [`docs/REQUISITOS.md`](docs/REQUISITOS.md).

## Stack

NestJS 12 · Prisma 7 · PostgreSQL 18 · Node.js 26 LTS · TypeScript 6 · Jest 30 + Supertest 7 · GitHub Actions

## Como rodar

Pré-requisitos: **Node.js 26** e **Docker** (ou um PostgreSQL 18 instalado).

1. Crie o `.env` a partir do exemplo e gere uma chave de administrador:
   ```bash
   cp .env.example .env
   sed -i.bak "s/^API_KEY=.*/API_KEY=$(openssl rand -hex 16)/" .env && rm .env.bak
   ```
2. Suba tudo:
   ```bash
   docker compose up -d --wait   # sobe o PostgreSQL e espera ficar pronto
   npm ci                        # instala exatamente o package-lock.json e gera o Prisma Client
   npx prisma migrate deploy     # cria as tabelas
   npm run start:dev             # API e painel em http://localhost:3000
   ```
3. Crie o seu usuário (o token aparece **uma única vez**, guarde-o):
   ```bash
   source .env
   curl -s -X POST http://localhost:3000/usuarios -H "x-api-key: $API_KEY" \
     -H "Content-Type: application/json" -d '{"nome":"Anna Witória Paulino","email":"anna@exemplo.com"}'
   ```
4. Abra **http://localhost:3000**, cole o token em "Acesso" e use o painel. O Swagger fica em **/docs**.

## Testes

```bash
npm run test:unit    # regras de negócio, sem banco
npm run test:int     # API + banco real. ATENÇÃO: apaga os dados do banco do .env
```

A CI (`.github/workflows/ci.yml`) roda build, migrações e os dois tipos de teste em todo push.

## Acesso

| Quem | Como se identifica | Pode |
|---|---|---|
| Administrador | cabeçalho `x-api-key` com a `API_KEY` do `.env` | só cadastrar usuários |
| Usuário | cabeçalho `Authorization: Bearer <token>` | criar, alterar e fazer rollback de flags (vira o autor) |
| Qualquer um | — | consultar flags, histórico e configuração |

## Endpoints

| Método | Rota | Acesso | O que faz |
|---|---|---|---|
| `POST` | `/usuarios` | admin | Cria um usuário e devolve o token (uma vez) |
| `GET` | `/usuarios/eu` | usuário | Mostra quem é o dono do token |
| `POST` | `/flags` | usuário | Cria a flag, desligada nos 3 ambientes |
| `GET` | `/flags` | livre | Lista as flags com o estado e o percentual de cada ambiente |
| `PUT` | `/flags/:chave/ambientes/:ambiente` | usuário | Liga, desliga ou muda o percentual (`{"ativa":true,"percentual":30,"motivo":"..."}`) |
| `POST` | `/flags/:chave/ambientes/:ambiente/rollback` | usuário | Restaura o estado e o percentual de uma versão anterior |
| `GET` | `/flags/:chave/historico?ambiente=PROD` | livre | Histórico de versões (auditoria) |
| `GET` | `/ambientes/:ambiente/flags?usuario=ID` | livre | O que um sistema cliente consulta: `{ "chave": true }` para aquele usuário |

**Liberação gradual:** cada usuário final cai sempre no mesmo grupo de 0 a 99 para cada flag. Com `percentual: 30`, quem está nos grupos 0 a 29 recebe `true`. Sem `?usuario=`, uma flag abaixo de 100% responde `false`.

## Roteiro de demonstração (5 minutos)

Com a API no ar e o token do passo 3 de "Como rodar":

```bash
T="Authorization: Bearer COLE-SEU-TOKEN"; J="Content-Type: application/json"; U=http://localhost:3000

# 1. cria o IC
curl -s -X POST $U/flags -H "$T" -H "$J" -d '{"chave":"novo-checkout","descricao":"Tela nova de checkout"}'

# 2. libera só para 10% dos clientes em PROD (v2)
curl -s -X PUT $U/flags/novo-checkout/ambientes/PROD -H "$T" -H "$J" \
  -d '{"ativa":true,"percentual":10,"motivo":"Piloto aprovado pelo CCB na RFC-001"}'

# 3. o mesmo cliente sempre recebe a mesma resposta
curl -s "$U/ambientes/PROD/flags?usuario=cliente-1"; curl -s "$U/ambientes/PROD/flags?usuario=cliente-2"

# 4. piloto ok: 100% (v3)
curl -s -X PUT $U/flags/novo-checkout/ambientes/PROD -H "$T" -H "$J" \
  -d '{"ativa":true,"percentual":100,"motivo":"Piloto sem erros, liberando para todos"}'

# 5. deu problema: rollback para a v2 (gera a v4, de volta aos 10%)
curl -s -X POST $U/flags/novo-checkout/ambientes/PROD/rollback -H "$T" -H "$J" \
  -d '{"versao":2,"motivo":"Erro no pagamento, voltando ao piloto"}'

# 6. auditoria: as 4 versões continuam lá, cada uma com o autor
curl -s "$U/flags/novo-checkout/historico?ambiente=PROD"
```

O mesmo roteiro pode ser feito pelo painel em http://localhost:3000.

## Estrutura

```
src/flags/regras.ts           regras de negócio puras, incluindo a liberação gradual (testadas sem banco)
src/flags/flags.service.ts    casos de uso das flags (RF01–RF06)
src/flags/flags.controller.ts rotas HTTP das flags
src/flags/flags.dto.ts        validação de entrada
src/flags/api-key.guard.ts    acesso do administrador (x-api-key)
src/usuarios/                 usuários, tokens e o guard de login (RF07)
public/index.html             painel web (RF08)
db/schema.prisma              modelo de dados
db/migrations/                migrações SQL versionadas
tests/unit, tests/integration
docs/REQUISITOS.md            RF, RNF, RN, casos de uso e rastreabilidade
```

## Baselines

| Tag | O que congela |
|---|---|
| `BL-0.1.0` | Primeira versão: flags versionadas, auditoria e rollback com uma chave única |
| `BL-0.2.0` | Liberação gradual, usuários com token e painel web |

## Próximos passos (fora do escopo atual)

- Perfis de usuário (quem pode mexer em `PROD`)
- Aprovação em dois passos para mudanças em `PROD` (uma pessoa pede, outra aprova)
- Expiração e troca de tokens
