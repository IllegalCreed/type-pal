import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  indexedPng,
  installLoadAll,
  loadAllScript,
} from '../__tests__/grok-render-r1/legal-host.js'
import { drawNumber } from '../present/draw-number.js'
import { createFramebuffer } from '../present/framebuffer.js'
import { drawBox } from '../present/menu/draw-box.js'
import { loadAll } from './loader.js'

const frameIds = Array.from({ length: 71 }, (_, id) => id)
let pngs: Map<number, Uint8Array>

beforeAll(async () => {
  pngs = new Map()
  // 每帧6×8，色号等于原帧号；错取相邻帧会直接改变真实输出像素。
  for (const id of frameIds) {
    const rgba = Array.from({ length: 48 }, () => [id, 0, 0, 255]).flat()
    pngs.set(id, await indexedPng(6, 8, rgba))
  }
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('loadAll SPRITEUI frame identity', () => {
  it('完整清单保留全部帧号，黄色数字1使用frame20', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    installLoadAll(loadAllScript({ uiFrames: frameIds }), pngs)
    const assets = await loadAll(7)
    expect(warn).not.toHaveBeenCalled()
    expect(assets.uiSpriteFrames).toHaveLength(71)
    for (const id of frameIds) {
      expect(assets.uiSpriteFrames[id]?.indices).toEqual(new Uint8Array(48).fill(id))
    }
    const fb = createFramebuffer(40, 12)
    drawNumber(fb, 1, 1, { x: 6, y: 2 }, 'yellow', 'left', assets.uiSpriteFrames)
    expect(fb.indices[2 * 40 + 6]).toBe(20)
    expect(fb.indices[9 * 40 + 11]).toBe(20)
  })

  it('frame19失败后数字1仍用frame20，缺失的数字0沿用跳过', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    installLoadAll(loadAllScript({ uiFrames: frameIds, fail: { uiFrames: [19] } }), pngs)
    const assets = await loadAll(7)
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'assets: ui-sprite frame 19 load failed:',
      new Error('assets: fetch /extracted/images/ui/frame-19.png failed (404)'),
    )
    const fb = createFramebuffer(40, 12)
    drawNumber(fb, 1, 1, { x: 6, y: 2 }, 'yellow', 'left', assets.uiSpriteFrames)
    expect(fb.indices[2 * 40 + 6]).toBe(20)
    expect(assets.uiSpriteFrames[19]).toBeUndefined()
    expect(assets.uiSpriteFrames).toHaveLength(71)
    fb.clear()
    drawNumber(fb, 0, 1, { x: 6, y: 2 }, 'yellow', 'left', assets.uiSpriteFrames)
    expect(fb.indices).toEqual(new Uint8Array(40 * 12))
  })

  it('必要边框frame1失败后报原编号缺失，不用frame2补位', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    installLoadAll(loadAllScript({ uiFrames: frameIds, fail: { uiFrames: [1] } }), pngs)
    const assets = await loadAll(7)
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'assets: ui-sprite frame 1 load failed:',
      new Error('assets: fetch /extracted/images/ui/frame-01.png failed (404)'),
    )
    const fb = createFramebuffer(40, 40)
    expect(() =>
      drawBox({
        fb,
        x: 0,
        y: 0,
        rows: 0,
        cols: 0,
        style: 0,
        uiSpriteFrames: assets.uiSpriteFrames,
      }),
    ).toThrow('draw-box: uiSpriteFrames[1] missing — style 0 需要 SPRITEUI frame 0-8')
    expect(fb.indices).toEqual(new Uint8Array(40 * 40))
  })
})
