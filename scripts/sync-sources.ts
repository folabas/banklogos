/**
 * Fetches each country's source list (sources/*.ts), saves it to sources/snapshots/<scope>.json
 * and reports institutions added, removed or renamed since the last saved snapshot.
 * `--check` fetches and diffs without writing.
 */
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SOURCES } from '../sources/index.js';
import type { SourceSnapshot } from '../sources/types.js';
import { ROOT } from './lib/logos.js';
import { diffSnapshots } from './lib/match.js';

const SNAPSHOT_DIR = join(ROOT, 'sources/snapshots');
const check = process.argv.includes('--check');
let changes = 0;

for (const source of SOURCES) {
  const path = join(SNAPSHOT_DIR, `${source.name}.json`);
  const before: SourceSnapshot | undefined = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
  const after = await source.fetch();
  const { added, removed, renamed } = diffSnapshots(before, after);

  console.log(`${source.name} (${source.regulator}): ${after.entries.length} institutions`);
  for (const [category, total] of Object.entries(after.totals)) console.log(`  ${category}: ${total} listed`);
  for (const e of added) console.log(`  + ${e.legalName} [${e.category}, id ${e.registryId}]`);
  for (const e of removed) console.log(`  - ${e.legalName} [${e.category}, id ${e.registryId}]`);
  for (const r of renamed) console.log(`  ~ ${r.from} -> ${r.to} [id ${r.registryId}]`);
  changes += added.length + removed.length + renamed.length;

  if (!check) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    // Keep the old date when nothing changed, so the file only shows up in git diffs on real changes.
    const unchanged = before && !added.length && !removed.length && !renamed.length;
    const toWrite = unchanged ? { ...after, fetchedAt: before.fetchedAt } : after;
    writeFileSync(path, JSON.stringify(toWrite, null, 2) + '\n');
  }
}

console.log(changes ? `\n${changes} change(s).` : '\nNo changes.');
