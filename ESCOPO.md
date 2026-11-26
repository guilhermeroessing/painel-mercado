# Painel de Mercado — Escopo Inicial (v0.1)

> **Instruções para o Claude Code:** este arquivo é a especificação do projeto. Leia-o inteiro antes de começar.
> Trabalhe **uma fase por vez**, na ordem da seção 8. Ao fim de cada fase, rode os testes, verifique os
> critérios de aceite e pare para eu revisar antes de seguir. Se alguma decisão aqui se mostrar inviável
> (API mudou, endpoint fora do ar, código de série errado), **me avise e proponha alternativa** em vez de
> contornar em silêncio. Não invente códigos de série, endpoints ou campos de resposta: verifique na
> documentação oficial ou fazendo uma chamada real.

---

## 1. Objetivo

Um site **público, gratuito e estático** com dados do mercado financeiro e da economia brasileira, voltado a
**estudo**: cotações com atraso, indicadores técnicos, indicadores fundamentalistas, painel macroeconômico
e calculadoras financeiras.

**Premissas**
- Custo zero: só serviços gratuitos.
- Atraso de até **1 hora** nas cotações é aceitável. Não é ferramenta de trading.
- Qualquer pessoa acessa pelo link, sem login.
- Idioma: português do Brasil. Números no formato brasileiro (`1.234,56`, `12,5%`, `R$`).

## 2. Fora do escopo (v0.1)

- Cotações em tempo real ou intraday.
- Login, contas de usuário, carteiras salvas no servidor.
- Recomendações de investimento, rankings de "melhores ações", sinais de compra e venda.
- Backend próprio ou banco de dados hospedado.
- Ativos internacionais e criptomoedas (ficam para depois).
- Aplicativo mobile (o site só precisa ser responsivo).

---

## 3. Arquitetura

```
┌─────────────────────────┐      cron (GitHub Actions)      ┌──────────────────────┐
│ APIs públicas           │ ──────────────────────────────▶ │ Pipeline Python      │
│ brapi · BCB SGS · Focus │                                  │ (coleta + cálculo)   │
│ CVM · Tesouro · IBGE    │                                  └──────────┬───────────┘
└─────────────────────────┘                                             │ gera JSON
                                                                        ▼
                                                          ┌──────────────────────────┐
                                                          │ /data/*.json (estáticos) │
                                                          └──────────┬───────────────┘
                                                                     │ deploy
                                                                     ▼
                                                    ┌────────────────────────────────┐
                                                    │ GitHub Pages — site estático   │
                                                    │ (HTML/JS lê só os JSON locais) │
                                                    └────────────────────────────────┘
```

**Por que assim**
- **O navegador nunca chama APIs externas.** Assim o token da brapi não fica exposto, não há problema de
  CORS e a cota mensal não cresce com o número de visitantes.
- Os dados são coletados em lote por um workflow agendado e publicados como arquivos JSON junto com o site.
- Hospedagem gratuita: repositório **público** no GitHub, GitHub Pages e GitHub Actions.

**Stack**
- **Pipeline:** Python 3.12, `requests`, `pandas`, `python-bcb` (SGS, Focus, PTAX), `pytest`.
- **Frontend:** Vite + TypeScript, sem framework pesado (vanilla TS ou Preact, o que ficar mais simples).
  - Gráfico de candles: **TradingView Lightweight Charts** (licença Apache 2.0; exibir a atribuição que a licença pede).
  - Gráficos de linha e barra (macro): **Apache ECharts** ou **Chart.js**.
  - Testes: **Vitest**.
- **CI/CD:** GitHub Actions (coleta de dados, testes, deploy no Pages).

---

## 4. Fontes de dados

> Confirme cada endpoint e código com uma chamada real antes de usar. Guarde todos os códigos e URLs em
> `pipeline/config.yaml`, nunca espalhados pelo código.

