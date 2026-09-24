import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalize } from '../../packages/core/src/lookup.js';
import { formatOf, type LogoEntity } from '../../packages/core/src/types.js';
import type { LogoFolder } from './logos.js';
import { logoMetaSchema } from './schema.js';
import { lintPng } from './png-lint.js';
import { lintSvg } from './svg-lint.js';

export interface ValidationResult {
  entities: LogoEntity[];
  errors: string[];
  warnings: string[];
}

export function validateFolders(
  folders: LogoFolder[],
  readSvg = (path: string) => readFileSync(path, 'utf8'),
  readPng = (path: string): Uint8Array => readFileSync(path),
): ValidationResult {
  const entities: LogoEntity[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const idOwners = new Map<string, string>();

  for (const folder of folders) {
    const err = (msg: string) => errors.push(`${folder.label}: ${msg}`);

    if (folder.scopeDir !== folder.scopeDir.toLowerCase()) err(`scope folder "${folder.scopeDir}" must be lower case`);
    if (folder.meta instanceof Error) {
      err(folder.meta.message);
      continue;
    }
    const parsed = logoMetaSchema.safeParse(folder.meta);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) err(`meta.json ${issue.path.join('.') || '(root)'}: ${issue.message}`);
      continue;
    }
    const meta = parsed.data as LogoEntity;

    if (meta.id !== folder.idDir) err(`id "${meta.id}" must match its folder name "${folder.idDir}"`);
    if (meta.scope.toLowerCase() !== folder.scopeDir)
      err(`scope "${meta.scope}" does not match folder "${folder.scopeDir}"`);

    const owner = idOwners.get(meta.id);
    if (owner) err(`id "${meta.id}" is already used by ${owner}`);
    else idOwners.set(meta.id, folder.label);

    const expected = meta.variants.map((v) => `${v}.${formatOf(meta, v)}`);
    for (const file of expected) if (!folder.assetFiles.includes(file)) err(`variant file ${file} is missing`);
    for (const file of folder.assetFiles) if (!expected.includes(file)) err(`${file} is not listed in variants`);
    for (const file of folder.otherFiles)
      err(`unexpected file ${file} (only meta.json and variant images belong here)`);

    for (const file of expected.filter((f) => folder.assetFiles.includes(f))) {
      const path = join(folder.dir, file);
      const problems = file.endsWith('.png') ? lintPng(readPng(path)) : lintSvg(readSvg(path));
      for (const problem of problems) err(`${file} ${problem}`);
    }

    if (!meta.verified) warnings.push(`${folder.label}: not verified yet`);
    entities.push(meta);
  }

  // Two entities answering to the same name in the same market make getLogo({ name }) ambiguous.
  const seen = new Map<string, LogoEntity>();
  for (const entity of entities) {
    const names = new Set(
      [entity.id, entity.name, entity.shortName ?? '', ...entity.aliases].map(normalize).filter(Boolean),
    );
    const markets = entity.scope === 'global' ? ['global', ...entity.markets] : entity.markets;
    for (const name of names) {
      for (const market of markets) {
        const key = `${market}:${name}`;
        const other = seen.get(key);
        if (other && other.id !== entity.id) {
          warnings.push(`name "${name}" is shared by "${other.id}" and "${entity.id}" in ${market}`);
        } else seen.set(key, entity);
      }
    }
  }

  // A bank code must resolve to exactly one entity in its country, or getLogo({ bankCode }) is ambiguous.
  const codeOwner = new Map<string, string>();
  for (const entity of entities) {
    for (const code of entity.bankCodes ?? []) {
      const key = `${entity.scope}:${code}`;
      const other = codeOwner.get(key);
      if (other) errors.push(`bank code ${code} (${entity.scope}) is claimed by both "${other}" and "${entity.id}"`);
      else codeOwner.set(key, entity.id);
    }
  }

  entities.sort((a, b) => a.id.localeCompare(b.id));
  return { entities, errors, warnings };
}
