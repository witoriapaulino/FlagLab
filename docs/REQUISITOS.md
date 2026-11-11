# FlagLab: Requisitos e Rastreabilidade · v1.1

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0 | 11/11/2026 | Anna Witória Paulino | Versão inicial (RF01–RF05) |
| 1.1 | 12/11/2026 | Anna Witória Paulino | Liberação gradual (RF06, RN07), usuários com token (RF07, RN06 revisada) e painel web (RF08) |

## 1. Propósito e escopo

O FlagLab permite **ligar e desligar funcionalidades por ambiente**, também **só para parte dos usuários**, sem publicar código novo e mantendo o **histórico completo** de cada mudança. Ele serve de laboratório para os quatro pilares da Gerência de Configuração: identificação, controle, auditoria e relato de status.

**Fora do escopo:** perfis e permissões por ambiente, aprovação em dois passos, expiração de tokens.

## 2. Usuários

| Ator | O que faz |
|---|---|
| **Administrador** | Cadastra usuários (usa a `API_KEY`) |
| **Gestor de configuração** | Cria flags, liga, desliga, ajusta o percentual e faz rollback (usa o próprio token) |
| **Sistema cliente** | Consulta as flags de um ambiente, opcionalmente para um usuário final |
| **Auditor** | Lê o histórico de mudanças |

## 3. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF01 | Cadastrar uma flag com chave única e descrição |
| RF02 | Ligar ou desligar uma flag em um ambiente (`DEV`, `HOMOLOG`, `PROD`) |
| RF03 | Consultar o estado de todas as flags de um ambiente |
| RF04 | Consultar o histórico de versões de uma flag, com filtro opcional por ambiente |
| RF05 | Fazer rollback de uma flag para o estado (ligada/desligada e percentual) de uma versão anterior |
| RF06 | Liberar uma flag para um percentual (0 a 100) dos usuários finais |
| RF07 | Cadastrar usuários e autenticá-los por token pessoal |
| RF08 | Painel web para listar, criar, alterar, auditar e fazer rollback de flags |

## 4. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | A chave é única e está em kebab-case (`nova-tela-checkout`) |
| RN02 | Toda flag nasce **desligada** e em 100% (versão 1) nos três ambientes |
| RN03 | Toda mudança exige **motivo** (mínimo de 10 caracteres) |
| RN04 | Uma mudança que não altera o estado atual (ligada/desligada **e** percentual) é rejeitada (409) |
| RN05 | O histórico é imutável: o rollback cria uma versão **nova** e nunca apaga ou edita as anteriores |
| RN06 | Criar e alterar flags exige o token de um usuário, e **o autor é sempre o dono do token**. Enviar `autor` no corpo é rejeitado. Só o administrador (`API_KEY`) cadastra usuários. Consultar é público |
| RN07 | Na liberação gradual, cada usuário final cai sempre no mesmo grupo (0 a 99) para cada flag. Sem usuário informado, uma flag abaixo de 100% responde desligada |

## 5. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF01 | **Segurança:** a chave de administrador vem de variável de ambiente e é comparada em tempo constante. Os tokens são aleatórios (192 bits) e só o hash SHA-256 fica no banco |
| RNF02 | **Integridade:** um índice único em (flag, ambiente, versão) impede duas versões com o mesmo número |
| RNF03 | **Rastreabilidade:** toda versão guarda o autor (nome no momento e o vínculo com o usuário), o motivo e a data |
| RNF04 | **Qualidade:** a CI roda build, migrações e testes em todo push |
| RNF05 | **Documentação:** a API é autodocumentada em `/docs` (OpenAPI/Swagger) |
| RNF06 | **Segurança do painel:** os dados são exibidos sempre como texto (sem `innerHTML`), o que evita XSS |

## 6. Casos de uso

