import { defineConfig } from 'vite'
import reactPlugin from '@vitejs/plugin-react-swc'
import civetPlugin from 'vite-plugin-civet'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactPlugin(),
    civetPlugin({
      stripTypes: true,
      outputExtension: 'jsx',
      outputTransformerPlugin: 'vite:react-swc',
    }),
  ],
})
