// Roda os testes do pipeline com node:test; sem arquivos de teste, sai com 0.
import { existsSync, globSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const arquivos = existsSync('pipeline/tests') ? globSync('pipeline/tests/**/*.test.ts') : [];
if (arquivos.length === 0) {
  console.log('Pipeline: nenhum teste encontrado.');
  process.exit(0);
}
const r = spawnSync(
  process.execPath,
  ['--import', 'tsx', '--test', '--test-concurrency=2', ...arquivos],
  { stdio: 'inherit' },
);
process.exit(r.status ?? 1);
