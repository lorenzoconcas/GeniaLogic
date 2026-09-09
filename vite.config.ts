import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Keep local development at /; production and its preview use the Pages repository path.
  base: command === 'build' || isPreview ? '/genialogic/' : '/',
  plugins: [vue(), tailwindcss()],
}))
