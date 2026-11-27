# Plano — painel-mercado-f1-cotacoes

13 tasks, 1 repo (`guilhermeroessing/painel-mercado`, branch `claude/zealous-ritchie-udqtv9`), gate lean com overrides `seguranca:high` e `contratos:high`.

## Decisões que vão ao Marcelo

Nenhuma trava a execução. O plano adota o padrão entre parênteses; trocar depois custa 1 a 2 linhas de `pipeline/config.yaml`.

1. Watchlist (padrão: trocar ELET3 por AXIA3 e JBSS3 por JBSS32). Medido no `COTAHIST_D25112026` da B3: ELET3 e JBSS3 não têm negócio no mercado à vista; AXIA3 (Axia Energia, ex-Eletrobras) e JBSS32 (BDR da JBS N.V.) têm. Com a lista da RN1 sem troca, a página inicial mostra 2 das 30 linhas com erro. A série de AXIA3 começa na data da troca de código; o plano não junta o histórico de ELET3.
2. Início do histórico (padrão: `cotahist.ano_inicial: 1995`). Antes de julho de 1994 o COTAHIST está em cruzeiro, cruzeiro real e outras moedas. A série desde 1986 mistura moedas sem conversão. Nenhuma tela da F1 usa mais de 1 ano + 200 pregões.
3. Fonte do Ibovespa (padrão: "dado indisponível", como a spec, seção 4). O COTAHIST não traz o índice. Proposta: coletar `^BVSP` pela brapi no `diario.yml` (22 requisições/mês) e acumular a série própria. Hipótese: o plano gratuito da brapi entrega `^BVSP`; sem token, ninguém confirmou. A spec pede a fonte definida antes do fim da F1.

## Ajustes na lista de tasks do orquestrador

1. Entram indicadores técnicos (T11, T12) e o coletor do CDI (T6). A spec aprovada, H2, pede IFR, MACD, Bollinger, médias, volatilidade, drawdown e retorno comparado ao CDI. Sem eles a H2 não fecha. O CDI vem do BCB SGS série 12, como a seção 6 da spec.
2. O item (4) vira 2 tasks: T4 (cliente brapi e contador de cota) e T5 (tarefas `cotacoes` e `diario`). Juntos dão 9 arquivos e mais de 8 regras; separados, T4 roda em paralelo com T2 e T3.
3. Entra a task T8 (base do site: formatação pt-BR, carga dos JSON, cabeçalho "Atualizado em", rodapé com aviso legal). T9, T10 e T13 usam essa base; sem ela, as 3 tasks repetem o mesmo código. Os dados de exemplo do QA (`npm run dados:exemplo`) ficam na T5, que já tem as funções de variação e sparkline.
4. O aviso "preços não ajustados por proventos" fica na T10. Ele mora no mesmo arquivo da página do ativo; numa task separada, T10, T12 e T13 editariam o mesmo arquivo em paralelo. A T13 fica só com a página Sobre.
5. Entra `backfill.yml` (T7), com disparo manual. O backfill baixa 1 ZIP por ano (o de 2025 tem 89 MB, medido) e precisa rodar no GitHub Actions, porque os arquivos brutos não vão para o repo.
6. Ficam fora: `semanal.yml` e proventos. A spec, seção 4, deixa a base de proventos para feature própria, e nenhuma história da F1 mostra proventos.
7. Os tipos do contrato JSON ficam em `contratos/dados.ts` desde a T1. Pipeline e site importam os mesmos tipos, e as cadeias de pipeline e de site andam em paralelo.

## Notas de operação (para o orquestrador)

- Rede do ambiente (medido em 26/11/2026): `bvmf.bmfbovespa.com.br` responde; `brapi.dev` e `api.bcb.gov.br` são bloqueados pelo proxy. A T4 precisa de `brapi.dev` para gravar a fixture real (os tickers de teste da brapi, como PETR4, respondem sem token: hipótese da documentação). A T6 precisa de `api.bcb.gov.br`. Sem a liberação, a task grava `failed` com o motivo.
- Segredos que o Marcelo cria no GitHub: `BRAPI_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Sem eles, os workflows pulam a etapa com aviso e terminam verdes.
- O GitHub só roda `schedule` e `workflow_run` a partir do branch padrão do repositório. Os crons rodam quando o branch com os workflows for o padrão.
- Deploy: `deploy.yml` publica `frontend/out` com o Vercel CLI (`vercel deploy --prebuilt` não é usado; o site é estático). O `vercel.json` desliga o deploy automático por Git para não haver 2 deploys por push.
- `deploy_check`: o `<meta name="versao">` da página leva o SHA do commit (T1). A URL `https://painel-mercado.vercel.app` é hipótese até o projeto Vercel existir; passe `PAINEL_URL` com a URL real.
- `run.json` sugerido para o QA: `start` = `npm run dados:exemplo && npm run build && npm run servir`, `url` = `http://localhost:3000`, sem login. `next start` não serve `output: 'export'`; o `servir` usa `serve` sobre `frontend/out`.
- QA da T10 roda 2 fluxos: `steps.json` com `--url http://localhost:3000/` e `steps-ticker-inexistente.json` com `--url "http://localhost:3000/ativo/?t=ZZZZ3"`. Os demais `steps.json` começam em `http://localhost:3000/`.
- Testes no fim da feature: Vitest no site com `--maxWorkers=2`; `node:test` no pipeline com `--test-concurrency=2` (o `node:test` não tem `--maxWorkers`; esse é o equivalente).

## Modelos acima do padrão

- T2 `sonnet`: o layout de largura fixa tem 7 regras (tipo de registro, mercado, ticker, centavos, fator de cotação, data, CRLF); 1 offset errado corrompe a base inteira sem erro.
- T4 `sonnet`: 6 regras de borda (429 para tudo, 404, retry com backoff só em 5xx e rede, timeout, token só no header, cota).
- T5 `sonnet`: 6 regras de negócio (RN4, último dado válido, data do pregão em feriado, dado sujo, manifest por ticker, abortar por cota).
- T7 `sonnet`: workflows não rodam localmente; 6 regras (cron em UTC, `concurrency` comum, `permissions`, branch órfã com force-push, segredos, `workflow_run`).
- T9 e T10 `opus low`: tela nova com 3 a 4 estados e troca de cartão para tabela por largura.
- T11 `sonnet`: lógica nova não trivial, 9 fórmulas que precisam bater com a referência em 1e-6.
- T12 `opus low`: estado de tela complexo (8 indicadores, parâmetros, 2 painéis extras no gráfico).

## Contrato JSON (vale para todas as tasks)

Todo arquivo em `data/` usa o envelope `{ gerado_em, fonte, atraso_aprox_min, dados }`, gravado sem identação. Caminhos relativos a `data/`:

| Arquivo | `dados` | Quem grava |
|---|---|---|
| `manifest.json` | `Manifest` | T3, T5, T6 |
| `cotacoes.json` | `Cotacoes` | T5 |
| `historico/{TICKER}.json` | `Candle[]`, ordem crescente de `d` | T3, T5 |
| `macro/cdi.json` | `PontoSerie[]` | T6 |
| `uso-brapi.json` | `UsoBrapi` | T5 |

Duas adições ao escopo, seção 7: `Cotacao.tipo` (agrupa ações, FIIs e ETFs na página inicial) e `Cotacao.spark` (sparkline da página inicial sem baixar 30 históricos).

---

## T1 — Fundação do repo e do site (em construção, CI, deploy Vercel)

