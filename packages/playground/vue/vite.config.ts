import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vitePluginCondensation from 'vite-plugin-condensation'

export default defineConfig({
  plugins: [
    vue(),
    vitePluginCondensation()
  ]
})