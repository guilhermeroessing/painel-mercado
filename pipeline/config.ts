import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { TipoAtivo } from '../contratos/dados.ts';

export type AtivoConfig = { ticker: string; nome: string; tipo: TipoAtivo };
export type Config = {
  watchlist: AtivoConfig[];
  brapi: { base_url: string; limite_mensal: number; timeout_ms: number };
  cotahist: { url_anual: string; ano_inicial: number };
  sgs: { url_modelo: string; cdi: number };
};

const CAMINHO_PADRAO = new URL('./config.yaml', import.meta.url);
const TIPOS: readonly string[] = ['acao', 'fii', 'etf'];
const TICKER = /^[A-Z0-9]{4,6}$/;

function falha(campo: string, valor: unknown): never {
  throw new Error(`config inválida em ${campo}: ${JSON.stringify(valor)}`);
}

function objeto(campo: string, valor: unknown): Record<string, unknown> {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) falha(campo, valor);
  return valor as Record<string, unknown>;
}

function texto(campo: string, valor: unknown): string {
  if (typeof valor !== 'string' || valor.trim() === '') falha(campo, valor);
  return valor;
}

function positivo(campo: string, valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) falha(campo, valor);
  return valor;
}

function lerAtivos(valor: unknown): AtivoConfig[] {
  if (!Array.isArray(valor) || valor.length === 0) falha('watchlist', valor);
  const vistos = new Set<string>();
  return valor.map((item, i) => {
    const campo = `watchlist[${i}]`;
    const o = objeto(campo, item);
    const ticker = texto(`${campo}.ticker`, o.ticker);
    if (!TICKER.test(ticker)) falha(`${campo}.ticker`, ticker);
    if (vistos.has(ticker)) falha(`${campo}.ticker (repetido)`, ticker);
    vistos.add(ticker);
    const tipo = texto(`${campo}.tipo`, o.tipo);
    if (!TIPOS.includes(tipo)) falha(`${campo}.tipo`, tipo);
    return { ticker, nome: texto(`${campo}.nome`, o.nome), tipo: tipo as TipoAtivo };
  });
}

export function carregarConfig(caminho: string | URL = CAMINHO_PADRAO): Config {
  const raiz = objeto('raiz', parse(readFileSync(caminho, 'utf8')));
  const brapi = objeto('brapi', raiz.brapi);
  const cotahist = objeto('cotahist', raiz.cotahist);
  const sgs = objeto('sgs', raiz.sgs);
  return {
    watchlist: lerAtivos(raiz.watchlist),
    brapi: {
      base_url: texto('brapi.base_url', brapi.base_url),
      limite_mensal: positivo('brapi.limite_mensal', brapi.limite_mensal),
      timeout_ms: positivo('brapi.timeout_ms', brapi.timeout_ms),
    },
    cotahist: {
      url_anual: texto('cotahist.url_anual', cotahist.url_anual),
      ano_inicial: positivo('cotahist.ano_inicial', cotahist.ano_inicial),
    },
    sgs: {
      url_modelo: texto('sgs.url_modelo', sgs.url_modelo),
      cdi: positivo('sgs.cdi', sgs.cdi),
    },
  };
}
