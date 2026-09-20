import { createContext, useContext } from 'react'
import type { ModuleMeta } from '@/content/schema'

export interface ModuleContextValue {
  meta: ModuleMeta
  /** Beat ids registered by <MissionBeat> in render order (for completion gating). */
  registerBeat: (id: string) => void
}

export const ModuleContext = createContext<ModuleContextValue | null>(null)

export function useModule(): ModuleContextValue {
  const ctx = useContext(ModuleContext)
  if (!ctx) {
    // Components can be rendered in isolation (style reference, tests): provide a harmless default.
    return {
      meta: { id: 'standalone', act: 0, title: 'Standalone', est_minutes: 0, path: '' },
      registerBeat: () => {},
    }
  }
  return ctx
}
