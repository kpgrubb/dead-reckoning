/**
 * rehype plugin: route a literal `<table>` written as JSX in an MDX module through the MDX
 * component map, the same way a GFM pipe table already is.
 *
 * Why this exists. MDX compiles a Markdown table to `_components.table`, so the `table` entry in
 * `src/components/index.ts` wraps it in the `.dr-table-wrap` scroller. It compiles a literal
 * `<table>` in JSX to a bare `_jsx("table", …)`, which never touches the component map — verified
 * against @mdx-js/mdx, and the reason the QA review's 886 px relay-audit table in `act-9-02` was
 * still unwrapped after the `table` override went in. Six modules author their tables that way.
 *
 * The fix is one line of tree surgery: rename the element to `TableScroller`, a capitalised name
 * MDX *does* resolve from the component map, where it is the same component as `table`. Props and
 * children, including MDX expressions inside the cells, are untouched, so the rendered table is
 * identical apart from the wrapper around it.
 */
interface JsxNode {
  type: string
  name?: string | null
  children?: JsxNode[]
}

/** The component map entry a renamed table resolves to (see `src/components/index.ts`). */
export const TABLE_SCROLLER = 'TableScroller'

export function rehypeJsxTables() {
  return (tree: JsxNode) => {
    const walk = (node: JsxNode) => {
      if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name === 'table') {
        node.name = TABLE_SCROLLER
      }
      for (const child of node.children ?? []) walk(child)
    }
    walk(tree)
  }
}
