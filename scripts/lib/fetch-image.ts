/** Downloads an official logo file and prepares it for logos/: optimized + linted SVG, or a shippable PNG. */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { License, LogoFormat, LogoVariant } from '../../packages/core/src/types.js';
import { optimizeSvg } from './optimize.js';
import { lintPng } from './png-lint.js';
import { toShippablePng } from './raster.js';
import { lintSvg } from './svg-lint.js';

export interface FileRef {
  url: string;
  format?: LogoFormat;
  license: License;
  /** Page to cite as the source when it differs from the file URL (e.g. an app store listing). */
  sourceUrl?: string;
  /** When set, `url` is an HTML page and the logo is its n-th (0-based) inline <svg> element. */
  inlineIndex?: number;
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36';

export async function download(url: string): Promise<Uint8Array> {
  // Files already extracted locally (e.g. from an official press-kit zip); sourceUrl records the real origin.
  if (url.startsWith('file:')) return new Uint8Array(readFileSync(fileURLToPath(url)));
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      lastError = err;
      // Some bank sites serve an incomplete certificate chain. Node won't fetch the missing intermediate,
      // but the system curl (Windows schannel/macOS) does, and still verifies the certificate.
      const code = (err as { cause?: { code?: string } }).cause?.code ?? '';
      if (/CERT|SIGNATURE|ISSUER/.test(code)) {
        return new Uint8Array(execFileSync('curl', ['-sSL', '--fail', '-m', '60', '-A', UA, url], { maxBuffer: 50e6 }));
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastError;
}

/** Pulls the n-th <svg>…</svg> out of an HTML page and makes it a standalone file. */
export function extractInlineSvg(html: string, index: number): string {
  const found = html.match(/<svg\b[\s\S]*?<\/svg>/gi) ?? [];
  const svg = found[index];
  if (!svg) throw new Error(`page has ${found.length} inline <svg> elements; index ${index} not found`);
  return /\sxmlns=/.test(svg.slice(0, svg.indexOf('>')))
    ? svg
    : svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
}

/** Downloads and prepares one variant; returns the format and bytes to write. */
export async function prepare(ref: FileRef, variant: LogoVariant): Promise<{ format: LogoFormat; bytes: Uint8Array }> {
  const raw = await download(ref.url);
  const head = new TextDecoder().decode(raw.subarray(0, 2048));
  const looksSvg = /<svg[\s>]/i.test(head) && !/^\s*(<!doctype html|<html)/i.test(head);
  if (ref.inlineIndex !== undefined || ref.format === 'svg' || (ref.format === undefined && looksSvg)) {
    const full = new TextDecoder().decode(raw);
    if (ref.inlineIndex === undefined && !looksSvg) throw new Error(`${variant}: expected SVG, got something else`);
    const svg = ref.inlineIndex !== undefined ? extractInlineSvg(full, ref.inlineIndex) : full;
    const optimized = optimizeSvg(svg);
    const problems = lintSvg(optimized);
    // An official SVG that is only too heavy (detailed artwork) is rendered to PNG rather than dropped.
    if (problems.length === 1 && problems[0]!.includes('KB (max')) {
      const png = await toShippablePng(new TextEncoder().encode(optimized), variant);
      const pngProblems = lintPng(png);
      if (pngProblems.length) throw new Error(`${variant}.png ${pngProblems.join('; ')}`);
      console.warn(`warn  ${variant}.svg ${problems[0]}; rendered to PNG instead`);
      return { format: 'png', bytes: png };
    }
    if (problems.length) throw new Error(`${variant}.svg ${problems.join('; ')}`);
    return { format: 'svg', bytes: new TextEncoder().encode(optimized) };
  }
  const png = await toShippablePng(raw, variant).catch((err: Error) => {
    throw new Error(`${variant}: not a readable image (${err.message})`);
  });
  const problems = lintPng(png);
  if (problems.length) throw new Error(`${variant}.png ${problems.join('; ')}`);
  return { format: 'png', bytes: png };
}
