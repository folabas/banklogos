import sharp from 'sharp';
import type { LogoVariant } from '../../packages/core/src/types.js';
import { MAX_PNG_BYTES } from './png-lint.js';

/** Longest side we ship: plenty for 2-3x displays at typical logo sizes. */
const MAX_SIDE: Record<LogoVariant, number> = { logo: 512, mark: 256 };

/**
 * Converts an official raster (PNG, JPEG, WebP) into the PNG we ship: never upscaled, fitted within
 * MAX_SIDE, palette-compressed, and stepped down in size until it fits MAX_PNG_BYTES.
 */
export async function toShippablePng(input: Uint8Array, variant: LogoVariant): Promise<Buffer> {
  // SVG input is rasterized at a density high enough that the longest side reaches MAX_SIDE.
  const meta = await sharp(input).metadata();
  if (!meta.width || !meta.height) throw new Error('not a readable image');
  const density =
    meta.format === 'svg'
      ? Math.min(2400, Math.ceil((72 * MAX_SIDE[variant]) / Math.max(meta.width, meta.height)))
      : undefined;
  let side = MAX_SIDE[variant];
  for (;;) {
    const out = await sharp(input, density ? { density } : {})
      .resize({ width: side, height: side, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
      .toBuffer();
    if (out.length <= MAX_PNG_BYTES || side <= 128) return out;
    side = Math.round(side * 0.75);
  }
}
