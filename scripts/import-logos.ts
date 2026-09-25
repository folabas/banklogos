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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { LogoEntity, LogoFormat, LogoType, LogoVariant } from '../packages/core/src/types.js';
import type { SourceEntry, SourceSnapshot } from '../sources/types.js';
import { prepare, type FileRef } from './lib/fetch-image.js';
import { writeJson } from './lib/json.js';
import { LOGOS_DIR, readLogoFolders, ROOT } from './lib/logos.js';

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

    const files: Partial<Record<LogoVariant, { format: LogoFormat; bytes: Uint8Array }>> = {};
    try {
      files.logo = await prepare(entry.logo, 'logo');
    } catch (err) {
      // A logo that fails the quality checks (oversized SVG, tiny PNG) falls back to the official app icon.
      if (!entry.mark) throw err;
      console.warn(`warn  ${entry.id}: logo rejected (${(err as Error).message}); using the mark as the logo`);
      files.logo = await prepare(entry.mark, 'logo');
      entry.logo = entry.mark;
      entry.mark = null;
    }
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
