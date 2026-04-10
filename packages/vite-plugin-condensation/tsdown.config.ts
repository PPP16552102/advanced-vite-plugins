import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: './src/index.ts',
  outDir: './dist',
  format: ['cjs', 'es'],
  dts: true,
  clean: true,
  treeshake: true,
  deps: {
    skipNodeModulesBundle: true
  }
})