/**
 * G01-B。边界守卫。旧 loadAll 只断言任意 404 匹配 /failed (404)/，
 * 不区分 URL、补零、sprite 0 过滤、空 manifest 或 fetchPalette。
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  callsEnding,
  installLoadAll,
  legalPalette,
  legalRole,
  loadAllScript,
  pngAtlas,
} from '../__tests__/grok-render-r1/legal-host.js'
import { fetchPalette, loadAll } from './loader.js'

describe('G01-B loadAll 边界守卫', () => {
  let pngs: Map<number, Uint8Array>

  beforeAll(async () => {
    pngs = await pngAtlas([0, 1, 2, 3, 8, 12])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('G01-B01 sceneId 0 使用 scene/0.json 与 events/scene-000.json', async () => {
    const script = loadAllScript({
      scene: { sceneId: 0, mapNum: 4, eventObjects: [] },
      eventsName: 'scene-000.onEnter',
      roles: [legalRole(0, 2)],
    })
    const { calls } = installLoadAll(script, pngs)
    const assets = await loadAll(0)
    expect(callsEnding(calls, '/data/scene/0.json')).toHaveLength(1)
    expect(callsEnding(calls, '/events/scene-000.json')).toHaveLength(1)
    expect(callsEnding(calls, '/data/tilemap/4.json')).toHaveLength(1)
    expect(assets.events.segments[0]?.name).toBe('scene-000.onEnter')
    expect(assets.scene.sceneId).toBe(0)
  })

  it('G01-B02 roles 为空时在精灵请求前抛 roles[0] missing，且已取过 tileset', async () => {
    const { calls } = installLoadAll(loadAllScript({ roles: [] }), pngs)
    await expect(loadAll(7)).rejects.toThrow('assets: player-roles.json roles[0] missing')
    expect(callsEnding(calls, '/data/tileset/12.rle')).toHaveLength(1)
    expect(callsEnding(calls, '/data/sprite/71.rle')).toHaveLength(0)
    expect(calls.some((url) => url.includes('/data/sprite/'))).toBe(false)
  })

  it('G01-B03 spriteNum 0 的队长和事件对象都不进集合，只剩固定 71 与 73', async () => {
    const script = loadAllScript({
      roles: [legalRole(0, 0)],
      scene: {
        sceneId: 7,
        mapNum: 12,
        eventObjects: [{ id: 3, x: 1, y: 1, spriteNum: 0, triggerMode: 0 }],
      },
    })
    const { calls } = installLoadAll(script, pngs)
    const assets = await loadAll(7)
    expect([...assets.characterSprites.keys()].sort((a, b) => a - b)).toEqual([71, 73])
    expect(callsEnding(calls, '/data/sprite/0.rle')).toHaveLength(0)
    expect(callsEnding(calls, '/data/sprite/71.rle')).toHaveLength(1)
    expect(callsEnding(calls, '/data/sprite/73.rle')).toHaveLength(1)
  })

  it('G01-B04 frameCount 为 0 的被引用 chunk 不取 fire RLE，未引用 chunk 也不取', async () => {
    const script = loadAllScript({
      magics: [
        {
          ...loadAllScript().magics[0]!,
          id: 0,
          effect: 0,
        },
        {
          ...loadAllScript().magics[1]!,
          id: 1,
          effect: 4,
        },
      ],
      fireChunks: [
        { chunkIndex: 0, frameCount: 2 },
        { chunkIndex: 4, frameCount: 0 },
        { chunkIndex: 7, frameCount: 2 },
      ],
    })
    const { calls } = installLoadAll(script, pngs)
    const assets = await loadAll(7)
    expect([...assets.magicSprites.keys()]).toEqual([0])
    expect(callsEnding(calls, '/data/magic/fire-00.rle')).toHaveLength(1)
    expect(callsEnding(calls, '/data/magic/fire-04.rle')).toHaveLength(0)
    expect(callsEnding(calls, '/data/magic/fire-07.rle')).toHaveLength(0)
  })

  it('G01-B05 空战斗 manifest 仍读取清单文件，但不请求任何精灵或背景成员', async () => {
    const script = loadAllScript({ battleSprites: [], battleBgIds: [] })
    const { calls } = installLoadAll(script, pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/data/battle-sprites.json')).toHaveLength(1)
    expect(callsEnding(calls, '/data/battle-bgs.json')).toHaveLength(1)
    expect(calls.some((url) => url.includes('/battle-sprite/'))).toBe(false)
    expect(calls.some((url) => url.includes('/images/battle/bg/'))).toBe(false)
    expect(assets.battleSprites.size).toBe(0)
    expect(assets.battleBgs.size).toBe(0)
  })

  it('G01-B06 words.json 没有 flat 字段时词表为空数组', async () => {
    const { calls } = installLoadAll(loadAllScript({ words: {} }), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/lookup/words.json')).toHaveLength(1)
    expect(assets.words).toEqual([])
  })

  it('G01-B07 scene JSON 404 时错误带 scene URL，且不会再请求 tilemap', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    await expect(loadAll(4)).rejects.toThrow(
      'assets: fetch /extracted/data/scene/4.json failed (404)',
    )
    expect(calls).toEqual(['/extracted/data/scene/4.json'])
  })

  it('G01-B08 tilemap 404 时错误带 mapNum URL，且 tileset 尚未请求', async () => {
    const { calls } = installLoadAll(loadAllScript({ fail: { tilemap: 404 } }), pngs)
    await expect(loadAll(7)).rejects.toThrow(
      'assets: fetch /extracted/data/tilemap/12.json failed (404)',
    )
    expect(callsEnding(calls, '/data/scene/7.json')).toHaveLength(1)
    expect(callsEnding(calls, '/data/tilemap/12.json')).toHaveLength(1)
    expect(calls.some((url) => url.includes('/tileset/'))).toBe(false)
  })

  it('G01-B09 fetchPalette(5) 读取 palette/5.json 并返回完整 256 色', async () => {
    const palette = legalPalette((colors) => {
      colors[5] = [9, 8, 7]
    })
    const { calls } = installLoadAll(loadAllScript({ extraPalettes: { 5: palette } }), pngs)
    const loaded = await fetchPalette(5)
    expect(calls).toEqual(['/extracted/data/palette/5.json'])
    expect(loaded.colors).toHaveLength(256)
    expect(loaded.colors[5]).toEqual([9, 8, 7])
    expect(loaded.cycles).toEqual([{ start: 10, length: 4, step: 1, frameInterval: 3 }])
  })

  it('G01-B10 fetchPalette(12) 503 的错误同时包含 URL 与状态码', async () => {
    const { calls } = installLoadAll(loadAllScript({ fail: { palettes: { 12: 503 } } }), pngs)
    await expect(fetchPalette(12)).rejects.toThrow(
      'assets: fetch /extracted/data/palette/12.json failed (503)',
    )
    expect(calls).toEqual(['/extracted/data/palette/12.json'])
  })
})
