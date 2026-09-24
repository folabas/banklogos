import { defineConfig } from 'tsup';

export default defineConfig({
  // Each SVG gets its own module so consumers only bundle the logos they import.
  entry: ['src/index.ts', 'src/generated/svg/*.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