Arquivos a criar (repo vazio, sem commits; todos novos, linha 1):
- `package.json`: 1 pacote na raiz, `"type": "module"`, `"engines": {"node": ">=22"}`, versões exatas. Dependências: `next`, `react`, `react-dom`, `lightweight-charts` (5.x), `yaml`. Dev: `typescript`, `tsx`, `vitest`, `eslint`, `eslint-config-next`, `typescript-eslint`, `prettier`, `eslint-config-prettier`, `@types/node`, `@types/react`, `@types/react-dom`, `serve`. Scripts: `dev` (`next dev frontend`), `build` (`next build frontend`), `servir` (`serve frontend/out -l 3000`), `typecheck` (`tsc --noEmit -p tsconfig.json && tsc --noEmit -p frontend/tsconfig.json`), `lint` (`eslint . && prettier --check .`), `format` (`prettier --write .`), `test` (`npm run test:site && npm run test:pipeline`), `test:site` (`vitest run --passWithNoTests`), `test:pipeline` (`node --import tsx --test --test-concurrency=2 "pipeline/tests/**/*.test.ts"`, com saída 0 sem arquivos de teste), `coletar` (`tsx pipeline/main.ts`), `prepare` (`git config core.hooksPath .githooks || true`).
- `package-lock.json`: gerado pelo `npm install`.
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `module`/`moduleResolution` `NodeNext`, `include` `pipeline`, `contratos`, `scripts`, `vitest.config.ts`.
- `frontend/tsconfig.json`: config do Next (`moduleResolution: bundler`, `jsx: preserve`, plugin `next`), `strict: true`, `include` `**/*.ts(x)` do frontend e `../contratos`.
- `eslint.config.mjs`: flat config com `typescript-eslint` strict, `eslint-config-next` para `frontend/**`, `eslint-config-prettier` por último; ignora `frontend/out`, `frontend/.next`, `data`, `frontend/public/data`.
- `.prettierrc.json`, `.prettierignore` (mesmos ignores + `package-lock.json`).
- `.gitignore`: `node_modules/`, `.env`, `.env.*` exceto `!.env.example`, `frontend/.next/`, `frontend/out/`, `frontend/public/data/`, `data/`, `*.ZIP`, `*.zip`, `COTAHIST_*.TXT` exceto `!pipeline/tests/fixtures/**`, `.vercel/`.
- `.env.example`: `BRAPI_TOKEN=` vazio.
- `.nvmrc`: `22`.
- `CLAUDE.md`: convenções (TS em todo o repo; ESLint + Prettier; Vitest no site, `node:test` no pipeline; testes sem rede com fixtures em `pipeline/tests/fixtures` e `frontend/tests/fixtures`; comentário só em 1 linha; commits em português; nada em main; token só por `process.env.BRAPI_TOKEN`; dados brutos da B3 fora do repo; números com `Intl.NumberFormat('pt-BR')`, horário de Brasília).
- `README.md`: o que é, como rodar (`npm install`, `npm test`, `npm run build`), estrutura de pastas. A T7 acrescenta a seção de workflows.
- `ESCOPO.md`: cópia de `/root/.claude/uploads/3438dc50-0fe9-5eef-ae00-33cb11a6ad58/05d018bc-ESCOPO.md`.
- `vitest.config.ts`: `test.include` `frontend/tests/**/*.test.ts(x)`, `environment: 'node'`.
- `frontend/next.config.ts`: `output: 'export'`, `trailingSlash: true`, `images: { unoptimized: true }`.
- `frontend/app/layout.tsx`: `<html lang="pt-BR">`, `<meta name="versao" content={process.env.NEXT_PUBLIC_VERSAO ?? 'local'}>`, `<main>` com `children`, título "Painel de Mercado".
- `frontend/app/page.tsx`: texto "Painel de Mercado — em construção" e o aviso legal da spec, `data-testid="em-construcao"`.
- `frontend/app/globals.css`: tokens de cor e espaço (grade de 4 px), fonte do sistema, `font-variant-numeric: tabular-nums` em números.
- `contratos/dados.ts`: só tipos e 1 constante. Assinaturas exatas:
  - `export type Envelope<T> = { gerado_em: string; fonte: string; atraso_aprox_min: number; dados: T };`
  - `export type Candle = { d: string; o: number; h: number; l: number; c: number; c_bruto: number; v: number };`
  - `export type TipoAtivo = "acao" | "fii" | "etf";`
  - `export type Cotacao = { preco: number; var_dia_pct: number | null; var_12m_pct: number | null; volume: number | null; nome: string; tipo: TipoAtivo; ts: string; spark: number[] };`
  - `export type Cotacoes = Record<string, Cotacao>;`
  - `export type Status = { gerado_em: string } & ({ status: "ok" } | { status: "erro"; erro: string });`
  - `export type Manifest = { arquivos: Record<string, Status>; tickers: Record<string, Status> };`
  - `export type PontoSerie = { d: string; v: number };`
  - `export type UsoBrapi = { mes: string; requisicoes: number };`
  - `export const CAMINHOS = { manifest: "manifest.json", cotacoes: "cotacoes.json", uso: "uso-brapi.json", cdi: "macro/cdi.json", historico: (ticker: string) => \`historico/${ticker}.json\` } as const;`
- `.github/workflows/ci.yml`: `push` em qualquer branch e `pull_request`; Node 22 com cache npm; `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`; job `segredos` com gitleaks (binário de versão fixa, `gitleaks detect --redact`). `permissions: contents: read`.
- `.github/workflows/deploy.yml`: `push` no branch de trabalho e `workflow_dispatch`; `npm ci`, `npm run build` com `NEXT_PUBLIC_VERSAO: ${{ github.sha }}`; `npx vercel@<versão fixa> deploy frontend/out --prod --yes --token "$VERCEL_TOKEN"` com `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` do secret. Sem `VERCEL_TOKEN`, o passo emite `::warning::` e termina verde. `concurrency: { group: deploy, cancel-in-progress: true }`. `permissions: contents: read`.
- `vercel.json`: `{ "git": { "deploymentEnabled": false } }`.
- `.githooks/pre-commit`: roda `gitleaks protect --staged --redact` se o gitleaks existir; sem ele, procura no diff staged a linha `BRAPI_TOKEN=` com valor e barra o commit.

Padrão do repo: repo vazio, sem padrão. As tasks seguintes seguem o que esta task cria.

