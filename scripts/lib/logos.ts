import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const LOGOS_DIR = join(ROOT, 'logos');

const isAsset = (file: string) => /\.(svg|png)$/.test(file);

export interface LogoFolder {
  /** Folder name directly under logos/, e.g. "ng" or "global". */
  scopeDir: string;
  /** Folder name of the entity, which must equal its id. */
  idDir: string;
  dir: string;
  /** Path relative to the repo root, for messages. */
  label: string;
  /** Parsed meta.json, or an Error if it is missing or not valid JSON. */
  meta: unknown;
  /** Image files present in the folder, e.g. ["logo.svg", "mark.png"]. */
  assetFiles: string[];
  /** Any other files in the folder. */
  otherFiles: string[];
}

function subdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => !name.startsWith('.') && statSync(join(dir, name)).isDirectory())
    .sort();
}

/** Walks logos/<scope>/<id>/ and returns one entry per entity folder. */
export function readLogoFolders(logosDir = LOGOS_DIR): LogoFolder[] {
  const folders: LogoFolder[] = [];
  for (const scopeDir of subdirs(logosDir)) {
    for (const idDir of subdirs(join(logosDir, scopeDir))) {
      const dir = join(logosDir, scopeDir, idDir);
      const files = readdirSync(dir).filter((f) => !f.startsWith('.'));
      let meta: unknown;
      const metaPath = join(dir, 'meta.json');
      try {
        meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      } catch (err) {
        meta = existsSync(metaPath)
          ? new Error(`meta.json is not valid JSON: ${(err as Error).message}`)
          : new Error('meta.json is missing');
      }
      folders.push({
        scopeDir,
        idDir,
        dir,
        label: relative(ROOT, dir).replaceAll('\\', '/'),
        meta,
        assetFiles: files.filter(isAsset).sort(),
        otherFiles: files.filter((f) => !isAsset(f) && f !== 'meta.json').sort(),
      });
    }
  }
  return folders;
}
