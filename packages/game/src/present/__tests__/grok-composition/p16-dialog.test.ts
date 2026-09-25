import { describe, expect, it } from 'vitest'
import { appendDialogLine, drawDialogBox, startDialogLine } from '../../dialog-box.js'
import { createFramebuffer } from '../../framebuffer.js'
import { presentFrame } from '../../present.js'
import {
  at,
  DIALOG,
  digitFrames,
  glyphsOf,
  hiddenSprite,
  image,
  SENTINEL,
  sprite,
  TITLE,
  yellowDigit,
} from './fixtures/images.js'
import { baseContext, bitmapView, emptyMap, exploreState, worldView } from './fixtures/world.js'

function narrationFrames() {
  const frames = digitFrames()
  frames[44] = image(4, 16, 0, 0)
  frames[44]!.indices[0] = 0x44
  frames[44]!.opaque[0] = 1
  frames[45] = image(8, 16, 0, 0)
  frames[46] = image(4, 16, 0, 0)
  return frames
}

function titled(portraitIcon: number | undefined) {
  const state = startDialogLine('李:', {
    style: 'bottom',
    portraitIcon,
    fontColor: DIALOG,
  })
  appendDialogLine(state, '甲')
  state.charsRevealed = 1
  return state
}

describe('P16 对话框绘制', () => {
  it('P16 旁白数字走黄色精灵，缺UI帧时不画框并把数字当字形', () => {
    const frames = narrationFrames()
    const glyphs = glyphsOf(['甲', '3'])
    const state = startDialogLine('甲3', { style: 'narration' })
    state.charsRevealed = 2
    const fb = createFramebuffer()
    fb.indices.fill(SENTINEL)
    const before = structuredClone(state)
    const beforeFrame = bitmapView(frames[44]!)
    drawDialogBox(fb, state, glyphs, { uiSpriteFrames: frames })
    expect(structuredClone(state)).toEqual(before)
    expect(bitmapView(frames[44]!)).toEqual(beforeFrame)
    // len=3，框原点 (148,40)，文字 (160,50)。'3' 在全角之后，黄数字 y+4。
    expect(at(fb, 148, 40)).toBe(0x44)
    expect(at(fb, 160, 50)).toBe(0)
    expect(at(fb, 176, 54)).toBe(yellowDigit(3))

    const bare = createFramebuffer()
    bare.indices.fill(SENTINEL)
    drawDialogBox(bare, state, glyphs)
    expect(at(bare, 148, 40)).toBe(SENTINEL)
    expect(at(bare, 176, 54)).toBe(SENTINEL)
    expect(at(bare, 160, 50)).toBe(0)
    // 无 UI 帧时 '3' 走字形，落在正文行 (176,50)，不是黄精灵的 y+4。
    expect(at(bare, 176, 50)).toBe(0)
    expect(at(bare, 177, 50)).toBe(SENTINEL)
    expect(structuredClone(state)).toEqual(before)
  })

  it('P16 立绘不透明0盖住底色，透明孔保留底色，缺立绘资源仍画正文', () => {
    const portrait = sprite(
      2,
      2,
      [
        { x: 0, y: 0, index: 0 },
        { x: 0, y: 1, index: 0x77 },
      ],
      { x: 1, y: 2 },
    )
    const glyphs = glyphsOf(['李', '甲', ':'])
    const state = titled(4)
    const fb = createFramebuffer()
    fb.indices.fill(SENTINEL)
    const before = structuredClone(state)
    const beforePortrait = bitmapView(portrait)
    drawDialogBox(fb, state, glyphs, { portraitFrames: new Map([[4, portrait]]) })
    expect(structuredClone(state)).toEqual(before)
    expect(bitmapView(portrait)).toEqual(beforePortrait)
    // bottom 立绘锚 (270 - w/2, 144 - h/2) = (269,143)。
    expect(at(fb, 269, 143)).toBe(0)
    expect(at(fb, 270, 143)).toBe(SENTINEL)
    expect(at(fb, 269, 144)).toBe(0x77)
    expect(at(fb, 4, 108)).toBe(TITLE)
    expect(at(fb, 20, 126)).toBe(DIALOG)

    state.portraitIcon = 99
    const missing = createFramebuffer()
    missing.indices.fill(SENTINEL)
    drawDialogBox(missing, state, glyphs, { portraitFrames: new Map([[4, portrait]]) })
    expect(at(missing, 269, 143)).toBe(SENTINEL)
    expect(at(missing, 270, 143)).toBe(SENTINEL)
    expect(at(missing, 20, 126)).toBe(DIALOG)
    expect(at(missing, 4, 108)).toBe(TITLE)
  })

  it('P16 presentFrame里立绘透明孔露出地块，不透明0写成0，姓名和正文颜色不同', () => {
    const tile = image(2, 2, 0x41)
    const map = emptyMap(2, 2)
    map.cells[0]![0] = { lower: 1, upper: 0 }
    const portrait = sprite(
      2,
      2,
      [
        { x: 0, y: 0, index: 0 },
        { x: 0, y: 1, index: 0x77 },
      ],
      { x: 1, y: 2 },
    )
    const gs = exploreState({ x: 0, y: 0 })
    gs.camera = { x: -285, y: -151 }
    const state = titled(4)
    gs.dialogBox = state
    const ctx = baseContext({
      tilemap: map,
      tileImages: { get: (id) => (id === 1 ? tile : undefined) },
      partyFrames: [hiddenSprite(1, 1)],
      glyphs: glyphsOf(['李', '甲', ':']),
      dialogAssets: { portraitFrames: new Map([[4, portrait]]) },
    })
    const fb = createFramebuffer()
    fb.indices.fill(SENTINEL)
    const beforeWorld = worldView(gs)
    const beforeDialog = structuredClone(state)
    const beforeTile = bitmapView(tile)
    const beforePortrait = bitmapView(portrait)
    presentFrame(fb, gs, ctx)
    expect(worldView(gs)).toEqual(beforeWorld)
    expect(structuredClone(gs.dialogBox)).toEqual(beforeDialog)
    expect(bitmapView(tile)).toEqual(beforeTile)
    expect(bitmapView(portrait)).toEqual(beforePortrait)
    expect(at(fb, 269, 143)).toBe(0)
    expect(at(fb, 270, 143)).toBe(0x41)
    expect(at(fb, 269, 144)).toBe(0x77)
    expect(at(fb, 4, 108)).toBe(TITLE)
    expect(at(fb, 20, 126)).toBe(DIALOG)
    expect(fb.indices[0]).toBe(0)

    state.portraitIcon = 99
    presentFrame(fb, gs, ctx)
    expect(at(fb, 269, 143)).toBe(0x41)
    expect(at(fb, 270, 143)).toBe(0x41)
    expect(at(fb, 20, 126)).toBe(DIALOG)
    expect(at(fb, 4, 108)).toBe(TITLE)
    expect(structuredClone(state).portraitIcon).toBe(99)
  })
})
