import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Envelope } from '../contratos/dados.ts';

// Grava em arquivo temporário e troca por rename: a leitura nunca vê JSON pela metade.
export async function gravarJson<T>(
  dataDir: string,
  caminho: string,
  envelope: Envelope<T>,
): Promise<void> {
  const destino = join(dataDir, caminho);
  await mkdir(dirname(destino), { recursive: true });
  const temporario = `${destino}.${process.pid}.tmp`;
  await writeFile(temporario, JSON.stringify(envelope));
  await rename(temporario, destino);
}

export async function lerJson<T>(dataDir: string, caminho: string): Promise<Envelope<T> | null> {
  let texto: string;
  try {
    texto = await readFile(join(dataDir, caminho), 'utf8');
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw erro;
  }
  return JSON.parse(texto) as Envelope<T>;
}

// Brasil não tem horário de verão desde 2019: o offset fixo é -03:00.
export function agoraBrasilia(agora: Date): string {
  const deslocado = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
  return `${deslocado.toISOString().slice(0, 19)}-03:00`;
}
