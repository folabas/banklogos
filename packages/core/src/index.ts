import { registry } from './generated/registry.js';
import { createIndex } from './lookup.js';

export type { LogoEntity, LogoType, LogoVariant, LogoSource, License, Scope } from './types.js';
export { LOGO_TYPES, LOGO_VARIANTS, LICENSES } from './types.js';
export type { NameQuery, LogoIndex } from './lookup.js';
export { createIndex, normalize } from './lookup.js';

const index = createIndex(registry);

/** Look up a logo by id, or by name/alias (optionally preferring a country). Returns undefined when nothing matches. */
export const getLogo = index.getLogo;
/** Search names, short names and aliases. Exact matches rank first, then prefix, then substring. */
export const searchLogos = index.searchLogos;
/** Entities scoped to a country or operating in it (e.g. Visa appears in listByCountry("NG")). */
export const listByCountry = index.listByCountry;
export const listByType = index.listByType;
export const listAll = index.all;
