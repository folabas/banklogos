export const MAX_PNG_BYTES = 100 * 1024;
// Wide wordmarks are often ~40px tall on bank sites; below 32px they are unusable.
export const MIN_PNG_SIDE = 32;
export const MAX_PNG_SIDE = 1024;

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Width and height from a PNG's IHDR chunk, or undefined if the bytes are not a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (bytes.length < 24 || SIGNATURE.some((b, i) => bytes[i] !== b)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR') return undefined;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Returns a list of problems with a PNG file; empty means it passes. */
export function lintPng(bytes: Uint8Array): string[] {
  const size = pngSize(bytes);
  if (!size) return ['is not a valid PNG file'];
  const errors: string[] = [];
  if (bytes.length > MAX_PNG_BYTES) {
    errors.push(`is ${(bytes.length / 1024).toFixed(1)} KB (max ${MAX_PNG_BYTES / 1024} KB)`);
  }
  const { width, height } = size;
  if (Math.min(width, height) < MIN_PNG_SIDE) errors.push(`is ${width}×${height}px (min ${MIN_PNG_SIDE}px per side)`);
  if (Math.max(width, height) > MAX_PNG_SIDE) errors.push(`is ${width}×${height}px (max ${MAX_PNG_SIDE}px per side)`);
  return errors;
}