Comportamentos:
- `npm install && npm test` sem rede → saída 0 com 0 testes.
- `npm run build` sem rede → gera `frontend/out/index.html` com "em construção" e `<meta name="versao" content="local">`.
- `git check-ignore .env` → `.env` (ignorado); `git check-ignore .env.example` → sem saída (versionado).
- Commit com `BRAPI_TOKEN=<valor-falso-de-teste>` num arquivo staged → o hook barra o commit.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm install`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run lint`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx vitest run --passWithNoTests --maxWorkers=2`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run test:pipeline`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run build`
- `actionlint .github/workflows/*.yml`, se o binário existir.

Domínios da code-guard: `modularidade`, `arquitetura`, `contratos`, `front`, `a11y`, `ux`.

UI: sem Impeccable. Siga `references/unslop.md`. Tela: 1 página estática, mobile primeiro.

## T2 — Watchlist em config.yaml e parser do COTAHIST

Arquivos a criar:
- `pipeline/config.yaml`: `watchlist` com 30 itens `{ticker, nome, tipo}` na ordem da RN1 (ações, FIIs, ETFs), com AXIA3 no lugar de ELET3 e JBSS32 no lugar de JBSS3 (decisão 1); `brapi: {base_url: https://brapi.dev/api, limite_mensal: 12000, timeout_ms: 10000}`; `cotahist: {url_anual: "https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_A{ano}.ZIP", url_diario: "https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D{ddmmaaaa}.ZIP", ano_inicial: 1995}`; `sgs: {base_url: https://api.bcb.gov.br/dados/serie, cdi: 12}`. Os nomes vêm do `NOMRES` do COTAHIST e da razão social, sem linguagem de recomendação.
- `pipeline/config.ts`:
  - `export type AtivoConfig = { ticker: string; nome: string; tipo: TipoAtivo };`
  - `export type Config = { watchlist: AtivoConfig[]; brapi: { base_url: string; limite_mensal: number; timeout_ms: number }; cotahist: { url_anual: string; url_diario: string; ano_inicial: number }; sgs: { base_url: string; cdi: number } };`
  - `export function carregarConfig(caminho?: string): Config` (padrão `pipeline/config.yaml`). Valida na leitura: ticker casa `^[A-Z0-9]{4,6}$`, sem ticker repetido, `tipo` no conjunto, números positivos. Erro → lança `Error` com o campo e o valor.
- `pipeline/coleta/cotahist.ts`:
  - `export type RegistroCotahist = { ticker: string; d: string; o: number; h: number; l: number; c: number; v: number };`
  - `export function lerLinhaCotahist(linha: string): RegistroCotahist | null`
  - `export async function* lerCotahist(entrada: NodeJS.ReadableStream, tickers: ReadonlySet<string>): AsyncGenerator<RegistroCotahist>`
  - Layout (posições 1-based, conferidas numa linha real de PETR4 em 25/11/2026): TIPREG 1–2 (`01` = cotação; `00` e `99` = header e trailer → `null`), DATA 3–10 (`AAAAMMDD` → `AAAA-MM-DD`), CODNEG 13–24 (trim), TPMERC 25–27 (só `010`, mercado à vista; fracionário `020` e opções → `null`), PREABE 57–69, PREMAX 70–82, PREMIN 83–95, PREULT 109–121 (inteiros com 2 decimais implícitos), QUATOT 153–170 (`v` = quantidade de títulos, mesma unidade do `regularMarketVolume` da brapi: hipótese a conferir na T4), FATCOT 211–217 (preço unitário = valor ÷ 100 ÷ FATCOT).
  - A linha tem 245 caracteres e termina em CRLF (medido: 246 bytes por linha). `lerCotahist` lê em `latin1` com `readline`, tira o `\r`, filtra pelo conjunto de tickers e não guarda o arquivo em memória.
- `pipeline/tests/fixtures/cotahist/COTAHIST_AMOSTRA.TXT`: recorte real do `COTAHIST_D25112026.TXT` (ou de um ano antigo com FATCOT 1000, se achar), em `latin1` com CRLF: header, PETR4 (`010`), PETR4F (`020`), 1 opção (`070`), MXRF11, BOVA11, AXIA3, JBSS32, trailer. Até 15 linhas. Baixe com `curl` para o scratchpad, recorte com `grep -a`, apague o ZIP e o TXT inteiro.

Padrão do repo: tipos de `contratos/dados.ts` (T1). Leitura de arquivo em stream, sem dependência nova.

Comportamentos:
- Linha real de PETR4 de 25/11/2026 → `{ticker: "PETR4", d: "2026-11-25", o: 40.7, h: 41.51, l: 40.41, c: 41.36, v: 64227800}`.
- Linha de PETR4F (fracionário), de opção, header e trailer → `null`.
- Linha com FATCOT 1000 → preços divididos por 1000.
- `lerCotahist(fixture, {"PETR4","MXRF11"})` → 2 registros; os outros tickers da fixture ficam de fora.
- `config.yaml` com ticker repetido ou `tipo: acoes` → `carregarConfig` lança erro com o campo.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint pipeline/config.ts pipeline/coleta/cotahist.ts`
- Conferência manual: `npx tsx -e` que roda `lerCotahist` na fixture e imprime os registros. Compare com os números acima.
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `contratos`, `modularidade`, `arquitetura`.

## T3 — Backfill: séries por ativo em data/historico/{TICKER}.json e manifest

Arquivos a criar:
- `pipeline/saida.ts`:
  - `export async function gravarJson<T>(dataDir: string, caminho: string, envelope: Envelope<T>): Promise<void>`: `JSON.stringify` sem identação, grava em arquivo temporário no mesmo diretório e faz `rename`. Cria o diretório se faltar.
  - `export async function lerJson<T>(dataDir: string, caminho: string): Promise<Envelope<T> | null>`: `null` se o arquivo não existe; lança se o JSON é inválido.
  - `export function agoraBrasilia(agora: Date): string`: ISO 8601 com `-03:00` (Brasil sem horário de verão desde 2019).
- `pipeline/calculo/serie.ts`:
  - `export function candleValido(c: Candle): boolean`: `false` se algum de `o`, `h`, `l`, `c` é ≤ 0 ou não finito, ou se `v` ≤ 0.
  - `export function registroParaCandle(r: RegistroCotahist): Candle`: `c_bruto = c` (RN3).
  - `export function mesclarSerie(base: readonly Candle[], novos: readonly Candle[]): Candle[]`: o candle novo substitui o de mesma `d`; saída em ordem crescente de `d`, sem duplicata.
- `pipeline/manifest.ts`:
  - `export async function registrarStatus(dataDir: string, mudancas: { arquivos?: Record<string, Status>; tickers?: Record<string, Status> }, agora: Date): Promise<void>`: lê o manifest atual, junta as mudanças por chave, grava. As chaves que a execução não toca ficam como estavam.
- `pipeline/tarefas/backfill.ts`:
  - `export async function executarBackfill(opcoes: { config: Config; dataDir: string; entradas: NodeJS.ReadableStream[]; agora: Date }): Promise<{ pregoes: Record<string, number>; descartados: number }>`: lê todas as entradas com `lerCotahist`, descarta candle inválido com `console.warn("dado sujo", ticker, d)`, agrupa por ticker, mescla com o `historico/{TICKER}.json` existente, grava 1 arquivo por ticker (`fonte: "B3 COTAHIST"`, `atraso_aprox_min: 0`), registra `historico/{TICKER}.json` como `ok` no manifest. Ticker da watchlist sem nenhum registro → `erro: "sem registros no COTAHIST"` no manifest e o arquivo antigo fica intacto.
- `pipeline/main.ts`: CLI com `node:util` `parseArgs`. `--tarefa backfill --arquivo <caminho | -> [--arquivo …] [--data-dir data]`. `-` lê da entrada padrão (para `unzip -p … |`). Tarefa desconhecida → mensagem com as tarefas válidas e saída 2. Imprime o resumo em 1 linha por ticker.

Padrão do repo: tipos e `CAMINHOS` de `contratos/dados.ts:1` (T1); `lerCotahist` de `pipeline/coleta/cotahist.ts` (T2).

Comportamentos:
- `npm run coletar -- --tarefa backfill --arquivo pipeline/tests/fixtures/cotahist/COTAHIST_AMOSTRA.TXT --data-dir <tmp>` → `<tmp>/historico/PETR4.json` com `dados: [{"d":"2026-11-25","o":40.7,"h":41.51,"l":40.41,"c":41.36,"c_bruto":41.36,"v":64227800}]`, sem identação, e `<tmp>/manifest.json` com `historico/PETR4.json` `ok`.
- Rodar 2 vezes a mesma entrada → arquivo igual, sem candle repetido.
- Rodar com 2 anos em ordem inversa → série em ordem crescente de data.
- Candle com preço 0 → fora do arquivo e 1 linha `dado sujo` no log.
- Ticker da watchlist ausente da entrada → manifest com erro para ele; o `historico` antigo dele não muda.
- Falha no meio da gravação → o arquivo antigo continua válido (rename atômico).

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint pipeline/saida.ts pipeline/calculo/serie.ts pipeline/manifest.ts pipeline/tarefas/backfill.ts pipeline/main.ts`
- O comando `coletar` acima com `--data-dir` no scratchpad, 2 vezes.
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `contratos`, `resiliencia`, `observabilidade`, `modularidade`, `arquitetura`.

## T4 — Cliente brapi com timeout, retry, 429 e contador de cota

Arquivos a criar:
- `pipeline/coleta/brapi.ts`:
  - `export type CotacaoBrapi = { ticker: string; preco: number; abertura: number; maxima: number; minima: number; var_dia_pct: number; volume: number; ts: string };`
  - `export type ResultadoBrapi = { tipo: "ok"; cotacao: CotacaoBrapi } | { tipo: "limite" } | { tipo: "nao_encontrado" } | { tipo: "falha"; motivo: string };`
  - `export type ClienteBrapi = { buscarCotacao(ticker: string): Promise<ResultadoBrapi>; requisicoesFeitas(): number };`
  - `export function criarClienteBrapi(opcoes: { token: string; baseUrl: string; timeoutMs: number; fetch?: typeof fetch; esperar?: (ms: number) => Promise<void> }): ClienteBrapi`
  - `GET {baseUrl}/quote/{ticker}` com `Authorization: Bearer <token>` e `AbortSignal.timeout(timeoutMs)`. Mapeia `results[0]`: `regularMarketPrice`, `regularMarketOpen`, `regularMarketDayHigh`, `regularMarketDayLow`, `regularMarketChangePercent`, `regularMarketVolume`, `regularMarketTime`. Confirme os nomes na resposta real da fixture antes de mapear. Campo ausente ou não numérico → `falha: "resposta inválida"`.
  - 429 → `limite` na hora, sem retry. 404 ou `results` vazio → `nao_encontrado`. 5xx, erro de rede e timeout → até 2 novas tentativas, espera de 1 s e 2 s; depois `falha`. Cada tentativa conta 1 em `requisicoesFeitas()`.
  - O token nunca aparece em log, erro ou retorno. `motivo` leva só status HTTP e ticker.
- `pipeline/coleta/contador.ts`:
  - `export function mesBrasilia(agora: Date): string` → `"2026-11"`.
  - `export function projetarUsoMensal(requisicoes: number, agora: Date): number` → `ceil(requisicoes × dias_no_mês ÷ dia_do_mês)`, com o dia em horário de Brasília.
  - `export function verificarCota(uso: UsoBrapi | null, previstas: number, agora: Date, limite: number): { permitido: boolean; usadas: number; projecao: number }`: `usadas` = 0 se `uso.mes` é outro mês; `projecao = projetarUsoMensal(usadas + previstas, agora)`; `permitido = projecao <= limite`.
  - `export function somarUso(uso: UsoBrapi | null, feitas: number, agora: Date): UsoBrapi`: zera na virada do mês.
- `pipeline/tests/fixtures/brapi/quote-PETR4.json`: resposta real de `GET https://brapi.dev/api/quote/PETR4` (ticker de teste, sem token). Precisa do host `brapi.dev` liberado; sem ele, grave `failed` com o motivo. Remova da fixture qualquer campo que identifique conta.
- `pipeline/tests/fixtures/brapi/erro-404.json`, `erro-429.json`: corpos reais, se a brapi devolver; senão, o corpo documentado, com 1 linha no `result.json` dizendo a origem.

Padrão do repo: tipos de `contratos/dados.ts` (T1). `fetch` nativo do Node 22, sem dependência nova. Injeção de `fetch` e `esperar` para teste sem rede.

Comportamentos:
- Fixture `quote-PETR4.json` → `ok` com `preco` = `regularMarketPrice` da fixture.
- Resposta 429 → `limite` com 1 requisição contada, sem nova tentativa.
- 503, 503, 200 → `ok` com 3 requisições contadas e esperas de 1 s e 2 s.
- 503 três vezes → `falha` com `motivo` "HTTP 503 PETR4", sem o token.
- `verificarCota({mes:"2026-11", requisicoes: 5000}, 30, 2026-11-10T15:00-03:00, 12000)` → `projecao` 15090, `permitido: false`.
- `verificarCota({mes:"2026-10", requisicoes: 9000}, 30, 2026-11-02T10:00-03:00, 12000)` → `usadas` 0, `projecao` 450, `permitido: true`.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint pipeline/coleta/brapi.ts pipeline/coleta/contador.ts`
- Conferência manual com `npx tsx -e` e um `fetch` falso que devolve a fixture.
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `contratos`, `resiliencia`, `observabilidade`, `modularidade`.

## T5 — Tarefas cotacoes e diario (cotacoes.json, var 12m, sparkline, candle do dia)

Arquivos a criar e a mudar:
- `pipeline/calculo/variacao.ts` (novo):
  - `export function variacao12m(serie: readonly Candle[], precoAtual: number, hoje: string): number | null`: referência = `c` do último pregão com `d` ≤ hoje − 12 meses; se a série começa depois disso, o primeiro pregão (RN4). Série vazia → `null`. Resultado em %.
  - `export function sparkSemanal(serie: readonly Candle[], hoje: string): number[]`: `c` do último pregão de cada semana nos últimos 12 meses, até 53 pontos.
- `pipeline/tarefas/execucao.ts` (novo): laço comum às 2 tarefas.
  - `export type ResumoExecucao = { status: "pulada_sem_token" | "abortada_cota" | "interrompida_limite" | "concluida"; requisicoes: number; usadas_no_mes: number; projecao: number; erros: Record<string, string> };`
  - `export async function percorrerWatchlist(opcoes: { config: Config; dataDir: string; token: string | undefined; agora: Date; fetch?: typeof fetch; aoReceber: (ativo: AtivoConfig, cotacao: CotacaoBrapi) => Promise<void> }): Promise<ResumoExecucao>`
  - Sem token → `pulada_sem_token`, `console.warn`, nenhum arquivo muda. Cota (`verificarCota` com `previstas` = tamanho da watchlist) acima do limite → `abortada_cota`, nenhuma requisição, manifest `cotacoes.json` com `erro: "projeção mensal <P> acima de <limite>"`. `limite` → para o laço na hora (`interrompida_limite`), os tickers seguintes ficam com o dado anterior e `erro: "limite da brapi (429)"`. `nao_encontrado` e `falha` → erro só naquele ticker, o laço segue. Requisições em sequência, 1 ticker por vez. No fim grava `uso-brapi.json` com `somarUso` e imprime `brapi: <n> requisições nesta execução; <m> no mês; projeção <p> (limite <l>)`.
- `pipeline/tarefas/cotacoes.ts` (novo): `export async function executarCotacoes(opcoes: Omit<Parameters<typeof percorrerWatchlist>[0], "aoReceber">): Promise<ResumoExecucao>`. Parte do `cotacoes.json` anterior; para cada `ok`, troca a entrada do ticker: `preco`, `var_dia_pct`, `volume`, `ts`, `nome` e `tipo` do config, `var_12m_pct` e `spark` a partir do `historico/{TICKER}.json`. Ticker com erro mantém a entrada anterior. Ordem das chaves = ordem da watchlist. Envelope `fonte: "brapi.dev"`, `atraso_aprox_min: 30`. Manifest: `cotacoes.json` e 1 status por ticker.
- `pipeline/tarefas/diario.ts` (novo): `export async function executarDiario(opcoes: idem): Promise<ResumoExecucao>`. Para cada `ok`, monta `Candle` com `d` = data de `ts` em horário de Brasília, `o`/`h`/`l` da cotação, `c = c_bruto = preco`, `v = volume`; descarta se `candleValido` é falso (log `dado sujo`); mescla com `mesclarSerie` e grava `historico/{TICKER}.json` (`fonte: "B3 COTAHIST + brapi.dev"`).
- `pipeline/main.ts` (muda): acrescenta `--tarefa cotacoes` e `--tarefa diario`, com `token = process.env.BRAPI_TOKEN`. Saída 0 em `pulada_sem_token`, `abortada_cota` e `interrompida_limite`, com `::warning::<mensagem>` quando `process.env.GITHUB_ACTIONS` existe; saída 1 só em erro inesperado.
- `scripts/dados-exemplo.ts` (novo): grava `frontend/public/data/` só para o QA local, `fonte: "exemplo sintético"`. Lê a watchlist com `carregarConfig` (T2). Série com passeio aleatório de semente fixa, 300 pregões úteis até hoje; MXRF11 com 40 pregões (histórico curto); HAPV3 com erro no manifest e o dado anterior; `macro/cdi.json` com 300 pontos de 0,05; `cotacoes.json` dos 30 com `var_12m_pct` e `spark` de `variacao12m` e `sparkSemanal`. Grava com `gravarJson`. `--vazio` apaga `frontend/public/data/`.
- `package.json` (muda, bloco `scripts` da T1): `dados:exemplo` (`tsx scripts/dados-exemplo.ts`).

Padrão do repo: `percorrerWatchlist` usa `criarClienteBrapi` e `verificarCota` (T4); gravação por `gravarJson` e `registrarStatus` (T3); mescla por `mesclarSerie` (T3).

Comportamentos:
- Sem `BRAPI_TOKEN` → log "BRAPI_TOKEN ausente; tarefa pulada", saída 0, `data/` sem mudança.
- `fetch` falso com a fixture de PETR4 para todos → `cotacoes.json` com 30 chaves na ordem do config, `uso-brapi.json` com 30 requisições, log com a projeção.
- PETR4 com 429 no 5º ticker → 5 requisições, os 25 seguintes com o preço anterior e erro no manifest.
- `uso-brapi.json` com 11.900 requisições no dia 20 → nenhuma requisição, manifest com erro de cota.
- `historico/PETR4.json` com fechamento de 25/11/2025 = 30,00 e preço atual 41,36 → `var_12m_pct` ≈ 37,87.
- Ativo com histórico desde 01/06/2026 → `var_12m_pct` sobre o primeiro pregão. Sem histórico → `null`.
- `diario` num feriado com `regularMarketTime` do dia útil anterior → o candle fica na data do dia útil anterior; nenhum candle novo com a data do feriado.
- `npm run dados:exemplo` → `frontend/public/data/` com os 30 tickers, MXRF11 com 40 pregões e HAPV3 com erro no manifest; 2 execuções geram arquivos iguais.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint pipeline/calculo/variacao.ts pipeline/tarefas/execucao.ts pipeline/tarefas/cotacoes.ts pipeline/tarefas/diario.ts pipeline/main.ts`
- `BRAPI_TOKEN= npm run coletar -- --tarefa cotacoes --data-dir <tmp>` → saída 0 e aviso de token ausente.
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `contratos`, `resiliencia`, `observabilidade`, `queries`, `modularidade`.

## T6 — Coletor do CDI (BCB SGS série 12) em data/macro/cdi.json

Arquivos a criar e a mudar:
- `pipeline/coleta/bcb_sgs.ts` (novo): `export async function buscarSerieSgs(opcoes: { baseUrl: string; codigo: number; inicio: string; fim: string; timeoutMs: number; fetch?: typeof fetch }): Promise<PontoSerie[]>`. URL `{baseUrl}/bcdata.sgs.{codigo}/dados?formato=json&dataInicial=dd/MM/aaaa&dataFinal=dd/MM/aaaa`. Converte `{"data":"25/11/2026","valor":"0.055131"}` em `{d:"2026-11-25", v:0.055131}`. Janela acima de 10 anos → lança antes da chamada (limite do SGS). Valor não numérico → lança com a data. 5xx e timeout → até 2 novas tentativas (1 s, 2 s).
- `pipeline/tarefas/cdi.ts` (novo): `export async function executarCdi(opcoes: { config: Config; dataDir: string; agora: Date; fetch?: typeof fetch }): Promise<{ pontos: number }>`. Busca os últimos 3 anos, mescla por `d` com o `macro/cdi.json` existente, grava (`fonte: "BCB SGS 12"`, `atraso_aprox_min: 1440`). Falha → arquivo anterior intacto e manifest `macro/cdi.json` com erro.
- `pipeline/main.ts` (muda): acrescenta `--tarefa cdi`.
- `pipeline/tests/fixtures/sgs/serie-12.json`: resposta real de 1 mês da série 12. Precisa do host `api.bcb.gov.br` liberado; sem ele, grave `failed` com o motivo.

Padrão do repo: retry e timeout de `pipeline/coleta/brapi.ts` (T4); se a lógica de retry já existir lá como função, reuse-a em vez de copiar; gravação por `gravarJson` e `registrarStatus` (T3).

Comportamentos:
- Fixture → `macro/cdi.json` com `dados` em ordem crescente, `v` numérico, sem identação.
- Pedido de 11 anos → erro antes de qualquer requisição.
- SGS fora do ar → `macro/cdi.json` anterior intacto, manifest com erro, saída 0 com aviso.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint pipeline/coleta/bcb_sgs.ts pipeline/tarefas/cdi.ts pipeline/main.ts`
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `contratos`, `resiliencia`, `observabilidade`.

## T7 — Workflows cotacoes.yml, diario.yml, backfill.yml e deploy com dados

Arquivos a criar e a mudar:
- `scripts/preparar-dados.sh` (novo): busca a branch `data` do `origin` e copia os arquivos para `./data`; se a branch não existe, cria `./data` vazio. `set -euo pipefail`.
- `scripts/publicar-dados.sh <mensagem>` (novo): em `./data`, cria 1 commit órfão só com `*.json` e faz `git push --force origin HEAD:data` com o `GITHUB_TOKEN`. Sem mudança em relação à branch atual → não publica. Recusa publicar se `./data/manifest.json` não existe ou se há arquivo que não é `.json`.
- `.github/workflows/cotacoes.yml` (novo): `schedule: cron "7 13-21 * * 1-5"` (10h07 a 18h07 de Brasília, 9 execuções) e `workflow_dispatch`. `concurrency: { group: dados, cancel-in-progress: false }`. `permissions: contents: write`. Passos: checkout, Node 22 com cache npm, `npm ci`, `scripts/preparar-dados.sh`, `npm run coletar -- --tarefa cotacoes` com `env: BRAPI_TOKEN: ${{ secrets.BRAPI_TOKEN }}` só nesse passo, `scripts/publicar-dados.sh "cotacoes <data>"`.
- `.github/workflows/diario.yml` (novo): `cron "37 22 * * 1-5"` (19h37 de Brasília) e `workflow_dispatch`. Mesmo `concurrency`. Passos: `--tarefa diario` (com o token) e `--tarefa cdi` (sem o token); publica 1 vez no fim. A falha do CDI não impede a publicação do diário.
- `.github/workflows/backfill.yml` (novo): só `workflow_dispatch`, entradas `ano_inicial` (padrão `1995`) e `ano_final` (padrão: ano corrente). Mesmo `concurrency`. Para cada ano: `curl --fail --retry 3 -o /tmp/COTAHIST_A<ano>.ZIP <url_anual>`, `unzip -p … | npm run coletar -- --tarefa backfill --arquivo -`, apaga o ZIP. Publica no fim. `timeout-minutes: 120`. Entradas validadas como 4 dígitos antes de entrar no shell.
- `.github/workflows/deploy.yml` (muda): acrescenta `workflow_run` de "Cotações", "Diário" e "Backfill" com `types: [completed]` e `if: github.event.workflow_run.conclusion == 'success'`; antes do build, apaga `frontend/public/data` e copia a branch `data` para lá (vazio se a branch não existe).
- `README.md` (muda): seção "Dados e workflows": segredos (`BRAPI_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`), como rodar o backfill, horários em UTC e em Brasília, cota (≈ 6.600 requisições/mês com 30 tickers: 5.940 de cotações + 660 do diário), crons só no branch padrão, e como reativar workflows agendados que o GitHub desliga depois de 60 dias sem atividade.

Padrão do repo: `.github/workflows/ci.yml` e `deploy.yml` da T1 (Node 22, cache npm, `npm ci`, ações com versão fixa).

Comportamentos:
- Execução de `cotacoes.yml` sem `BRAPI_TOKEN` → job verde com aviso; branch `data` sem mudança.
- `cotacoes.yml` e `diario.yml` disparados juntos → o segundo espera o primeiro (mesmo grupo).
- Branch `data` depois de 10 execuções → 1 commit (órfão), só `.json`.
- Build do deploy sem branch `data` → site com "Dados ainda não disponíveis"; nunca publica os dados de exemplo da T8.

Verificação:
- `actionlint .github/workflows/*.yml`, se o binário existir; senão, faça o parse de cada arquivo com o pacote `yaml` (`npx tsx -e`).
- `bash -n scripts/preparar-dados.sh scripts/publicar-dados.sh` e `shellcheck`, se existir.
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run lint`

Domínios da code-guard: `arquitetura`, `resiliencia`, `observabilidade`.

## T8 — Base do site: formatação pt-BR, carga de JSON, cabeçalho, rodapé e dados de exemplo

Arquivos a criar e a mudar:
- `frontend/src/format.ts` (novo), todas com `Intl.NumberFormat('pt-BR')` ou `Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' })`, formatadores criados 1 vez no módulo:
  - `export function formatarPreco(valor: number): string` → `"R$ 41,36"`.
  - `export function formatarPct(valor: number | null): string` → `"+1,25%"`, `"−0,80%"` (sinal de menos U+2212), `"0,00%"`, `null` → `"—"`.
  - `export function formatarData(iso: string): string` → `"25/11/2026"`.
  - `export function formatarDataHoraBrasilia(iso: string): string` → `"26/11/2026 15:07"`.
  - `export function formatarVolume(valor: number | null): string` → `"64,2 mi"`, `null` → `"—"`.
- `frontend/src/dados/carregar.ts` (novo):
  - `export type Carga<T> = { estado: "carregando" } | { estado: "vazio" } | { estado: "erro"; mensagem: string } | { estado: "ok"; envelope: Envelope<T> };`
  - `export async function carregarJson<T>(caminho: string, buscar?: typeof fetch): Promise<Exclude<Carga<T>, { estado: "carregando" }>>`: busca `/data/<caminho>`; 404 → `vazio`; JSON sem `gerado_em` ou `dados` → `erro`.
  - `export function useDados<T>(caminho: string | null): Carga<T>`: hook com `AbortController` no cleanup; `null` não busca.
- `frontend/src/ui/Cabecalho.tsx` (novo): nome do site, navegação "Início" (`/`) e "Sobre" (`/sobre/`), e a linha `data-testid="atualizado-em"` lida de `cotacoes.json`: `"Atualizado em 26/11/2026 15:07 (horário de Brasília) — dados com atraso"`; sem arquivo: `"Dados ainda não disponíveis"`.
- `frontend/src/ui/Rodape.tsx` (novo): `data-testid="aviso-legal"` com o texto do escopo, seção 5.5: "Conteúdo exclusivamente educativo. Não constitui recomendação de investimento. Cotações com atraso, fornecidas por terceiros, sem garantia de exatidão." e link "Sobre".
- `frontend/app/layout.tsx` (muda, `frontend/app/layout.tsx:1` da T1): `Cabecalho` acima e `Rodape` abaixo do `<main>`.
- `frontend/app/globals.css` (muda): cores semânticas de alta e baixa (com sinal no texto; a cor não é o único sinal), largura máxima de leitura, foco visível.
Padrão do repo: tipos de `contratos/dados.ts` (T1); tokens de `frontend/app/globals.css` (T1). Os dados de exemplo para o QA vêm do `npm run dados:exemplo` da T5.

Comportamentos:
- `formatarPreco(1234.5)` → `"R$ 1.234,50"`; `formatarPct(-0.8)` → `"−0,80%"`; `formatarDataHoraBrasilia("2026-11-26T18:07:00Z")` → `"26/11/2026 15:07"`.
- Sem `frontend/public/data` → cabeçalho "Dados ainda não disponíveis" em todas as páginas.
- Com dados de exemplo → cabeçalho com a data e a hora do `gerado_em` em horário de Brasília e "dados com atraso".
- Rodapé com o aviso legal em toda página.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint frontend/src frontend/app/layout.tsx`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run build`
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `front`, `a11y`, `ux`, `modularidade`.

UI: sem Impeccable; siga `references/unslop.md` e a direção visual da spec, seção 5 (sóbrio, planilha e relatório impresso, sem gradiente nem ícone decorativo). Mobile primeiro (375×667), depois 768×1024 e 1280×720. Fluxo: `tasks/T8/steps.json`.

## T9 — Página inicial com a lista dos 30 ativos e sparkline

Arquivos a criar e a mudar:
- `frontend/app/page.tsx` (muda, `frontend/app/page.tsx:1` da T1): troca "em construção" por `<ListaAtivos />` (client component).
- `frontend/src/ui/ListaAtivos.tsx` (novo): `export function ListaAtivos(): JSX.Element`. Carrega `cotacoes.json` e `manifest.json` com `useDados`. Linhas = chaves de `cotacoes.json` na ordem do arquivo, mais os tickers do manifest com erro e sem cotação (linha "Sem dados"). Grupos "Ações", "FIIs", "ETFs" por `tipo`. Cada linha: ticker (link `/ativo/?t=<TICKER>`), nome, preço, variação do dia, variação em 12 meses, sparkline. Ticker com erro no manifest: `data-testid="aviso-erro"` "Falha na última coleta; exibindo dado de DD/MM/AAAA HH:MM". Estados: carregando (esqueleto sem animação em loop), vazio ("Dados ainda não disponíveis"), erro de carga (mensagem e o resto da página em pé), ok. `data-testid="lista-ativos"` no contêiner e `data-testid="ativo-<TICKER>"` em cada linha.
- `frontend/src/ui/Sparkline.tsx` (novo): `export function Sparkline(props: { valores: readonly number[]; rotulo: string }): JSX.Element`. SVG inline, sem biblioteca; `role="img"` e `aria-label` com o rótulo (ex.: "PETR4, 12 meses: de R$ 30,00 a R$ 41,36"); menos de 2 valores → `—`.
- `frontend/src/ui/lista-ativos.module.css` (novo): até 767 px, cada ativo é um cartão (ticker e preço na 1ª linha, variações e sparkline na 2ª), sem rolagem horizontal em 375 px; a partir de 768 px, tabela com `<th scope="col">` e números alinhados à direita.

Padrão do repo: `useDados` e `format.ts` da T8; `Cotacoes`, `Manifest` de `contratos/dados.ts` (T1).

Comportamentos:
- Com dados de exemplo → 30 linhas: 24 ações, 4 FIIs, 2 ETFs, cada uma com ticker, nome, preço em R$, variação do dia, variação em 12 meses e sparkline.
- HAPV3 com erro no manifest → linha com o preço anterior e o aviso de falha com a data.
- `var_12m_pct: null` → "—".
- Sem dados → "Dados ainda não disponíveis", sem erro no console.
- 375×667 → `scroll_width` = 375 (o `mobile_flow.py` mede).
- Clique em PETR4 → `/ativo/?t=PETR4`.
- Nenhum texto com "compre", "venda", "barata", "cara", "oportunidade" (RN6).
- JS da página inicial abaixo de 300 KB (sem `lightweight-charts` no bundle da rota `/`).

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint frontend/app/page.tsx frontend/src/ui/ListaAtivos.tsx frontend/src/ui/Sparkline.tsx`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run build` (confira o tamanho da rota `/` na saída).
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `front`, `a11y`, `ux`.

UI: sem Impeccable; `references/unslop.md`. Modo: lista/tabela. Mobile primeiro. Fluxo: `tasks/T9/steps.json` com `--url http://localhost:3000/` e dados de exemplo.

## T10 — Página do ativo: candles, seletor de período, atribuição e aviso de preço não ajustado

Arquivos a criar:
- `frontend/app/ativo/page.tsx`: `<Suspense>` em volta de `<PaginaAtivo />` (exigência do `useSearchParams` no export estático).
- `frontend/src/periodo.ts`:
  - `export type Periodo = "1M" | "3M" | "6M" | "1A";`
  - `export const PERIODOS: readonly Periodo[]`
  - `export function recortarPeriodo(serie: readonly Candle[], periodo: Periodo): Candle[]`: candles com `d` ≥ (última `d` − N meses de calendário).
  - `export function tickerValido(valor: string | null): string | null`: maiúsculas, `^[A-Z0-9]{4,6}$`; senão `null`. Só ticker válido vira caminho de `fetch`.
- `frontend/src/ui/PaginaAtivo.tsx`: lê `t` da URL, valida com `tickerValido` e confere se o ticker está em `cotacoes.json` ou no `manifest.json`. Carrega `historico/<T>.json`. Mostra ticker, nome, preço e variação do dia; `data-testid="aviso-nao-ajustado"` "Preços não ajustados por proventos." acima do gráfico; gráfico; seletor de período (padrão 1A). Estados: carregando; ticker inválido ou fora da lista → `data-testid="ativo-inexistente"` "Ativo <T> não encontrado." e link "Voltar para a lista" (`/`); histórico ausente → "Histórico ainda não disponível"; primeiro pregão depois de (última data − 12 meses) → `data-testid="historico-curto"` "Histórico curto: dados desde DD/MM/AAAA".
- `frontend/src/ui/GraficoCandles.tsx`: `export function GraficoCandles(props: { serie: readonly Candle[] }): JSX.Element`. Lightweight Charts 5 com `addSeries(CandlestickSeries, …)`, `layout.attributionLogo: true`, localização pt-BR (`priceFormatter` com `formatarPreco`), `ResizeObserver` para a largura e `chart.remove()` no cleanup. `data-testid="grafico-candles"`. Abaixo: `data-testid="atribuicao-tradingview"` "Gráfico: TradingView Lightweight Charts™" com link para `https://www.tradingview.com/` (NOTICE da licença Apache 2.0). Altura 320 px no celular, 420 px a partir de 768 px. `aria-label` no contêiner com ticker, período e último fechamento.
- `frontend/src/ui/SeletorPeriodo.tsx`: `export function SeletorPeriodo(props: { valor: Periodo; aoMudar: (p: Periodo) => void }): JSX.Element`. 4 `<button data-periodo="…" aria-pressed>`; alvo de toque ≥ 44 px.
- `frontend/src/ui/pagina-ativo.module.css`.

Padrão do repo: `useDados` e `format.ts` da T8; `Candle` de `contratos/dados.ts` (T1).

Comportamentos:
- `/ativo/?t=PETR4` com dados de exemplo → candles de 1 ano, aviso de preço não ajustado, atribuição visível, cabeçalho "Atualizado em".
- Clique em 1M → só o último mês de candles; o botão 1M fica `aria-pressed="true"`.
- `/ativo/?t=ZZZZ3` → "Ativo ZZZZ3 não encontrado." e link para a lista.
- `/ativo/?t=../manifest` → mesma mensagem, sem `fetch` fora de `/data/historico/`.
- MXRF11 (40 pregões) → gráfico com o que existe e aviso de histórico curto.
- 375×667 → `scroll_width` = 375.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint frontend/app/ativo frontend/src/periodo.ts frontend/src/ui/PaginaAtivo.tsx frontend/src/ui/GraficoCandles.tsx frontend/src/ui/SeletorPeriodo.tsx`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run build`
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `front`, `a11y`, `ux`.

UI: sem Impeccable; `references/unslop.md`. Modo: gráfico em destaque, controles embaixo. Mobile primeiro. Fluxos: `tasks/T10/steps.json` (`--url http://localhost:3000/`) e `tasks/T10/steps-ticker-inexistente.json` (`--url "http://localhost:3000/ativo/?t=ZZZZ3"`).

## T11 — Indicadores técnicos como funções puras

Arquivos a criar. Toda função recebe a série em ordem crescente e devolve um array do mesmo tamanho, com `null` onde a janela ainda não fecha; os escalares devolvem `null` sem dados suficientes.
- `frontend/src/indicadores/medias.ts`:
  - `export function mediaMovelSimples(valores: readonly number[], periodo: number): (number | null)[]`
  - `export function mediaMovelExponencial(valores: readonly number[], periodo: number): (number | null)[]`: semente = MMS dos primeiros `periodo` valores; `α = 2 ÷ (periodo + 1)`.
- `frontend/src/indicadores/ifr.ts`: `export function ifr(fechamentos: readonly number[], periodo?: number): (number | null)[]`. Padrão 14, suavização de Wilder: médias iniciais = média simples dos primeiros `periodo` ganhos e perdas; depois `(anterior × (n − 1) + atual) ÷ n`. Perda média 0 → 100.
- `frontend/src/indicadores/macd.ts`: `export function macd(fechamentos: readonly number[], rapida?: number, lenta?: number, sinal?: number): { macd: (number | null)[]; sinal: (number | null)[]; histograma: (number | null)[] }`. Padrão 12, 26, 9; MME de `mediaMovelExponencial`; sinal = MME(9) da linha MACD a partir do 1º valor não nulo.
- `frontend/src/indicadores/bollinger.ts`: `export function bandasBollinger(fechamentos: readonly number[], periodo?: number, desvios?: number): { media: (number | null)[]; superior: (number | null)[]; inferior: (number | null)[] }`. Padrão 20 e 2; desvio-padrão populacional (divisor n).
- `frontend/src/indicadores/risco.ts`:
  - `export function volatilidadeAnualizada(fechamentos: readonly number[], janela: number): number | null`: desvio-padrão amostral (divisor n − 1) dos retornos logarítmicos dos últimos `janela` pregões × √252.
  - `export function drawdownMaximo(fechamentos: readonly number[]): number | null`: maior queda do pico ao vale, em fração negativa.
  - `export function retornoAcumulado(fechamentos: readonly number[]): number | null`: `último ÷ primeiro − 1`.
  - `export function retornoCdi(pontos: readonly PontoSerie[], inicio: string, fim: string): number | null`: `Π(1 + v ÷ 100) − 1` dos pontos com `inicio < d ≤ fim`; sem pontos → `null`.
- `frontend/src/indicadores/formulas.ts`: `export const FORMULAS: Record<"mms" | "mme" | "ifr" | "macd" | "bollinger" | "volatilidade" | "drawdown" | "retorno" | "cdi", string>`: fórmula em texto simples, 1 a 2 frases, mesma notação das definições acima.

Padrão do repo: `PontoSerie` de `contratos/dados.ts` (T1). Sem dependência nova. Sem acesso a DOM.

Comportamentos (os testes finais comparam com valores de referência calculados por script independente, por exemplo Python com as mesmas definições, tolerância 1e-6, gravados em `frontend/tests/fixtures/indicadores/`):
- `mediaMovelSimples([1,2,3,4,5], 3)` → `[null, null, 2, 3, 4]`.
- `ifr` de 20 fechamentos só em alta → 100 a partir do 15º.
- `volatilidadeAnualizada` com menos de `janela + 1` fechamentos → `null` (tela mostra "—").
- `drawdownMaximo([10, 12, 9, 11])` → `−0,25`.
- `retornoCdi` com 2 pontos de 0,05 → `0,00100025`.
- MM200 com 150 pregões → todos `null`.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint frontend/src/indicadores`
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `modularidade`, `arquitetura`.

## T12 — Indicadores na página do ativo: sobreposições, painéis, parâmetros, fórmulas e estatísticas

Arquivos a criar e a mudar:
- `frontend/src/ui/ControlesIndicadores.tsx` (novo): `export type EstadoIndicadores = { mms: Record<9 | 21 | 50 | 200, boolean>; mme: Record<9 | 21 | 50 | 200, boolean>; ifr: { ligado: boolean; periodo: number }; macd: { ligado: boolean; rapida: number; lenta: number; sinal: number }; bollinger: { ligado: boolean; periodo: number; desvios: number } };` e `export function ControlesIndicadores(props: { valor: EstadoIndicadores; aoMudar: (v: EstadoIndicadores) => void }): JSX.Element`. Caixas de seleção com `name` `mms-9`, `mms-21`, `mms-50`, `mms-200`, `mme-…`, `ifr`, `macd`, `bollinger`; campos numéricos inteiros de 2 a 250 (desvios de 0,5 a 4, passo 0,5), com `<label>`. Valor fora da faixa → campo marcado inválido e o indicador mantém o último valor válido. Tudo desligado no início. `data-testid="controles-indicadores"`.
- `frontend/src/ui/Formula.tsx` (novo): `export function Formula(props: { id: keyof typeof FORMULAS }): JSX.Element`. Botão "Fórmula" com `data-formula`, `aria-expanded` e `aria-controls`; abre o texto `data-testid="formula-<id>"` por clique e por teclado (funciona sem hover, no toque).
- `frontend/src/ui/Estatisticas.tsx` (novo): `data-testid="estatisticas"`. Para o período selecionado: volatilidade 21 e 63 pregões, drawdown máximo, retorno acumulado do ativo, retorno do CDI (de `macro/cdi.json`), e `data-testid="retorno-ibovespa"` "Ibovespa: dado indisponível" (decisão 3). Cada item com `Formula`. Sem dado suficiente → "—".
- `frontend/src/ui/GraficoCandles.tsx` (muda, a partir do componente da T10): recebe `indicadores: EstadoIndicadores`; médias e Bollinger como `LineSeries` no painel principal; IFR e MACD em painéis próprios do Lightweight Charts 5 (`data-testid="painel-ifr"`, `data-testid="painel-macd"` nos contêineres de legenda ou no gráfico). Indicadores calculados sobre a série inteira e depois recortados para o período, para a MM200 existir no início do período de 1A.
- `frontend/src/ui/PaginaAtivo.tsx` (muda): guarda `EstadoIndicadores` no estado, carrega `macro/cdi.json`, monta controles e estatísticas abaixo do seletor de período.
- `frontend/src/ui/pagina-ativo.module.css` (muda).

Padrão do repo: funções de `frontend/src/indicadores/*` (T11); `GraficoCandles` e `PaginaAtivo` da T10; `useDados` da T8.

Comportamentos:
- Liga MMS 21 → linha da média sobre os candles; desliga → a linha some.
- Liga IFR → painel com a linha do IFR(14) e marcas em 30 e 70; muda o período para 9 → a linha muda.
- Liga MACD → painel com MACD, sinal e histograma.
- Botão "Fórmula" do IFR → texto da fórmula visível; Enter e Espaço também abrem.
- Período 1M → estatísticas recalculadas no mês; volatilidade 63 com menos de 64 pregões no período → "—".
- MXRF11 (40 pregões) com MM200 ligada → nenhuma linha e nenhuma quebra; estatística sem janela → "—".
- Ibovespa → "dado indisponível".
- 375×667 → controles empilhados, `scroll_width` = 375.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint frontend/src/ui`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run build`
- Nenhum teste existe ainda para estes arquivos.

Domínios da code-guard: `front`, `a11y`, `ux`.

UI: sem Impeccable; `references/unslop.md`. Mobile primeiro. Fluxo: `tasks/T12/steps.json` com `--url http://localhost:3000/`.

## T13 — Página Sobre mínima com fontes, atraso e licenças

Arquivo a criar:
- `frontend/app/sobre/page.tsx`: página estática. `data-testid="fontes"`: B3 COTAHIST (histórico diário, não ajustado por proventos), brapi.dev (cotação com atraso de cerca de 30 min, de hora em hora das 10h às 18h, dias úteis), BCB SGS série 12 (CDI, diário). Frequência e atraso de cada fonte. Frase "Preços não ajustados por proventos". `data-testid="licencas"`: TradingView Lightweight Charts™ (Apache 2.0, link para a licença e para `https://www.tradingview.com/`), dados do BCB e o aviso legal. Sem fórmulas aqui: elas ficam nos botões "Fórmula" da página do ativo.

Padrão do repo: `Cabecalho` e `Rodape` da T8 já trazem o link `/sobre/`.

Comportamentos:
- Link "Sobre" no cabeçalho e no rodapé → `/sobre/` com as 3 fontes e as licenças.
- 375×667 → `scroll_width` = 375.

Verificação:
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run typecheck`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npx eslint frontend/app/sobre`
- `~/.claude/skills/dev/scripts/heavy_lock.sh npm run build`

Domínios da code-guard: `front`, `a11y`, `ux`.

UI: sem Impeccable; `references/unslop.md`. Fluxo: `tasks/T13/steps.json` com `--url http://localhost:3000/`.

## Ordem e paralelismo

- Cadeia do pipeline: T1 → T2 → T3 → T5 → T6 → T7, com T4 em paralelo a T2 e T3.
- Cadeia do site: T1 → T8 → (T9, T10, T13 em paralelo) e T1 → T11; T10 + T11 → T12. Depois da T1 rodam juntas T2, T4 e T8 (teto de 3).
- Arquivo tocado por mais de 1 task: `pipeline/main.ts` (T3, T5, T6, em série), `package.json` (T1, T5), `README.md` (T1, T7), `deploy.yml` (T1, T7), `frontend/app/layout.tsx` e `globals.css` (T1, T8), `GraficoCandles.tsx`, `PaginaAtivo.tsx` e `pagina-ativo.module.css` (T10, T12). Em todos os casos a 2ª task depende da 1ª.
- O QA do gate precisa da T5 (`npm run dados:exemplo`); o gate roda depois de todas as tasks.