### 4.1 brapi.dev: cotações, histórico, dividendos
- Plano gratuito: **15.000 requisições/mês**, **1 ticker por chamada**, atraso de cerca de 30 min,
  fundamentos só básicos.
- Autenticação: header `Authorization: Bearer <token>`. O token fica no secret `BRAPI_TOKEN` do GitHub,
  **nunca no código**.
- Endpoints principais:
  - `GET /api/quote/{ticker}`: cotação atual.
  - `GET /api/quote/{ticker}?range=1y&interval=1d`: histórico diário OHLCV.
  - `GET /api/quote/{ticker}?dividends=true`: proventos.
  - `GET /api/quote/^BVSP`: Ibovespa.
- Docs: https://brapi.dev/docs

**Orçamento de requisições (precisa caber em 15.000/mês, com folga):**

| Tarefa | Frequência | Cálculo (30 tickers) | Req./mês |
|---|---|---|---|
| Cotação atual | de hora em hora, 10h–18h, dias úteis (9×/dia) | 30 × 9 × 22 | ~5.940 |
| Histórico diário (1 ano) | 1×/dia, após o fechamento | 30 × 22 | ~660 |
| Dividendos | 1×/semana | 30 × 4 | ~120 |
| **Total** | | | **~6.700** |

- Comece com uma **watchlist de 30 ativos** em `config.yaml` (ações mais líquidas do Ibovespa, alguns FIIs,
  BOVA11, IVVB11).
- O pipeline precisa **contar as requisições** e abortar com aviso se a projeção mensal passar de 12.000.

### 4.2 Banco Central: SGS (séries temporais)
- URL: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json&dataInicial=dd/MM/aaaa&dataFinal=dd/MM/aaaa`
- **Limite: no máximo 10 anos por consulta.** Para histórico maior, quebre em janelas e concatene.
- Últimos N valores: `.../dados/ultimos/{N}?formato=json`.
- Séries candidatas (**valide cada código** na página de metadados do SGS antes de usar):

| Indicador | Código | Periodicidade |
|---|---|---|
| Selic meta (Copom) | 432 | diária |
| Selic diária | 11 | diária |
| CDI diário | 12 | diária |
| CDI anualizado (base 252) | 4389 | diária |
| IPCA mensal | 433 | mensal |
| IPCA acumulado 12 meses | 13522 | mensal |
| IGP-M mensal | 189 | mensal |
| Dólar comercial (venda) | 1 | diária |
| Euro (venda) | 21619 | diária |
| IBC-Br dessazonalizado | 24364 | mensal |
| TR | 226 | diária |
| Rendimento da poupança | 195 | mensal |

- Frequência de coleta: 1×/dia (séries diárias) e 1×/semana (mensais).

### 4.3 Banco Central: Focus (expectativas de mercado)
- API OData do Olinda: `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/`
  (recurso `ExpectativasMercadoAnuais`). Use o `python-bcb` (`bcb.Expectativas`).
- Mostrar a mediana para IPCA, Selic, PIB e câmbio no ano corrente e nos dois seguintes, e como ela evoluiu
  nas últimas 12 semanas.
- Coleta semanal (o Focus sai às segundas).

### 4.4 CVM: Dados Abertos (fundamentos)
- DFP (anual): `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_{ANO}.zip`
- ITR (trimestral): `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_{ANO}.zip`
- Cadastro: dataset "Cias Abertas: Informação Cadastral" (CNPJ ↔ código CVM).
- Os arquivos são ZIP com CSV em `latin-1` e separador `;`. Use as demonstrações **consolidadas**
  (`_con_`) e, se não houver, as individuais (`_ind_`).
- Atenção: valores de ITR podem ser **acumulados no ano** e não do trimestre isolado. Para chegar no
  trimestre, faça a diferença entre períodos. Para dados de 12 meses (LTM), some os últimos 4 trimestres.
- Mapeamento ticker ↔ CNPJ/código CVM mantido à mão em `pipeline/tickers_cvm.yaml` para os 30 ativos da
  watchlist.
- Coleta semanal (os arquivos são atualizados toda semana; só reprocesse se o arquivo tiver mudado).
- Licença ODbL: exibir a atribuição "Fonte: CVM – Portal de Dados Abertos".

### 4.5 Tesouro Direto
- Preços e taxas históricos: CSV do **Tesouro Transparente** (dataset "Taxas dos Títulos Ofertados pelo
  Tesouro Direto"). Encontre a URL atual no portal; não chute.
- Alternativa: o endpoint de Tesouro da brapi (conta na cota).
- Coleta: 1×/dia.

### 4.6 IBGE SIDRA (opcional na v0.1)
- `https://apisidra.ibge.gov.br/values/...`: PIB trimestral e desemprego (PNAD Contínua). Pode ficar
  para a fase 6.

