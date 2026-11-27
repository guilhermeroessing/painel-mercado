# Status — Feature 1 (fundação + cotações + página do ativo)

Leia primeiro. Os demais arquivos desta pasta são a spec aprovada, o plano e o registro de cada tarefa.

## Onde está o código

- Branch de trabalho desta sessão: `claude/vibrant-hawking-ojj43u` (designado pelo ambiente). O plano cita `claude/zealous-ritchie-udqtv9`, que também recebe deploy; o `deploy.yml` agora roda nos dois.
- Commits da T1 e da T2 estão em `fa81b29` e `851fb72`; a T3 e as correções de deploy e lint entram depois deles.

## Tarefas

| Tarefa                                                     | Situação                                                                                                                                                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T1 — fundação (Next.js estático, lint, testes, CI, deploy) | feita, no GitHub                                                                                                                                                                                       |
| T2 — watchlist e leitor do COTAHIST                        | feita. Atenção: a nota anterior dizia validada contra o arquivo oficial de 2024, mas `tasks/T2/result.md` diz que a fixture é sintética. Conferir contra o COTAHIST real antes de confiar nos números. |
| T3 — backfill em `data/historico/{TICKER}.json`            | feita (`tasks/T3/result.md`): 15 testes de pipeline passam, CLI verificado 2 vezes no scratchpad                                                                                                       |
| T4 em diante                                               | pendentes, conforme `plan.md`. A próxima é a T4 (cliente brapi), que precisa de `brapi.dev` liberado no proxy e de `BRAPI_TOKEN`.                                                                      |

## Decisões aprovadas pelo Marcelo

- Stack: Next.js estático na Vercel; coleta em TypeScript.
- Base própria: histórico do COTAHIST da B3, a partir de 1995; coleta diária com a brapi.
- Troca de ativos: ELET3 → AXIA3; JBSS3 → JBSS32 (ELET3 e JBSS3 deixaram de negociar).
- Ibovespa: via brapi (`^BVSP`), em torno de 22 requisições por mês.

## Pendências

1. **Deploy na Vercel**: a causa do "Could not retrieve Project Settings" está no próprio `VERCEL_TOKEN`, não no código. Ajuste feito no `deploy.yml`: antes de publicar, uma chamada à API da Vercel mostra o HTTP exato (401/403 indica token sem escopo na equipe, 404 indica ID errado), e a pasta publicada é vinculada ao projeto por `.vercel/project.json`. Falta recriar o `VERCEL_TOKEN` com escopo na equipe `team_z0Wuugwk6KdNUXwMIeTm8OGA`, e conferir `VERCEL_PROJECT_ID` = `prj_vXRlPZZLv0uwNoba68Ro2kFtJBL9`. Não consegui ler os secrets daqui (a API é bloqueada pelo proxy), então isto não foi testado no runner.
2. **CI do `lint`** estava vermelho porque o Prettier checava `docs/painel-mercado-f1`. Formatado nesta rodada.
3. **Token da brapi** cadastrado como Network secret do ambiente "painel-mercado (dados B3)" (host `brapi.dev`, Bearer). Validar as chamadas reais depois de confirmar que a nova sessão enxerga o token.

## Regras que continuam valendo

- Nada vai para `main`. Commit e push só no branch de trabalho desta sessão; seguir o plano foi pedido em 27/11/2026.
- Commits em português, no formato `tipo(escopo): descrição`.
- Token da brapi só por `process.env.BRAPI_TOKEN` ou secret. Nunca no código nem no chat.
- Dados brutos do COTAHIST ficam fora do repositório.
