# Convenções do repositório

- TypeScript em todo o repo. Python não é usado.
- Lint e formatação: ESLint e Prettier (`npm run lint`, `npm run format`).
- Testes: Vitest no site (`frontend/tests`), `node:test` no pipeline (`pipeline/tests`).
- Testes rodam sem rede, com fixtures em `pipeline/tests/fixtures` e `frontend/tests/fixtures`.
- Comentário só em 1 linha.
- Commits em português, no formato `tipo(escopo): descrição`.
- Nunca commitar em `main`.
- O token da brapi entra só por `process.env.BRAPI_TOKEN`. Nunca no código nem no repo.
- Dados brutos da B3 (COTAHIST) ficam fora do repo.
- Números com `Intl.NumberFormat('pt-BR')` e horário de Brasília.
- O escopo do produto está em `ESCOPO.md`.
