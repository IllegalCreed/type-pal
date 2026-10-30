// @vitest-environment node
/** Current extracted scripts through the event runner; requires corrected PAL resources. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AbstractKey, Command, EventObjectsFile } from '@type-pal/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCommandBus } from './command-bus.js'
import { setSceneLoader, tickEventSystem } from './event-system.js'
import { createInitialGameState, npcFromEventObject } from './game-state.js'
import { setGlobalEvents } from './script-catalog.js'

const resourceRoot = fileURLToPath(new URL('../../../../data/extracted/', import.meta.url))
function readResource<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(resourceRoot, path), 'utf8'))
}
const commands = readResource<{ segments: { commands: Command[] }[] }>('events/all.json')
  .segments[0]!.commands
const objects = readResource<EventObjectsFile>('data/event-objects.json')
let now = 0

function environment(scene = 81) {
  const gs = createInitialGameState({ x: 1280, y: 640, facing: 'up' })
  gs.allEventObjects = objects.eventObjects.map((object) => npcFromEventObject(object))
  gs.wNumScene = scene + 1
  const [start, end] = objects.sceneRanges[scene]!
  gs.npcs = Array.from({ length: end - start }, (_, index) => gs.allEventObjects![start + index]!)
  return { gs, bus: createCommandBus() }
}

// A legal suspended scene-script cursor is the input here, not a complete E2E checkpoint.
// Keep dialogue and confirm processing real; only advance the clock deterministically.
function play(
  env: ReturnType<typeof environment>,
  ip: number,
  owner: number,
  denyCount = 0,
  stopAfterCourtAnswer = false,
  onEnterScene?: number,
) {
  const { gs, bus } = env
  const lines: string[] = []
  let previousLine = ''
  let answers = 0
  gs.eventCursor =
    onEnterScene === undefined
      ? { ip, currentEventObjectId: owner, triggerOwnerId: owner }
      : { ip, onEnterSceneId: onEnterScene, onEnterStartIp: ip }
  gs.mode = 'event'
  for (let frame = 0; frame < 5000 && gs.mode === 'event'; frame++) {
    now += 1000
    gs.nowMs = now
    const question = gs.eventCursor?.waiting === 'confirm'
    const pressed = new Set<AbstractKey>([question && answers < denyCount ? 'Cancel' : 'Confirm'])
    if (question) {
      if (answers >= denyCount && !gs.eventCursor?.confirmYes) pressed.add('Right')
      answers++
    }
    tickEventSystem(gs, { held: new Set(), pressed, frameNum: frame })
    const line = gs.dialogBox?.currentLineText
    if (line && line !== previousLine) {
      lines.push(line)
      previousLine = line
    }
    bus.drain()
    // Once the player agrees, the unrelated subsequent trial dialogue is outside this contract.
    const current = gs.eventCursor?.ip
    if (stopAfterCourtAnswer && current !== undefined && current >= 14487 && current < 14500) {
      return { lines, answers }
    }
  }
  expect(gs.mode, 'finite script must terminate within the bound').toBe('explore')
  return { lines, answers }
}

beforeEach(() => {
  now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  setGlobalEvents(structuredClone(commands))
})
afterEach(() => {
  setGlobalEvents([])
  setSceneLoader(null)
  vi.restoreAllMocks()
})

describe('PAL authored script corrections: court and gate', () => {
  it('orders one beating demand before each answer and repeats only after denial', () => {
    const result = play(environment(), 14457, 1518, 2, true)
    expect(result.answers).toBe(3)
    expect(result.lines).toEqual([
      '还不肯招？再打！',
      '你招是不招！？',
      '不招？再打！',
      '你招是不招！？',
      '不招？再打！',
      '你招是不招！？',
    ])
  })

  it.each([1599, 1600, 1601])('opening the gate through guard %i moves it only once', (first) => {
    const env = environment(84)
    play(env, 14971, 1518)
    const gate = env.gs.allEventObjects![1599]!
    const initialX = gate.x
    const initialY = gate.y
    const callers = [first, ...[1599, 1600, 1601].filter((id) => id !== first), first]
    for (const [index, id] of callers.entries()) {
      const npc = env.gs.allEventObjects![id]!
      const ip = npc.triggerResume?.ip ?? Number(npc.triggerLabel?.slice(2))
      expect(Number.isInteger(ip)).toBe(true)
      const result = play(env, ip, id)
      expect(result.lines).toEqual(
        index === 0
          ? ['奉太守之命，可让两位出城。']
          : ['你就是那位抓到女飞贼', '集团首领的少侠吗？', '真了不起！'],
      )
      expect({ x: gate.x, y: gate.y }).toEqual({ x: initialX - 32, y: initialY })
    }
  })
})

it('completes the altar farewell onEnter without replaying it on the next visit', () => {
  const env = environment(77)
  const first = play(env, 12820, 0, 0, false, 77)
  expect(first.lines).toContain('韩医仙一行人走了')
  const resume = env.gs.sceneOnEnterIp[77]
  expect(resume).toBeDefined()
  const second = play(env, resume!, 0, 0, false, 77)
  expect(second.lines).toEqual([])
})

it.each([0, 2])('keeps the scholar hiring state %i until his dialogue decision', (hiredState) => {
  const env = environment(102)
  env.gs.allEventObjects![1882]!.sState = hiredState
  const result = play(env, 16389, 1883)
  expect(result.lines.includes('二．．二位．．英雄')).toBe(hiredState === 0)
  expect(env.gs.allEventObjects![1882]!.sState).toBe(0)
})

it('hides the Peach Forest Anu instance until its entrance preparation reveals her', () => {
  const env = environment(182)
  const anu = env.gs.allEventObjects![2984]!
  expect(anu.sState).toBe(0)
  env.gs.mode = 'event'
  env.gs.eventCursor = { ip: 27448, currentEventObjectId: 2984 }
  for (let frame = 0; frame < 10; frame++) {
    now += 1000
    env.gs.nowMs = now
    tickEventSystem(env.gs, { held: new Set(), pressed: new Set(), frameNum: frame })
    const ip = env.gs.eventCursor?.ip
    if (ip !== undefined && ip >= 27449 && ip < 27460) break
  }
  expect(anu.sState).toBe(1)
  expect(env.gs.allEventObjects![2960]!.triggerLabel).toBe('L_25096')
})

it('handing over thirty-six worms clears Gai Luojiao and her retinue on the early route', () => {
  const env = environment(172)
  env.gs.allEventObjects![2862]!.sState = 1
  env.gs.inventory = [{ itemId: 152, count: 36 }]
  setSceneLoader(async () => {})
  expect(
    Array.from({ length: 7 }, (_, i) => env.gs.allEventObjects![3657 + i]!.sState).every(
      (state) => state! > 0,
    ),
  ).toBe(true)
  play(env, 28419, 2862)
  expect(env.gs.inventory.find((item) => item.itemId === 152)?.count ?? 0).toBe(0)
  expect(Array.from({ length: 7 }, (_, i) => env.gs.allEventObjects![3657 + i]!.sState)).toEqual([
    0, 0, 0, 0, 0, 0, 0,
  ])
  expect(env.gs.wNumScene).toBe(175)
})

it('repairs the original corrupt farewell text without adding a garbage question-mark line', () => {
  const env = environment(9)
  env.gs.allEventObjects![188]!.triggerResume = { ip: 3919 }
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = play(env, 3919, 188)
    expect(result.lines).toEqual(['呵．．怎么可能嘛，不要放', '在心上，大概是我老眼昏花', '看错了'])
  }
})
