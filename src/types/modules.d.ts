declare module '*.mdx' {
  import type { ComponentType } from 'react'
  import type { MDXComponents } from 'mdx/types'
  import type { ModuleFrontmatter } from '@/content/schema'
  export const frontmatter: ModuleFrontmatter
  const MDXContent: ComponentType<{ components?: MDXComponents }>
  export default MDXContent
}

/** Injected by vite.config.ts: short commit sha + build time. Shown in Settings. */
declare const __BUILD_ID__: string

declare module 'virtual:content-manifest' {
  import type { ModuleMeta } from '@/content/schema'
  export const modules: ModuleMeta[]
}
