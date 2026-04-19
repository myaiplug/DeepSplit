import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function githubPagesSpaFallback() {
  return {
    name: 'github-pages-spa-fallback',
    apply: 'build',
    generateBundle(_, bundle) {
      const indexAsset = bundle['index.html']

      if (indexAsset && indexAsset.type === 'asset') {
        this.emitFile({
          type: 'asset',
          fileName: '404.html',
          source: indexAsset.source,
        })
      }
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react(), githubPagesSpaFallback()],
  base: command === 'build' ? '/DeepSplit/' : '/',
}))
