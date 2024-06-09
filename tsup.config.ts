import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['./src/Rotorise.ts',],
    splitting: false,
    sourcemap: true,
    outDir: 'dist',
    clean: true,
    format: ['cjs', 'esm'],
    dts: true,

})