import { defineConfig } from 'tsup';

export default defineConfig({
  // Each image gets its own module so consumers only bundle the logos they import.
  entry: ['src/index.ts', 'src/generated/svg/*.ts', 'src/generated/img/*.ts'],
  format: ['esm', 'cjs'],
  // Declarations for the hundreds of one-line image modules are written by scripts/write-module-types.ts,
  // which is much faster than running the TypeScript declaration build on each.
  dts: { entry: 'src/index.ts' },
  clean: true,
  splitting: false,
  treeshake: true,
});
