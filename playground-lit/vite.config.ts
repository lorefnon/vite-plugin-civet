import { defineConfig } from 'vite'
import civetPlugin from 'vite-plugin-civet'
import babelPlugin from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    babelPlugin({
      apply: 'serve',
    }),
    civetPlugin({
      stripTypes: true,
      outputExtension: 'js',
      outputTransformerPlugin: {
        serve: 'babel-plugin',
      },
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})

