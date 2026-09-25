import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { formatOf, getLogo, listAll, listByCountry, listByType, searchLogos } from '../src/index.js';

const svgModule = (name: string) => fileURLToPath(new URL(`../src/generated/svg/${name}.ts`, import.meta.url));
const asset = (file: string) => fileURLToPath(new URL(`../assets/${file}`, import.meta.url));
const nativePng = (name: string) => fileURLToPath(new URL(`../assets/native/${name}.png`, import.meta.url));

describe('generated registry', () => {
  it('ships a file for every variant in its reported format, and an svg module for SVG variants', () => {
    for (const entity of listAll()) {
      for (const variant of entity.variants) {
        const name = variant === 'logo' ? entity.id : `${entity.id}-${variant}`;
        const format = formatOf(entity, variant);
        expect(['svg', 'webp'], name).toContain(format);
        expect(existsSync(asset(`${name}.${format}`)), name).toBe(true);
        expect(existsSync(svgModule(name)), name).toBe(format === 'svg');
        // React Native can't draw SVG, so every SVG logo also ships as a PNG rendering.
        if (format === 'svg') expect(existsSync(nativePng(name)), `${name} native png`).toBe(true);
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
