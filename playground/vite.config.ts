import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import plugin from 'vite-plugin-civet'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), plugin({
    stripTypes: true,
    outputExtension: 'jsx',
    outputTransformerPlugin: 'vite:react-babel'
  })],
})
