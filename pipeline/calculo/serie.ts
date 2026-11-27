import type { Candle } from '../../contratos/dados.ts';
import type { RegistroCotahist } from '../coleta/cotahist.ts';

export function candleValido(c: Candle): boolean {
  const precos = [c.o, c.h, c.l, c.c];
  if (!precos.every((p) => Number.isFinite(p) && p > 0)) return false;
  return Number.isFinite(c.v) && c.v > 0;
}

// RN3: o preço bruto é o de fechamento do COTAHIST; ajuste por proventos vem depois.
export function registroParaCandle(r: RegistroCotahist): Candle {
  return { d: r.d, o: r.o, h: r.h, l: r.l, c: r.c, c_bruto: r.c, v: r.v };
}

// O candle novo substitui o antigo de mesma data; a saída sai em ordem crescente, sem repetição.
export function mesclarSerie(base: readonly Candle[], novos: readonly Candle[]): Candle[] {
  const porData = new Map<string, Candle>();
  for (const c of base) porData.set(c.d, c);
  for (const c of novos) porData.set(c.d, c);
  return [...porData.values()].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}
