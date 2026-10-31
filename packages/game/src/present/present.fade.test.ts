import type { Palette } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import { buildFadeIn, buildSceneFade, makeWorkingPalette } from '../core/palette-fade.js'
import { sceneContext, sceneMap } from './__tests__/scene-render-fixtures.js'
import { createFramebuffer } from './framebuffer.js'
import { presentFrame } from './present.js'
import { resetScreenWavePhase } from './screen-wave.js'

describe('Scene fade presentation', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetScreenWavePhase()
  })
  describe('cursorless fade completion preserves the actual restored palette', () => {
    const palette = (): Palette => ({
      colors: Array.from({ length: 256 }, (_, i) => [i, (i * 2) % 256, 255 - i]),
      cycles: [],
    })

    it.each([
      undefined,
      'dialog',
      'frame-wait',
    ] as const)('FadeIn without owning waiter (%s) restores all target colors', (waiting) => {
      const base = palette(),
        before = structuredClone(base)
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.palette = makeWorkingPalette(base)
      gs.paletteFadeState = buildFadeIn(base.colors, 600, 0)
      if (waiting) gs.eventCursor = { commands: [], labelMap: {}, ip: 0, waiting }
      vi.spyOn(performance, 'now').mockReturnValue(600)
      presentFrame(createFramebuffer(), gs, sceneContext())
      expect(gs.paletteFadeState).toBeUndefined()
      expect(gs.palette.colors).toEqual(before.colors)
      expect(base).toEqual(before)
    })

    it.each([
      'palette-fade',
      'scene-fade',
    ] as const)('%s remains owned by the event system', (waiting) => {
      const base = palette(),
        gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.palette = makeWorkingPalette(base)
      const fade = buildFadeIn(base.colors, 600, 0)
      gs.paletteFadeState = fade
      gs.eventCursor = { commands: [], labelMap: {}, ip: 0, waiting }
      vi.spyOn(performance, 'now').mockReturnValue(600)
      presentFrame(createFramebuffer(), gs, sceneContext())
      expect(gs.paletteFadeState).toBe(fade)
      expect(gs.palette.colors).toEqual(base.colors.map((c) => c.map((v) => (v * 60) >> 6)))
      expect(gs.eventCursor.ip).toBe(0)
    })

    it('无人等待且 FadeIn 尚未完成时保留状态和游标', () => {
      const base = palette()
      const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.palette = makeWorkingPalette(base)
      const fade = buildFadeIn(base.colors, 600, 0)
      gs.paletteFadeState = fade
      const cursor = { commands: [], labelMap: {}, ip: 0, waiting: 'dialog' as const }
      gs.eventCursor = cursor
      vi.spyOn(performance, 'now').mockReturnValue(100)
      presentFrame(createFramebuffer(), gs, sceneContext())
      expect(gs.paletteFadeState).toBe(fade)
      expect(gs.eventCursor).toBe(cursor)
      expect(gs.eventCursor.ip).toBe(0)
      expect(gs.palette.colors[128]).toEqual([20, 0, 19]) // j=10, each channel ×10/64.
    })

    it('cursorless SceneFade still keeps its documented 63/64 endpoint', () => {
      const base = palette(),
        gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
      gs.palette = makeWorkingPalette(base)
      gs.paletteFadeState = buildSceneFade(base.colors, base.colors, true, 600, 0)
      vi.spyOn(performance, 'now').mockReturnValue(600)
      presentFrame(createFramebuffer(), gs, sceneContext())
      expect(gs.paletteFadeState).toBeUndefined()
      expect(gs.palette.colors).toEqual(base.colors.map((c) => c.map((v) => (v * 63) >> 6)))
    })
  })

  describe('G8 SceneFade 72 帧 dither 集成(present 驱动 — sdlpal video.c:1130 VIDEO_FadeScreen)', () => {
    // dither 数学(nibble blend)由 dither-fade.test.ts 覆盖;此处测 present 层**集成驱动**:
    //   ① 首帧从 fb(clear 前)snapshot backupPixels ② 按 elapsedMs/totalMs 推进 appliedSteps 0→72
    //   ③ 首帧旧画面与最终目标画面像素；不据此声称中间每帧主角可见。
    it('snapshot backupPixels(clear 前)+ 按 elapsed 推进 0→36→72 + 显示 backupPixels', () => {
      const nowSpy = vi.spyOn(performance, 'now')
      const gs = createInitialGameState({ x: 160, y: 112, facing: 'down' })
      const ctx = sceneContext(sceneMap(20, 20))
      const fb = createFramebuffer()
      fb.indices.fill(0x35) // "旧场景"像素(snapshot 源)
      // totalMs=720 → 10ms/step;speed 字段仅记录,present 用 totalMs。
      gs.fadeState = { speed: 2, totalMs: 720, startTimeMs: 0, appliedSteps: 0 }

      // 帧1(elapsed 0):snapshot 旧场景 0x35 → backupPixels;target step floor(0)=0
      nowSpy.mockReturnValue(0)
      presentFrame(fb, gs, ctx)
      expect(gs.fadeState?.backupPixels).toBeDefined()
      expect(gs.fadeState!.backupPixels!.length).toBe(320 * 200)
      expect(gs.fadeState!.backupPixels!).toEqual(new Uint8Array(320 * 200).fill(0x35))
      expect(gs.fadeState!.backupPixels).not.toBe(fb.indices)
      expect(gs.fadeState!.appliedSteps).toBe(0)
      expect(fb.indices).toEqual(new Uint8Array(320 * 200).fill(0x35))

      // 帧2(elapsed = totalMs/2 = 360):target step floor(0.5*72)=36
      nowSpy.mockReturnValue(360)
      presentFrame(fb, gs, ctx)
      expect(gs.fadeState!.appliedSteps).toBe(36)

      // 帧3(elapsed = totalMs = 720):progress clamp 1 → target step 72(满)
      nowSpy.mockReturnValue(720)
      presentFrame(fb, gs, ctx)
      expect(gs.fadeState!.appliedSteps).toBe(72)
      // Independent final scene: a 16×24 party sprite at (152,92), all other pixels clear.
      const target = new Uint8Array(320 * 200)
      for (let y = 92; y < 116; y++) target.fill(5, y * 320 + 152, y * 320 + 168)
      expect(fb.indices).toEqual(target)
      expect(gs.fadeState!.backupPixels).toEqual(target)

      // 帧4(elapsed 超时 9999):progress clamp 1 → 仍 72(不溢出)
      nowSpy.mockReturnValue(9999)
      presentFrame(fb, gs, ctx)
      expect(gs.fadeState!.appliedSteps).toBe(72)
    })
  })
})
