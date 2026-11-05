/** DEV state snapshots and their opt-in browser download boundary. */
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { createInitialGameState, type GameState } from '../core/game-state.js'
import { dumpFrameJson, initStateDump } from './state-dump.js'

function gsForDump() {
  const gs = createInitialGameState({ x: 300, y: 400, facing: 'left' })
  gs.wNumScene = 4
  gs.camera.x = 140
  gs.camera.y = 288
  gs.partyMembers = [0, 1]
  gs.PlayerRolesRuntime.rgwSpriteNum[0] = 2
  gs.PlayerRolesRuntime.rgwSpriteNum[1] = 5
  gs.npcs = [
    {
      id: 3,
      x: 100,
      y: 50,
      spriteNum: 9,
      facing: 'up',
      scriptedFrame: 3,
      sState: 2,
      sLayer: 1,
      triggerMode: 4,
    },
    { id: 8, x: 200, y: 60, spriteNum: 11 }, // 最小 npc：dir 0 / frame 0 / sState 1 / layer 0 / trigMode 0
  ]
  return gs
}

function snapshot(gs: GameState, frame = 0, walkFrames = 4): unknown {
  return JSON.parse(dumpFrameJson(gs, frame, walkFrames))
}

const originalUrl = window.location.href
const debugKeys = ['__tpDumpBuffer', '__tpDumpDownload'] as const
const originalPorts = debugKeys.map((key) => Object.getOwnPropertyDescriptor(window, key))

afterEach(() => {
  window.history.replaceState(null, '', originalUrl)
  debugKeys.forEach((key, index) => {
    const descriptor = originalPorts[index]
    if (descriptor) Object.defineProperty(window, key, descriptor)
    else Reflect.deleteProperty(window, key)
  })
})

describe('state snapshot fields', () => {
  it('serializes the complete scene, party and global NPC fields with explicit defaults', () => {
    const gs = gsForDump()
    expect(snapshot(gs, 42, 4)).toEqual({
      frame: 42,
      scene: 4,
      viewport: [140, 288],
      party: {
        x: 300,
        y: 400,
        dir: 1, // left
        wFrame: 4, // left, idle, four directional frames
        role: 0,
        sprite: 2,
        members: [
          { role: 0, sprite: 2 },
          { role: 1, sprite: 5 },
        ],
      },
      npcs: [
        { id: 3, x: 100, y: 50, dir: 2, frame: 3, sState: 2, sprite: 9, layer: 1, trigMode: 4 },
        { id: 8, x: 200, y: 60, dir: 0, frame: 0, sState: 1, sprite: 11, layer: 0, trigMode: 0 },
      ],
    })
  })

  it.each([
    { name: 'idle scripted pose', walking: false, step: 0, script: 7, frames: 4, expected: 7 },
    { name: 'zero scripted pose', walking: false, step: 0, script: 0, frames: 4, expected: 0 },
    {
      name: 'three-frame walking overrides pose',
      walking: true,
      step: 2,
      script: 7,
      frames: 3,
      expected: 6,
    },
    {
      name: 'four-frame walking overrides pose',
      walking: true,
      step: 3,
      script: 7,
      frames: 4,
      expected: 11,
    },
  ])('$name yields frame $expected', ({ walking, step, script, frames, expected }) => {
    const gs = gsForDump()
    gs.party.facing = 'up'
    gs.partyScriptedFrame[0] = script
    gs.walkingFrame = { walking, stepFrame: step }
    expect(snapshot(gs, 0, frames)).toMatchObject({ party: { wFrame: expected } })
  })

  it('keeps sprite zero and applies the same incomplete-input fallback to leader and members', () => {
    const gs = gsForDump()
    gs.PlayerRolesRuntime.rgwSpriteNum[0] = 0
    gs.partyLeaderSpriteId = 7
    expect(snapshot(gs)).toMatchObject({
      party: {
        sprite: 0,
        members: [
          { role: 0, sprite: 0 },
          { role: 1, sprite: 5 },
        ],
      },
    })
    // Deliberately incomplete diagnostic input, not a valid current save/runtime layout.
    gs.PlayerRolesRuntime.rgwSpriteNum = []
    expect(snapshot(gs)).toMatchObject({
      party: {
        sprite: 7,
        members: [
          { role: 0, sprite: 7 },
          { role: 1, sprite: 0 },
        ],
      },
    })
    gs.partyLeaderSpriteId = undefined
    gs.partyMembers = []
    expect(snapshot(gs)).toMatchObject({ party: { sprite: 0, role: 0, members: [] } })
  })
})

describe('state dump opt-in', () => {
  it('disabled dumping leaves no browser ports or buffered records', () => {
    window.history.replaceState(null, '', '/?tp_dump=0')
    const controller = initStateDump()
    expect(controller.enabled).toBe(false)
    controller.push(gsForDump(), 4)
    expect(Reflect.get(window, '__tpDumpBuffer')).toBeUndefined()
    expect(Reflect.get(window, '__tpDumpDownload')).toBeUndefined()
  })

  it('buffers sequential frames and downloads exactly those JSONL records before releasing its URL', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    onTestFinished(() => log.mockRestore())
    const createUrl = vi.fn<(blob: Blob) => string>(() => 'blob:state-dump-test')
    const revokeUrl = vi.fn<(url: string) => void>()
    for (const [name, implementation] of [
      ['createObjectURL', createUrl],
      ['revokeObjectURL', revokeUrl],
    ] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(URL, name)
      Object.defineProperty(URL, name, { configurable: true, value: implementation })
      onTestFinished(() => {
        if (descriptor) Object.defineProperty(URL, name, descriptor)
        else Reflect.deleteProperty(URL, name)
      })
    }
    const downloads: Array<{ href: string; name: string }> = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push({ href: this.href, name: this.download })
    })
    onTestFinished(() => click.mockRestore())
    window.history.replaceState(null, '', '/?tp_dump=1')
    const controller = initStateDump()
    expect(controller.enabled).toBe(true)
    controller.push(gsForDump(), 4)
    controller.push(gsForDump(), 4)
    const buffer: unknown = Reflect.get(window, '__tpDumpBuffer')
    if (!Array.isArray(buffer) || !buffer.every((row) => typeof row === 'string')) {
      throw new Error('dump buffer must contain JSON strings')
    }
    expect(buffer).toHaveLength(2)
    expect(buffer.map((row) => JSON.parse(row))).toMatchObject([
      { frame: 0, scene: 4 },
      { frame: 1, scene: 4 },
    ])
    const download: unknown = Reflect.get(window, '__tpDumpDownload')
    if (typeof download !== 'function')
      throw new Error('enabled dump must expose its download callback')
    download()
    expect(downloads).toEqual([{ href: 'blob:state-dump-test', name: 'ts-dump.jsonl' }])
    expect(createUrl).toHaveBeenCalledTimes(1)
    const blob = createUrl.mock.calls[0]?.[0]
    if (!blob) throw new Error('download must create a Blob URL')
    expect(blob.type).toBe('application/x-ndjson')
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
    expect(text).toBe(`${buffer.join('\n')}\n`)
    expect(revokeUrl.mock.calls).toEqual([['blob:state-dump-test']])
    expect(log.mock.calls).toEqual([
      ['type-pal: state dump enabled. Run __tpDumpDownload() to save.'],
      ['type-pal: dumped 2 frames'],
    ])
  })
})
