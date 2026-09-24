export const LOGO_TYPES = [
  'bank',
  'microfinance-bank',
  'mobile-money',
  'e-wallet',
  'payment-gateway',
  'card-network',
  'crypto',
] as const;
export type LogoType = (typeof LOGO_TYPES)[number];

export const LOGO_VARIANTS = ['logo', 'mark'] as const;
export type LogoVariant = (typeof LOGO_VARIANTS)[number];

export const LICENSES = [
  'official-press-kit',
  'official-site',
  'cc-by-sa',
  'public-domain-textlogo',
  'manual',
] as const;
export type License = (typeof LICENSES)[number];

/** ISO 3166-1 alpha-2 code (upper case), or "global" for multinational brands. */
export type Scope = string;

export interface LogoEntity {
  /** Stable slug. Never reused or renamed once published. */
  id: string;
  name: string;
  shortName?: string;
  aliases: string[];
  scope: Scope;
  /** Countries where the brand operates. Always includes `scope` unless scope is "global". */
  markets: string[];
  types: LogoType[];
  /** SVG variants available. `logo` is always present. */
  variants: LogoVariant[];
  colors?: { primary?: string; secondary?: string };
  website?: string;
  regulatorRef?: { body: string; category?: string; licenseNo?: string };
  source: { url: string; license: License; fetchedAt: string };
  /** True once a maintainer has confirmed the logo is current and correct. */
  verified: boolean;
  /** Package version the entity first shipped in. */
  addedIn: string;
}
