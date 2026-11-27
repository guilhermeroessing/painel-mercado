# T2 resultado

Status: done (sem commit, sem push; arquivos no índice).

## Arquivos
- pipeline/config.yaml (30 ativos, brapi, cotahist url_anual com {ANO} e ano_inicial 1995, sgs url_modelo e cdi 12)
- pipeline/config.ts (carregarConfig com validação)
- pipeline/coleta/cotahist.ts (lerLinhaCotahist, lerCotahist em stream latin1)
- pipeline/tests/fixtures/cotahist/COTAHIST_AMOSTRA.TXT (11 linhas, 245 colunas, CRLF, latin1)
- pipeline/tests/cotahist.test.ts (8 testes)

## Comandos
- npm run typecheck: ok
- npx eslint pipeline: ok
- npx prettier --write pipeline: ok
- npm run test:pipeline: 8 pass, 0 fail

## Dúvidas e desvios
- Layout conferido contra a tabela de posições do plano e do SeriesHistoricas_Layout (memória do layout oficial); não baixei o PDF. Posições usadas: TIPREG 1-2, DATA 3-10, CODNEG 13-24, TPMERC 25-27, NOMRES 28-39, PREABE 57-69, PREMAX 70-82, PREMIN 83-95, PREULT 109-121, QUATOT 153-170, VOLTOT 171-188, FATCOT 211-217.
- Fixture é sintética (valores do exemplo de PETR4 do plano), não recorte real: sem acesso à B3. Não há linha real conferida.
- Registro tem campos extras `nome` e `volume_financeiro` (VOLTOT/100), além de ticker,d,o,h,l,c,v do plano.
- Preço = inteiro/100/FATCOT (plano); FATCOT 0 ou campo não numérico devolve null.
- sgs usa `url_modelo` com {codigo} (pedido do lead), não `base_url` do plano; T6 deve ler url_modelo.
- url_anual usa {ANO} (pedido do lead), plano dizia {ano}. url_diario do plano não entrou.
- Nomes da watchlist são curtos e escritos por mim, não vêm do NOMRES real.
