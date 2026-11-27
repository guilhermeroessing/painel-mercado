import type { Manifest, Status } from '../contratos/dados.ts';
import { CAMINHOS } from '../contratos/dados.ts';
import { agoraBrasilia, gravarJson, lerJson } from './saida.ts';

type Mudancas = { arquivos?: Record<string, Status>; tickers?: Record<string, Status> };

// Junta as mudanças ao manifest atual; chaves que a execução não toca ficam como estavam.
export async function registrarStatus(
  dataDir: string,
  mudancas: Mudancas,
  agora: Date,
): Promise<void> {
  const atual = (await lerJson<Manifest>(dataDir, CAMINHOS.manifest))?.dados ?? {
    arquivos: {},
    tickers: {},
  };
  const manifest: Manifest = {
    arquivos: { ...atual.arquivos, ...mudancas.arquivos },
    tickers: { ...atual.tickers, ...mudancas.tickers },
  };
  await gravarJson(dataDir, CAMINHOS.manifest, {
    gerado_em: agoraBrasilia(agora),
    fonte: 'pipeline',
    atraso_aprox_min: 0,
    dados: manifest,
  });
}
