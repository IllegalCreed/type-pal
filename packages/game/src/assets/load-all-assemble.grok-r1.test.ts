/**
 * G01-A。旧证明只覆盖 loadAll 的泛 404（loader.test.ts「fetch 失败 → 抛错」）。
 * 本组断言真实 RLE/PNG 装配结果、URL 归属和硬表透传，不重复该条。
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  callsEnding,
  installLoadAll,
  loadAllScript,
  pngAtlas,
} from '../__tests__/grok-render-r1/legal-host.js'
import { loadAll } from './loader.js'

describe('G01-A loadAll 合法装配', () => {
  let pngs: Map<number, Uint8Array>

  beforeAll(async () => {
    pngs = await pngAtlas([0, 1, 2, 3, 8, 9, 12])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('G01-A01 scene 7 用 mapNum 12 取 tilemap 与 tileset，不按 sceneId 取图', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/data/scene/7.json')).toHaveLength(1)
    expect(callsEnding(calls, '/data/tilemap/12.json')).toHaveLength(1)
    expect(callsEnding(calls, '/data/tileset/12.rle')).toHaveLength(1)
    expect(calls.some((url) => url.includes('/tilemap/7.json'))).toBe(false)
    expect(assets.scene.mapNum).toBe(12)
    expect(assets.tilemap.tileset).toBe('tileset/12.rle')
  })

  it('G01-A02 scene 7 的事件脚本 URL 补零为 scene-007，段名原样返回', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/events/scene-007.json')).toHaveLength(1)
    expect(assets.events.scene).toBe(7)
    expect(assets.events.segments[0]?.name).toBe('scene-007.onEnter')
    expect(assets.events.segments[0]?.commands).toEqual([])
  })

  it('G01-A03 首屏调色板固定取 palette/0，256 色与循环段原样进入结果', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/data/palette/0.json')).toHaveLength(1)
    expect(assets.palette.colors).toHaveLength(256)
    expect(assets.palette.colors[4]).toEqual([4, 20, 40])
    expect(assets.palette.cycles).toEqual([{ start: 10, length: 4, step: 1, frameInterval: 3 }])
  })

  it('G01-A04 tileset RLE 经真实解码进入 tileImages，键 0/1 像素为 AA/BB', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/data/tileset/12.rle')).toHaveLength(1)
    expect(assets.tileImages.size).toBe(2)
    expect(Array.from(assets.tileImages.get(0)?.indices ?? [])).toEqual([0xaa])
    expect(Array.from(assets.tileImages.get(1)?.indices ?? [])).toEqual([0xbb])
    expect(Array.from(assets.tileImages.get(0)?.opaque ?? [])).toEqual([1])
  })

  it('G01-A05 角色精灵键为队长、事件对象、71 与 73，5×3 帧锚点为 2,3', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    const assets = await loadAll(7)
    expect([...assets.characterSprites.keys()].sort((a, b) => a - b)).toEqual([2, 9, 71, 73])
    expect(callsEnding(calls, '/data/sprite/2.rle')).toHaveLength(1)
    expect(callsEnding(calls, '/data/sprite/0.rle')).toHaveLength(0)
    const leader = assets.characterSprites.get(2)
    expect(leader?.anchorX).toBe(2)
    expect(leader?.anchorY).toBe(3)
    expect(leader?.frames).toHaveLength(1)
    expect(leader?.frames[0]?.width).toBe(5)
    expect(leader?.frames[0]?.height).toBe(3)
    expect(leader?.frames[0]?.indices[0]).toBe(0x3c)
    expect(leader?.frames[0]?.indices.length).toBe(15)
  })

  it('G01-A06 队长与两个事件对象共用 sprite 9 时只 fetch 一次', async () => {
    const script = loadAllScript({
      roles: [
        {
          ...loadAllScript().roles[0]!,
          spriteNum: 9,
        },
        {
          ...loadAllScript().roles[1]!,
          spriteNum: 9,
        },
      ],
      scene: {
        sceneId: 7,
        mapNum: 12,
        eventObjects: [
          {
            id: 1,
            x: 0,
            y: 0,
            spriteNum: 9,
            triggerMode: 1,
          },
          {
            id: 2,
            x: 8,
            y: 8,
            spriteNum: 9,
            triggerMode: 1,
          },
        ],
      },
    })
    const { calls } = installLoadAll(script, pngs)
    const assets = await loadAll(7)
    expect([...assets.characterSprites.keys()].sort((a, b) => a - b)).toEqual([9, 71, 73])
    expect(callsEnding(calls, '/data/sprite/9.rle')).toHaveLength(1)
  })

  it('G01-A07 战斗精灵键为 kind-id，背景 8 的像素来自对应 PNG', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    const assets = await loadAll(7)
    expect([...assets.battleSprites.keys()].sort()).toEqual(['enemy-4', 'player-2'])
    expect(assets.battleSprites.get('player-2')?.frames).toHaveLength(2)
    expect(Array.from(assets.battleSprites.get('player-2')?.frames[1]?.indices ?? [])).toEqual([
      0x22,
    ])
    expect(callsEnding(calls, '/data/battle-sprite/player/2.rle')).toHaveLength(1)
    expect(callsEnding(calls, '/images/battle/bg/008.png')).toHaveLength(1)
    const bg = assets.battleBgs.get(8)
    expect(bg?.width).toBe(2)
    expect(bg?.height).toBe(1)
    expect(Array.from(bg?.indices ?? [])).toEqual([8, 9])
  })

  it('G01-A08 法术精灵只加载被引用且 frameCount>0 的 chunk，含 effect 0', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    const assets = await loadAll(7)
    expect([...assets.magicSprites.keys()].sort((a, b) => a - b)).toEqual([0, 4])
    expect(assets.magicSprites.get(0)?.frames).toHaveLength(2)
    expect(callsEnding(calls, '/data/magic/fire-00.rle')).toHaveLength(1)
    expect(callsEnding(calls, '/data/magic/fire-04.rle')).toHaveLength(1)
    expect(callsEnding(calls, '/data/magic/fire-07.rle')).toHaveLength(0)
    expect(callsEnding(calls, '/data/magic/fire-09.rle')).toHaveLength(0)
  })

  it('G01-A09 物品图标按 chunkIndex 入 map，UI 帧按 manifest 顺序保留', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    const loaded = await loadAll(7)
    expect(callsEnding(calls, '/images/items/003.png')).toHaveLength(1)
    expect(callsEnding(calls, '/images/items/012.png')).toHaveLength(1)
    expect(Array.from(loaded.itemIcons.get(3)?.indices ?? [])).toEqual([3, 4])
    expect(Array.from(loaded.itemIcons.get(12)?.indices ?? [])).toEqual([12, 13])
    expect(loaded.uiSpriteFrames).toHaveLength(3)
    expect(Array.from(loaded.uiSpriteFrames[0]?.indices ?? [])).toEqual([0, 1])
    expect(Array.from(loaded.uiSpriteFrames[1]?.indices ?? [])).toEqual([1, 2])
    expect(Array.from(loaded.uiSpriteFrames[2]?.indices ?? [])).toEqual([2, 3])
  })

  it('G01-A10 词表、商店、升级表、敌人 id 与敌位布局原样透传', async () => {
    const { calls } = installLoadAll(loadAllScript(), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/lookup/words.json')).toHaveLength(1)
    expect(assets.words).toEqual(['甲', '乙'])
    expect(assets.stores).toEqual([{ id: 3, items: [61, 0] }])
    expect(assets.levelUpExp).toEqual([10, 20])
    expect(assets.levelUpMagic).toEqual([[{ level: 2, magic: 296 }]])
    expect(assets.enemies.map((enemy) => enemy.id)).toEqual([41])
    expect(assets.battleEffectIndex).toEqual([3, 6])
    expect(assets.enemyPos).toEqual({ layouts: [[{ x: 40, y: 80 }]] })
    expect(assets.objectPlayers.map((row) => row.id)).toEqual([1])
  })
})