---

## 5. Funcionalidades

### 5.1 Página inicial: visão geral
- Cards com Ibovespa, dólar, Selic meta, CDI anualizado, IPCA em 12 meses e IGP-M em 12 meses (valor,
  variação e data de referência).
- Tabela da watchlist com ticker, nome, preço, variação do dia, variação em 12 meses e mini-gráfico (sparkline).
- Indicação clara de **"Atualizado em DD/MM/AAAA HH:MM (horário de Brasília) — dados com atraso"**.

### 5.2 Página do ativo (`/ativo/?t=PETR4`)
- Gráfico de candles (1 ano), com seleção de período (1M, 3M, 6M, 1A).
- **Indicadores técnicos**, calculados **no navegador** a partir do OHLCV, com parâmetros que o usuário
  pode mudar:
  - Médias móveis simples e exponenciais (padrão: 9, 21, 50, 200).
  - IFR/RSI (14).
  - MACD (12, 26, 9).
  - Bandas de Bollinger (20, 2σ).
  - Volatilidade histórica anualizada (21 e 63 pregões; √252).
  - Drawdown máximo no período.
  - Retorno acumulado comparado ao Ibovespa e ao CDI no mesmo período.
- **Indicadores fundamentalistas** (vindos do JSON gerado a partir da CVM, usando os últimos 12 meses):
  - Valuation: P/L, P/VP, EV/EBITDA, Dividend Yield (12m).
  - Rentabilidade: ROE, ROIC, margem bruta, margem EBITDA, margem líquida.
  - Endividamento: Dívida líquida/EBITDA, Dívida líquida/PL, liquidez corrente.
  - Crescimento: CAGR de receita e de lucro em 3 anos, quando houver dados.
  - Cada indicador mostra a fórmula num tooltip (o site é para estudo).
  - Bancos e seguradoras têm demonstrações diferentes. Nesses casos, mostre só P/L, P/VP, ROE e DY e
    avise que os demais não se aplicam.
- Histórico de proventos (tabela e gráfico anual).

### 5.3 Painel macroeconômico
- Gráficos de séries históricas: Selic × IPCA 12m (com o **juro real ex-post** calculado), câmbio,
  IGP-M, IBC-Br.
- Expectativas do Focus: tabela com a mediana atual e gráfico de como ela evoluiu.
- Seletor de período (1A, 5A, 10A, máximo).
- Botão para baixar CSV de cada série.

### 5.4 Calculadoras (100% no navegador, sem coletar dados)
Taxas de referência (CDI, Selic, IPCA, TR) **pré-preenchidas** com o último valor do JSON, mas editáveis.

