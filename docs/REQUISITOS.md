# FlagLab: Requisitos e Rastreabilidade · v1.0

| Versão | Data | Autor | Mudança |
|---|---|---|---|
| 1.0 | 11/11/2026 | Anna Witória Paulino | Versão inicial |

## 1. Propósito e escopo

O FlagLab permite **ligar e desligar funcionalidades por ambiente** sem publicar código novo, mantendo o **histórico completo** de cada mudança. Ele serve de laboratório para os quatro pilares da Gerência de Configuração: identificação, controle, auditoria e relato de status.

**Fora do escopo:** liberação percentual, usuários e perfis, interface web.

## 2. Usuários

| Ator | O que faz |
|---|---|
| **Gestor de configuração** | Cria flags, liga, desliga e faz rollback (usa a `x-api-key`) |
| **Sistema cliente** | Consulta as flags de um ambiente para decidir o que mostrar |
| **Auditor** | Lê o histórico de mudanças |

## 3. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF01 | Cadastrar uma flag com chave única, descrição e autor |
| RF02 | Ligar ou desligar uma flag em um ambiente (`DEV`, `HOMOLOG`, `PROD`) |
| RF03 | Consultar o estado de todas as flags de um ambiente |
| RF04 | Consultar o histórico de versões de uma flag, com filtro opcional por ambiente |
| RF05 | Fazer rollback de uma flag para o estado de uma versão anterior |

## 4. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | A chave é única e está em kebab-case (`nova-tela-checkout`) |
| RN02 | Toda flag nasce **desligada** (versão 1) nos três ambientes |
| RN03 | Toda mudança exige **autor** e **motivo** (mínimo de 10 caracteres) |
| RN04 | Uma mudança que não altera o estado atual é rejeitada (409) |
| RN05 | O histórico é imutável: o rollback cria uma versão **nova** e nunca apaga ou edita as anteriores |
| RN06 | Criar e alterar exigem o cabeçalho `x-api-key`. Consultar é público |

## 5. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF01 | **Segurança:** a chave de API vem de variável de ambiente, nunca do código, e é comparada em tempo constante |
| RNF02 | **Integridade:** um índice único em (flag, ambiente, versão) impede duas versões com o mesmo número |
| RNF03 | **Rastreabilidade:** toda versão guarda autor, motivo e data |
| RNF04 | **Qualidade:** a CI roda build, migrações e testes em todo push |
| RNF05 | **Documentação:** a API é autodocumentada em `/docs` (OpenAPI/Swagger) |

## 6. Casos de uso

| UC | Ator | Fluxo principal | Fluxos alternativos |
|---|---|---|---|
| UC01 Criar flag | Gestor | Envia chave, descrição e autor → o sistema cria a v1 desligada em cada ambiente | Chave repetida → 409 · chave inválida → 400 · sem chave de API → 401 |
| UC02 Alterar flag | Gestor | Envia o novo estado, o autor e o motivo → o sistema grava a versão N+1 | Mesmo estado → 409 · motivo curto → 400 · ambiente inválido → 400 |
| UC03 Consultar ambiente | Sistema cliente | Pede `/ambientes/PROD/flags` → recebe `{ chave: true/false }` | — |
| UC04 Auditar | Auditor | Pede o histórico → recebe as versões da mais nova para a mais antiga | Flag inexistente → 404 |
| UC05 Rollback | Gestor | Escolhe a versão → o sistema copia o estado dela para uma versão nova | Versão inexistente → 404 · estado igual ao atual → 409 |

## 7. Modelo de dados

```
flags (id, chave UNIQUE, descricao, criado_em)
  1 ──── N
flag_versoes (id, flag_id FK, ambiente, versao, ativa, autor, motivo, criado_em)
  UNIQUE (flag_id, ambiente, versao)
```

O estado atual de uma flag em um ambiente é a linha com a **maior versão** desse ambiente.

## 8. Inventário de itens de configuração

| ID | Item | Local |
|---|---|---|
| IC-DOC-01 | Este documento de requisitos | `docs/REQUISITOS.md` |
| IC-DOC-02 | README | `README.md` |
| IC-SRC-01 | Regras de negócio | `src/flags/regras.ts` |
| IC-SRC-02 | Serviço, controller, DTOs e guard | `src/flags/` |
| IC-DB-01 | Migrações | `db/migrations/` |
| IC-DB-02 | Modelo de dados | `db/schema.prisma` |
| IC-TST-01 | Testes unitários | `tests/unit/` |
| IC-TST-02 | Testes de integração | `tests/integration/` |
| IC-CI-01 | Pipeline de CI | `.github/workflows/ci.yml` |

## 9. Matriz de rastreabilidade (requisito → código → teste)

| Requisito | Código | Teste |
|---|---|---|
| RF01, RN01, RN02 | `flags.service.ts#criar`, `flags.dto.ts` | integração: "cria a flag desligada", "chave duplicada…" |
| RF02, RN03, RN04 | `flags.service.ts#alterar`, `regras.ts#mudancaRedundante` | unitário: "RN04"; integração: "ligar em PROD…", "ligar de novo é 409…" |
| RF03 | `flags.service.ts#configuracao` | integração: "ligar em PROD não afeta DEV" |
| RF04, RNF03 | `flags.service.ts#historico` | integração: "rollback… preserva o histórico" |
| RF05, RN05 | `flags.service.ts#rollback` | integração: "rollback cria versão nova…", "versão inexistente é 404" |
| RN06, RNF01 | `api-key.guard.ts` | integração: "escrita sem x-api-key responde 401" |
| RNF02 | `db/schema.prisma` (`@@unique`) | unitário: "próxima versão é a maior + 1" |
| RNF04 | `.github/workflows/ci.yml` | execução na aba Actions |
