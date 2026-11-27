import type { Candle, Status } from '../../contratos/dados.ts';
import { CAMINHOS } from '../../contratos/dados.ts';
import type { Config } from '../config.ts';
import { candleValido, mesclarSerie, registroParaCandle } from '../calculo/serie.ts';
import { lerCotahist } from '../coleta/cotahist.ts';
import { registrarStatus } from '../manifest.ts';
import { agoraBrasilia, gravarJson, lerJson } from '../saida.ts';

type OpcoesBackfill = {
  config: Config;
  dataDir: string;
  entradas: NodeJS.ReadableStream[];
  agora: Date;
};

export type ResultadoBackfill = { pregoes: Record<string, number>; descartados: number };

export async function executarBackfill(opcoes: OpcoesBackfill): Promise<ResultadoBackfill> {
  const { config, dataDir, entradas, agora } = opcoes;
  const tickers = new Set(config.watchlist.map((a) => a.ticker));
  const novosPorTicker = new Map<string, Candle[]>();
  let descartados = 0;

  for (const entrada of entradas) {
    for await (const registro of lerCotahist(entrada, tickers)) {
      const candle = registroParaCandle(registro);
      if (!candleValido(candle)) {
        descartados++;
        console.warn('dado sujo', registro.ticker, registro.d);
        continue;
      }
      const lista = novosPorTicker.get(registro.ticker) ?? [];
      lista.push(candle);
      novosPorTicker.set(registro.ticker, lista);
    }
  }

  const pregoes: Record<string, number> = {};
  const arquivos: Record<string, Status> = {};
  const gerado_em = agoraBrasilia(agora);

  for (const { ticker } of config.watchlist) {
    const caminho = CAMINHOS.historico(ticker);
    const novos = novosPorTicker.get(ticker);
    if (!novos || novos.length === 0) {
      arquivos[caminho] = { gerado_em, status: 'erro', erro: 'sem registros no COTAHIST' };
      continue;
    }
    const base = (await lerJson<Candle[]>(dataDir, caminho))?.dados ?? [];
    const serie = mesclarSerie(base, novos);
    await gravarJson(dataDir, caminho, {
      gerado_em,
      fonte: 'B3 COTAHIST',
      atraso_aprox_min: 0,
      dados: serie,
    });
    pregoes[ticker] = serie.length;
    arquivos[caminho] = { gerado_em, status: 'ok' };
  }

  await registrarStatus(dataDir, { arquivos }, agora);
  return { pregoes, descartados };
}
