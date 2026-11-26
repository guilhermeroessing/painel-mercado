export type Envelope<T> = { gerado_em: string; fonte: string; atraso_aprox_min: number; dados: T };
export type Candle = {
  d: string;
  o: number;
  h: number;
  l: number;
  c: number;
  c_bruto: number;
  v: number;
};
export type TipoAtivo = 'acao' | 'fii' | 'etf';
export type Cotacao = {
  preco: number;
  var_dia_pct: number | null;
  var_12m_pct: number | null;
  volume: number | null;
  nome: string;
  tipo: TipoAtivo;
  ts: string;
  spark: number[];
};
export type Cotacoes = Record<string, Cotacao>;
export type Status = { gerado_em: string } & ({ status: 'ok' } | { status: 'erro'; erro: string });
export type Manifest = { arquivos: Record<string, Status>; tickers: Record<string, Status> };
export type PontoSerie = { d: string; v: number };
export type UsoBrapi = { mes: string; requisicoes: number };
export const CAMINHOS = {
  manifest: 'manifest.json',
  cotacoes: 'cotacoes.json',
  uso: 'uso-brapi.json',
  cdi: 'macro/cdi.json',
  historico: (ticker: string) => `historico/${ticker}.json`,
} as const;
