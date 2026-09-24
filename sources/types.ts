import type { LogoType } from '../packages/core/src/types.js';

/** One institution from a source list. */
export interface SourceEntry {
  /** The source's own identifier for the institution. Stable across renames. */
  registryId: string;
  /** Name as the source lists it, with whitespace cleaned up. */
  legalName: string;
  /** Category, e.g. "commercial-bank", "microfinance-bank". */
  category: string;
  /** The types an entity from this category gets by default. */
  types: LogoType[];
  /** Bank code used by transfer APIs, when the source provides one. */
  bankCode?: string;
}

/** A saved copy of a source list, committed under sources/snapshots/. */
export interface SourceSnapshot {
  scope: string;
  /** Who publishes the list, e.g. "CBN" or "Paystack". */
  regulator: string;
  /** How entries are linked to logo entities: CBN register id, or bank code. */
  matchBy: 'registryId' | 'bankCode';
  fetchedAt: string;
  /** Total per category before any curation (e.g. all 796 MFBs), for context. */
  totals: Record<string, number>;
  entries: SourceEntry[];
}

/** A canonical list of institutions that should have logos. */
export interface SourceList {
  /** Snapshot file name under sources/snapshots/, e.g. "ng-cbn". */
  name: string;
  scope: string;
  regulator: string;
  fetch(): Promise<SourceSnapshot>;
}
