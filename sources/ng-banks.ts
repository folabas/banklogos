/**
 * Nigeria: every institution a Nigerian bank account can be paid into, with its bank code.
 * This is the list apps show in "choose your bank" screens, so it is the coverage target for NG.
 * Data: Paystack's public bank list (https://api.paystack.co/bank?country=nigeria), which mirrors the
 * NIBSS/CBN institution codes. The CBN register (ng.ts) adds licence categories on top.
 */
import type { LogoType } from '../packages/core/src/types.js';
import { cleanName } from './ng.js';
import type { SourceEntry, SourceList, SourceSnapshot } from './types.js';

const URL = 'https://api.paystack.co/bank?country=nigeria&perPage=500';

export interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  active: boolean;
  is_deleted: boolean | null;
  type: string;
}

// Entries that are payment rails, duplicates of another entry, or no longer licensed.
const SKIP: Record<string, string> = {
  'titan-paystack': 'Paystack settlement account at Titan Trust, not a consumer bank',
  'kanopoly-mfb-ng': 'Kano Poly MFB: CBN licence revoked July 2026',
};

function categorize(name: string): { category: string; types: LogoType[] } {
  if (/\b(mfb|micro-?finance|microfinanace|mircofinance)\b/i.test(name)) {
    return { category: 'microfinance-bank', types: ['microfinance-bank'] };
  }
  if (/\b(mortgage|mortage|savings and loans|homes)\b/i.test(name))
    return { category: 'mortgage-bank', types: ['bank'] };
  if (/\b(psb|payment service bank)\b/i.test(name))
    return { category: 'payment-service-bank', types: ['mobile-money'] };
  if (/\bfinance (company|limited|ltd)\b|\bfinance$/i.test(name))
    return { category: 'finance-company', types: ['bank'] };
  return { category: 'bank', types: ['bank'] };
}

export function buildSnapshot(banks: PaystackBank[], fetchedAt: string): SourceSnapshot {
  const entries: SourceEntry[] = [];
  const seenCodes = new Set<string>();
  const totals: Record<string, number> = {};
  for (const b of banks) {
    if (!b.active || b.is_deleted || b.type !== 'nuban' || b.slug in SKIP) continue;
    const code = b.code.trim();
    // The same bank sometimes appears twice with one code (e.g. Zenith 057); keep the first.
    if (seenCodes.has(code)) continue;
    seenCodes.add(code);
    const { category, types } = categorize(b.name);
    totals[category] = (totals[category] ?? 0) + 1;
    entries.push({ registryId: code, bankCode: code, legalName: cleanName(b.name), category, types });
  }
  entries.sort((a, b) => a.legalName.localeCompare(b.legalName));
  return { scope: 'NG', regulator: 'Paystack', matchBy: 'bankCode', fetchedAt, totals, entries };
}

export const ngBanks: SourceList = {
  name: 'ng-banks',
  scope: 'NG',
  regulator: 'Paystack',
  async fetch() {
    const res = await fetch(URL, {
      headers: { 'User-Agent': 'banklogos source sync', Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Paystack bank list: HTTP ${res.status}`);
    const body = (await res.json()) as { status?: boolean; data?: unknown };
    if (!body.status || !Array.isArray(body.data)) throw new Error('Paystack bank list: unexpected response shape');
    const snapshot = buildSnapshot(body.data as PaystackBank[], new Date().toISOString().slice(0, 10));
    if (snapshot.entries.length < 100) {
      throw new Error(`Paystack returned only ${snapshot.entries.length} banks; refusing to use it`);
    }
    return snapshot;
  },
};
