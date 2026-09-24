import { registry } from './generated/registry.js';
import { createIndex, type LogoIndex, type LogoQuery } from './lookup.js';
import type { LogoEntity, LogoType } from './types.js';

export type { LogoEntity, LogoType, LogoVariant, LogoFormat, LogoSource, License, Scope } from './types.js';
export { LOGO_TYPES, LOGO_VARIANTS, LOGO_FORMATS, LICENSES, formatOf } from './types.js';
export type { NameQuery, BankCodeQuery, LogoQuery, LogoIndex } from './lookup.js';
export { createIndex, normalize } from './lookup.js';

// Built on first use rather than at import time, so bundlers can drop the registry
// from apps that only import types, constants or createIndex.
let index: LogoIndex | undefined;
const getIndex = () => (index ??= createIndex(registry));

/**
 * Look up a logo by id, by name/alias (optionally preferring a country), or by bank code:
 * getLogo('gtbank'), getLogo({ name: 'GTB' }), getLogo({ bankCode: '058' }). Returns undefined when nothing matches.
 */
export function getLogo(query: string | LogoQuery): LogoEntity | undefined {
  return getIndex().getLogo(query);
}

/** Search names, short names and aliases. Exact matches rank first, then prefix, then substring. */
export function searchLogos(query: string, options?: { limit?: number }): LogoEntity[] {
  return getIndex().searchLogos(query, options);
}

/** Entities scoped to a country or operating in it (e.g. Visa appears in listByCountry("NG")). */
export function listByCountry(countryCode: string): LogoEntity[] {
  return getIndex().listByCountry(countryCode);
}

export function listByType(type: LogoType): LogoEntity[] {
  return getIndex().listByType(type);
}

export function listAll(): LogoEntity[] {
  return getIndex().all();
}
