# Spec — Painel de Mercado, Feature 1: fundação + cotações + página do ativo

Status: **rascunho para revisão do Marcelo.** Nada será construído antes da aprovação.
Base: `ESCOPO.md` v0.1 (arquivo enviado pelo usuário). Repo: `guilhermeroessing/painel-mercado`. Branch de trabalho: `claude/zealous-ritchie-udqtv9`.

---

## 1. Objetivo e o porquê

Um site público, gratuito e estático, para estudo de mercado financeiro brasileiro. Esta feature entrega a base do projeto e as duas primeiras telas de dados: a **página inicial com a lista de ativos** e a **página de cada ativo** com gráfico de candles e indicadores técnicos.

Fica de fora desta feature: painel macroeconômico (feature 2) e calculadoras (feature 3), nessa ordem.

Sucesso = o usuário abre o link, vê os 30 ativos com preço e variação, clica num ativo e vê o gráfico de 1 ano com a data da última atualização. Tudo funciona bem no celular primeiro, e também em tablet e computador.

## 2. Histórias e critérios de aceite

**H1 — Visitante vê a lista de ativos.**

- Dado que o visitante abre a página inicial, então vê 30 linhas (24 ações, 4 FIIs, 2 ETFs), cada uma com ticker, nome, preço, variação do dia, variação em 12 meses e mini-gráfico.
- A página mostra "Atualizado em DD/MM/AAAA HH:MM (horário de Brasília) — dados com atraso" e a frase de aviso legal no rodapé.
- No celular, a lista cabe sem rolagem horizontal.

**H2 — Visitante abre a página de um ativo.**

- Dado que o visitante clica num ticker (ou abre `/ativo/?t=PETR4`), então vê o gráfico de candles de 1 ano.
- Seletor de período: 1M, 3M, 6M, 1A.
- Indicadores técnicos calculados no navegador, com parâmetros ajustáveis: médias móveis simples e exponenciais (9, 21, 50, 200), IFR (14), MACD (12, 26, 9), Bandas de Bollinger (20, 2σ), volatilidade anualizada (21 e 63 pregões, √252), drawdown máximo no período e retorno acumulado comparado ao Ibovespa e ao CDI.
- Cada indicador mostra a fórmula num tooltip.
- Atribuição visível do TradingView Lightweight Charts (licença Apache 2.0).

**H3 — Dados sempre disponíveis mesmo com falha.**

- Se a coleta de um ativo falhar, o último dado válido continua sendo exibido, com aviso de erro no manifest. As outras telas e ativos não são afetados.

**H4 — O robô de coleta respeita a cota.**

- O pipeline conta as requisições e aborta com aviso se a projeção mensal passar de 12.000 (limite de segurança abaixo dos 15.000 do plano gratuito).
- Erro 429 da brapi interrompe a tarefa sem insistir em loop.

**H5 — Projeto roda do zero com um comando.**

- `npm install`, `npm test`, `npm run build` funcionam sem rede, usando fixtures gravadas.

## 3. Regras de negócio

1. **RN1 — Watchlist:** 30 ativos, definidos em `pipeline/config.yaml`. Lista inicial aprovada pelo Marcelo em 26/11/2026: ações PETR4, PETR3, VALE3, ITUB4, BBDC4, BBAS3, ABEV3, WEGE3, B3SA3, RENT3, SUZB3, AXIA3, GGBR4, PRIO3, ITSA4, TOTS3, EQTL3, SBSP3, RAIL3, HAPV3, CSNA3, JBSS32, RDOR3, CMIG4; FIIs HGLG11, XPML11, KNRI11, MXRF11; ETFs BOVA11, IVVB11. O Marcelo pode trocar a qualquer momento.
2. **RN2 — Atraso:** toda tela de cotação mostra a data e hora da última atualização em horário de Brasília e a palavra "com atraso".
3. **RN3 — Preço:** o histórico vem do COTAHIST da B3, que é **não ajustado** por proventos. Por isso `c` e `c_bruto` são iguais nesta feature. Quando a base de proventos entrar (ver seção 4), `c` passa a ser o preço ajustado. Enquanto isso, a página do ativo mostra o aviso "preços não ajustados por proventos".
4. **RN4 — Variação em 12 meses:** calculada sobre o fechamento ajustado de 12 meses atrás (ou o primeiro pregão disponível, se o ativo tiver menos de 12 meses). Se não houver dado, mostra "—".
5. **RN5 — Tempo de coleta:** cotações de hora em hora, 10h–18h de Brasília, dias úteis (cron em UTC: 13h–21h). Histórico diário: uma vez por dia útil, após o fechamento. Dividendos: uma vez por semana.
6. **RN6 — Sem recomendação:** nenhum texto usa "compre", "venda", "barata", "cara", "oportunidade" ou similares.
7. **RN7 — Sem download em massa de cotações:** não há botão para baixar cotações da B3. (O CSV de séries do BCB fica para a feature 2.)
8. **RN8 — Sem publicidade e sem cobrança de acesso.**
9. **RN9 — Formato brasileiro:** números com `Intl.NumberFormat('pt-BR')`, datas `DD/MM/AAAA`, valores em R$.
10. **RN10 — Token nunca no navegador:** o site lê apenas os JSON publicados. Nenhuma chamada à brapi acontece no navegador.

