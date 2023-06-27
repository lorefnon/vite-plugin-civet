import { defineConfig } from 'vite'
import { pluginCivetIdeSupport } from 'vite-plugin-civet'

export default defineConfig({
  plugins: [
    pluginCivetIdeSupport(),
  ],
  server: {
    port: 3000,
  },
})
