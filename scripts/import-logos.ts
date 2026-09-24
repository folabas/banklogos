/**
 * Imports approved logos from one or more manifests into logos/<scope>/<id>/.
 *
 *   npm run import -- <manifest.json> [more.json ...] [--dry-run]
 *
 * Each entry names its institution by bank code (default snapshot "ng-banks") or by registry id (with
 * "snapshot": "ng-cbn"); scope, category and default types come from that snapshot. SVGs are optimized and
 * linted, rasters are converted to PNG and resized, and existing entity folders are never overwritten.
 * Entries with "sameBrandAs" add their bank code to that brand instead of creating a new entity.
 * Failures are written to import-report.json. Run `npm run validate && npm run preview` after.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { License, LogoEntity, LogoFormat, LogoType, LogoVariant } from '../packages/core/src/types.js';
import type { SourceEntry, SourceSnapshot } from '../sources/types.js';
import { writeJson } from './lib/json.js';
import { LOGOS_DIR, readLogoFolders, ROOT } from './lib/logos.js';
import { optimizeSvg } from './lib/optimize.js';
import { lintPng } from './lib/png-lint.js';
import { toShippablePng } from './lib/raster.js';
import { lintSvg } from './lib/svg-lint.js';

interface FileRef {
  url: string;
  format?: LogoFormat;
  license: License;
  /** Page to cite as the source when it differs from the file URL (e.g. an app store listing). */
  sourceUrl?: string;
  /** When set, `url` is an HTML page and the logo is its n-th (0-based) inline <svg> element. */
  inlineIndex?: number;
}

