import { defineConfig } from 'tsup'
import pkg from './package.json' assert {type: 'json'}

export default defineConfig({
  entry: ['./src/index.ts'],
  format: ['cjs', 'esm'],

  ignoreWatch: './playground-ts/**/*.*',
  external: [
    ...Object.keys(pkg.devDependencies),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  dts: true,
  clean: true,
})
