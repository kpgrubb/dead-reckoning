import '@testing-library/jest-dom/vitest'
import { useProgress } from '@/store/progress'

/**
 * Pin the learner seed. Every instrument seeds its simulations from it via `seedFrom`, and it is
 * deliberately random per device — `freshSeed()` on store creation — so a test run draws a
 * different sampling distribution each time. That made any assertion about a simulated result
 * quietly flaky: <LimitStack>'s convergence check ("the largest gap from N(0,1) falls as n grows")
 * failed about one run in three, because with finite reps that gap is itself a random quantity and
 * the claim holds in distribution rather than always. Everything else in the project is seeded; this
 * was the one input that was not.
 */
useProgress.setState({ learnerSeed: 20_260_101 })

/**
 * Browser APIs jsdom does not implement, stubbed so instruments can be rendered in tests.
 * Chart primitives size themselves with ResizeObserver, large scatters fall back to canvas, and
 * the Monte Carlo runner constructs a Worker. Without these, rendering a module throws for
 * reasons that have nothing to do with the module.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext) {
  // A no-op 2D context: canvas paths are a drawing detail, never an assertion target.
  HTMLCanvasElement.prototype.getContext = (() =>
    new Proxy(
      {},
      {
        get: (_t, prop) => (prop === 'canvas' ? undefined : () => undefined),
      },
    )) as unknown as HTMLCanvasElement['getContext']
}

// Deliberately NO Worker stub. `runSimulation` runs synchronously in-thread when `Worker` is
// undefined, which is what the simulation tests rely on to get deterministic results. Defining a
// no-op Worker makes those simulations silently return nothing.

// jsdom lacks matchMedia; settings code guards on it but components may call it directly.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
