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
  const map = emptyMap(12, 14)
  const background = image(32, 16, 0)
  const left = image(32, 16, 0)
  const right = image(32, 16, 0)
  // 黑底覆盖视口，只留 (16,8) 一个小孔，仍核实真实接缝修复先于水波/重映射。
  // 西北邻居 (15,7) 提供确定颜色；避免用大片空洞的 16 轮扩散制造测试像素。
  background.indices[7 * 32 + 15] = index
  background.opaque![8 * 32 + 16] = 0
  right.opaque![0] = 0
  // 两个 lower 瓦片分别起于 (-16,8) 和 (16,8)，显式组成第 8 行 x=0..32 的标记条。
  left.indices.fill(index, 16, 32)
  right.indices.fill(index, 0, 17)
  map.cells[1]![0] = { lower: 1, upper: 0 }
  map.cells[1]![1] = { lower: 2, upper: 0 }
  const tiles = [background, left, right]
  return { map, tiles, tileImages: { get: (id: number) => tiles[id] } }
}

describe('P12 大世界叠层与补帧', () => {
  it('P12 advanceEffects为false时波幅和相位不变，为true时同一行像素改道', () => {
    resetScreenWavePhase()
    const { map, tiles, tileImages } = layer0Tile(TILE)
    const actor = sprite(1, 1, [{ x: 0, y: 0, index: 0x11 }], { x: 0, y: 1 })
    const gs = exploreState({ x: 16, y: 17 })
    gs.wScreenWave = 128
    gs.sWaveProgression = -8
    const ctx = baseContext({
      tilemap: map,
      tileImages,
      partyFrames: [actor],
    })
    const fb = createFramebuffer()

    const draw = (advance: boolean) => {
      fb.indices.fill(SENTINEL)
      const bits = tiles.map(bitmapView)
      const actorBits = bitmapView(actor)
      const world = worldView(gs)
      presentFrame(fb, gs, ctx, advance)
      expect(tiles.map(bitmapView)).toEqual(bits)
      expect(bitmapView(actor)).toEqual(actorBits)
      expect(worldView(gs).party).toEqual(world.party)
      expect(worldView(gs).camera).toEqual(world.camera)
    }

    draw(false)
    // 相位 0、波幅 128：第 8 行左移 126，显式标记条落在 x=194..226。
    // (196,8) 和 (210,8) 有色，(230,8) 还没有。精灵在波之后，留在 (16,20)。
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

    draw(true)
    // 下一逻辑帧：波幅 112、相位 1，第 8 行左移 105，标记条在 x=215..247。
    // 若只改波幅而不推进相位，条会在 x=210..242；两端像素能区分这两种结果。
    expect(gs.wScreenWave).toBe(112)
    expect(gs.sWaveProgression).toBe(-8)
    expect(fb.indices[8 * 320 + 245]).toBe(TILE)
    expect(fb.indices[8 * 320 + 212]).not.toBe(TILE)
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
    const { map, tiles, tileImages } = layer0Tile(DIALOG)
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
      tileImages,
      partyFrames: [actor],
      glyphs: glyphsOf(['甲']),
    })
    const fb = createFramebuffer()
    fb.indices.fill(SENTINEL)
    const beforeTiles = tiles.map(bitmapView)
    const beforeDialog = structuredClone(gs.dialogBox)
    const beforeColors = palette.colors.map((color) => [...color])
    presentFrame(fb, gs, ctx)
    expect(tiles.map(bitmapView)).toEqual(beforeTiles)
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