| # | Calculadora | Entradas principais | Saídas |
|---|---|---|---|
| 1 | Juros compostos com aportes | valor inicial, aporte mensal, taxa, prazo | montante, total investido, juros, gráfico |
| 2 | Conversão de taxas | taxa e período de origem | equivalente diária (252), mensal e anual; nominal ↔ real (Fisher) |
| 3 | Renda fixa: CDB × LCI/LCA × Tesouro × Poupança | valor, prazo, % do CDI ou taxa pré/IPCA+ | valor bruto, IR, IOF, líquido, taxa equivalente sem IR |
| 4 | Precificação de título prefixado e IPCA+ | taxa, vencimento, VNA | PU, duration de Macaulay e modificada, marcação a mercado se a taxa mudar ±X p.p. |
| 5 | Financiamento SAC × Price | valor, taxa, prazo | tabela de amortização, total de juros, comparação |
| 6 | VPL / TIR / Payback | fluxos de caixa, taxa de desconto | VPL, TIR (método numérico), payback simples e descontado |
| 7 | Aposentadoria / independência financeira | idade, patrimônio, aporte, retorno real, renda desejada | patrimônio necessário, idade-alvo, regra de retirada |
| 8 | Preço justo | LPA, VPA, DPA, taxas | Graham (√(22,5·LPA·VPA)), Bazin (DPA/taxa), Gordon; aviso de que são modelos simplificados |
| 9 | Custo de oportunidade / inflação | valor, período | poder de compra corrigido pelo IPCA (série do SGS) |
| 10 | Rentabilidade real de carteira | retornos, IPCA | retorno nominal × real, comparação com o CDI |

**Regras tributárias**
- Ficam num arquivo único (`frontend/src/config/tributacao.ts`) com a data da última revisão.
- Ponto de partida, que precisa ser **conferido com a legislação em vigor antes de publicar**:
  - IR regressivo em renda fixa: 22,5% (até 180 dias), 20% (181–360), 17,5% (361–720) e 15% (acima de 720).
  - LCI, LCA, CRI e CRA isentos para pessoa física.
  - IOF regressivo nos primeiros 30 dias.
  - Poupança: 0,5% a.m. + TR quando a Selic está acima de 8,5% a.a.; nos demais casos, 70% da Selic + TR.
- Toda calculadora mostra a fórmula usada e um aviso de "caráter educativo".

### 5.5 Página "Sobre / Metodologia"
- Fontes de dados, frequência de atualização, atrasos, fórmulas de todos os indicadores e as licenças
  (ODbL para CVM e BCB, Apache para a Lightweight Charts).
- **Aviso legal** (também no rodapé de todas as páginas): "Conteúdo exclusivamente educativo. Não constitui
  recomendação de investimento. Cotações com atraso, fornecidas por terceiros, sem garantia de exatidão."

---

## 6. Estrutura do repositório

```
painel-mercado/
├── ESCOPO.md                 # este arquivo
├── CLAUDE.md                 # convenções do projeto (gerar na fase 0)
├── README.md
├── pipeline/
│   ├── config.yaml           # watchlist, códigos SGS, URLs, agendas
│   ├── tickers_cvm.yaml      # ticker ↔ CNPJ / código CVM
│   ├── coleta/
│   │   ├── brapi.py
│   │   ├── bcb_sgs.py
│   │   ├── bcb_focus.py
│   │   ├── cvm.py
│   │   └── tesouro.py
│   ├── calculo/
│   │   └── fundamentos.py    # LTM, múltiplos
│   ├── saida.py              # grava JSON + manifest
│   ├── main.py               # CLI: python -m pipeline.main --tarefa cotacoes|historico|macro|focus|cvm|tesouro
│   └── tests/
├── frontend/
│   ├── index.html
│   ├── ativo/index.html
│   ├── macro/index.html
│   ├── calculadoras/index.html
│   ├── sobre/index.html
│   ├── src/
│   │   ├── indicadores/      # SMA, EMA, RSI, MACD, Bollinger, vol... (puro, testável)
│   │   ├── calculadoras/     # funções financeiras puras
│   │   ├── config/tributacao.ts
│   │   ├── ui/
│   │   └── format.ts         # formatação pt-BR (Intl.NumberFormat)
│   └── tests/
├── data/                     # JSON gerados (não editar à mão)
└── .github/workflows/
    ├── cotacoes.yml          # de hora em hora, dias úteis
    ├── diario.yml            # histórico, SGS diário, Tesouro
    ├── semanal.yml           # Focus, CVM, SGS mensal, dividendos
    └── deploy.yml            # build + GitHub Pages
```

