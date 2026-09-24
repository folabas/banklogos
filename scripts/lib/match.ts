import { normalize } from '../../packages/core/src/lookup.js';
import type { LogoEntity } from '../../packages/core/src/types.js';
import type { SourceEntry, SourceSnapshot } from '../../sources/types.js';

// Legal and category words that regulators append but brands drop.
const NOISE = /\b(plc|limited|ltd|nigeria|microfinance bank|mfb|merchant bank|psb|payment service bank)\b\.?/gi;

/** "Guaranty Trust Bank Plc" -> "guarantytrustbank"; "KUDA MFB" -> "kuda". */
export function matchKey(name: string): string {
  return normalize(name.replace(NOISE, ' '));
}

export interface Coverage {
  /** Linked by regulatorRef.registryId. */
  covered: { entry: SourceEntry; entity: LogoEntity }[];
  /** Same name, but not linked yet: add the registryId or bank code to meta.json. */
  nameOnly: { entry: SourceEntry; entity: LogoEntity }[];
  /** No logo yet. */
  missing: SourceEntry[];
  /** Entities that cite this regulator with a registryId the source no longer lists (licence revoked, merged, renamed). */
  stale: LogoEntity[];
}

export function matchCoverage(snapshot: SourceSnapshot, entities: LogoEntity[]): Coverage {
  const inScope = entities.filter((e) => e.scope === snapshot.scope);
  // Link keys: the regulator's id for register snapshots, bank codes for payment-network snapshots.
  const byRegistryId = new Map<string, LogoEntity>();
  for (const e of inScope) {
    if (snapshot.matchBy === 'bankCode') for (const code of e.bankCodes ?? []) byRegistryId.set(code, e);
    else if (e.regulatorRef?.body === snapshot.regulator && e.regulatorRef.registryId) {
      byRegistryId.set(e.regulatorRef.registryId, e);
    }
  }
  const byName = new Map<string, LogoEntity>();
  for (const e of inScope) {
    for (const n of [e.name, e.shortName, ...e.aliases]) if (n) byName.set(matchKey(n), e);
  }

  const result: Coverage = { covered: [], nameOnly: [], missing: [], stale: [] };
  for (const entry of snapshot.entries) {
    const linked = byRegistryId.get(entry.registryId);
    if (linked) {
      result.covered.push({ entry, entity: linked });
      continue;
    }
    const named = byName.get(matchKey(entry.legalName));
    const alreadyLinked = snapshot.matchBy === 'bankCode' ? false : Boolean(named?.regulatorRef?.registryId);
    if (named && !alreadyLinked) result.nameOnly.push({ entry, entity: named });
    else result.missing.push(entry);
  }
  const listed = new Set(snapshot.entries.map((e) => e.registryId));
  result.stale = [...byRegistryId.entries()].filter(([id]) => !listed.has(id)).map(([, e]) => e);
  return result;
}

/** Added and removed entries between two snapshots, keyed by registryId. */
export function diffSnapshots(before: SourceSnapshot | undefined, after: SourceSnapshot) {
  const old = new Map((before?.entries ?? []).map((e) => [e.registryId, e]));
  const now = new Map(after.entries.map((e) => [e.registryId, e]));
  return {
    added: after.entries.filter((e) => !old.has(e.registryId)),
    removed: [...old.values()].filter((e) => !now.has(e.registryId)),
    renamed: after.entries
      .filter((e) => old.has(e.registryId) && old.get(e.registryId)!.legalName !== e.legalName)
      .map((e) => ({ from: old.get(e.registryId)!.legalName, to: e.legalName, registryId: e.registryId })),
  };
}
