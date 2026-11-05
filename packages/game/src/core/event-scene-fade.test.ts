/** Dither-fade consumption and scene steps that are allowed to begin automatic fade-in. */
import type { Command, Palette } from '@type-pal/shared'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import {
  buildLabelMap,
  OP_FADE_SCREEN,
  OP_PARTY_WALK_TO,
  OP_PARTY_WALK_TO_4,
  OP_PLAY_SOUND,
  OP_RIDE_OBJECT_4,
  OP_SET_CAMERA,
  OP_SHAKE_SCREEN,
  tickEventSystem,
  tickSceneAutoFadeIn,
} from './event-system.js'
import type { EventCursor } from './game-state.js'
import { buildFadeIn } from './palette-fade.js'
import { snap } from './scene.test-fixtures.js'

function palette(rgb: [number, number, number]): Palette {
  return { colors: Array.from({ length: 256 }, () => [...rgb]), cycles: [] }
}

describe('dither-fade script consumption', () => {
  it('unfreezes the scene, holds the opcode until 1440ms, then resumes exactly once', () => {
    let now = 1000
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now)
    onTestFinished(() => clock.mockRestore())
    const gs = freshPlayerOpcodeState()
    gs.sceneLoading = true
    gs.blackScreenHold = true
    const commands: Command[] = [
      { op: 'raw', opcode: OP_FADE_SCREEN, operands: [1, 0, 0] },
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [77, 0, 0] },
      { op: 'end' },
    ]
    gs.mode = 'event'
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
    tickEventSystem(gs, snap())
    // TS budgets 72 intervals from VIDEO_FadeScreen's (speed+1)*10ms step.
    // This verifies that budget's consumption, not C's first-draw wall-clock phase.
    expect(gs.fadeState).toMatchObject({ speed: 1, totalMs: 1440, startTimeMs: 1000 })
    expect(gs.blackScreenHold).toBe(false)
    expect(gs.sceneLoading).toBe(false)
    expect(gs.eventCursor?.waiting).toBe('fade-screen')
    expect(gs.eventCursor?.ip).toBe(0)
    expect(gs.pendingSounds ?? []).toEqual([])
    now = 2439
    tickEventSystem(gs, snap())
    expect(gs.eventCursor?.waiting).toBe('fade-screen')
    expect(gs.pendingSounds ?? []).toEqual([])
    now = 2440
    tickEventSystem(gs, snap())
    expect(gs.fadeState).toBeUndefined()
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.pendingSounds).toEqual([77])
    expect(gs.mode).toBe('explore')
  })
})

describe('automatic scene fade-in lookahead', () => {
  function atOpcode(opcode: number, operands: [number, number, number]) {
    const gs = freshPlayerOpcodeState()
    gs.basePalette = palette([120, 60, 30])
    gs.palette = palette([0, 0, 0])
    gs.needToFadeIn = true
    gs.mode = 'event'
    gs.npcs = [{ id: 1, x: 0, y: 0, spriteNum: 1, sState: 1 }]
    const commands: Command[] = [{ op: 'raw', opcode, operands }]
    gs.eventCursor = {
      commands,
      labelMap: buildLabelMap(commands),
      ip: 0,
      currentEventObjectId: 1,
    }
    return gs
  }

  it.each([
    { name: 'party walk', opcode: OP_PARTY_WALK_TO, operands: [10, 10, 0] },
    { name: 'ride', opcode: OP_RIDE_OBJECT_4, operands: [10, 10, 0] },
    { name: 'multi-frame camera pan', opcode: OP_SET_CAMERA, operands: [8, 4, 3] },
    { name: 'speed-four party walk', opcode: OP_PARTY_WALK_TO_4, operands: [10, 10, 0] },
  ] satisfies Array<{
    name: string
    opcode: number
    operands: [number, number, number]
  }>)('$name may consume needToFadeIn before its first scene step', ({ opcode, operands }) => {
    const gs = atOpcode(opcode, operands)
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.paletteFadeState?.targetColors[0]).toEqual([120, 60, 30])
  })

  it('a screen-shake instruction does not consume scene fade-in', () => {
    const gs = atOpcode(OP_SHAKE_SCREEN, [10, 10, 0])
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.paletteFadeState).toBeUndefined()
  })
  it.each([
    { name: 'camera recenter', operands: [0, 0, 0xffff] },
    { name: 'single-step camera pan', operands: [10, 10, 1] },
  ] satisfies Array<{
    name: string
    operands: [number, number, number]
  }>)('$name does not start a lookahead fade', ({ operands }) => {
    const gs = atOpcode(OP_SET_CAMERA, operands)
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(true)
    expect(gs.paletteFadeState).toBeUndefined()
  })
})

