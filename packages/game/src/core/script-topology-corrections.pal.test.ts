// @vitest-environment node
/** Real corrected portal scripts and map collision; no complete E2E route claim. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Command, EventObjectsFile, PixelPos, Tilemap } from '@type-pal/shared'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createCommandBus } from './command-bus.js'
import { setSceneLoader, tickEventSystem } from './event-system.js'
import { createInitialGameState, npcFromEventObject } from './game-state.js'
import { isWalkable } from './scene-system.js'
import { findSearchableNpc } from './scene-system-search.js'
import { setGlobalEvents } from './script-catalog.js'

const resourceRoot = fileURLToPath(new URL('../../../../data/extracted/', import.meta.url))
function resource<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(resourceRoot, path), 'utf8'))
}
const commands = resource<{ segments: { commands: Command[] }[] }>('events/all.json').segments[0]!
  .commands
const objects = resource<EventObjectsFile>('data/event-objects.json')
let now = 0

function reachable(map: Tilemap, start: PixelPos, goal: (p: PixelPos) => boolean): boolean {
  if (!isWalkable(map, start.x, start.y, [], 0, true)) return false
  const queue = [start]
  const seen = new Set([`${start.x},${start.y}`])
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!
    if (goal(p)) return true
    for (const [dx, dy] of [
      [16, 8],
      [16, -8],
      [-16, 8],
      [-16, -8],
    ]) {
      const next = { x: p.x + dx!, y: p.y + dy! }
      const key = `${next.x},${next.y}`
      if (!seen.has(key) && isWalkable(map, next.x, next.y, [], 0, true)) {
        seen.add(key)
        queue.push(next)
      }
    }
  }
  return false
}

function environment(scene: number) {
  const gs = createInitialGameState({ x: 1504, y: 1008, facing: 'down' })
  gs.wNumScene = scene + 1
  gs.allEventObjects = objects.eventObjects.map((e) => npcFromEventObject(e))
  // Asset I/O is the seam; the portal's scene choice and setPartyPos run in the real interpreter.
  setSceneLoader(async () => {
    gs.sceneLoading = false
  })
  return { gs, bus: createCommandBus() }
}

function portal(env: ReturnType<typeof environment>, ip: number, owner: number) {
  env.gs.mode = 'event'
  env.gs.eventCursor = { ip, currentEventObjectId: owner, triggerOwnerId: owner }
  for (let frame = 0; frame < 50 && env.gs.mode === 'event'; frame++) {
    now += 1000
    env.gs.nowMs = now
    tickEventSystem(env.gs, { held: new Set(), pressed: new Set(['Confirm']), frameNum: frame })
    env.bus.drain()
  }
  expect(env.gs.mode).toBe('explore')
}

beforeEach(() => {
  now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  setGlobalEvents(structuredClone(commands))
})
afterEach(() => {
  setSceneLoader(null)
  setGlobalEvents([])
  vi.restoreAllMocks()
})

it.each([
  [226, 30946, 3969],
  [225, 30950, 3949],
])('trial portal %i/%i reaches the hidden-gu chest island and its return', (source, ip, owner) => {
  const env = environment(source!)
  portal(env, ip!, owner!)
  expect(env.gs.wNumScene).toBe(227)
  const map = resource<Tilemap>('data/tilemap/224.json')
  const chest = env.gs.allEventObjects![3999]!
  expect(
    reachable(map, env.gs.party, (p) =>
      ['down', 'left', 'up', 'right'].some(
        (dir) =>
          findSearchableNpc([chest], dir as 'down' | 'left' | 'up' | 'right', p.x, p.y)?.id ===
          3999,
      ),
    ),
  ).toBe(true)
  const exit = env.gs.allEventObjects![3989]!
  expect(
    reachable(map, env.gs.party, (p) => Math.abs(p.x - exit.x) + 2 * Math.abs(p.y - exit.y) < 16),
  ).toBe(true)
  portal(env, 31046, exit.id)
  expect(env.gs.wNumScene).toBe(227)
  expect({ x: env.gs.party.x, y: env.gs.party.y }).toEqual({ x: 1696, y: 1136 })
  expect(isWalkable(map, env.gs.party.x, env.gs.party.y, [], 0, true)).toBe(true)
})

it.each([
  [249, 34024, 4400, 261],
  [285, 35091, 4813, 287],
])('palace portal %i/%i reaches room C and can return', (source, ip, owner, destination) => {
  const env = environment(source!)
  portal(env, ip!, owner!)
  expect(env.gs.wNumScene).toBe(destination)
  expect({ x: env.gs.party.x, y: env.gs.party.y }).toEqual({ x: 928, y: 816 })
  const map = resource<Tilemap>('data/tilemap/204.json')
  const exit = env.gs.allEventObjects![source === 249 ? 4557 : 4841]!
  expect(exit.spriteNum).toBe(0)
  expect(exit.sState).toBe(1)
  const threshold = ((exit.triggerMode ?? 0) - 4) * 32 + 16
  expect(threshold).toBe(48)
  expect(
    reachable(
      map,
      env.gs.party,
      (p) => Math.abs(p.x - exit.x) + 2 * Math.abs(p.y - exit.y) < threshold,
    ),
  ).toBe(true)
  portal(env, Number(exit.triggerLabel!.slice(2)), exit.id)
  expect(env.gs.wNumScene).toBe(source! + 1)
  expect({ x: env.gs.party.x, y: env.gs.party.y }).toEqual({ x: 1392, y: 616 })
  expect(
    isWalkable(
      resource<Tilemap>('data/tilemap/203.json'),
      env.gs.party.x,
      env.gs.party.y,
      [],
      0,
      true,
    ),
  ).toBe(true)
})
