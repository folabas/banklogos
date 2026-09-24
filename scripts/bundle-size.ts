/**
 * Bundles typical consumer imports of the built package (like a production Vite/webpack build:
 * ESM, minified, tree-shaken) and checks them against size budgets. Run `npm run build` first.
 * `--json` prints machine-readable results.
 */
import { build } from 'esbuild';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { ROOT } from './lib/logos.js';

interface Scenario {
  name: string;
  code: string;
  /** Max gzipped bytes. */
  budget?: number;
}

const KB = 1024;
const scenarios: Scenario[] = [
  { name: 'one logo SVG', code: `import svg from 'fintech-logos/svg/gtbank'; console.log(svg);`, budget: 5 * KB },
  {
    name: 'one logo as <img> URL',
    code: `import src from 'fintech-logos/img/gtbank'; console.log(src);`,
    budget: 5 * KB,
  },
  { name: 'one mark SVG', code: `import svg from 'fintech-logos/svg/usdt-mark'; console.log(svg);`, budget: 5 * KB },
  {
    name: 'two logo SVGs',
    code: `import a from 'fintech-logos/svg/gtbank'; import b from 'fintech-logos/svg/opay'; console.log(a, b);`,
  },
  {
    name: 'getLogo (metadata registry)',
    code: `import { getLogo } from 'fintech-logos'; console.log(getLogo('gtbank'));`,
    // Tripwire: the whole registry ships with getLogo (~460 B minified per entity). Past this,
    // split the registry into per-country entry points (e.g. fintech-logos/ng).
    budget: 25 * KB,
  },
  {
    name: 'getLogo + one logo SVG',
    code: `import { getLogo } from 'fintech-logos'; import svg from 'fintech-logos/svg/gtbank'; console.log(getLogo('gtbank'), svg);`,
  },
  {
    name: 'createIndex only (no registry)',
    code: `import { createIndex } from 'fintech-logos'; console.log(createIndex([]));`,
  },
];

if (!existsSync(join(ROOT, 'packages/core/dist/index.js'))) {
  console.error('packages/core/dist not found. Run `npm run build` first.');
  process.exit(1);
}

const results = [];
for (const s of scenarios) {
  const out = await build({
    stdin: { contents: s.code, resolveDir: ROOT, loader: 'js' },
    bundle: true,
    minify: true,
    treeShaking: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
    // img/<id> modules import the image file itself; count it as an emitted file, not as JS.
    loader: { '.svg': 'file', '.webp': 'file', '.png': 'file' },
    outdir: join(ROOT, '.cache/size'),
  });
  const bytes = out.outputFiles.find((f) => f.path.endsWith('.js'))!.contents;
  results.push({ ...s, raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length });
}

if (process.argv.includes('--json')) {
  console.log(
    JSON.stringify(
      results.map(({ code: _code, ...r }) => r),
      null,
      2,
    ),
  );
} else {
  const fmt = (n: number) => `${(n / KB).toFixed(2)} KB`;
  console.log(`${'scenario'.padEnd(32)}${'minified'.padStart(12)}${'gzip'.padStart(12)}   budget (gzip)`);
  for (const r of results) {
    const status =
      r.budget === undefined ? '' : r.gzip <= r.budget ? `ok  ≤ ${fmt(r.budget)}` : `OVER ${fmt(r.budget)}`;
    console.log(`${r.name.padEnd(32)}${fmt(r.raw).padStart(12)}${fmt(r.gzip).padStart(12)}   ${status}`);
  }
}

const over = results.filter((r) => r.budget !== undefined && r.gzip > r.budget);
if (over.length) {
  console.error(`\n${over.length} scenario(s) over budget.`);
  process.exit(1);
}
