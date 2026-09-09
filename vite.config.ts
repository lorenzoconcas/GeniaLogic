import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Pages paths are case-sensitive. CI provides the site's actual path via configure-pages.
  base: command === 'build' || isPreview ? (process.env.PAGES_BASE_PATH || '/GeniaLogic/') : '/',
  plugins: [vue(), tailwindcss()],
}))
