import assert from 'node:assert/strict';
import { createReadStream, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { lerCotahist, lerLinhaCotahist } from '../coleta/cotahist.ts';
import { carregarConfig } from '../config.ts';

const FIXTURE = new URL('./fixtures/cotahist/COTAHIST_AMOSTRA.TXT', import.meta.url);
const linhas = readFileSync(FIXTURE, 'latin1').split('\r\n').filter(Boolean);
function linhaDe(ticker: string): string {
  const linha = linhas.find((l) => l.slice(12, 24).trim() === ticker);
  assert.ok(linha, `fixture sem ${ticker}`);
  return linha;
}

async function ler(tickers: string[]) {
  const saida = [];
  for await (const r of lerCotahist(createReadStream(FIXTURE), new Set(tickers))) saida.push(r);
  return saida;
}

test('lê todos os campos de uma cotação à vista', () => {
  assert.deepEqual(lerLinhaCotahist(linhaDe('PETR4')), {
    ticker: 'PETR4',
    nome: 'PETROBRAS',
    d: '2026-11-25',
    o: 40.7,
    h: 41.51,
    l: 40.41,
    c: 41.36,
    v: 64227800,
    volume_financeiro: 2632900000,
  });
});

test('divide o preço pelo fator de cotação', () => {
  const r = lerLinhaCotahist(linhaDe('VALE3'));
  assert.ok(r);
  assert.equal(r.d, '1995-01-02');
  assert.equal(r.o, 15000 / 1000);
  assert.equal(r.c, 15100 / 1000);
});

test('ignora fracionário e opções', () => {
  assert.equal(lerLinhaCotahist(linhaDe('PETR4F')), null);
  assert.equal(lerLinhaCotahist(linhaDe('PETRA400')), null);
});

test('ignora header e trailer', () => {
  assert.equal(lerLinhaCotahist(linhas[0] ?? ''), null);
  assert.equal(lerLinhaCotahist(linhas.at(-1) ?? ''), null);
});

test('ignora linha curta ou vazia', () => {
  assert.equal(lerLinhaCotahist(''), null);
  assert.equal(lerLinhaCotahist(linhaDe('PETR4').slice(0, 100)), null);
});

test('lerCotahist devolve só tickers da watchlist no mercado à vista', async () => {
  const r = await ler(['PETR4', 'MXRF11', 'PETR4F', 'PETRA400']);
  assert.deepEqual(
    r.map((x) => x.ticker),
    ['PETR4', 'MXRF11'],
  );
});

test('lerCotahist ignora ticker fora da watchlist', async () => {
  const r = await ler(['AXIA3', 'JBSS32', 'BOVA11']);
  assert.deepEqual(
    r.map((x) => x.ticker),
    ['BOVA11', 'AXIA3', 'JBSS32'],
  );
  assert.ok(!r.some((x) => x.ticker === 'ZZZZ3'));
});

test('config real tem 30 ativos: 24 ações, 4 FIIs, 2 ETFs', () => {
  const c = carregarConfig();
  const por = (t: string) => c.watchlist.filter((a) => a.tipo === t).length;
  assert.equal(c.watchlist.length, 30);
  assert.deepEqual([por('acao'), por('fii'), por('etf')], [24, 4, 2]);
  assert.equal(c.cotahist.ano_inicial, 1995);
});
