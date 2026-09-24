import { optimize } from 'svgo';

/** SVGO with defaults, plus: width/height removed in favour of viewBox, and a trailing newline. */
export function optimizeSvg(svg: string, path?: string): string {
  const result = optimize(svg, {
    path,
    multipass: true,
    plugins: ['preset-default', 'removeDimensions', 'removeScripts', 'removeXlink'],
  });
  return result.data.trimEnd() + '\n';
}
