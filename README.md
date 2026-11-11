# FlagLab

Servidor de **feature flags** com **configuração versionada**. É um laboratório para praticar Gerência de Configuração (GC) com código de verdade.

Uma *feature flag* é um interruptor que liga ou desliga uma funcionalidade **sem publicar código novo**. Por exemplo, a "tela nova de checkout" fica ligada em `DEV` para testes e desligada em `PROD` até a aprovação.

## Por que é um laboratório de GC

| Conceito de GC | Onde aparece no FlagLab |
|---|---|
| **Item de configuração (IC)** | Cada flag é um item controlado, com chave única |
| **Controle de versão** | Toda mudança cria uma versão nova (`v1`, `v2`…) por ambiente |
| **Controle de mudança** | Nenhuma mudança é aceita sem **autor** e **motivo** |
| **Auditoria** | `GET /flags/:chave/historico` mostra quem mudou, o quê, quando e por quê |
| **Baseline / rollback** | Voltar a uma versão anterior cria uma versão **nova**. O histórico nunca é apagado |
| **Ambientes** | `DEV`, `HOMOLOG` e `PROD` têm configurações independentes |

Requisitos, regras de negócio e rastreabilidade estão em [`docs/REQUISITOS.md`](docs/REQUISITOS.md).

## Stack

NestJS 11 · Prisma 7 · PostgreSQL 16 · Jest + Supertest · GitHub Actions

## Como rodar

Pré-requisitos: **Node.js 22** e **Docker** (ou um PostgreSQL 16 instalado).

1. Crie o arquivo `.env` na raiz com este conteúdo e troque a `API_KEY`:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flaglab?schema=public
   API_KEY=troque-esta-chave
   PORT=3000
   ```
2. Rode:
   ```bash
   docker compose up -d          # sobe o PostgreSQL
   npm install                   # instala e gera o Prisma Client
   npx prisma migrate deploy     # cria as tabelas
   npm run start:dev             # API em http://localhost:3000
   ```
3. A documentação interativa (Swagger) fica em **http://localhost:3000/docs**.

## Testes

```bash
npm run test:unit    # regras de negócio, sem banco
npm run test:int     # API + banco real. ATENÇÃO: apaga os dados do banco do .env
```

A CI (`.github/workflows/ci.yml`) roda build, migrações e os dois tipos de teste em todo push.

## Endpoints

| Método | Rota | Chave? | O que faz |
|---|---|---|---|
| `POST` | `/flags` | sim | Cria a flag, desligada nos 3 ambientes |
| `GET` | `/flags` | não | Lista as flags com o estado atual de cada ambiente |
| `PUT` | `/flags/:chave/ambientes/:ambiente` | sim | Liga ou desliga, gerando uma versão nova |
| `POST` | `/flags/:chave/ambientes/:ambiente/rollback` | sim | Restaura o estado de uma versão anterior |
| `GET` | `/flags/:chave/historico?ambiente=PROD` | não | Histórico de versões (auditoria) |
| `GET` | `/ambientes/:ambiente/flags` | não | O que um sistema cliente consulta: `{ "chave": true }` |

"Chave? sim" significa que a rota exige o cabeçalho `x-api-key` com o valor de `API_KEY`.

## Roteiro de demonstração (5 minutos)

```bash
K="x-api-key: troque-esta-chave"; J="Content-Type: application/json"; U=http://localhost:3000

# 1. cria o IC
curl -s -X POST $U/flags -H "$K" -H "$J" -d '{"chave":"novo-checkout","descricao":"Tela nova de checkout","autor":"Anna"}'

# 2. liga só em PROD (v2)
curl -s -X PUT $U/flags/novo-checkout/ambientes/PROD -H "$K" -H "$J" \
  -d '{"ativa":true,"autor":"Anna","motivo":"Aprovado pelo CCB na RFC-001"}'

# 3. deu problema: desliga (v3)
curl -s -X PUT $U/flags/novo-checkout/ambientes/PROD -H "$K" -H "$J" \
  -d '{"ativa":false,"autor":"Anna","motivo":"Erro no pagamento em produção"}'

# 4. corrigido: rollback para a v2 (gera a v4)
curl -s -X POST $U/flags/novo-checkout/ambientes/PROD/rollback -H "$K" -H "$J" \
  -d '{"versao":2,"autor":"Anna","motivo":"Correção publicada, reativando"}'

# 5. auditoria: as 4 versões continuam lá
curl -s "$U/flags/novo-checkout/historico?ambiente=PROD"
```

## Estrutura

```
src/flags/regras.ts        regras de negócio puras (testadas sem banco)
src/flags/flags.service.ts casos de uso (RF01–RF05)
src/flags/flags.controller.ts rotas HTTP
src/flags/flags.dto.ts     validação de entrada
src/flags/api-key.guard.ts proteção das rotas de escrita
db/schema.prisma           modelo de dados
db/migrations/             migrações SQL versionadas
tests/unit, tests/integration
docs/REQUISITOS.md         RF, RNF, RN, casos de uso e rastreabilidade
```

## Próximos passos (fora do escopo atual)

- Liberação gradual (ligar para X% dos usuários)
- Autenticação por usuário em vez de uma chave única
- Tela web para o painel de flags
