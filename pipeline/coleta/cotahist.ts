import { createInterface } from 'node:readline';

export type RegistroCotahist = {
  ticker: string;
  nome: string;
  d: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  volume_financeiro: number;
};

const COMPRIMENTO_LINHA = 245;
const TIPO_COTACAO = '01';
const MERCADO_A_VISTA = '010';

// Posições do layout oficial da B3 (1-based, inclusivas).
function campo(linha: string, de: number, ate: number): string {
  return linha.slice(de - 1, ate);
}

function inteiro(linha: string, de: number, ate: number): number | null {
  const texto = campo(linha, de, ate);
  return /^\d+$/.test(texto) ? Number(texto) : null;
}

export function lerLinhaCotahist(linha: string): RegistroCotahist | null {
  if (linha.length < COMPRIMENTO_LINHA) return null;
  if (campo(linha, 1, 2) !== TIPO_COTACAO) return null;
  if (campo(linha, 25, 27) !== MERCADO_A_VISTA) return null;
  const data = campo(linha, 3, 10);
  if (!/^\d{8}$/.test(data)) return null;
  const fator = inteiro(linha, 211, 217);
  const abertura = inteiro(linha, 57, 69);
  const maxima = inteiro(linha, 70, 82);
  const minima = inteiro(linha, 83, 95);
  const fechamento = inteiro(linha, 109, 121);
  const titulos = inteiro(linha, 153, 170);
  const financeiro = inteiro(linha, 171, 188);
  if (
    !fator ||
    abertura === null ||
    maxima === null ||
    minima === null ||
    fechamento === null ||
    titulos === null ||
    financeiro === null
  ) {
    return null;
  }
  const preco = (inteiroPreco: number) => inteiroPreco / 100 / fator;
  return {
    ticker: campo(linha, 13, 24).trim(),
    nome: campo(linha, 28, 39).trim(),
    d: `${data.slice(0, 4)}-${data.slice(4, 6)}-${data.slice(6, 8)}`,
    o: preco(abertura),
    h: preco(maxima),
    l: preco(minima),
    c: preco(fechamento),
    v: titulos,
    volume_financeiro: financeiro / 100,
  };
}

export async function* lerCotahist(
  entrada: NodeJS.ReadableStream,
  tickers: ReadonlySet<string>,
): AsyncGenerator<RegistroCotahist> {
  entrada.setEncoding('latin1');
  const linhas = createInterface({ input: entrada, crlfDelay: Infinity });
  for await (const linha of linhas) {
    const registro = lerLinhaCotahist(linha.replace(/\r$/, ''));
    if (registro && tickers.has(registro.ticker)) yield registro;
  }
}