## 4. Pontas soltas e decisão de cada uma

| Ponta solta                                                   | Decisão                                                                                                                                                                                            |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token da brapi ainda não existe                               | Toda a feature é construída e testada com fixtures gravadas, sem rede. A coleta real só roda depois que o Marcelo criar o token e o colocar no secret `BRAPI_TOKEN` (instruções já dadas no chat). |
| Ticker inexistente ou deslistado                              | O coletor marca erro para aquele ticker no manifest e mantém o último dado válido. Não derruba os outros.                                                                                          |
| Brapi responde 429 (limite atingido)                          | Para a tarefa, grava erro no manifest e não tenta de novo naquela execução.                                                                                                                        |
| Fim de semana, feriado ou pregão sem dado                     | O último fechamento é mostrado com a data correta, sem inventar valor.                                                                                                                             |
| Primeira execução (nenhum JSON ainda)                         | A página mostra "Dados ainda não disponíveis" em vez de tela quebrada.                                                                                                                             |
| Ativo com menos de 1 ano de histórico                         | O gráfico mostra o que existe, e o indicador que precisa de janela maior mostra "—" até ter dados suficientes.                                                                                     |
| Dado sujo (preço zero, volume nulo)                           | Ignorado no cálculo e registrado no log. Não entra no gráfico.                                                                                                                                     |
| Concorrência entre cron de hora em hora e cron diário         | Workflows com `concurrency` para não gravar o mesmo arquivo ao mesmo tempo.                                                                                                                        |
| Repositório de dados crescer                                  | Decisão do orquestrador (ver seção 8): dados em branch `data` órfão, com force-push, conforme a opção (a) do escopo.                                                                               |
| Histórico do plano gratuito da brapi pode ser curto (3 meses) | Deixa de ser o caminho do histórico. A base vem do COTAHIST da B3 (desde 1995) e cresce com a coleta diária. O teste com o token da brapi só confirma a cotação do dia.                            |
| Arquivos brutos da B3 são grandes (cerca de 80 MB por ano)    | Não entram no repositório. O GitHub Actions baixa, processa e descarta. Só o JSON compacto gerado vai para a branch `data`.                                                                        |
| Preço sem ajuste por proventos                                | Aviso visível na página do ativo. A base de proventos (fonte a definir) entra depois, em feature própria.                                                                                          |
| Ibovespa (`^BVSP`) não está no COTAHIST de ações              | Fonte do índice a definir antes da feature 1 terminar. Enquanto isso, a comparação com o Ibovespa mostra "dado indisponível".                                                                      |

## 5. Telas

**Prioridade de tela: mobile primeiro.** O Marcelo acredita que a maioria dos acessos será pelo celular. Tablet (768×1024) e desktop (1280×720) são verificados depois, com o mesmo conteúdo.

**Direção visual (5 linhas, rascunho — a validar com o Impeccable ou com o Marcelo):**

- Produto: painel de estudo de mercado financeiro brasileiro, para quem está aprendendo.
- Caráter: sóbrio, legível, técnico.
- Mundo: planilha de análise e relatório impresso (sem gradientes ou ícones decorativos).
- Momentos: variações positivas e negativas ganham cor; o gráfico é o ponto de destaque na página do ativo.
- Assinatura: a linha "Atualizado em ... — dados com atraso" aparece sempre no topo, no mesmo formato.

**Tela 1 — Início (`/`)**

- Job: ver rapidamente como está a lista de ativos.
- Modo: lista/tabela. No celular, cada ativo vira um cartão; no desktop, vira uma tabela.
- Estados: carregando, vazio (primeira execução), erro de um ativo (linha com aviso), sem erro.

**Tela 2 — Ativo (`/ativo/?t=TICKER`)**

- Job: entender o comportamento recente de um ativo e comparar com Ibovespa e CDI.
- Modo: gráfico em destaque, controles de período e de indicadores embaixo.
- Estados: carregando, ticker inexistente (mensagem clara e link de volta), dado parcial (aviso de histórico curto).

**Propostas de UI pelo Impeccable:** pendentes. A instalação do Impeccable falhou por causa do proxy e será refeita antes da Fase 2 do /dev. Até lá, o layout segue a direção acima sem o passo de validação.

## 6. Dado e medição

