import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { testLog } from 'vite-plugin-condensation'

testLog();

export default defineConfig({
  plugins: [
    vue()
  ]
})