import { defineConfig } from 'vite'
import civetPlugin from 'vite-plugin-civet'
import babelPlugin from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    babelPlugin(),
    civetPlugin({
      stripTypes: true,
      outputExtension: 'js',
      outputTransformerPlugin: 'babel-plugin',
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
})