describe('automatic fade admission', () => {
  it('exploration consumes the request, releases black hold and creates a 600ms fade to the base palette', () => {
    const gs = freshPlayerOpcodeState()
    gs.basePalette = palette([12, 24, 36])
    gs.needToFadeIn = true
    gs.blackScreenHold = true
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(false)
    expect(gs.blackScreenHold).toBe(false)
    expect(gs.paletteFadeState?.totalMs).toBe(600)
    expect(gs.paletteFadeState?.targetColors).toEqual(palette([12, 24, 36]).colors)
  })

  it.each([
    'palette fade',
    'dither fade',
    'loading',
    'no request',
  ] as const)('%s prevents a new automatic fade', (condition) => {
    const gs = freshPlayerOpcodeState()
    gs.needToFadeIn = condition !== 'no request'
    if (condition === 'palette fade')
      gs.paletteFadeState = buildFadeIn(palette([1, 2, 3]).colors, 600, 1000)
    if (condition === 'dither fade')
      gs.fadeState = { speed: 2, totalMs: 2160, startTimeMs: 1000, appliedSteps: 0 }
    if (condition === 'loading') gs.sceneLoading = true
    const paletteFade = gs.paletteFadeState
    const ditherFade = gs.fadeState
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(condition !== 'no request')
    expect(gs.paletteFadeState).toBe(paletteFade)
    expect(gs.fadeState).toBe(ditherFade)
  })

  it.each([
    { waiting: 'frame-wait', allowed: true },
    { waiting: 'scene-fade', allowed: true },
    { waiting: 'camera-pan', allowed: true },
    { waiting: 'dialog', allowed: false },
  ] satisfies Array<{
    waiting: EventCursor['waiting']
    allowed: boolean
  }>)('event wait $waiting allows fade=$allowed', ({ waiting, allowed }) => {
    // This isolates the admission predicate; it does not simulate each modal lifecycle.
    const gs = freshPlayerOpcodeState()
    gs.mode = 'event'
    gs.needToFadeIn = true
    gs.eventCursor = { ip: 1, waiting }
    tickSceneAutoFadeIn(gs)
    expect(gs.needToFadeIn).toBe(!allowed)
    expect(gs.paletteFadeState !== undefined).toBe(allowed)
  })
})

describe('palette fade script completion', () => {
  it('a real FadeIn holds its suffix until completion and finalizes all target colors before continuing', () => {
    let now = 1000
    const clock = vi.spyOn(performance, 'now').mockImplementation(() => now)
    onTestFinished(() => clock.mockRestore())
    const gs = freshPlayerOpcodeState()
    gs.basePalette = palette([12, 24, 36])
    gs.palette = palette([0, 0, 0])
    const commands: Command[] = [
      { op: 'raw', opcode: 0x51, operands: [1, 0, 0] },
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [77, 0, 0] },
      { op: 'end' },
    ]
    gs.mode = 'event'
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0 }
    tickEventSystem(gs, snap())
    expect(gs.eventCursor?.waiting).toBe('palette-fade')
    expect(gs.palette?.colors).toEqual(palette([0, 0, 0]).colors)
    now = 1599
    tickEventSystem(gs, snap())
    expect(gs.pendingSounds ?? []).toEqual([])
    expect(gs.eventCursor?.ip).toBe(0)
    now = 1600
    tickEventSystem(gs, snap())
    expect(gs.palette?.colors).toEqual(palette([12, 24, 36]).colors)
    expect(gs.paletteFadeState).toBeUndefined()
    expect(gs.pendingSounds).toEqual([77])
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })

  it('a missing dither state releases the defensive wait without skipping the current instruction', () => {
    const gs = freshPlayerOpcodeState()
    const commands: Command[] = [
      { op: 'raw', opcode: OP_PLAY_SOUND, operands: [77, 0, 0] },
      { op: 'end' },
    ]
    gs.mode = 'event'
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0, waiting: 'fade-screen' }
    tickEventSystem(gs, snap())
    expect(gs.pendingSounds).toEqual([77])
    expect(gs.eventCursor).toBeUndefined()
    expect(gs.mode).toBe('explore')
  })
})
