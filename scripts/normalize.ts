/**
 * Runs every logo SVG through SVGO and writes the result back.
 * `--check` only reports files that would change (used in CI).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { readLogoFolders } from './lib/logos.js';
import { optimizeSvg } from './lib/optimize.js';

const check = process.argv.includes('--check');
let changed = 0;

for (const folder of readLogoFolders()) {
  for (const file of folder.svgFiles) {
    const path = join(folder.dir, file);
    const before = readFileSync(path, 'utf8');
    const after = optimizeSvg(before, path);
    if (after === before) continue;
    changed++;
    if (check) {
      console.error(`not normalized: ${folder.label}/${file}`);
    } else {
      writeFileSync(path, after);
      const saved = Buffer.byteLength(before) - Buffer.byteLength(after);
      console.log(`normalized ${folder.label}/${file} (${saved >= 0 ? '-' : '+'}${Math.abs(saved)} bytes)`);
    }
  }
}

if (check && changed) {
  console.error(`\n${changed} file(s) need normalizing. Run: npm run normalize`);
  process.exit(1);
}
console.log(check ? 'All SVGs normalized.' : `${changed} file(s) normalized.`);