## 7. Contratos de dados (JSON)

Todo arquivo em `/data` segue este envelope:

```json
{
  "gerado_em": "2026-11-26T15:00:00-03:00",
  "fonte": "brapi.dev",
  "atraso_aprox_min": 30,
  "dados": { }
}
```

Arquivos esperados:
- `data/manifest.json`: lista de arquivos com `gerado_em` e status (ok/erro) de cada um.
- `data/cotacoes.json`: `{ "PETR4": { "preco", "var_dia_pct", "var_12m_pct", "volume", "nome", "ts" } }`
- `data/historico/{TICKER}.json`: `[{ "d": "2026-11-25", "o", "h", "l", "c", "v" }]` com preço **ajustado**
  por proventos, e o campo `c_bruto` à parte.
- `data/macro/{serie}.json`: `[{ "d": "2026-10-01", "v": 0.56 }]`
- `data/focus.json`
- `data/fundamentos/{TICKER}.json`: indicadores LTM, histórico anual e data da última demonstração.
- `data/proventos/{TICKER}.json`
- `data/tesouro.json`

Arquivos de séries longas devem ser **compactos** (chaves curtas, sem identação) para o site carregar rápido.

---

## 8. Fases de implementação

### Fase 0 — Fundação
- Criar o repositório, a estrutura de pastas, o `CLAUDE.md` com as convenções (Python: ruff + pytest;
  TS: eslint + prettier + vitest; commits em português).
- Vite configurado com páginas múltiplas e `base` correto para o GitHub Pages.
- Workflow `deploy.yml` publicando uma página "em construção".
- **Aceite:** o link do Pages abre; o CI roda lint e testes vazios sem erro.

### Fase 1 — Macro (sem token, só BCB)
- Coletores do SGS (com quebra em janelas de 10 anos) e do Focus.
- Página Macro com gráficos, seletor de período e download em CSV.
- Cards de macro na página inicial.
- **Aceite:** valores conferidos manualmente contra o site do BCB em 3 séries; testes do coletor com
  respostas gravadas (fixtures), sem rede.

### Fase 2 — Cotações (brapi)
- Coletor com contador de requisições, retry com backoff e tratamento de erro 429 (limite atingido) sem
  insistir em loop.
- Workflows `cotacoes.yml` e `diario.yml`. Lembrete: o cron do GitHub é em **UTC** (10h–18h em Brasília
  = 13h–21h UTC) e pode atrasar alguns minutos.
- Página inicial com a watchlist e página do ativo com o gráfico de candles.
- **Aceite:** os 30 tickers aparecem; a projeção de uso mensal fica no log e abaixo de 12.000.

### Fase 3 — Indicadores técnicos
- Funções puras em `src/indicadores/` com **testes contra valores de referência** (calculados à parte, por
  exemplo com `pandas-ta`, e salvos como fixture).
- Sobreposições no gráfico (médias, Bollinger) e painéis (IFR, MACD).
- Comparação de retorno contra Ibovespa e CDI.
- **Aceite:** todos os indicadores batem com a referência com tolerância de 1e-6.

### Fase 4 — Calculadoras
- Funções financeiras puras e testadas (TIR por Newton-Raphson com fallback para bisseção; dias úteis com
  calendário de feriados da B3/ANBIMA guardado no repositório).
- Interface com formulários, resultados, gráfico quando fizer sentido e a fórmula visível.
- **Aceite:** cada calculadora tem pelo menos 3 casos de teste com valores conferidos à mão ou numa HP 12C/Excel.

### Fase 5 — Fundamentos (CVM)
- Download dos ZIPs (só quando tiverem mudado), parse, montagem do LTM e cálculo dos múltiplos (preço
  vem de `cotacoes.json`; ações em circulação vêm do FRE ou da composição do capital).
