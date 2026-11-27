# Status — Feature 1 (fundação + cotações + página do ativo)

Leia primeiro. Os demais arquivos desta pasta são a spec aprovada, o plano e o registro de cada tarefa.

## Onde está o código
- Branch de trabalho: `claude/zealous-ritchie-udqtv9` (não use outra branch).
- Último commit enviado: `fa81b29` (T1: fundação do site, CI, deploy e proteção de segredos).
- A T2 (leitor do arquivo COTAHIST da B3, watchlist de 30 ativos) está no mesmo branch, dentro desse commit.

## Tarefas
| Tarefa | Situação |
|---|---|
| T1 — fundação (Next.js estático, lint, testes, CI, deploy) | feita, no GitHub |
| T2 — watchlist e leitor do COTAHIST | feita; validada contra o arquivo oficial de 2024 (PETR4, VALE3, ITUB4 e BOVA11 em 30/12/2024 batem com o registro bruto) |
| T3 — backfill em `data/historico/{TICKER}.json` | próxima |
| T4 em diante | pendentes, conforme `plan.md` |

## Decisões aprovadas pelo Marcelo
- Stack: Next.js estático na Vercel; coleta em TypeScript.
- Base própria: histórico do COTAHIST da B3, a partir de 1995; coleta diária com a brapi.
- Troca de ativos: ELET3 → AXIA3; JBSS3 → JBSS32 (ELET3 e JBSS3 deixaram de negociar).
- Ibovespa: via brapi (`^BVSP`), em torno de 22 requisições por mês.

## Pendências
1. **Deploy na Vercel falhou** nas duas tentativas com "Could not retrieve Project Settings". O secret `VERCEL_TOKEN` provavelmente precisa ser recriado com escopo na equipe do projeto. Os IDs esperados são `VERCEL_ORG_ID` = `team_z0Wuugwk6KdNUXwMIeTm8OGA` e `VERCEL_PROJECT_ID` = `prj_vXRlPZZLv0uwNoba68Ro2kFtJBL9`.
2. **Token da brapi** cadastrado como Network secret do ambiente "painel-mercado (dados B3)" (host `brapi.dev`, Bearer). Validar as chamadas reais depois de confirmar que a nova sessão enxerga o token.
3. **Commit local da T2**: está no branch. Não há mais alterações pendentes além deste STATUS.

## Regras que continuam valendo
- Nada vai para `main`. Commit e push só com confirmação do Marcelo.
- Commits em português, no formato `tipo(escopo): descrição`.
- Token da brapi só por `process.env.BRAPI_TOKEN` ou secret. Nunca no código nem no chat.
- Dados brutos do COTAHIST ficam fora do repositório.
