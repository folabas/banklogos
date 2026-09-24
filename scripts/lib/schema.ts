import { z } from 'zod';
import { LICENSES, LOGO_TYPES, LOGO_VARIANTS, type LogoEntity } from '../../packages/core/src/types.js';

const countryCode = z.string().regex(/^[A-Z]{2}$/, 'must be an upper-case ISO 3166-1 alpha-2 code');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'must be a 6-digit hex colour like #FF4713');

export const logoMetaSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'must be a kebab-case slug'),
    name: z.string().min(1),
    shortName: z.string().min(1).optional(),
    aliases: z.array(z.string().min(1)),
    scope: z.union([countryCode, z.literal('global')]),
    markets: z.array(countryCode),
    types: z.array(z.enum(LOGO_TYPES)).min(1),
    variants: z
      .array(z.enum(LOGO_VARIANTS))
      .min(1)
      .refine((v) => v.includes('logo'), 'must include "logo"'),
    colors: z.strictObject({ primary: hexColor.optional(), secondary: hexColor.optional() }).optional(),
    website: z.url().optional(),
    regulatorRef: z
      .strictObject({ body: z.string().min(1), category: z.string().optional(), licenseNo: z.string().optional() })
      .optional(),
    source: z.strictObject({ url: z.url(), license: z.enum(LICENSES), fetchedAt: isoDate }),
    verified: z.boolean(),
    addedIn: z.string().regex(/^\d+\.\d+\.\d+$/, 'must be a semver version'),
  })
  .superRefine((meta, ctx) => {
    if (meta.scope !== 'global' && !meta.markets.includes(meta.scope)) {
      ctx.addIssue({ code: 'custom', path: ['markets'], message: `must include the scope "${meta.scope}"` });
    }
    const dupes = (arr: string[]) => arr.filter((v, i) => arr.indexOf(v) !== i);
    for (const key of ['aliases', 'markets', 'types', 'variants'] as const) {
      const d = dupes(meta[key] as string[]);
      if (d.length) ctx.addIssue({ code: 'custom', path: [key], message: `duplicate values: ${d.join(', ')}` });
    }
  });

// Compile-time check that the schema and the published type agree.
type Meta = z.infer<typeof logoMetaSchema>;
const _metaIsEntity = (m: Meta): LogoEntity => m;
const _entityIsMeta = (e: LogoEntity): Meta => e;
void _metaIsEntity;
void _entityIsMeta;
