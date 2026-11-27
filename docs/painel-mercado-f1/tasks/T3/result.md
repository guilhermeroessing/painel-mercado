# T3 resultado

Status: done (commit no branch `claude/vibrant-hawking-ojj43u`).

## Arquivos

- pipeline/saida.ts (gravarJson com rename atômico, lerJson, agoraBrasilia com -03:00)
- pipeline/calculo/serie.ts (candleValido, registroParaCandle com c_bruto = c, mesclarSerie)
- pipeline/manifest.ts (registrarStatus: junta mudanças, mantém chaves não tocadas)
- pipeline/tarefas/backfill.ts (executarBackfill: lê entradas, descarta dado sujo, grava 1 arquivo por ticker, marca erro para ticker sem registro)
- pipeline/main.ts (CLI com parseArgs; `--tarefa`, `--arquivo` repetível ou `-` para stdin, `--data-dir`; tarefa inválida sai com 2)
- pipeline/tests/backfill.test.ts (7 testes, sem rede)

## Comandos

- npm run typecheck: ok
- npx eslint pipeline: ok
- npm run lint: ok
- npm run test:pipeline: 15 pass, 0 fail (8 da T2 + 7 da T3)
- `npm run coletar -- --tarefa backfill --arquivo pipeline/tests/fixtures/cotahist/COTAHIST_AMOSTRA.TXT --data-dir <scratchpad>` rodado 2 vezes: `historico/PETR4.json` tem o candle de 2026-11-25 (o 40.7, h 41.51, l 40.41, c 41.36, v 64227800), sem repetição. O arquivo difere em bytes só por `gerado_em`; o `dados` é igual.

## Dúvidas e desvios

- Os arquivos de série são gravados em `data/`, que está no `.gitignore`. Nada de `data/` vai ao repositório.
- Ticker da watchlist sem registro no COTAHIST: o manifest registra `historico/{T}.json` como `erro` e o arquivo antigo fica intacto. Com a fixture de amostra, 26 dos 30 tickers caem nesse caso, esperado.
- A fixture da T2 é sintética (ver `tasks/T2/result.md`), então os números de PETR4 testados não foram conferidos contra um arquivo oficial da B3 nesta tarefa.
