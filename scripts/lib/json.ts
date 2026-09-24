import { writeFileSync } from 'node:fs';
import { format } from 'prettier';

/** Writes JSON formatted exactly as `prettier --write` would, so generated files pass `format:check`. */
export async function writeJson(path: string, data: unknown): Promise<void> {
  writeFileSync(path, await format(JSON.stringify(data), { parser: 'json', filepath: path }));
}
