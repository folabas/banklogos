/**
 * Runs after tsup. For every shipped file in packages/core/assets/ writes dist/generated/img/<name>:
 *
 *   <name>.js   ESM, for bundlers: imports the file, so Vite, webpack, Next.js, Parcel, etc. emit it and hand
 *               back its URL (in dev mode too). Next.js returns an object for image imports; `.src` is taken.
 *   <name>.cjs  CommonJS, for plain Node: the file:// URL of the file inside the installed package.
 *   .d.ts / .d.cts declarations (default export: string)
 *
 * It also writes declarations for the tsup-built svg/<name> modules.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/logos.js';

const CORE = join(ROOT, 'packages/core');
const ASSETS = join(CORE, 'assets');
const IMG = join(CORE, 'dist/generated/img');
const SVG = join(CORE, 'dist/generated/svg');
const DECL = 'declare const value: string;\nexport default value;\n';

mkdirSync(IMG, { recursive: true });
let images = 0;
for (const file of readdirSync(ASSETS)) {
  const name = file.replace(/\.(svg|webp|png)$/, '');
  const rel = JSON.stringify(`../../../assets/${file}`);
  writeFileSync(
    join(IMG, `${name}.js`),
    `import asset from ${rel};\nconst value = typeof asset === 'string' ? asset : asset.src;\nexport default value;\n`,
  );
  writeFileSync(
    join(IMG, `${name}.cjs`),
    `'use strict';\nconst { pathToFileURL } = require('node:url');\nconst { join } = require('node:path');\n` +
      `module.exports = pathToFileURL(join(__dirname, ${rel})).href;\n`,
  );
  writeFileSync(join(IMG, `${name}.d.ts`), DECL);
  writeFileSync(join(IMG, `${name}.d.cts`), 'declare const value: string;\nexport = value;\n');
  images++;
}

let svgs = 0;
if (existsSync(SVG)) {
  for (const file of readdirSync(SVG)) {
    const match = file.match(/^(.*)\.(js|cjs)$/);
    if (!match) continue;
    writeFileSync(join(SVG, `${match[1]}.${match[2] === 'js' ? 'd.ts' : 'd.cts'}`), DECL);
    svgs++;
  }
}
console.log(`image modules: ${images} img, ${svgs} svg declarations`);
