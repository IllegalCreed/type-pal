import type { WorldState } from '@type-pal/content'
import { expect, vi } from 'vitest'
import type { ShellHost } from './dom-host.js'

export interface ShellObservation {
  readonly world: WorldState
  readonly sceneId: string
  readonly dialogue: boolean
  readonly script: { running: boolean }
  readonly renderDebug: { menuActive: boolean; inBattle: boolean }
  readonly player: { pos: { col: number; row: number; height: number } }
}
export function observation(): ShellObservation {
  const value: unknown = Reflect.get(window, '__reforge')
  if (!value || typeof value !== 'object' || !('world' in value) || !('sceneId' in value))
    throw new Error('normal runtime not booted')
  // Existing product debug surface; read-only tests never mutate this object.
  return value as ShellObservation
}
export async function drain() {
  // Let the real asynchronous frame finish; a fixed number of Promise hops is not a frame receipt.
  const { setImmediate } = await vi.importActual<{ setImmediate(callback: () => void): unknown }>(
    'node:timers',
  )
  await new Promise<void>((resolve) => setImmediate(resolve))
}
export async function key(host: ShellHost, value: string, dt = 100) {
  host.key(value)
  await host.frame(dt)
  await drain()
  host.release(value)
}
export async function until(host: ShellHost, condition: () => boolean, limit = 80) {
  for (let i = 0; i < limit && !condition(); i++) {
    await host.frame(100)
    await drain()
  }
  expect(condition()).toBe(true)
}