| UC | Ator | Fluxo principal | Fluxos alternativos |
|---|---|---|---|
| UC01 Criar flag | Gestor | Envia chave e descrição → o sistema cria a v1 desligada em cada ambiente, com o gestor como autor | Chave repetida → 409 · chave inválida → 400 · sem token → 401 |
| UC02 Alterar flag | Gestor | Envia o estado, o percentual e o motivo → o sistema grava a versão N+1 | Mesmo estado e percentual → 409 · motivo curto → 400 · ambiente inválido → 400 · campo `autor` no corpo → 400 |
| UC03 Consultar ambiente | Sistema cliente | Pede `/ambientes/PROD/flags?usuario=ID` → recebe `{ chave: true/false }` para esse usuário | Sem usuário → flags abaixo de 100% vêm `false` |
| UC04 Auditar | Auditor | Pede o histórico → recebe as versões da mais nova para a mais antiga, com o autor | Flag inexistente → 404 |
| UC05 Rollback | Gestor | Escolhe a versão → o sistema copia o estado e o percentual dela para uma versão nova | Versão inexistente → 404 · estado igual ao atual → 409 |
| UC06 Cadastrar usuário | Administrador | Envia nome e e-mail → recebe o token uma única vez | E-mail repetido → 409 · sem `API_KEY` → 401 |
| UC07 Usar o painel | Gestor | Abre `/`, cola o token e faz os UC01, UC02, UC04 e UC05 pela tela | Token inválido → painel fica só de leitura |

## 7. Modelo de dados

```
usuarios (id, nome, email UNIQUE, token_hash UNIQUE, criado_em)
  1 ──── N  (autor_id, opcional: versões antigas não têm)
flags (id, chave UNIQUE, descricao, criado_em)
  1 ──── N
flag_versoes (id, flag_id FK, ambiente, versao, ativa, percentual, autor, autor_id FK, motivo, criado_em)
  UNIQUE (flag_id, ambiente, versao)
```

O estado atual de uma flag em um ambiente é a linha com a **maior versão** desse ambiente.

## 8. Inventário de itens de configuração

| ID | Item | Local |
|---|---|---|
| IC-DOC-01 | Este documento de requisitos | `docs/REQUISITOS.md` |
| IC-DOC-02 | README | `README.md` |
| IC-SRC-01 | Regras de negócio | `src/flags/regras.ts` |
| IC-SRC-02 | Serviço, controller, DTOs e guard das flags | `src/flags/` |
| IC-SRC-03 | Usuários e autenticação | `src/usuarios/` |
| IC-WEB-01 | Painel web | `public/index.html` |
| IC-DB-01 | Migrações | `db/migrations/` |
| IC-DB-02 | Modelo de dados | `db/schema.prisma` |
| IC-TST-01 | Testes unitários | `tests/unit/` |
| IC-TST-02 | Testes de integração | `tests/integration/` |
| IC-CI-01 | Pipeline de CI | `.github/workflows/ci.yml` |

## 9. Matriz de rastreabilidade (requisito → código → teste)

| Requisito | Código | Teste |
|---|---|---|
| RF01, RN01, RN02 | `flags.service.ts#criar`, `flags.dto.ts` | integração: "cria a flag desligada…", "chave duplicada…" |
| RF02, RN03, RN04 | `flags.service.ts#alterar`, `regras.ts#mudancaRedundante` | unitário: "RN04…" (2 casos); integração: "ligar em PROD…", "ligar de novo é 409…" |
| RF03 | `flags.service.ts#configuracao` | integração: "ligar em PROD não afeta DEV" |
| RF04, RNF03 | `flags.service.ts#historico` | integração: "rollback… preserva o histórico" (confere os autores) |
| RF05, RN05 | `flags.service.ts#rollback` | integração: "rollback cria versão nova…", "rollback restaura também o percentual", "versão inexistente é 404" |
| RF06, RN07 | `regras.ts#grupo`, `regras.ts#liberadaPara` | unitário: "liberação gradual" (6 casos); integração: "liberação gradual a 30%…" |
| RF07, RN06, RNF01 | `src/usuarios/*`, `api-key.guard.ts` | integração: "só o administrador cria usuários…", "/usuarios/eu…", "escrita sem token…", "o autor vem do login…" |
| RF08, RNF06 | `public/index.html` | verificação manual (roteiro do README pelo painel) |
| RNF02 | `db/schema.prisma` (`@@unique`) | unitário: "próxima versão é a maior + 1" |
| RNF04 | `.github/workflows/ci.yml` | execução na aba Actions |
