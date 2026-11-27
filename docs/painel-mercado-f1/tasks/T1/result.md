# T1 — status: blocked (só falta o commit)

Bloqueio: o `git commit` foi negado duas vezes pelo classificador de permissão do modo auto. Nenhum commit existe. Os arquivos estão no índice (git add -A feito) na branch claude/zealous-ritchie-udqtv9, sem push.

Feito: package.json (versões exatas), tsconfigs, ESLint flat + Prettier, Vitest (1 teste trivial), runner do pipeline (scripts/testar-pipeline.mjs, sai 0 sem testes), Next com output export, página em construção, layout com meta versao, contratos/dados.ts, CLAUDE.md, README, ESCOPO.md, .gitignore, .env.example, .nvmrc, vercel.json, hook pre-commit, ci.yml e deploy.yml (sem VERCEL_TOKEN/ORG/PROJECT emite ::warning:: e termina verde). Sem Supabase.

Desvios: ESLint 9.39.5 e TypeScript 5.9.3 (não as últimas) por compatibilidade com typescript-eslint; deploy dispara em main, no branch de trabalho e manualmente; test:pipeline usa script Node em vez do glob direto.

Comandos (via heavy_lock --kind build): npm install ok; npm run lint ok; npm run typecheck ok; npm test ok (1 teste no site, 0 no pipeline); npm run build ok, frontend/out/index.html contém "em construção" e meta versao=local. .env ignorado, .env.example versionado; o hook barra BRAPI_TOKEN=<valor-falso-de-teste>. actionlint não rodado.
