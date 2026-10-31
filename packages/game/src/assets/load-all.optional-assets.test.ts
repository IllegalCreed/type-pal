/** Optional resource failures preserve successful members and exact warning diagnostics. */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { callsEnding, installAssetFetch } from '../__tests__/asset-fetch-fixture.js'
import { makeAssetLoadScenario } from '../__tests__/asset-load-scenario.js'
import { pngAtlas } from '../__tests__/png-atlas.js'
import { loadAll } from './loader.js'

describe('loadAll optional asset failures', () => {
  let pngs: Map<number, Uint8Array>

  beforeAll(async () => {
    pngs = await pngAtlas([0, 1, 2, 3, 8, 9, 12])
  })

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('object-players 404 时结果为空数组，敌人表仍在', async () => {
    const { calls } = installAssetFetch(
      makeAssetLoadScenario({ fail: { objectPlayers: 404 } }),
      pngs,
    )
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/data/object-players.json')).toHaveLength(1)
    expect(assets.objectPlayers).toEqual([])
    expect(assets.enemies.map((enemy) => enemy.id)).toEqual([41])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      '[loader] object-players.json 加载失败,队友死亡/濒死脚本将不触发:',
      new Error('assets: fetch /extracted/data/object-players.json failed (404)'),
    )
  })

  it('words.json 500 时词表为空，商店表仍透传', async () => {
    const { calls } = installAssetFetch(makeAssetLoadScenario({ fail: { words: 500 } }), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/lookup/words.json')).toHaveLength(1)
    expect(assets.words).toEqual([])
    expect(assets.stores).toEqual([{ id: 3, items: [61, 0] }])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      '[loader] words.json 加载失败,菜单文案退化到硬编码 fallback:',
      new Error('assets: fetch /extracted/lookup/words.json failed (500)'),
    )
  })

  it('battle-sprites.json 404 时精灵 map 为空，背景 8 仍解码', async () => {
    const { calls } = installAssetFetch(
      makeAssetLoadScenario({ fail: { battleSprites: 404 } }),
      pngs,
    )
    const assets = await loadAll(7)
    expect(assets.battleSprites.size).toBe(0)
    expect(calls.some((url) => url.includes('/battle-sprite/'))).toBe(false)
    expect(Array.from(assets.battleBgs.get(8)?.indices ?? [])).toEqual([8, 9])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'assets: battle-sprites.json 缺失,跳过战斗精灵:',
      new Error('assets: fetch /extracted/data/battle-sprites.json failed (404)'),
    )
  })

  it('battle-bgs.json 404 时背景 map 为空，player-2 精灵仍在', async () => {
    const { calls } = installAssetFetch(makeAssetLoadScenario({ fail: { battleBgs: 404 } }), pngs)
    const assets = await loadAll(7)
    expect(assets.battleBgs.size).toBe(0)
    expect(calls.some((url) => url.includes('/images/battle/bg/'))).toBe(false)
    expect(assets.battleSprites.has('player-2')).toBe(true)
    expect(assets.battleSprites.get('player-2')?.frames).toHaveLength(2)
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'assets: battle-bgs.json 缺失,跳过战斗背景:',
      new Error('assets: fetch /extracted/data/battle-bgs.json failed (404)'),
    )
  })

  it('事件精灵 9 的 RLE 404 被跳过，71 与 73 仍在', async () => {
    const { calls } = installAssetFetch(makeAssetLoadScenario({ fail: { sprites: [9] } }), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/data/sprite/9.rle')).toHaveLength(1)
    expect(assets.characterSprites.has(9)).toBe(false)
    expect(assets.characterSprites.has(2)).toBe(true)
    expect(assets.characterSprites.has(71)).toBe(true)
    expect(assets.characterSprites.has(73)).toBe(true)
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'assets: sprite 9 load failed, skip:',
      new Error('sprite-blob: fetch /extracted/data/sprite/9.rle failed (404)'),
    )
  })

  it('enemy-4 RLE 404 被跳过，player-2 的第二帧像素仍是 0x22', async () => {
    installAssetFetch(makeAssetLoadScenario({ fail: { battleSpriteKeys: ['enemy-4'] } }), pngs)
    const loaded = await loadAll(7)
    expect(loaded.battleSprites.has('enemy-4')).toBe(false)
    expect(Array.from(loaded.battleSprites.get('player-2')?.frames[1]?.indices ?? [])).toEqual([
      0x22,
    ])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'assets: battle sprite enemy-4 load failed, skip:',
      new Error('sprite-blob: fetch /extracted/data/battle-sprite/enemy/4.rle failed (404)'),
    )
  })

  it('背景 8 的 PNG 404 被跳过，背景 9 的像素保留', async () => {
    const script = makeAssetLoadScenario({
      battleBgIds: [8, 9],
      fail: { battleBgIds: [8] },
    })
    const { calls } = installAssetFetch(script, pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/images/battle/bg/008.png')).toHaveLength(1)
    expect(callsEnding(calls, '/images/battle/bg/009.png')).toHaveLength(1)
    expect(assets.battleBgs.has(8)).toBe(false)
    expect(assets.battleBgs.get(9)?.width).toBe(2)
    expect(Array.from(assets.battleBgs.get(9)?.indices ?? [])).toEqual([9, 10])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'assets: battle bg 8 load failed, skip:',
      new Error('assets: fetch /extracted/images/battle/bg/008.png failed (404)'),
    )
  })

  it('effect.rle 404 时 effectSprite 缺席，法术 chunk 0 仍在', async () => {
    installAssetFetch(makeAssetLoadScenario({ fail: { effect: 404 } }), pngs)
    const loaded = await loadAll(7)
    expect(loaded.effectSprite).toBeUndefined()
    expect(loaded.magicSprites.has(0)).toBe(true)
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'assets: magic/effect.rle 缺失,战斗命中特效 overlay 将不画:',
      new Error('sprite-blob: fetch /extracted/data/magic/effect.rle failed (404)'),
    )
  })

  it('fire-sprites.json 404 时法术 map 为空，命中特效帧仍加载', async () => {
    installAssetFetch(makeAssetLoadScenario({ fail: { fireMeta: 404 } }), pngs)
    const assets = await loadAll(7)
    expect(assets.magicSprites.size).toBe(0)
    expect(assets.effectSprite?.frames).toHaveLength(2)
    expect(Array.from(assets.effectSprite?.frames[0]?.indices ?? [])).toEqual([0x11])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'assets: fire-sprites.json 缺失,法术特效 overlay 将不画:',
      new Error('assets: fetch /extracted/data/fire-sprites.json failed (404)'),
    )
  })

  it('UI 帧 1 失败时，缺失位置留空，其余帧保留原编号', async () => {
    const script = makeAssetLoadScenario({
      fail: { uiFrames: [1] },
    })
    const { calls } = installAssetFetch(script, pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/images/ui/frame-01.png')).toHaveLength(1)
    expect(assets.uiSpriteFrames).toHaveLength(3)
    expect(Array.from(assets.uiSpriteFrames[0]?.indices ?? [])).toEqual([0, 1])
    expect(assets.uiSpriteFrames[1]).toBeUndefined()
    expect(Array.from(assets.uiSpriteFrames[2]?.indices ?? [])).toEqual([2, 3])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'assets: ui-sprite frame 1 load failed:',
      new Error('assets: fetch /extracted/images/ui/frame-01.png failed (404)'),
    )
  })

  it('物品 12 失败时省略该键，物品 3 的像素保留', async () => {
    const { calls } = installAssetFetch(makeAssetLoadScenario({ fail: { itemIcons: [12] } }), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/images/items/012.png')).toHaveLength(1)
    expect(assets.itemIcons.has(12)).toBe(false)
    expect(Array.from(assets.itemIcons.get(3)?.indices ?? [])).toEqual([3, 4])
    expect(console.warn).toHaveBeenCalledExactlyOnceWith(
      'assets: item icon 12 load failed, skip:',
      new Error('assets: fetch /extracted/images/items/012.png failed (404)'),
    )
  })
})
