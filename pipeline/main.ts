import { createReadStream } from 'node:fs';
import { parseArgs } from 'node:util';
import { carregarConfig } from './config.ts';
import { executarBackfill } from './tarefas/backfill.ts';

const TAREFAS = ['backfill'] as const;

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      tarefa: { type: 'string' },
      arquivo: { type: 'string', multiple: true },
      'data-dir': { type: 'string', default: 'data' },
    },
  });

  if (!values.tarefa || !TAREFAS.includes(values.tarefa as (typeof TAREFAS)[number])) {
    console.error(`tarefa inválida: ${values.tarefa ?? '(vazia)'}. Use: ${TAREFAS.join(', ')}`);
    return 2;
  }

  const entradas = (values.arquivo ?? []).map((arquivo) =>
    arquivo === '-' ? process.stdin : createReadStream(arquivo),
  );
  const resultado = await executarBackfill({
    config: carregarConfig(),
    dataDir: values['data-dir'] ?? 'data',
    entradas,
    agora: new Date(),
  });

  for (const [ticker, total] of Object.entries(resultado.pregoes)) {
    console.log(`${ticker}: ${total} pregões`);
  }
  console.log(`descartados: ${resultado.descartados}`);
  return 0;
}

process.exitCode = await main();
