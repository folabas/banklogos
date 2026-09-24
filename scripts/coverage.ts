/**
 * Compares the saved source snapshots against logos/ and lists which licensed institutions
 * have a logo, which need their registryId added, and which are still wanted.
 * `--markdown` prints a table suitable for an issue or the plan doc.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SourceSnapshot } from '../sources/types.js';
import { readLogoFolders, ROOT } from './lib/logos.js';
import { matchCoverage } from './lib/match.js';
import { validateFolders } from './lib/validate.js';

const SNAPSHOT_DIR = join(ROOT, 'sources/snapshots');
const markdown = process.argv.includes('--markdown');
const { entities } = validateFolders(readLogoFolders());

for (const file of readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith('.json'))) {
  const snapshot: SourceSnapshot = JSON.parse(readFileSync(join(SNAPSHOT_DIR, file), 'utf8'));
  const { covered, nameOnly, missing, stale } = matchCoverage(snapshot, entities);
  const total = snapshot.entries.length;
  const pct = total ? Math.round((covered.length / total) * 100) : 0;

  if (markdown) {
    console.log(`### ${snapshot.scope}: ${covered.length} of ${total} covered (${pct}%)\n`);
    console.log('| Institution | Category | CBN id | Status |\n| --- | --- | --- | --- |');
    const rows = [
      ...covered.map((c) => ({ e: c.entry, s: `logo: \`${c.entity.id}\`` })),
      ...nameOnly.map((c) => ({ e: c.entry, s: `logo \`${c.entity.id}\`, needs registryId` })),
      ...missing.map((e) => ({ e, s: 'wanted' })),
    ].sort((a, b) => a.e.category.localeCompare(b.e.category) || a.e.legalName.localeCompare(b.e.legalName));
    for (const { e, s } of rows) console.log(`| ${e.legalName} | ${e.category} | ${e.registryId} | ${s} |`);
    continue;
  }

  console.log(
    `${snapshot.scope} (${file.replace('.json', '')}, ${snapshot.regulator}, snapshot ${snapshot.fetchedAt}): ${covered.length}/${total} covered (${pct}%)`,
  );
  for (const { entry, entity } of covered) console.log(`  ✓ ${entry.legalName} -> ${entity.id}`);
  for (const { entry, entity } of nameOnly) {
    const fix =
      snapshot.matchBy === 'bankCode'
        ? `add "${entry.bankCode}" to bankCodes`
        : `add "registryId": "${entry.registryId}" to its regulatorRef`;
    console.log(`  ~ ${entry.legalName} -> ${entity.id}: ${fix}`);
  }
  for (const entity of stale) console.log(`  ! ${entity.id}: its ${snapshot.matchBy} is no longer listed`);

  const byCategory = new Map<string, string[]>();
  for (const e of missing) byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), e.legalName]);
  for (const [category, names] of byCategory) {
    console.log(`\n  wanted: ${category} (${names.length})`);
    for (const n of names) console.log(`    - ${n}`);
  }
}
