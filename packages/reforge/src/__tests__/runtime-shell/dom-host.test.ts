// @vitest-environment jsdom
import { IDBDatabase } from 'fake-indexeddb'
import { expect, test, vi } from 'vitest'
import { chromePng, installShellHost } from './dom-host.js'

test('close joins a real transaction and its thumbnail continuation before disposing browser IO', async () => {
  const originalBitmap = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')
  const originalTransaction = Object.getOwnPropertyDescriptor(IDBDatabase.prototype, 'transaction')
  const host = await installShellHost()
  let work: Promise<void> | undefined
  let bitmap: ImageBitmap | undefined
  try {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('shell-host-lifecycle', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('records')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const decode = createImageBitmap
    const image = new Blob([chromePng().slice().buffer], { type: 'image/png' })
    let outcome = 'pending'
    const transaction = database.transaction('records', 'readwrite')
    work = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => {
        void (async () => {
          bitmap = await decode(image)
          outcome = 'decoded'
          resolve()
        })().catch(reject)
      }
      transaction.onabort = () => reject(transaction.error)
      transaction.objectStore('records').put('ready', 'key')
    })

    const closing = host.close()
    expect(host.close()).toBe(closing)
    await closing
    expect(outcome).toBe('decoded')
    expect(bitmap?.close).toHaveBeenCalledOnce()
    expect(Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap')).toEqual(originalBitmap)
    expect(Object.getOwnPropertyDescriptor(IDBDatabase.prototype, 'transaction')).toEqual(
      originalTransaction,
    )
  } finally {
    await work
    await host.close()
    // Also collect a late bitmap when the isolated no-drain counter fails above.
    for (const frame of host.bitmaps)
      if (vi.mocked(frame.close).mock.calls.length === 0) frame.close()
  }
})
