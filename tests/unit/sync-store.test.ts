/**
 * Regression tests for cross-device progress sync.
 *
 * The defect these exist for, found by the Phase 4 QA review: entering the passcode on a second
 * device and then merely navigating pushed that device's empty progress over the saved copy. The
 * remote store keeps one revision per passcode and has no undo, so the first device's work was
 * gone. `unlock` fetched the remote copy to display its timestamp but never took it, and autosave
 * was armed the moment a passcode existed.
 *
 * The invariant: a device never writes over a saved copy it has not taken.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SyncPayload } from '@/lib/sync'

const pull = vi.fn<(code: string) => Promise<SyncPayload | null>>()
const push = vi.fn<(code: string, payload: SyncPayload) => Promise<void>>()

vi.mock('@/lib/sync', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/sync')>()),
  pull: (code: string) => pull(code),
  push: (code: string, payload: SyncPayload) => push(code, payload),
}))

const { useSync } = await import('@/store/sync')
const { useProgress } = await import('@/store/progress')

const remoteCopy = (savedAt: string, beats: Record<string, unknown> = { 'act-1-01-x': true }): SyncPayload =>
  ({ v: 1, savedAt, progress: { learnerSeed: 1234, completed: {}, beats, drills: {}, checkpoints: {}, lastModule: null, decisions: {}, consults: {} }, log: {} }) as unknown as SyncPayload

beforeEach(() => {
  pull.mockReset()
  push.mockReset()
  useSync.setState({ passcode: null, lastSavedAt: null, status: 'idle', message: null, remoteSavedAt: null, pendingRemote: false })
  useProgress.setState({ beats: {}, completed: {}, checkpoints: {} } as never)
})

describe('sync store', () => {
  it('suppresses autosave when a passcode unlocks onto an existing saved copy', async () => {
    pull.mockResolvedValue(remoteCopy('2026-01-01T10:00:00.000Z'))
    await useSync.getState().unlock('helios')

    const s = useSync.getState()
    expect(s.passcode).toBe('HELIOS')
    expect(s.remoteSavedAt).toBe('2026-01-01T10:00:00.000Z')
    // The whole fix: this device must not write until it has taken the copy.
    expect(s.pendingRemote).toBe(true)
    expect(push).not.toHaveBeenCalled()
  })

  it('allows autosave when nothing is saved under the passcode yet', async () => {
    pull.mockResolvedValue(null)
    await useSync.getState().unlock('helios')
    expect(useSync.getState().pendingRemote).toBe(false)
  })

  it('clears the suppression once the copy is loaded, and takes its progress', async () => {
    pull.mockResolvedValue(remoteCopy('2026-01-01T10:00:00.000Z', { 'act-2-01-y': true }))
    await useSync.getState().unlock('helios')
    await useSync.getState().load()

    expect(useSync.getState().pendingRemote).toBe(false)
    expect(useProgress.getState().beats).toHaveProperty('act-2-01-y')
  })

  it('clears the suppression on an explicit SAVE, which is the user choosing to overwrite', async () => {
    pull.mockResolvedValue(remoteCopy('2026-01-01T10:00:00.000Z'))
    push.mockResolvedValue()
    await useSync.getState().unlock('helios')
    expect(useSync.getState().pendingRemote).toBe(true)

    await useSync.getState().save()
    expect(push).toHaveBeenCalledTimes(1)
    expect(useSync.getState().pendingRemote).toBe(false)
  })

  it('re-suppresses when another device has saved something newer', async () => {
    push.mockResolvedValue()
    pull.mockResolvedValue(null)
    await useSync.getState().unlock('helios')
    await useSync.getState().save()
    const mine = useSync.getState().lastSavedAt!

    // Somebody else writes after us.
    pull.mockResolvedValue(remoteCopy(new Date(Date.parse(mine) + 60_000).toISOString()))
    await useSync.getState().check()
    expect(useSync.getState().pendingRemote).toBe(true)
  })

  it('stays clear when the remote copy is the one this device wrote', async () => {
    push.mockResolvedValue()
    pull.mockResolvedValue(null)
    await useSync.getState().unlock('helios')
    await useSync.getState().save()
    const mine = useSync.getState().lastSavedAt!

    pull.mockResolvedValue(remoteCopy(mine))
    await useSync.getState().check()
    expect(useSync.getState().pendingRemote).toBe(false)
  })

  it('leaves autosave suppressed when the check itself fails', async () => {
    pull.mockResolvedValue(remoteCopy('2026-01-01T10:00:00.000Z'))
    await useSync.getState().unlock('helios')
    pull.mockRejectedValue(new Error('network'))
    await useSync.getState().check()
    // Failing closed is the safe direction: an unreachable server must not license an overwrite.
    expect(useSync.getState().pendingRemote).toBe(true)
  })
})
