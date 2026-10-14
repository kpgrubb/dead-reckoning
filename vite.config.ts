/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { contentManifest } from './plugins/content-manifest.ts'
import { rehypeJsxTables } from './plugins/rehype-jsx-tables.ts'

const src = fileURLToPath(new URL('./src', import.meta.url))
const content = fileURLToPath(new URL('./content', import.meta.url))

/**
 * A build stamp, shown in Settings. GitHub Pages caches index.html for minutes, and index.html
 * names the hashed asset files, so a stale document silently serves stale content. Being able to
 * read the build off the page turns "is this the version I just deployed?" into a fact.
 */
function buildId(): string {
  let sha = 'local'
  try {
    sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    /* not a git checkout */
  }
  return `${sha} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}Z`
}

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the static build runs from any folder or host, including file://-adjacent setups.
  base: './',
  plugins: [
    contentManifest(),
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex, rehypeJsxTables],
        providerImportSource: '@mdx-js/react',
      }),
    },
    react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
  ],
  resolve: {
    alias: {
      '@': src,
      '@content': content,
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  worker: { format: 'es' },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    /**
     * Vitest's default is 5s, which was never calibrated against the heaviest work here. Rendering
     * one content module means a jsdom tree, KaTeX typesetting and several D3 charts, and importing
     * an Act's data module can run a real simulation first — `act-8/data.ts` does 10,000
     * permutations on import, measured at 435 ms on its own. Comfortable in isolation; over the
     * 5s line when 89 files are competing for the CPU. That produced an intermittent timeout on
     * `act-8-02` in roughly one full-suite run in three, with no assertion ever failing.
     */
    testTimeout: 30_000,
  },
})
