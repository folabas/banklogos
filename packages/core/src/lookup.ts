import type { LogoEntity, LogoType } from './types.js';

export interface NameQuery {
  name: string;
  country?: string;
}

export interface LogoIndex {
  getLogo(query: string | NameQuery): LogoEntity | undefined;
  searchLogos(query: string, options?: { limit?: number }): LogoEntity[];
  listByCountry(countryCode: string): LogoEntity[];
  listByType(type: LogoType): LogoEntity[];
  all(): LogoEntity[];
}

/** Lower-cases and strips everything except letters and digits: "Guaranty Trust Bank" -> "guarantytrustbank". */
export function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function namesOf(entity: LogoEntity): string[] {
  const names = [entity.id, entity.name, ...entity.aliases];
  if (entity.shortName) names.push(entity.shortName);
  return names.map(normalize).filter(Boolean);
}

function operatesIn(entity: LogoEntity, country: string): boolean {
  const code = country.toUpperCase();
  return entity.scope === code || entity.markets.includes(code);
}

export function createIndex(entities: readonly LogoEntity[]): LogoIndex {
  const byId = new Map(entities.map((e) => [e.id, e]));
  const searchable = entities.map((entity) => ({ entity, names: namesOf(entity) }));

  function getLogo(query: string | NameQuery): LogoEntity | undefined {
    if (typeof query === 'string') {
      const hit = byId.get(query);
      if (hit) return hit;
      query = { name: query };
    }
    if (!query || typeof query.name !== 'string') return undefined;
    const wanted = normalize(query.name);
    if (!wanted) return undefined;
    const matches = searchable.filter((s) => s.names.includes(wanted)).map((s) => s.entity);
    if (query.country) {
      const inCountry = matches.find((e) => operatesIn(e, query.country!));
      if (inCountry) return inCountry;
    }
    return matches[0];
  }

  function searchLogos(query: string, options: { limit?: number } = {}): LogoEntity[] {
    const wanted = normalize(query ?? '');
    if (!wanted) return [];
    const scored: { entity: LogoEntity; score: number }[] = [];
    for (const { entity, names } of searchable) {
      let score = 0;
      for (const name of names) {
        if (name === wanted) score = Math.max(score, 3);
        else if (name.startsWith(wanted)) score = Math.max(score, 2);
        else if (name.includes(wanted)) score = Math.max(score, 1);
      }
      if (score > 0) scored.push({ entity, score });
    }
    scored.sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name));
    const results = scored.map((s) => s.entity);
    return options.limit === undefined ? results : results.slice(0, options.limit);
  }

  return {
    getLogo,
    searchLogos,
    listByCountry: (countryCode) => entities.filter((e) => operatesIn(e, countryCode)),
    listByType: (type) => entities.filter((e) => e.types.includes(type)),
    all: () => [...entities],
  };
}
