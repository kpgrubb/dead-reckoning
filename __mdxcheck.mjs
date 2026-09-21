import { compile } from '@mdx-js/mdx'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import fs from 'node:fs/promises'

const files = process.argv.slice(2)
let bad = 0
for (const f of files) {
  const src = await fs.readFile(f, 'utf8')
  try {
    const out = await compile(src, {
      remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter, remarkGfm, remarkMath],
      rehypePlugins: [rehypeKatex],
      providerImportSource: '@mdx-js/react',
    })
    console.log('OK  ', f, String(out).length, 'bytes')
  } catch (e) {
    bad++
    console.log('FAIL', f)
    console.log('  ', e.message)
    if (e.line) console.log('   at line', e.line, 'col', e.column)
  }
}
process.exit(bad ? 1 : 0)
