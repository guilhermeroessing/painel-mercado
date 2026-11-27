import assert from 'node:assert/strict';
import { createReadStream, readFileSync } from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { Candle, Envelope, Manifest } from '../../contratos/dados.ts';
import { candleValido, mesclarSerie } from '../calculo/serie.ts';
import { carregarConfig } from '../config.ts';
import { executarBackfill } from '../tarefas/backfill.ts';

const FIXTURE = new URL('./fixtures/cotahist/COTAHIST_AMOSTRA.TXT', import.meta.url);
const AGORA = new Date('2026-11-27T12:00:00Z');
const linhas = readFileSync(FIXTURE, 'latin1').split('\r\n').filter(Boolean);
const linhaPetr4 = linhas.find((l) => l.slice(12, 24).trim() === 'PETR4');
assert.ok(linhaPetr4, 'fixture sem PETR4');

async function diretorioTemp(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'backfill-'));
}

async function lerEnvelope<T>(dir: string, caminho: string): Promise<Envelope<T>> {
  return JSON.parse(await readFile(join(dir, caminho), 'utf8')) as Envelope<T>;
}

function arquivoComLinhas(dir: string, nome: string, conteudo: string[]): Promise<string> {
  const caminho = join(dir, nome);
  return writeFile(caminho, conteudo.join('\r\n') + '\r\n', 'latin1').then(() => caminho);
}

test('backfill grava a série de PETR4 e marca no manifest', async () => {
  const dir = await diretorioTemp();
  const resultado = await executarBackfill({
    config: carregarConfig(),
    dataDir: dir,
    entradas: [createReadStream(FIXTURE)],
    agora: AGORA,
  });
  assert.equal(resultado.pregoes.PETR4, 1);
  assert.equal(resultado.descartados, 0);

  const serie = await lerEnvelope<Candle[]>(dir, 'historico/PETR4.json');
  assert.equal(serie.fonte, 'B3 COTAHIST');
  assert.equal(serie.atraso_aprox_min, 0);
  assert.deepEqual(serie.dados, [
    { d: '2026-11-25', o: 40.7, h: 41.51, l: 40.41, c: 41.36, c_bruto: 41.36, v: 64227800 },
  ]);

  const manifest = await lerEnvelope<Manifest>(dir, 'manifest.json');
  assert.deepEqual(manifest.dados.arquivos['historico/PETR4.json']?.status, 'ok');
  assert.deepEqual(manifest.dados.arquivos['historico/ZZZZ3.json'], undefined);
});

test('rodar a mesma entrada duas vezes não repete candle', async () => {
  const dir = await diretorioTemp();
  const config = carregarConfig();
  for (let i = 0; i < 2; i++) {
    await executarBackfill({
      config,
      dataDir: dir,
      entradas: [createReadStream(FIXTURE)],
      agora: AGORA,
    });
  }
  const serie = await lerEnvelope<Candle[]>(dir, 'historico/PETR4.json');
  assert.equal(serie.dados.length, 1);
});

test('dois anos em ordem inversa saem em ordem crescente de data', async () => {
  const dir = await diretorioTemp();
  const do2026 = linhaPetr4;
  const do2024 = do2026.slice(0, 2) + '20241230' + do2026.slice(10);
  const arq2026 = await arquivoComLinhas(dir, 'a.txt', [do2026]);
  const arq2024 = await arquivoComLinhas(dir, 'b.txt', [do2024]);
  await executarBackfill({
    config: carregarConfig(),
    dataDir: dir,
    entradas: [createReadStream(arq2026), createReadStream(arq2024)],
    agora: AGORA,
  });
  const serie = await lerEnvelope<Candle[]>(dir, 'historico/PETR4.json');
  assert.deepEqual(
    serie.dados.map((c) => c.d),
    ['2024-12-30', '2026-11-25'],
  );
});

test('candle com preço zero fica de fora e gera aviso de dado sujo', async () => {
  const dir = await diretorioTemp();
  const sujo = linhaPetr4.slice(0, 108) + '0'.repeat(13) + linhaPetr4.slice(121);
  const arq = await arquivoComLinhas(dir, 'sujo.txt', [sujo]);
  const avisos: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    avisos.push(args);
  };
  try {
    const resultado = await executarBackfill({
      config: carregarConfig(),
      dataDir: dir,
      entradas: [createReadStream(arq)],
      agora: AGORA,
    });
    assert.equal(resultado.descartados, 1);
  } finally {
    console.warn = original;
  }
  assert.deepEqual(avisos, [['dado sujo', 'PETR4', '2026-11-25']]);
  const manifest = await lerEnvelope<Manifest>(dir, 'manifest.json');
  assert.equal(manifest.dados.arquivos['historico/PETR4.json']?.status, 'erro');
});

test('ticker sem registro no COTAHIST mantém o histórico antigo', async () => {
  const dir = await diretorioTemp();
  const antigo = {
    gerado_em: '2026-11-01T10:00:00-03:00',
    fonte: 'B3 COTAHIST',
    atraso_aprox_min: 0,
    dados: [{ d: '2026-10-30', o: 1, h: 1, l: 1, c: 1, c_bruto: 1, v: 1 }],
  };
  await writeFile(join(dir, 'antigo.json'), JSON.stringify(antigo));
  await executarBackfill({
    config: carregarConfig(),
    dataDir: dir,
    entradas: [createReadStream(FIXTURE)],
    agora: AGORA,
  });
  const manifest = await lerEnvelope<Manifest>(dir, 'manifest.json');
  assert.equal(manifest.dados.arquivos['historico/ABEV3.json']?.status, 'erro');
});

test('candleValido recusa preço zero, não finito ou volume zero', () => {
  const base = { d: '2026-11-25', o: 1, h: 1, l: 1, c: 1, c_bruto: 1, v: 1 };
  assert.equal(candleValido(base), true);
  assert.equal(candleValido({ ...base, o: 0 }), false);
  assert.equal(candleValido({ ...base, c: Number.NaN }), false);
  assert.equal(candleValido({ ...base, v: 0 }), false);
});

test('mesclarSerie substitui pela data nova e ordena', () => {
  const antigo = { d: '2026-01-02', o: 1, h: 1, l: 1, c: 1, c_bruto: 1, v: 1 };
  const novo = { ...antigo, c: 9, c_bruto: 9 };
  const outro = { ...antigo, d: '2025-12-31' };
  assert.deepEqual(mesclarSerie([antigo, outro], [novo]), [outro, novo]);
});
