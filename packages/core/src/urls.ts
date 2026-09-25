import { VERSION } from './generated/version.js';
import { formatOf, type LogoEntity, type LogoVariant } from './types.js';

export interface LogoFileOptions {
  /** "mark" falls back to the full logo when the entity has no mark. Default: "logo". */
  variant?: LogoVariant;
}

export interface LogoUrlOptions extends LogoFileOptions {
  /** CDN that mirrors npm packages. Default: jsDelivr. */
  cdn?: 'jsdelivr' | 'unpkg';
  /** Package version to pin in the URL. Default: the installed version. */
  version?: string;
}

/** File name of a logo inside the package's assets/ folder, e.g. "gtbank.svg" or "kuda-mark.webp". */
export function logoFile(entity: LogoEntity, options: LogoFileOptions = {}): string {
  const variant = options.variant && entity.variants.includes(options.variant) ? options.variant : 'logo';
  const name = variant === 'logo' ? entity.id : `${entity.id}-${variant}`;
  return `${name}.${formatOf(entity, variant)}`;
}

/**
 * Public HTTPS URL of a logo on a CDN that mirrors npm, for places that need a real URL without a bundler:
 * server-rendered HTML, API responses, emails. Pinned to a version so the image never changes under you.
 */
export function logoUrl(entity: LogoEntity, options: LogoUrlOptions = {}): string {
  const version = options.version ?? VERSION;
  const base =
    options.cdn === 'unpkg'
      ? `https://unpkg.com/banklogos@${version}`
      : `https://cdn.jsdelivr.net/npm/banklogos@${version}`;
  return `${base}/assets/${logoFile(entity, options)}`;
}
