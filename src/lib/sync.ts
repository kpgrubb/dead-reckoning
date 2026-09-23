/**
 * Cross-device progress sync.
 *
 * The site is static, so there is no backend to authenticate against. A passcode is therefore not
 * a password: it is the *address* of your saved progress. It is hashed into an opaque key on a free
 * anonymous key-value store, and whoever knows the passcode can read or overwrite what is there.
 * That is an accepted trade for zero setup — see README. Never put anything private in here.
 *
 * localStorage remains the source of truth. Sync is opt-in, and every failure is non-fatal: if the
 * service is unreachable the app carries on exactly as before.
 */
import { hashString } from './rng'

const ENDPOINT = 'https://textdb.dev/api/data'
/** Namespaces our keys so they cannot collide with another project's on the shared service. */
const SALT = 'dead-reckoning/v1'

export interface SyncPayload {
  /** Schema version, so a later format change can migrate rather than corrupt. */
  v: 1
  savedAt: string
  progress: unknown
  log: unknown
}

/** Opaque, stable store key for a passcode. Not secret — it is derivable by anyone with the code. */
export function syncKey(passcode: string): string {
  const norm = passcode.trim().toUpperCase()
  const a = hashString(`${SALT}|${norm}`).toString(36)
  const b = hashString(`${norm}|${SALT}|2`).toString(36)
  return `dr-${a}${b}`
}

function url(passcode: string): string {
  return `${ENDPOINT}/${syncKey(passcode)}`
}

export class SyncError extends Error {}

/** Read the saved payload for a passcode. Returns null when nothing has been saved yet. */
export async function pull(passcode: string, signal?: AbortSignal): Promise<SyncPayload | null> {
  let res: Response
  try {
    res = await fetch(url(passcode), { signal, cache: 'no-store' })
  } catch (e) {
    throw new SyncError(`Could not reach the sync service (${(e as Error).message}).`)
  }
  if (res.status === 404) return null
  if (!res.ok) throw new SyncError(`Sync service returned ${res.status}.`)
  const text = (await res.text()).trim()
  // An unused key comes back empty rather than 404 on this service.
  if (!text) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new SyncError('Saved data is not readable. It may have been overwritten by something else.')
  }
  const p = parsed as Partial<SyncPayload>
  if (!p || typeof p !== 'object' || p.v !== 1) throw new SyncError('Saved data is in an unrecognised format.')
  return p as SyncPayload
}

/** Write the payload for a passcode, replacing whatever was there. */
export async function push(passcode: string, payload: SyncPayload, signal?: AbortSignal): Promise<void> {
  let res: Response
  try {
    res = await fetch(url(passcode), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (e) {
    throw new SyncError(`Could not reach the sync service (${(e as Error).message}).`)
  }
  if (!res.ok) throw new SyncError(`Sync service returned ${res.status}.`)
}
