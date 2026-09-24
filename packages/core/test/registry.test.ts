import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatOf, getLogo, listAll, listByCountry, listByType, searchLogos } from '../src/index.js';

const module = (kind: 'svg' | 'img', name: string) =>
  fileURLToPath(new URL(`../src/generated/${kind}/${name}.ts`, import.meta.url));

describe('generated registry', () => {
  it('has an img module for every variant, and an svg module for every SVG variant', () => {
    for (const entity of listAll()) {
      for (const variant of entity.variants) {
        const name = variant === 'logo' ? entity.id : `${entity.id}-${variant}`;
        expect(existsSync(module('img', name)), name).toBe(true);
        expect(existsSync(module('svg', name)), name).toBe(formatOf(entity, variant) === 'svg');
      }
    }
  });

  it('resolves every entity by id and by each of its names', () => {
    for (const entity of listAll()) {
      expect(getLogo(entity.id)).toBe(entity);
      for (const name of [entity.name, entity.shortName, ...entity.aliases].filter(Boolean) as string[]) {
        expect(getLogo({ name, country: entity.scope === 'global' ? undefined : entity.scope })?.id, name).toBe(
          entity.id,
        );
      }
    }
  });

  it('answers the everyday lookups', () => {
    if (!listAll().length) return; // empty registry before the first logos land
    expect(getLogo('GTB')?.id).toBe('gtbank');
    expect(getLogo({ name: 'Moniepoint MFB' })?.id).toBe('moniepoint');
    expect(searchLogos('zen')[0]?.id).toBe('zenith-bank');
    expect(listByCountry('NG').map((e) => e.id)).toContain('visa');
    expect(listByType('e-wallet').map((e) => e.id)).toContain('opay');
    expect(listByType('crypto').map((e) => e.id)).toContain('usdt');
    expect(getLogo('usdt')?.variants).toEqual(['logo', 'mark']);
    expect(getLogo({ bankCode: '058' })?.id).toBe('gtbank');
    expect(getLogo({ bankCode: '50515' })?.id).toBe('moniepoint');
    expect(getLogo('moniepoint')?.variantSources?.mark?.license).toBe('official-site');
  });
});
