import type { Palette } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInventoryMenu } from '../../../core/menu/inventory-menu.js'
import { openMenu } from '../../../core/menu/menu-mode.js'
import { startDialogLine } from '../../dialog-box.js'
import { createFramebuffer } from '../../framebuffer.js'
import { presentFrame } from '../../present.js'
import { resetScreenWavePhase } from '../../screen-wave.js'
import { BOX, DIALOG, glyphsOf, image, SENTINEL, sprite, TILE } from './fixtures/images.js'
import { baseContext, bitmapView, emptyMap, exploreState, worldView } from './fixtures/world.js'

function layer0Tile(index: number) {
  const map = emptyMap(4, 4)
  // cell(1,1) h=0 的 layer0 id = 1，屏幕原点 (16, 8)。
  map.cells[1]![1] = { lower: 1, upper: 0 }
  const tile = image(1, 1, index)
  return { map, tile }
}

describe('P12 大世界叠层与补帧', () => {
  it('P12 advanceEffects为false时波幅和相位不变，为true时同一行像素改道', () => {
    resetScreenWavePhase()
    const { map, tile } = layer0Tile(TILE)
    const actor = sprite(1, 1, [{ x: 0, y: 0, index: 0x11 }], { x: 0, y: 1 })
    const gs = exploreState({ x: 16, y: 17 })
    gs.wScreenWave = 128
    gs.sWaveProgression = -8
    const ctx = baseContext({
      tilemap: map,
      tileImages: { get: (id) => (id === 1 ? tile : undefined) },
      partyFrames: [actor],
    })
    const fb = createFramebuffer()

    const draw = (advance: boolean) => {
      fb.indices.fill(SENTINEL)
      const bits = bitmapView(tile)
      const actorBits = bitmapView(actor)
      const world = worldView(gs)
      presentFrame(fb, gs, ctx, advance)
      expect(bitmapView(tile)).toEqual(bits)
      expect(bitmapView(actor)).toEqual(actorBits)
      expect(worldView(gs).party).toEqual(world.party)
      expect(worldView(gs).camera).toEqual(world.camera)
    }

    draw(false)
    // 相位 0、波幅 128：第 8 行左移 126。瓦片在 (16,8)，接缝向外涂 16 像素后再卷动。
    // 原瓦片落到 (210,8)；只属于这次位移的 (196,8) 有色，(230,8) 还没有。精灵在波之后，留在 (16,20)。
    expect(gs.wScreenWave).toBe(128)
    expect(gs.sWaveProgression).toBe(-8)
    expect(fb.indices[8 * 320 + 210]).toBe(TILE)
    expect(fb.indices[8 * 320 + 196]).toBe(TILE)
    expect(fb.indices[8 * 320 + 230]).not.toBe(TILE)
    expect(fb.indices[20 * 320 + 16]).toBe(0x11)

    draw(false)
    expect(gs.wScreenWave).toBe(128)
    expect(gs.sWaveProgression).toBe(-8)
    expect(fb.indices[8 * 320 + 210]).toBe(TILE)
    expect(fb.indices[8 * 320 + 196]).toBe(TILE)
    expect(fb.indices[20 * 320 + 16]).toBe(0x11)

    draw(true)
    // 本帧先把波幅加上 progression，相位仍是 0。波幅 120 时左移 118，原瓦片到 (218,8)。
    // (230,8) 进入新卷动带，(196,8) 离开。
    expect(gs.wScreenWave).toBe(120)
    expect(gs.sWaveProgression).toBe(-8)
    expect(fb.indices[8 * 320 + 218]).toBe(TILE)
    expect(fb.indices[8 * 320 + 230]).toBe(TILE)
    expect(fb.indices[8 * 320 + 196]).not.toBe(TILE)
    expect(fb.indices[20 * 320 + 16]).toBe(0x11)
  })

  it('P12 偶数震屏补帧不减计数，再推进后改为上移', () => {
    const actor = sprite(1, 1, [{ x: 0, y: 0, index: 0x11 }], { x: 0, y: 1 })
    const gs = exploreState({ x: 16, y: 17 })
    gs.shakeTime = 2
    gs.shakeLevel = 1
    const ctx = baseContext({ partyFrames: [actor] })
    const fb = createFramebuffer()
    const draw = (advance: boolean) => {
      fb.indices.fill(SENTINEL)
      const bits = bitmapView(actor)
      presentFrame(fb, gs, ctx, advance)
      expect(bitmapView(actor)).toEqual(bits)
      expect(gs.party).toEqual({ x: 16, y: 17, facing: 'down' })
    }

    draw(false)
    expect(gs.shakeTime).toBe(2)
    expect(fb.indices[21 * 320 + 16]).toBe(0x11)
    expect(fb.indices[20 * 320 + 16]).toBe(0)
    expect(fb.indices[0]).toBe(0)

    draw(false)
    expect(gs.shakeTime).toBe(2)
    expect(fb.indices[21 * 320 + 16]).toBe(0x11)

    draw(true)
    expect(gs.shakeTime).toBe(1)
    expect(fb.indices[21 * 320 + 16]).toBe(0x11)

    draw(true)
    expect(gs.shakeTime).toBe(0)
    expect(fb.indices[19 * 320 + 16]).toBe(0x11)
    expect(fb.indices[21 * 320 + 16]).toBe(0)
  })

  it('P12 场景0x4F被remap成0x4E，对话框同索引保持0x4F', () => {
    const { map, tile } = layer0Tile(DIALOG)
    const actor = sprite(1, 1, [{ x: 0, y: 0, index: 0x11 }], { x: 0, y: 1 })
    const gs = exploreState({ x: 16, y: 17 })
    const colors = Array.from({ length: 256 }, () => [4, 5, 6] as [number, number, number])
    const palette: Palette = { colors, cycles: [] }
    gs.palette = palette
    gs.paletteFadeState = {
      startColors: colors.map((color) => [...color] as [number, number, number]),
      targetColors: colors.map((color) => [...color] as [number, number, number]),
      startTimeMs: performance.now(),
      totalMs: 10_000_000,
      mode: 'lerp',
      steps: 1,
      increment: 0,
      remap: { from: DIALOG, to: 0x4e },
    }
    gs.dialogBox = startDialogLine('甲', { style: 'bottom', fontColor: DIALOG })
    gs.dialogBox.charsRevealed = 1
    const ctx = baseContext({
      tilemap: map,
      tileImages: { get: (id) => (id === 1 ? tile : undefined) },
      partyFrames: [actor],
      glyphs: glyphsOf(['甲']),
    })
    const fb = createFramebuffer()
    fb.indices.fill(SENTINEL)
    const beforeTile = bitmapView(tile)
    const beforeDialog = structuredClone(gs.dialogBox)
    const beforeColors = palette.colors.map((color) => [...color])
    presentFrame(fb, gs, ctx)
    expect(bitmapView(tile)).toEqual(beforeTile)
    expect(structuredClone(gs.dialogBox)).toEqual(beforeDialog)
    expect(palette.colors).toEqual(beforeColors)
    expect(gs.paletteFadeState?.remap).toEqual({ from: DIALOG, to: 0x4e })

    // 瓦片在对话框之前被 0x4F→0x4E。正文仍用 0x4F。旁边的精灵不是 0x4F，保持 0x11。
    expect(fb.indices[8 * 320 + 16]).toBe(0x4e)
    expect(fb.indices[126 * 320 + 44]).toBe(DIALOG)
    expect(fb.indices[20 * 320 + 16]).toBe(0x11)
  })

  it('P12 菜单模式盖住左上角，event模式同一菜单栈不盖，对话像素两种模式都在', () => {
    const items: [] = []
    const gs = exploreState({ x: 200, y: 97 })
    openMenu(gs, { kind: 'inventory', state: createInventoryMenu(gs, items) })
    gs.dialogBox = startDialogLine('甲', { style: 'bottom', fontColor: DIALOG })
    gs.dialogBox.charsRevealed = 1
    const actor = sprite(1, 1, [{ x: 0, y: 0, index: 0x41 }], { x: 0, y: 1 })
    const frames = Array.from({ length: 18 }, () => image(8, 8, BOX))
    const ctx = baseContext({
      partyFrames: [actor],
      uiSpriteFrames: frames,
      items,
      glyphs: glyphsOf(['甲']),
    })
    const fb = createFramebuffer()

    fb.indices.fill(SENTINEL)
    const beforeItems = items.map((entry) => entry)
    const beforeMenu = structuredClone(gs.menuStack[0])
    const beforeDialog = structuredClone(gs.dialogBox)
    presentFrame(fb, gs, ctx)
    expect(items.map((entry) => entry)).toEqual(beforeItems)
    expect(structuredClone(gs.menuStack[0])).toEqual(beforeMenu)
    expect(structuredClone(gs.dialogBox)).toEqual(beforeDialog)
    expect(fb.indices[0 * 320 + 2]).toBe(BOX)
    expect(fb.indices[100 * 320 + 200]).toBe(0x41)
    expect(fb.indices[126 * 320 + 44]).toBe(DIALOG)

    gs.mode = 'event'
    fb.indices.fill(SENTINEL)
    const beforeEvent = worldView(gs)
    presentFrame(fb, gs, ctx)
    expect(worldView(gs)).toEqual(beforeEvent)
    expect(fb.indices[0 * 320 + 2]).toBe(0)
    expect(fb.indices[100 * 320 + 200]).toBe(0x41)
    expect(fb.indices[126 * 320 + 44]).toBe(DIALOG)
  })
})
