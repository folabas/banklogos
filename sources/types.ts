import type { LogoType } from '../packages/core/src/types.js';

/** One licensed institution from a regulator's register. */
export interface SourceEntry {
  /** The regulator's own identifier for the institution. Stable across renames. */
  registryId: string;
  /** Name as the regulator lists it, with whitespace cleaned up. */
  legalName: string;
  /** Regulator category, e.g. "commercial-bank", "microfinance-bank". */
  category: string;
  /** The types an entity from this category gets. */
  types: LogoType[];
}

/** A saved copy of a country's source list, committed under sources/snapshots/. */
export interface SourceSnapshot {
  scope: string;
  regulator: string;
  fetchedAt: string;
  /** Total per category before any curation (e.g. all 796 MFBs), for context. */
  totals: Record<string, number>;
  entries: SourceEntry[];
}

/** A country's canonical list of institutions that should have logos. */
export interface SourceList {
  scope: string;
  regulator: string;
  fetch(): Promise<SourceSnapshot>;
}
