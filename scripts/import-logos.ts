/**
 * Imports approved logos from a manifest into logos/<scope>/<id>/.
 *
 *   npm run import -- sources/imports/ng-batch-1.json [--dry-run]
 *
 * Each manifest entry names the institution by its registry id; scope, category and types come from
 * the source snapshot, so meta.json stays consistent with sources/. SVGs are linted before anything is
 * written, and existing entity folders are never overwritten. Run `npm run normalize && npm run validate` after.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { License, LogoEntity } from '../packages/core/src/types.js';
import type { SourceSnapshot } from '../sources/types.js';
import { LOGOS_DIR, ROOT } from './lib/logos.js';
import { optimizeSvg } from './lib/optimize.js';
import { lintSvg } from './lib/svg-lint.js';

interface FileRef {
  /** Direct URL of the SVG file. */
  url: string;
  license: License;
  /** Page to cite as the source when it differs from the file URL (e.g. a Commons file page). */
  sourceUrl?: string;
  /** When set, `url` is an HTML page and the logo is its n-th (0-based) inline <svg> element. */
  inlineIndex?: number;
}

export interface ManifestEntry {
  id: string;
  /** Snapshot to take scope/category/types from, e.g. "ng-cbn" or "ng-banks". */
  snapshot: string;
  registryId: string;
  name: string;
  shortName?: string;
  aliases?: string[];
  markets?: string[];
  website?: string;
  colors?: LogoEntity['colors'];
  /** Overrides the types the snapshot category implies (e.g. a wallet listed as a plain bank). */
  types?: LogoEntity['types'];
  /** Extra bank codes for the same brand (e.g. Access Bank's old Diamond code "063"). */
  extraBankCodes?: string[];
  logo: FileRef;
  mark?: FileRef;
}

const args = process.argv.slice(2);
const manifestPath = args.find((a) => !a.startsWith('--'));
const dryRun = args.includes('--dry-run');
if (!manifestPath) {
  console.error('usage: npm run import -- <manifest.json> [--dry-run]');
  process.exit(1);
}

const manifest: ManifestEntry[] = JSON.parse(readFileSync(join(ROOT, manifestPath), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const version: string = JSON.parse(readFileSync(join(ROOT, 'packages/core/package.json'), 'utf8')).version;
const addedIn = version === '0.0.0' ? '0.1.0' : version;
const snapshots = new Map<string, SourceSnapshot>();

function snapshot(name: string): SourceSnapshot {
  if (!snapshots.has(name)) {
    snapshots.set(name, JSON.parse(readFileSync(join(ROOT, 'sources/snapshots', `${name}.json`), 'utf8')));
  }
  return snapshots.get(name)!;
}

async function fetchSvg(ref: FileRef): Promise<string> {
  const res = await fetch(ref.url, { headers: { 'User-Agent': 'fintech-logos-import/0.1' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  if (ref.inlineIndex !== undefined) return extractInlineSvg(text, ref.inlineIndex);
  if (!/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(text)) {
    throw new Error('response is not an SVG file');
  }
  return text;
}

/** Pulls the n-th <svg>…</svg> out of an HTML page and makes it a standalone file. */
export function extractInlineSvg(html: string, index: number): string {
  const found = html.match(/<svg\b[\s\S]*?<\/svg>/gi) ?? [];
  const svg = found[index];
  if (!svg) throw new Error(`page has ${found.length} inline <svg> elements; index ${index} not found`);
  return /\sxmlns=/.test(svg.slice(0, svg.indexOf('>')))
    ? svg
    : svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

let imported = 0;
const failures: string[] = [];

for (const entry of manifest) {
  const label = `${entry.id} (${entry.name})`;
  try {
    const snap = snapshot(entry.snapshot);
    const source = snap.entries.find((e) => e.registryId === entry.registryId);
    if (!source) throw new Error(`registryId ${entry.registryId} is not in the ${entry.snapshot} snapshot`);
    const dir = join(LOGOS_DIR, snap.scope.toLowerCase(), entry.id);
    if (existsSync(dir)) throw new Error(`${dir} already exists`);

    const files: Record<string, string> = { logo: await fetchSvg(entry.logo) };
    if (entry.mark) files.mark = await fetchSvg(entry.mark);
    for (const [variant, svg] of Object.entries(files)) {
      // Lint the optimized file: the size limit applies after SVGO, and raw exports are often bloated.
      files[variant] = optimizeSvg(svg);
      const problems = lintSvg(files[variant]!);
      if (problems.length) throw new Error(`${variant}.svg ${problems.join('; ')}`);
    }

    const ref = (f: FileRef) => ({ url: f.sourceUrl ?? f.url, license: f.license, fetchedAt: today });
    const meta: LogoEntity = {
      id: entry.id,
      name: entry.name,
      ...(entry.shortName && { shortName: entry.shortName }),
      aliases: entry.aliases ?? [],
      scope: snap.scope,
      markets: entry.markets ?? [snap.scope],
      types: entry.types ?? source.types,
      variants: entry.mark ? ['logo', 'mark'] : ['logo'],
      ...(entry.colors && { colors: entry.colors }),
      ...(entry.website && { website: entry.website }),
      ...(snap.matchBy === 'bankCode'
        ? { bankCodes: [source.bankCode!, ...(entry.extraBankCodes ?? [])] }
        : { regulatorRef: { body: snap.regulator, category: source.category, registryId: source.registryId } }),
      source: ref(entry.logo),
      ...(entry.mark && { variantSources: { mark: ref(entry.mark) } }),
      verified: false,
      addedIn,
    };
    // A mark from the same place as the logo needs no separate provenance.
    if (entry.mark && meta.variantSources?.mark?.url === meta.source.url) delete meta.variantSources;

    if (!dryRun) {
      mkdirSync(dir, { recursive: true });
      for (const [variant, svg] of Object.entries(files)) writeFileSync(join(dir, `${variant}.svg`), svg);
      writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2) + '\n');
    }
    imported++;
    console.log(`${dryRun ? 'would import' : 'imported'} ${label}: ${Object.keys(files).join(' + ')}`);
  } catch (err) {
    failures.push(`${label}: ${(err as Error).message}`);
  }
}

for (const f of failures) console.error(`failed ${f}`);
console.log(`\n${imported} ${dryRun ? 'would be imported' : 'imported'}, ${failures.length} failed.`);
if (!dryRun && imported) console.log('Next: npm run normalize && npm run validate && npm run preview');
if (failures.length) process.exit(1);
