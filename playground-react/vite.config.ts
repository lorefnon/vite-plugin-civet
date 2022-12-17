import { defineConfig } from 'vite'
import reactPlugin from '@vitejs/plugin-react'
import civetPlugin from 'vite-plugin-civet'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactPlugin({
      babel: {
        presets: [
          '@babel/preset-react',
        ],
      },
    }),
    civetPlugin({
      stripTypes: true,
      outputExtension: 'jsx',
      outputTransformerPlugin: 'vite:react-babel',
    }),
  ],
})