| Dado                                                          | Origem                                                                               | Frequência                                                   | Como o Marcelo confere                                  |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------- |
| Cotação atual, variação do dia, 12 meses                      | brapi (`/api/quote/{ticker}`)                                                        | hora em hora, 10h–18h, úteis                                 | comparar com o site da B3 (dado com atraso)             |
| Histórico diário OHLCV, desde 1995 (o que estiver disponível) | Arquivo COTAHIST da B3, anual (`COTAHIST_AAAA.ZIP`), baixado uma vez para o backfill | carga inicial, e depois 1× por dia útil com a cotação do dia | comparar um pregão com o arquivo oficial da B3          |
| Coleta diária acumulada                                       | brapi (cotação do dia, com atraso)                                                   | 1× por dia útil, após o fechamento                           | o histórico próprio cresce a cada dia                   |
| Proventos                                                     | brapi (`?dividends=true`)                                                            | 1× por semana                                                | comparar com o aviso de proventos do RI da empresa      |
| Ibovespa e CDI                                                | brapi (`^BVSP`) e BCB SGS série 12                                                   | diária                                                       | comparar com o site do BCB                              |
| Contador de requisições                                       | o próprio pipeline                                                                   | a cada execução                                              | ver o log do workflow: projeção mensal abaixo de 12.000 |

**Medição de sucesso:** log de cada execução mostra o total de requisições do mês e a projeção; o manifest mostra o status de cada arquivo.

## 7. Fora do escopo (feature 1)

- Painel macroeconômico (feature 2).
- Calculadoras (feature 3).
- Indicadores fundamentalistas (CVM) — fase 5 do escopo.
- Tema claro/escuro, acessibilidade completa, Lighthouse ≥ 90 — fase 6 do escopo.
- Login, contas, carteira salva, Supabase — não entram na v0.1 (decisão do Marcelo: opção 1).
- Ativos internacionais e criptomoedas.
- Aplicativo mobile nativo.

## 8. Decisões do orquestrador (para o Marcelo conferir)

| #   | Decisão                                                                                                                                                                                    | Motivo                                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Stack: Next.js com exportação estática (`output: 'export'`), hospedado na Vercel. Supabase fica fora da v0.1.                                                                              | Escolha do Marcelo (opção 1): mantém a arquitetura estática do escopo, com custo zero.                                                           |
| D2  | Coleta de dados em TypeScript (Node 22), rodando no GitHub Actions com `tsx`. Substitui o pipeline Python do escopo.                                                                       | Uma linguagem só para site e coleta; `fetch` nativo do Node; menos instalação. Marcelo delegou a escolha.                                        |
| D3  | Feature 1 junta as fases 0 e 2 do escopo (fundação + cotações + página do ativo). A fase 1 (macro) vira feature 2, como pediu o Marcelo.                                                   | Ordem pedida pelo Marcelo: cotações, depois macro, depois calculadoras.                                                                          |
| D4  | Dados versionados numa branch `data` órfã com force-push, opção (a) do escopo.                                                                                                             | Simplicidade e histórico do repo limpo.                                                                                                          |
| D5  | Workflows: `cotacoes.yml` (de hora em hora), `diario.yml`, `semanal.yml`, `deploy.yml`, como no escopo.                                                                                    | Segue o escopo; ajusta apenas a linguagem.                                                                                                       |
| D6  | Biblioteca de gráfico de candles: TradingView Lightweight Charts. Gráficos de linha (feature 2): Apache ECharts.                                                                           | Escolha do escopo, sem alteração.                                                                                                                |
| D7  | Testes: Vitest no site e `node:test` nos coletores (sem dependência extra).                                                                                                                | Mantém o número de bibliotecas baixo.                                                                                                            |
| D8  | **Base de dados própria em arquivos JSON compactos**, na branch `data`: uma série por ativo, formada pelo COTAHIST (desde 1995, o que existir) e pela coleta diária. Sem Supabase na v0.1. | Marcelo pediu a base própria; arquivos são gratuitos, versionados e não exigem conta extra. Supabase pode entrar depois se ele quiser consultas. |
| D9  | Fonte do histórico: COTAHIST da B3 (`bvmf.bmfbovespa.com.br`), a fonte oficial e gratuita. Cota e token da brapi ficam só para a cotação do dia.                                           | Histórico de 1 ano no plano gratuito da brapi não está confirmado (ver pontas soltas).                                                           |
| D10 | Ambiente de teste deste projeto: ambiente pessoal "painel-mercado (dados B3)", com acesso só a `bvmf.bmfbovespa.com.br` e `www.b3.com.br`.                                                 | Liberação mínima, sem mexer no ambiente padrão.                                                                                                  |

---

## Próximo passo

1. Marcelo revisa esta spec e responde: aprova, ou pede mudança em alguma seção.
2. Só depois da aprovação: setup das contas (Vercel, Supabase fica de fora da feature 1), criação do repositório com a estrutura da fase 0 e o fluxo do `/dev` da Fase 2.
