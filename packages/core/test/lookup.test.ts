import { describe, expect, it } from 'vitest';
import { createIndex, normalize } from '../src/lookup.js';
import { logoFile, logoUrl } from '../src/urls.js';
import type { LogoEntity } from '../src/types.js';

function entity(overrides: Partial<LogoEntity> & Pick<LogoEntity, 'id' | 'name'>): LogoEntity {
  return {
    aliases: [],
    scope: 'NG',
    markets: ['NG'],
    types: ['bank'],
    variants: ['logo'],
    source: { url: 'https://example.com', license: 'official-site', fetchedAt: '2026-09-24' },
    verified: true,
    addedIn: '0.1.0',
    ...overrides,
  };
}

const gtbank = entity({
  id: 'gtbank',
  name: 'Guaranty Trust Bank',
  shortName: 'GTBank',
  aliases: ['GTB', 'GTCO'],
  bankCodes: ['058'],
});
const accessNg = entity({ id: 'access-bank', name: 'Access Bank', aliases: ['Access'], bankCodes: ['044', '063'] });
const accessGh = entity({ id: 'access-bank-gh', name: 'Access Bank', scope: 'GH', markets: ['GH'] });
const opay = entity({ id: 'opay', name: 'OPay', types: ['mobile-money', 'e-wallet'] });
const visa = entity({
  id: 'visa',
  name: 'Visa',
  scope: 'global',
  markets: ['NG', 'GH', 'KE'],
  types: ['card-network'],
});
const usdt = entity({ id: 'usdt', name: 'Tether', shortName: 'USDT', scope: 'global', markets: [], types: ['crypto'] });

const index = createIndex([gtbank, accessNg, accessGh, opay, visa, usdt]);

describe('normalize', () => {
  it('drops case, spaces and punctuation', () => {
    expect(normalize('Guaranty Trust Bank')).toBe('guarantytrustbank');
    expect(normalize('  G.T.-Bank ')).toBe('gtbank');
  });
});

describe('getLogo', () => {
  it('finds by id', () => {
    expect(index.getLogo('gtbank')).toBe(gtbank);
  });

  it('falls back to name, short name and alias matching when the string is not an id', () => {
    expect(index.getLogo('GTB')).toBe(gtbank);
    expect(index.getLogo('Guaranty Trust Bank')).toBe(gtbank);
    expect(index.getLogo({ name: 'gt bank' })).toBe(gtbank);
    expect(index.getLogo({ name: 'usdt' })).toBe(usdt);
  });

  it('prefers the entity operating in the requested country', () => {
    expect(index.getLogo({ name: 'Access Bank', country: 'GH' })).toBe(accessGh);
    expect(index.getLogo({ name: 'Access Bank', country: 'ng' })).toBe(accessNg);
  });

  it('finds by bank code, including extra codes for the same brand', () => {
    expect(index.getLogo({ bankCode: '058' })).toBe(gtbank);
    expect(index.getLogo({ bankCode: ' 063 ' })).toBe(accessNg);
    expect(index.getLogo({ bankCode: '044', country: 'ng' })).toBe(accessNg);
    expect(index.getLogo({ bankCode: '044', country: 'GH' })).toBeUndefined();
    expect(index.getLogo({ bankCode: '000' })).toBeUndefined();
    expect(index.getLogo({ bankCode: 58 as unknown as string })).toBeUndefined();
  });

  it('returns undefined instead of throwing for unknown or junk input', () => {
    expect(index.getLogo('not-a-bank')).toBeUndefined();
    expect(index.getLogo('')).toBeUndefined();
    expect(index.getLogo({ name: '' })).toBeUndefined();
    expect(index.getLogo(undefined as unknown as string)).toBeUndefined();
    expect(index.getLogo({} as { name: string })).toBeUndefined();
  });
});

describe('searchLogos', () => {
  it('ranks exact, then prefix, then substring matches', () => {
    const ids = index.searchLogos('access').map((e) => e.id);
    expect(ids.slice(0, 1)).toEqual(['access-bank']);
    expect(ids).toContain('access-bank-gh');
    expect(index.searchLogos('trust').map((e) => e.id)).toEqual(['gtbank']);
  });

  it('respects limit and returns [] for empty queries', () => {
    expect(index.searchLogos('a', { limit: 2 })).toHaveLength(2);
    expect(index.searchLogos('   ')).toEqual([]);
  });
});

describe('listByCountry / listByType', () => {
  it('includes global brands that operate in the country', () => {
    const ids = index.listByCountry('NG').map((e) => e.id);
    expect(ids).toEqual(['gtbank', 'access-bank', 'opay', 'visa']);
  });

  it('lists entities with several types under each of them, once', () => {
    expect(index.listByType('e-wallet')).toEqual([opay]);
    expect(index.listByType('mobile-money')).toEqual([opay]);
    expect(index.listByType('crypto')).toEqual([usdt]);
  });
});

describe('logoFile / logoUrl', () => {
  const kuda = entity({ id: 'kuda', name: 'Kuda', variants: ['logo', 'mark'], formats: { mark: 'webp' } });

  it('names the shipped file, falling back to the logo when there is no mark', () => {
    expect(logoFile(kuda)).toBe('kuda.svg');
    expect(logoFile(kuda, { variant: 'mark' })).toBe('kuda-mark.webp');
    expect(logoFile(gtbank, { variant: 'mark' })).toBe('gtbank.svg');
  });

  it('builds a version-pinned CDN URL', () => {
    expect(logoUrl(kuda, { version: '0.1.0' })).toBe('https://cdn.jsdelivr.net/npm/banklogos@0.1.0/assets/kuda.svg');
    expect(logoUrl(kuda, { version: '0.1.0', cdn: 'unpkg', variant: 'mark' })).toBe(
      'https://unpkg.com/banklogos@0.1.0/assets/kuda-mark.webp',
    );
  });
});
