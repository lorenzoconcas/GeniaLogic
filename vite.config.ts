import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const packageMetadata = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  config: { appBuildCode: string }
}
const buildTimestamp = new Date().toISOString()
let commitHash = 'non disponibile'
try { commitHash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim() } catch { /* La build può provenire da un archivio senza metadati Git. */ }

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // Pages paths are case-sensitive. CI provides the site's actual path via configure-pages.
  base: command === 'build' || isPreview ? (process.env.PAGES_BASE_PATH || '/GeniaLogic/') : '/',
  define: {
    __APP_BUILD_CODE__: JSON.stringify(packageMetadata.config.appBuildCode),
    __APP_BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    __APP_COMMIT_HASH__: JSON.stringify(commitHash),
  },
  plugins: [vue(), tailwindcss()],
}))
