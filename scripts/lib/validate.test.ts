import { describe, expect, it } from 'vitest';
import type { LogoFolder } from './logos.js';
import { validateFolders } from './validate.js';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';

function meta(overrides: Record<string, unknown> = {}) {
  return {
    id: 'gtbank',
    name: 'Guaranty Trust Bank',
    aliases: ['GTB'],
    scope: 'NG',
    markets: ['NG'],
    types: ['bank'],
    variants: ['logo'],
    source: { url: 'https://www.gtbank.com', license: 'official-site', fetchedAt: '2026-09-24' },
    verified: true,
    addedIn: '0.1.0',
    ...overrides,
  };
}

function folder(overrides: Partial<LogoFolder> = {}): LogoFolder {
  const scopeDir = overrides.scopeDir ?? 'ng';
  const idDir = overrides.idDir ?? 'gtbank';
  return {
    scopeDir,
    idDir,
    dir: `/logos/${scopeDir}/${idDir}`,
    label: `logos/${scopeDir}/${idDir}`,
    meta: meta(),
    svgFiles: ['logo.svg'],
    otherFiles: [],
    ...overrides,
  };
}

const run = (folders: LogoFolder[], svg = SVG) => validateFolders(folders, () => svg);

describe('validateFolders', () => {
  it('accepts a well-formed entity', () => {
    const result = run([folder()]);
    expect(result.errors).toEqual([]);
    expect(result.entities.map((e) => e.id)).toEqual(['gtbank']);
  });

  it('reports schema problems with their field path', () => {
    const { errors } = run([
      folder({ meta: meta({ types: ['bank', 'casino'], source: { url: 'nope', license: 'x', fetchedAt: 'today' } }) }),
    ]);
    expect(errors.some((e) => e.includes('meta.json types.1'))).toBe(true);
    expect(errors.some((e) => e.includes('meta.json source.url'))).toBe(true);
    expect(errors.some((e) => e.includes('meta.json source.fetchedAt'))).toBe(true);
  });

  it('rejects unknown fields', () => {
    const { errors } = run([folder({ meta: meta({ country: 'NG' }) })]);
    expect(errors.join('\n')).toMatch(/country/);
  });

  it('requires the id and scope to match the folder', () => {
    const { errors } = run([folder({ idDir: 'gt-bank', scopeDir: 'gh' })]);
    expect(errors.join('\n')).toMatch(/must match its folder name "gt-bank"/);
    expect(errors.join('\n')).toMatch(/does not match folder "gh"/);
  });

  it('requires markets to include the scope', () => {
    const { errors } = run([folder({ meta: meta({ markets: ['GH'] }) })]);
    expect(errors.join('\n')).toMatch(/must include the scope "NG"/);
  });

  it('allows global entities without their own country', () => {
    const visa = meta({ id: 'visa', name: 'Visa', scope: 'global', markets: ['NG'], types: ['card-network'] });
    expect(run([folder({ scopeDir: 'global', idDir: 'visa', meta: visa })]).errors).toEqual([]);
  });

  it('matches variant files to the variants list', () => {
    const { errors } = run([
      folder({
        meta: meta({ variants: ['logo', 'mark'] }),
        svgFiles: ['logo.svg', 'extra.svg'],
        otherFiles: ['logo.png'],
      }),
    ]);
    expect(errors).toEqual(
      expect.arrayContaining([
        'logos/ng/gtbank: variant file mark.svg is missing',
        'logos/ng/gtbank: extra.svg is not listed in variants',
        'logos/ng/gtbank: unexpected file logo.png (only meta.json and variant SVGs belong here)',
      ]),
    );
  });

  it('accepts a separate source for the mark, but only when the mark exists', () => {
    const markSource = { url: 'https://www.gtbank.com/icon.svg', license: 'official-site', fetchedAt: '2026-09-24' };
    const withMark = folder({
      meta: meta({ variants: ['logo', 'mark'], variantSources: { mark: markSource } }),
      svgFiles: ['logo.svg', 'mark.svg'],
    });
    expect(run([withMark]).errors).toEqual([]);

    const { errors } = run([folder({ meta: meta({ variantSources: { mark: markSource } }) })]);
    expect(errors.join('\n')).toMatch(/variantSources.mark: "mark" is not listed in variants/);
  });

  it('rejects duplicate ids across scopes', () => {
    const gh = folder({ scopeDir: 'gh', meta: meta({ scope: 'GH', markets: ['GH'] }) });
    expect(run([folder(), gh]).errors.join('\n')).toMatch(/already used by logos\/ng\/gtbank/);
  });

  it('passes SVG lint failures through', () => {
    const { errors } = run([folder()], '<svg><script/></svg>');
    expect(errors).toEqual(
      expect.arrayContaining([
        'logos/ng/gtbank: logo.svg has no viewBox on the root <svg>',
        'logos/ng/gtbank: logo.svg contains a <script> element',
      ]),
    );
  });

  it('reports missing or broken meta.json', () => {
    const { errors } = run([folder({ meta: new Error('meta.json is missing') })]);
    expect(errors).toEqual(['logos/ng/gtbank: meta.json is missing']);
  });

  it('warns about unverified entities and names shared within a market', () => {
    const other = folder({
      idDir: 'gtb',
      meta: meta({ id: 'gtb', name: 'Great Trust Bank', aliases: ['GTB'], verified: false }),
    });
    const { warnings, errors } = run([folder(), other]);
    expect(errors).toEqual([]);
    expect(warnings).toContain('logos/ng/gtb: not verified yet');
    expect(warnings.some((w) => w.includes('name "gtb" is shared by'))).toBe(true);
  });
});