- Tratamento à parte para bancos e seguradoras.
- **Aceite:** comparar P/L, ROE e margem líquida de 5 empresas com o RI de cada uma (diferença explicável
  por data ou critério, documentada).

### Fase 6 — Acabamento
- Tema claro/escuro, layout responsivo, acessibilidade básica (contraste, navegação por teclado, `aria-label`
  nos gráficos).
- Página "Sobre / Metodologia" completa, aviso legal e atribuições.
- Monitoramento: o `manifest.json` mostra um selo "dados desatualizados" se algum arquivo passar de 26 h
  sem atualizar (ou de 7 dias, nos semanais).
- (Opcional) IBGE SIDRA: PIB e desemprego.
- **Aceite:** Lighthouse ≥ 90 em Performance e Acessibilidade na página inicial.

---

## 9. Requisitos não funcionais

- **Segredos:** só em GitHub Secrets. Nenhum token no código, nos logs ou nos JSON publicados.
  - **Produção (GitHub Actions):** secret `BRAPI_TOKEN` (Settings → Secrets and variables → Actions),
    lido nos workflows como `${{ secrets.BRAPI_TOKEN }}` e passado ao Python por variável de ambiente.
  - **Desenvolvimento local:** arquivo `.env` na raiz com `BRAPI_TOKEN=...`, carregado com `python-dotenv`.
    O `.env` **tem que estar no `.gitignore` desde o primeiro commit** (fase 0). Criar também um
    `.env.example` versionado, com `BRAPI_TOKEN=` vazio.
  - O código lê só `os.environ["BRAPI_TOKEN"]`. Se a variável não existir, as tarefas da brapi são puladas
    com aviso e as demais continuam.
  - O Claude Code **nunca** pede, escreve, imprime nem commita o valor do token. Quem cria o `.env` e o
    secret é o usuário.
  - Fase 0: configurar um hook de pre-commit (ex.: `gitleaks` ou `detect-secrets`) para barrar tokens por engano.
- **Resiliência:** se uma fonte falhar, o pipeline mantém o último JSON válido, marca erro no `manifest` e
  não derruba as outras tarefas.
- **Tamanho do repositório:** os commits de dados de hora em hora incham o histórico. Use **uma** destas opções:
  (a) gravar os JSON num branch `data` órfão com force-push; ou (b) não versionar os dados e montar o site
  com `actions/cache` + `actions/deploy-pages`. Recomendo a (a), pela simplicidade; justifique se escolher outra.
- **Workflows agendados:** em repositórios públicos, o GitHub pode desativar workflows agendados depois de
  60 dias sem atividade no repositório. Documente no README como verificar e reativar.
- **Performance:** página inicial com menos de 300 KB de JS e dados carregados sob demanda.
- **Testes:** nenhum teste depende de rede; respostas de API ficam salvas em `tests/fixtures/`.
- **Formatação:** sempre `Intl.NumberFormat('pt-BR')` e datas `DD/MM/AAAA`; horário de Brasília.

## 10. Cuidados legais (uso educativo)

- O site exibe cotações da B3 com atraso, obtidas de um terceiro (brapi). Para uso educativo, não comercial e
  com atraso, o risco é baixo, mas:
  - sempre mostre a fonte e o atraso em cada tela de cotação;
  - não ofereça download em massa de cotações (só das séries macro do BCB, que são ODbL);
  - não exiba publicidade nem cobre acesso. Se isso mudar no futuro, a licença de market data da B3 precisa
    ser revista.
- Respeite os termos de uso da brapi.
- Sem linguagem de recomendação ("compre", "venda", "barata", "cara").

## 11. Backlog (depois da v0.1)

- Ativos internacionais e câmbio de várias moedas.
- Comparador de ativos lado a lado e screener simples por múltiplos.
- Curva de juros (ETTJ ANBIMA) e inflação implícita.
- Carteira simulada salva no `localStorage` do navegador.
- Fundos de investimento (CVM: informe diário) com rentabilidade e cotistas.
- Cenários de estresse em renda fixa.
