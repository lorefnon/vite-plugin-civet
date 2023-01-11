import { defineConfig } from 'vite'
import reactPlugin from '@vitejs/plugin-react-swc'
import civetPlugin from 'vite-plugin-civet'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactPlugin(),
    civetPlugin({
      // For simple uses of TypeScript, Civet can directly transform into JS:
      stripTypes: true,
      outputExtension: 'jsx',
      // For complex uses of TypeScript (e.g. enum), use existing TS transform:
      //outputExtension: 'tsx',
      outputTransformerPlugin: 'vite:react-swc',
    }),
  ],
})
