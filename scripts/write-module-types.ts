/** Writes a .d.ts / .d.cts next to every built image module (default export: string). Runs after tsup. */
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/logos.js';

const DECL = 'declare const value: string;\nexport default value;\n';
let count = 0;
for (const kind of ['svg', 'img']) {
  const dir = join(ROOT, 'packages/core/dist/generated', kind);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir)) {
    const match = file.match(/^(.*)\.(js|cjs)$/);
    if (!match) continue;
    writeFileSync(join(dir, `${match[1]}.${match[2] === 'js' ? 'd.ts' : 'd.cts'}`), DECL);
    count++;
  }
}
console.log(`module types: ${count} declarations`);
