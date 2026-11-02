/** A connection lease, never a receipt/data cache. Every caller still creates a strict transaction. */
interface Entry {
  promise: Promise<IDBDatabase>
  active: number
  retired: boolean
  close?: () => void
}
interface Session {
  users: number
  entries: Map<IDBFactory, Entry>
}
let session: Session | undefined

/** Lazy so IO-boundary test adapters and preflight failures need no IndexedDB at all. */
export async function withAuthorSaveStoreSession<T>(operation: () => Promise<T>): Promise<T> {
  session ??= { users: 0, entries: new Map() }
  const owned = session
  owned.users++
  try {
    return await operation()
  } finally {
    if (--owned.users === 0) {
      if (session === owned) session = undefined
      for (const entry of owned.entries.values()) {
        entry.retired = true
        if (!entry.active) entry.close?.()
      }
      owned.entries.clear()
    }
  }
}

export async function acquireAuthorSaveConnection(open: () => Promise<IDBDatabase>) {
  const current = session
  if (!current) {
    const db = await open()
    return { db, release: () => db.close() }
  }
  const factory = indexedDB
  let entry = current.entries.get(factory)
  if (!entry) {
    const created: Entry = { promise: open(), active: 0, retired: false }
    entry = created
    current.entries.set(factory, created) // share the in-flight open, not only its eventual value
    created.promise = created.promise.then((db) => {
      let closed = false
      const retire = () => {
        created.retired = true
        if (current.entries.get(factory) === created) current.entries.delete(factory)
      }
      created.close = () => {
        if (!closed) {
          closed = true
          db.close()
        }
      }
      db.onversionchange = () => {
        retire()
        created.close?.() // IDB lets already running transactions settle before closing.
      }
      db.onclose = retire
      return db
    })
  }
  const leased = entry
  leased.active++
  let released = false
  const release = () => {
    if (released) return
    released = true
    if (--leased.active === 0 && leased.retired) leased.close?.()
  }
  try {
    return { db: await leased.promise, release }
  } catch (error) {
    leased.retired = true
    if (current.entries.get(factory) === leased) current.entries.delete(factory)
    release()
    throw error // never retry a failed persistence operation implicitly
  }
}
