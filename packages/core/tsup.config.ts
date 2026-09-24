import { defineConfig } from 'tsup';

export default defineConfig({
  // Each image gets its own module so consumers only bundle the logos they import.
  // img/<name> modules are written directly by scripts/write-image-modules.ts (they import asset files).
  entry: ['src/index.ts', 'src/generated/svg/*.ts'],
  format: ['esm', 'cjs'],
  // Declarations for the hundreds of one-line image modules are written by scripts/write-image-modules.ts,
  // which is much faster than running the TypeScript declaration build on each.
  dts: { entry: 'src/index.ts' },
  clean: true,
  splitting: false,
  treeshake: true,
});
