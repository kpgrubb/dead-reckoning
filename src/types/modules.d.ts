declare module '*.mdx' {
  import type { ComponentType } from 'react'
  import type { MDXComponents } from 'mdx/types'
  import type { ModuleFrontmatter } from '@/content/schema'
  export const frontmatter: ModuleFrontmatter
  const MDXContent: ComponentType<{ components?: MDXComponents }>
  export default MDXContent
}

declare module 'virtual:content-manifest' {
  import type { ModuleMeta } from '@/content/schema'
  export const modules: ModuleMeta[]
}
