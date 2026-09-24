import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { lintPng, pngSize } from './png-lint.js';

const png = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 4, background: { r: 255, g: 71, b: 19, alpha: 1 } } })
    .png()
    .toBuffer();

describe('lintPng', () => {
  it('reads dimensions and accepts a reasonable logo', async () => {
    const bytes = await png(512, 128);
    expect(pngSize(bytes)).toEqual({ width: 512, height: 128 });
    expect(lintPng(bytes)).toEqual([]);
  });

  it('rejects non-PNG bytes such as a JPEG or HTML error page', () => {
    expect(lintPng(new TextEncoder().encode('<html>Access denied</html>'))).toEqual(['is not a valid PNG file']);
    expect(lintPng(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(30).fill(0)]))).toEqual([
      'is not a valid PNG file',
    ]);
  });

  it('rejects images too small to be useful or too large to ship', async () => {
    expect(lintPng(await png(40, 40))[0]).toMatch(/min 48px/);
    expect(lintPng(await png(2048, 256))[0]).toMatch(/max 1024px/);
  });
});
