import { describe, expect, it } from 'vitest';
import type { LogoEntity } from '../../packages/core/src/types.js';
import { buildSnapshot, cleanName } from '../../sources/ng.js';
import type { SourceSnapshot } from '../../sources/types.js';
import { diffSnapshots, matchCoverage, matchKey } from './match.js';

// Shaped like the real CBN responses: odd casing, stray whitespace, empty names.
const raw = {
  GetDMBs: [
    { id: 8, name: 'Guaranty Trust Bank Plc' },
    { id: 22, name: 'Unity  Bank Plc' },
    { id: 24, name: 'Zenith Bank Plc' },
    { id: 99, name: null },
  ],
  GetMBs: [{ id: 3181, name: 'CORONATION MERCHANT BANK' }],
  GetNIBs: [{ id: 4121, name: 'TAJ ' }],
  GetPSBs: [{ id: 9846, name: 'MOMO PAYMENT SERVICE BANK\n' }],
  GetMFBs: [
    { id: 3916, name: 'Moniepoint MFB' },
    { id: 3652, name: 'KUDA MFB' },
    { id: 10008, name: '1Trust Microfinance Bank Limited' },
  ],
};

function entity(id: string, name: string, extra: Partial<LogoEntity> = {}): LogoEntity {
  return {
    id,
    name,
    aliases: [],
    scope: 'NG',
    markets: ['NG'],
    types: ['bank'],
    variants: ['logo'],
    source: { url: 'https://example.com', license: 'official-site', fetchedAt: '2026-09-24' },
    verified: false,
    addedIn: '0.1.0',
    ...extra,
  };
}

describe('sources/ng buildSnapshot', () => {
  const snap = buildSnapshot(raw, '2026-09-24');

  it('cleans names and drops empty records', () => {
    expect(cleanName('Unity  Bank Plc\n')).toBe('Unity Bank Plc');
    expect(snap.entries.map((e) => e.legalName)).toContain('Unity Bank Plc');
    expect(snap.entries.map((e) => e.legalName)).toContain('TAJ');
    expect(snap.totals['commercial-bank']).toBe(3);
  });

  it('keeps only curated microfinance banks but reports the full total', () => {
    const mfbs = snap.entries.filter((e) => e.category === 'microfinance-bank').map((e) => e.registryId);
    expect(mfbs.sort()).toEqual(['3652', '3916']);
    expect(snap.totals['microfinance-bank']).toBe(3);
  });

  it('maps categories to logo types', () => {
    const psb = snap.entries.find((e) => e.registryId === '9846');
    expect(psb).toMatchObject({ category: 'payment-service-bank', types: ['mobile-money'] });
    expect(snap.entries.find((e) => e.registryId === '3181')?.types).toEqual(['bank']);
  });
});

describe('matchKey', () => {
  it('ignores legal suffixes and category words', () => {
    expect(matchKey('Guaranty Trust Bank Plc')).toBe(matchKey('Guaranty Trust Bank'));
    expect(matchKey('KUDA MFB')).toBe('kuda');
    expect(matchKey('Accion Microfinance Bank Limited')).toBe('accion');
    expect(matchKey('Standard Chartered Bank Nigeria Ltd.')).toBe('standardcharteredbank');
  });
});

describe('matchCoverage', () => {
  const snap = buildSnapshot(raw, '2026-09-24');

  it('links by registryId first, then flags name-only matches, then lists the rest as missing', () => {
    const gtbank = entity('gtbank', 'Guaranty Trust Bank', { regulatorRef: { body: 'CBN', registryId: '8' } });
    const kuda = entity('kuda', 'Kuda', { aliases: ['Kuda MFB'] });
    const { covered, nameOnly, missing } = matchCoverage(snap, [gtbank, kuda]);
    expect(covered.map((c) => c.entity.id)).toEqual(['gtbank']);
    expect(nameOnly.map((c) => [c.entity.id, c.entry.registryId])).toEqual([['kuda', '3652']]);
    expect(missing.map((e) => e.registryId)).not.toContain('8');
    expect(missing.map((e) => e.registryId)).toContain('24');
  });

  it('ignores entities from other scopes and flags registryIds the regulator no longer lists', () => {
    const gh = entity('zenith-bank-gh', 'Zenith Bank', { scope: 'GH', markets: ['GH'] });
    const revoked = entity('heritage-bank', 'Heritage Bank', { regulatorRef: { body: 'CBN', registryId: '9' } });
    const { nameOnly, stale } = matchCoverage(snap, [gh, revoked]);
    expect(nameOnly).toEqual([]);
    expect(stale.map((e) => e.id)).toEqual(['heritage-bank']);
  });
});

describe('diffSnapshots', () => {
  it('reports added, removed and renamed institutions by registryId', () => {
    const before: SourceSnapshot = {
      scope: 'NG',
      regulator: 'CBN',
      fetchedAt: '2026-08-01',
      totals: {},
      entries: [
        { registryId: '9', legalName: 'Heritage Bank Plc', category: 'commercial-bank', types: ['bank'] },
        { registryId: '8', legalName: 'Guaranty Trust Bank Plc', category: 'commercial-bank', types: ['bank'] },
      ],
    };
    const after = { ...before, entries: [{ ...before.entries[1]!, legalName: 'Guaranty Trust Bank Ltd' }] };
    after.entries.push({
      registryId: '9895',
      legalName: 'Tatum Bank Limited',
      category: 'commercial-bank',
      types: ['bank'],
    });
    const d = diffSnapshots(before, after);
    expect(d.added.map((e) => e.registryId)).toEqual(['9895']);
    expect(d.removed.map((e) => e.registryId)).toEqual(['9']);
    expect(d.renamed).toEqual([{ from: 'Guaranty Trust Bank Plc', to: 'Guaranty Trust Bank Ltd', registryId: '8' }]);
  });
});
