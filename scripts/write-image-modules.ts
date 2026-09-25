/**
 * Runs after tsup. For every shipped image in packages/core/assets/ writes:
 *
 *   dist/generated/img/<name>.js   ESM, for bundlers: imports the file, so Vite, webpack, Next.js, Parcel, etc. emit
 *                                  it and hand back its URL (in dev mode too). Next.js returns an object for image
 *                                  imports, so `.src` is taken; React Native returns an asset id, passed through.
 *   dist/generated/img/<name>.cjs  CommonJS, for plain Node: the file:// URL of the file inside the installed package.
 *   native/<name>.js               React Native: `require()` of a PNG/WebP (never SVG), which Metro turns into an
 *                                  image source for <Image source={...}>. Lives at the package root so it resolves
 *                                  with or without package "exports" support.
 *   .d.ts / .d.cts declarations for all of them, and for the tsup-built svg/<name> modules.
 */
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/logos.js';

const CORE = join(ROOT, 'packages/core');
const ASSETS = join(CORE, 'assets');
const NATIVE_ASSETS = join(ASSETS, 'native');
const IMG = join(CORE, 'dist/generated/img');
const SVG = join(CORE, 'dist/generated/svg');
const NATIVE = join(CORE, 'native');
const DECL = 'declare const value: string;\nexport default value;\n';

mkdirSync(IMG, { recursive: true });
rmSync(NATIVE, { recursive: true, force: true });
mkdirSync(NATIVE, { recursive: true });

const shipped = readdirSync(ASSETS, { withFileTypes: true })
  .filter((d) => d.isFile() && /\.(svg|webp)$/.test(d.name))
  .map((d) => d.name);

let images = 0;
for (const file of shipped) {
  const name = file.replace(/\.(svg|webp)$/, '');
  const rel = JSON.stringify(`../../../assets/${file}`);
  writeFileSync(
    join(IMG, `${name}.js`),
    `import asset from ${rel};\n` +
      `const value = asset && typeof asset === 'object' && 'src' in asset ? asset.src : asset;\n` +
      `export default value;\n`,
  );
  writeFileSync(
    join(IMG, `${name}.cjs`),
    `'use strict';\nconst { pathToFileURL } = require('node:url');\nconst { join } = require('node:path');\n` +
      `module.exports = pathToFileURL(join(__dirname, ${rel})).href;\n`,
  );
  writeFileSync(join(IMG, `${name}.d.ts`), DECL);
  writeFileSync(join(IMG, `${name}.d.cts`), 'declare const value: string;\nexport = value;\n');

  // React Native can't draw SVG in <Image>, so SVG logos point at their PNG rendering.
  const nativeFile = file.endsWith('.svg') ? `native/${name}.png` : file;
  if (!existsSync(join(ASSETS, nativeFile))) throw new Error(`missing ${nativeFile} for native/${name}`);
  writeFileSync(
    join(NATIVE, `${name}.js`),
    `module.exports = require(${JSON.stringify(`../assets/${nativeFile}`)});\n`,
  );
  writeFileSync(
    join(NATIVE, `${name}.d.ts`),
    '/** Image source for React Native <Image source={...}> (a Metro asset id). */\n' +
      'declare const source: number;\nexport default source;\n',
  );
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
console.log(`image modules: ${images} img + ${images} native, ${svgs} svg declarations`);
