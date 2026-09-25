/**
 * Replaces or removes one variant of existing entities, keeping the rest of their metadata.
 *
 *   npm run replace-logo -- <replacements.json> [--dry-run]
 *
 * Each entry: { "id", "variant": "logo" | "mark", "ref": FileRef | null, "reason" }. A null ref removes the
 * mark. "useMarkAsLogo": true promotes the existing mark to the logo instead of downloading anything.
 * Files are prepared exactly like `npm run import` (optimized/linted SVG or shippable PNG).
 */
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatOf, type LogoEntity, type LogoFormat, type LogoVariant } from '../packages/core/src/types.js';
import { prepare, type FileRef } from './lib/fetch-image.js';
import { writeJson } from './lib/json.js';
import { LOGOS_DIR } from './lib/logos.js';

interface Replacement {
  id: string;
  variant: LogoVariant;
  ref?: FileRef | null;
  useMarkAsLogo?: boolean;
  reason: string;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const file = args.find((a) => !a.startsWith('--'));
if (!file) {
  console.error('usage: npm run replace-logo -- <replacements.json> [--dry-run]');
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 10);
const replacements: Replacement[] = JSON.parse(readFileSync(file, 'utf8'));
let done = 0;
const failures: string[] = [];

for (const r of replacements) {
  try {
    const dir = ['ng', 'global'].map((s) => join(LOGOS_DIR, s, r.id)).find((d) => existsSync(join(d, 'meta.json')));
    if (!dir) throw new Error('entity not found');
    const meta: LogoEntity = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    const oldFile = (v: LogoVariant) => join(dir, `${v}.${formatOf(meta, v)}`);
    const setFormat = (v: LogoVariant, format: LogoFormat) => {
      const formats = { ...(meta.formats ?? {}) };
      if (format === 'svg') delete formats[v];
      else formats[v] = format;
      if (Object.keys(formats).length) meta.formats = formats;
      else delete meta.formats;
    };

    if (r.useMarkAsLogo) {
      if (!meta.variants.includes('mark')) throw new Error('has no mark to promote');
      const markFormat = formatOf(meta, 'mark');
      const markSource = meta.variantSources?.mark ?? meta.source;
      if (!dryRun) {
        rmSync(oldFile('logo'));
        renameSync(oldFile('mark'), join(dir, `logo.${markFormat}`));
      }
      meta.variants = ['logo'];
      delete meta.formats;
      setFormat('logo', markFormat);
      meta.source = markSource;
      delete meta.variantSources;
    } else if (r.ref === null) {
      if (r.variant !== 'mark') throw new Error('only the mark can be removed');
      if (!dryRun && meta.variants.includes('mark')) rmSync(oldFile('mark'));
      meta.variants = meta.variants.filter((v) => v !== 'mark');
      if (meta.formats) delete meta.formats.mark;
      if (meta.formats && !Object.keys(meta.formats).length) delete meta.formats;
      delete meta.variantSources;
    } else if (r.ref) {
      const { format, bytes } = await prepare(r.ref, r.variant);
      if (!dryRun) {
        if (meta.variants.includes(r.variant) && existsSync(oldFile(r.variant))) rmSync(oldFile(r.variant));
        writeFileSync(join(dir, `${r.variant}.${format}`), bytes);
      }
      if (!meta.variants.includes(r.variant)) meta.variants = [...meta.variants, r.variant];
      setFormat(r.variant, format);
      const source = { url: r.ref.sourceUrl ?? r.ref.url, license: r.ref.license, fetchedAt: today };
      if (r.variant === 'logo') meta.source = source;
      else meta.variantSources = { ...(meta.variantSources ?? {}), mark: source };
      if (meta.variantSources?.mark?.url === meta.source.url) delete meta.variantSources;
    } else {
      throw new Error('needs ref, ref: null or useMarkAsLogo');
    }

    if (!dryRun) await writeJson(join(dir, 'meta.json'), meta);
    done++;
    console.log(
      `${dryRun ? 'would replace' : 'replaced'} ${r.id} ${r.useMarkAsLogo ? 'logo <- mark' : r.variant}: ${r.reason}`,
    );
  } catch (err) {
    failures.push(`${r.id} ${r.variant}: ${(err as Error).message}`);
  }
}

for (const f of failures) console.error(`failed ${f}`);
console.log(`\n${done} done, ${failures.length} failed.`);
if (failures.length) process.exit(1);