export interface ManifestEntry {
  id: string;
  name: string;
  /** Snapshot the key refers to; defaults to "ng-banks". */
  snapshot?: string;
  bankCode?: string;
  registryId?: string;
  shortName?: string;
  aliases?: string[];
  markets?: string[];
  website?: string;
  colors?: LogoEntity['colors'];
  types?: LogoType[];
  extraBankCodes?: string[];
  logo: FileRef | null;
  mark?: FileRef | null;
  /** Same brand as another entity (its id or bank code): only the bank code is added there. */
  sameBrandAs?: string | null;
  notes?: string;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const manifestPaths = args.filter((a) => !a.startsWith('--'));
if (!manifestPaths.length) {
  console.error('usage: npm run import -- <manifest.json> [more.json ...] [--dry-run]');
  process.exit(1);
}

const manifest: ManifestEntry[] = manifestPaths.flatMap((p) => JSON.parse(readFileSync(p, 'utf8')));
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

function sourceEntry(entry: ManifestEntry): { snap: SourceSnapshot; source: SourceEntry } {
  const snap = snapshot(entry.snapshot ?? 'ng-banks');
  const key = snap.matchBy === 'bankCode' ? entry.bankCode : entry.registryId;
  const source = snap.entries.find((e) => (snap.matchBy === 'bankCode' ? e.bankCode : e.registryId) === key);
  if (!source) throw new Error(`${snap.matchBy} ${key} is not in the ${entry.snapshot ?? 'ng-banks'} snapshot`);
  return { snap, source };
}

async function download(url: string): Promise<Uint8Array> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      // Some bank sites serve an incomplete certificate chain. Node won't fetch the missing intermediate,
      // but the system curl (Windows schannel/macOS) does, and still verifies the certificate.
      const code = (err as { cause?: { code?: string } }).cause?.code ?? '';
      if (/CERT|SIGNATURE|ISSUER/.test(code)) {
        return new Uint8Array(execFileSync('curl', ['-sSL', '--fail', '-m', '60', '-A', UA, url], { maxBuffer: 50e6 }));
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
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

/** Downloads and prepares one variant; returns the format and bytes to write. */
async function prepare(ref: FileRef, variant: LogoVariant): Promise<{ format: LogoFormat; bytes: Uint8Array }> {
  const raw = await download(ref.url);
  const head = new TextDecoder().decode(raw.subarray(0, 2048));
  const looksSvg = /<svg[\s>]/i.test(head) && !/^\s*(<!doctype html|<html)/i.test(head);
  if (ref.inlineIndex !== undefined || ref.format === 'svg' || (ref.format === undefined && looksSvg)) {
    const full = new TextDecoder().decode(raw);
    if (ref.inlineIndex === undefined && !looksSvg) throw new Error(`${variant}: expected SVG, got something else`);
    const svg = ref.inlineIndex !== undefined ? extractInlineSvg(full, ref.inlineIndex) : full;
    const optimized = optimizeSvg(svg);
    const problems = lintSvg(optimized);
    if (problems.length) throw new Error(`${variant}.svg ${problems.join('; ')}`);
    return { format: 'svg', bytes: new TextEncoder().encode(optimized) };
  }
  const png = await toShippablePng(raw, variant).catch((err: Error) => {
    throw new Error(`${variant}: not a readable image (${err.message})`);
  });
  const problems = lintPng(png);
  if (problems.length) throw new Error(`${variant}.png ${problems.join('; ')}`);
  return { format: 'png', bytes: png };
}

const imported: string[] = [];
const merged: string[] = [];
const failures: { id: string; bankCode?: string; name: string; reason: string }[] = [];
const newEntities = new Map<string, { dir: string; meta: LogoEntity }>();

// Pass 1: new entities.
for (const entry of manifest.filter((e) => !e.sameBrandAs)) {
  try {
    if (!entry.logo) throw new Error(`no logo found${entry.notes ? `: ${entry.notes}` : ''}`);
    const { snap, source } = sourceEntry(entry);
    const dir = join(LOGOS_DIR, snap.scope.toLowerCase(), entry.id);
    if (existsSync(dir) || newEntities.has(entry.id)) throw new Error(`entity "${entry.id}" already exists`);

    const files: Partial<Record<LogoVariant, { format: LogoFormat; bytes: Uint8Array }>> = {
      logo: await prepare(entry.logo, 'logo'),
    };
    if (entry.mark) {
      try {
        files.mark = await prepare(entry.mark, 'mark');
      } catch (err) {
        console.warn(`warn  ${entry.id}: mark skipped (${(err as Error).message})`);
      }
    }

    const ref = (f: FileRef) => ({ url: f.sourceUrl ?? f.url, license: f.license, fetchedAt: today });
    const variants = Object.keys(files) as LogoVariant[];
    const formats = Object.fromEntries(
      variants.filter((v) => files[v]!.format !== 'svg').map((v) => [v, files[v]!.format]),
    );
    const aliases = new Set(entry.aliases ?? []);
    if (source.legalName !== entry.name) aliases.add(source.legalName);
    const meta: LogoEntity = {
      id: entry.id,
      name: entry.name,
      ...(entry.shortName && entry.shortName !== entry.name && { shortName: entry.shortName }),
      aliases: [...aliases].filter((a) => a !== entry.name),
      scope: snap.scope,
      markets: entry.markets ?? [snap.scope],
      types: entry.types?.length ? entry.types : source.types,
      variants,
      ...(Object.keys(formats).length && { formats }),
      ...(entry.colors && { colors: entry.colors }),
      ...(entry.website && { website: entry.website }),
      ...(snap.matchBy === 'bankCode'
        ? { bankCodes: [source.bankCode!, ...(entry.extraBankCodes ?? [])] }
        : { regulatorRef: { body: snap.regulator, category: source.category, registryId: source.registryId } }),
      source: ref(entry.logo),
      ...(files.mark &&
        entry.mark &&
        ref(entry.mark).url !== ref(entry.logo).url && { variantSources: { mark: ref(entry.mark) } }),
      verified: false,
      addedIn,
    };

    if (!dryRun) {
      mkdirSync(dir, { recursive: true });
      for (const v of variants) writeFileSync(join(dir, `${v}.${files[v]!.format}`), files[v]!.bytes);
      await writeJson(join(dir, 'meta.json'), meta);
    }
    newEntities.set(entry.id, { dir, meta });
    imported.push(entry.id);
    const desc = variants.map((v) => `${v}.${files[v]!.format}`).join(' + ');
    console.log(`${dryRun ? 'would import' : 'imported'} ${entry.id}: ${desc}`);
  } catch (err) {
    failures.push({ id: entry.id, bankCode: entry.bankCode, name: entry.name, reason: (err as Error).message });
  }
}

// Pass 2: extra bank codes for brands that already exist (on disk or just imported).
const existing = readLogoFolders()
  .filter((f) => !(f.meta instanceof Error))
  .map((f) => ({ dir: f.dir, meta: f.meta as LogoEntity }));
for (const e of newEntities.values()) if (!existing.some((x) => x.meta.id === e.meta.id)) existing.push(e);

for (const entry of manifest.filter((e) => e.sameBrandAs)) {
  const target = existing.find(
    (x) => x.meta.id === entry.sameBrandAs || x.meta.bankCodes?.includes(String(entry.sameBrandAs)),
  );
  if (!target || !entry.bankCode) {
    const reason = `sameBrandAs "${entry.sameBrandAs}" not found`;
    failures.push({ id: entry.id, bankCode: entry.bankCode, name: entry.name, reason });
    continue;
  }
  const codes = target.meta.bankCodes ?? [];
  if (!codes.includes(entry.bankCode)) {
    target.meta.bankCodes = [...codes, entry.bankCode];
    if (!dryRun) await writeJson(join(target.dir, 'meta.json'), target.meta);
  }
  merged.push(`${entry.bankCode} -> ${target.meta.id}`);
}

for (const m of merged) console.log(`${dryRun ? 'would add code' : 'added code'} ${m}`);
for (const f of failures) console.error(`failed ${f.id} (${f.bankCode ?? '-'}): ${f.reason}`);
if (!dryRun) writeFileSync(join(ROOT, 'import-report.json'), JSON.stringify({ imported, merged, failures }, null, 2));
console.log(
  `\n${imported.length} ${dryRun ? 'would be imported' : 'imported'}, ${merged.length} codes merged, ${failures.length} failed.`,
);
