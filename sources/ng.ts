/**
 * Nigeria: institutions licensed by the Central Bank of Nigeria.
 * Data comes from the JSON endpoints behind https://www.cbn.gov.ng/Supervision/Inst-DM.html (and siblings).
 */
import type { LogoType } from '../packages/core/src/types.js';
import type { SourceEntry, SourceList, SourceSnapshot } from './types.js';

const BASE = 'https://www.cbn.gov.ng/api';

interface Category {
  endpoint: string;
  category: string;
  types: LogoType[];
  /** When set, only these CBN ids are kept (the full list is too long to cover). */
  include?: Record<string, string>;
}

export const CATEGORIES: Category[] = [
  { endpoint: 'GetDMBs', category: 'commercial-bank', types: ['bank'] },
  { endpoint: 'GetMBs', category: 'merchant-bank', types: ['bank'] },
  { endpoint: 'GetNIBs', category: 'non-interest-bank', types: ['bank'] },
  { endpoint: 'GetPSBs', category: 'payment-service-bank', types: ['mobile-money'] },
  {
    endpoint: 'GetMFBs',
    category: 'microfinance-bank',
    types: ['microfinance-bank'],
    // Consumer-facing MFBs people pick in "choose your bank" lists. Keyed by CBN id.
    // OPay MFB (9857) is left out: OPay is already listed as a mobile money operator.
    include: {
      '3916': 'Moniepoint',
      '3652': 'Kuda',
      '3463': 'FairMoney',
      '3349': 'Carbon',
      '3921': 'Rubies',
      '4039': 'VFD',
      '3952': 'Sparkle',
      '3663': 'LAPO',
      '3199': 'Accion',
      '3719': 'Mkobo',
      '3906': 'Renmoney',
      '3287': 'Baobab',
    },
  },
];

export interface RawRecord {
  id: number | string;
  name: string | null;
}

/** Trims and collapses whitespace: "Unity  Bank Plc\n" -> "Unity Bank Plc". */
export function cleanName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/** Pure part of the fetch, so it can be tested against saved responses. */
export function buildSnapshot(raw: Record<string, RawRecord[]>, fetchedAt: string): SourceSnapshot {
  const entries: SourceEntry[] = [];
  const totals: Record<string, number> = {};
  for (const cat of CATEGORIES) {
    const records = (raw[cat.endpoint] ?? []).filter((r) => r.name && cleanName(r.name));
    totals[cat.category] = records.length;
    for (const r of records) {
      const registryId = String(r.id);
      if (cat.include && !(registryId in cat.include)) continue;
      entries.push({ registryId, legalName: cleanName(r.name!), category: cat.category, types: cat.types });
    }
  }
  entries.sort((a, b) => a.category.localeCompare(b.category) || a.legalName.localeCompare(b.legalName));
  return { scope: 'NG', regulator: 'CBN', fetchedAt, totals, entries };
}

async function fetchCategory(endpoint: string): Promise<RawRecord[]> {
  const res = await fetch(`${BASE}/${endpoint}?format=json`, {
    headers: { 'User-Agent': 'fintech-logos source sync', Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`CBN ${endpoint}: HTTP ${res.status}`);
  const data: unknown = await res.json();
  if (!Array.isArray(data) || data.some((r) => typeof r !== 'object' || r === null || !('id' in r) || !('name' in r))) {
    throw new Error(`CBN ${endpoint}: unexpected response shape`);
  }
  return data as RawRecord[];
}

export const ng: SourceList = {
  scope: 'NG',
  regulator: 'CBN',
  async fetch() {
    const raw: Record<string, RawRecord[]> = {};
    for (const cat of CATEGORIES) raw[cat.endpoint] = await fetchCategory(cat.endpoint);
    const snapshot = buildSnapshot(raw, new Date().toISOString().slice(0, 10));
    // An empty or tiny list means the endpoint changed, not that the banks vanished.
    if (snapshot.totals['commercial-bank']! < 10) {
      throw new Error(`CBN returned only ${snapshot.totals['commercial-bank']} commercial banks; refusing to use it`);
    }
    return snapshot;
  },
};
