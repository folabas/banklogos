export const MAX_SVG_BYTES = 20 * 1024;

/** Returns a list of problems with an SVG file's contents; empty means it passes. */
export function lintSvg(svg: string): string[] {
  const errors: string[] = [];
  const bytes = Buffer.byteLength(svg, 'utf8');
  if (bytes > MAX_SVG_BYTES) errors.push(`is ${(bytes / 1024).toFixed(1)} KB (max ${MAX_SVG_BYTES / 1024} KB)`);

  const body = svg
    .replace(/^\uFEFF/, '')
    .replace(/^\s*<\?xml[^>]*\?>\s*/, '')
    .replace(/^\s*<!--[\s\S]*?-->\s*/, '');
  const root = body.match(/^<svg\b[^>]*>/);
  if (!root) {
    errors.push('does not start with an <svg> element');
    return errors;
  }
  const viewBox = root[0].match(/\bviewBox\s*=\s*["']([^"']*)["']/);
  if (!viewBox) {
    errors.push('has no viewBox on the root <svg>');
  } else {
    const parts = viewBox[1]!
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length !== 4 || parts.some(Number.isNaN) || parts[2]! <= 0 || parts[3]! <= 0) {
      errors.push(`has an invalid viewBox "${viewBox[1]}"`);
    }
  }

  const banned: [RegExp, string][] = [
    [/<script\b/i, 'contains a <script> element'],
    [/<foreignObject\b/i, 'contains a <foreignObject> element'],
    [/<image\b/i, 'embeds a raster <image> (logos must be pure vector)'],
    [/\son[a-z]+\s*=/i, 'contains an inline event handler (on*=)'],
    [/(?:xlink:)?href\s*=\s*["'](?!#)/i, 'references an external resource via href'],
    [/url\(\s*["']?(?!#)/i, 'references an external resource via url()'],
    [/@import\b/i, 'contains a CSS @import'],
  ];
  for (const [pattern, message] of banned) if (pattern.test(svg)) errors.push(message);
  return errors;
}
