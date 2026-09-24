import { describe, expect, it } from 'vitest';
import { lintSvg } from './svg-lint.js';

const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="#FF4713"/></svg>';

describe('lintSvg', () => {
  it('accepts a clean vector logo, with or without an XML declaration', () => {
    expect(lintSvg(ok)).toEqual([]);
    expect(lintSvg(`<?xml version="1.0"?>\n${ok}`)).toEqual([]);
  });

  it('allows internal references like gradients', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><defs><linearGradient id="g"/></defs><use href="#g"/><rect fill="url(#g)"/></svg>';
    expect(lintSvg(svg)).toEqual([]);
  });

  it('requires a valid viewBox', () => {
    expect(lintSvg('<svg width="10" height="10"></svg>')).toContain('has no viewBox on the root <svg>');
    expect(lintSvg('<svg viewBox="0 0 0 10"></svg>')[0]).toMatch(/invalid viewBox/);
  });

  it('rejects scripts, rasters, handlers and external references', () => {
    const bad = (inner: string) => lintSvg(`<svg viewBox="0 0 1 1">${inner}</svg>`);
    expect(bad('<script>alert(1)</script>')).toContain('contains a <script> element');
    expect(bad('<image href="data:image/png;base64,AAA"/>')).toEqual(
      expect.arrayContaining(['embeds a raster <image> (logos must be pure vector)']),
    );
    expect(bad('<rect onclick="x()"/>')).toContain('contains an inline event handler (on*=)');
    expect(bad('<use href="https://evil.example/x.svg#a"/>')).toContain('references an external resource via href');
    expect(bad('<rect fill="url(https://evil.example/p)"/>')).toContain('references an external resource via url()');
  });

  it('rejects non-SVG content and oversized files', () => {
    expect(lintSvg('<html></html>')).toEqual(['does not start with an <svg> element']);
    const big = `<svg viewBox="0 0 1 1"><path d="${'M0 0'.repeat(6000)}"/></svg>`;
    expect(lintSvg(big)[0]).toMatch(/KB \(max 20 KB\)/);
  });
});
