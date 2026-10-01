/**
 * G01-C。可选清单失败后主加载仍完成，失败成员不进入结果，成功成员保留。
 * 旧测试没有这些恢复路径。
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  callsEnding,
  installLoadAll,
  loadAllScript,
  pngAtlas,
} from '../__tests__/grok-render-r1/legal-host.js'
import { loadAll } from './loader.js'

describe('G01-C loadAll 失败恢复', () => {
  let pngs: Map<number, Uint8Array>

  beforeAll(async () => {
    pngs = await pngAtlas([0, 1, 2, 3, 8, 9, 12])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function silenceWarn(): void {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  }

  it('G01-C01 object-players 404 时结果为空数组，敌人表仍在', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { calls } = installLoadAll(loadAllScript({ fail: { objectPlayers: 404 } }), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/data/object-players.json')).toHaveLength(1)
    expect(assets.objectPlayers).toEqual([])
    expect(assets.enemies.map((enemy) => enemy.id)).toEqual([41])
    expect(warn.mock.calls.some((args) => String(args[0]).includes('object-players'))).toBe(true)
  })

  it('G01-C02 words.json 500 时词表为空，商店表仍透传', async () => {
    silenceWarn()
    const { calls } = installLoadAll(loadAllScript({ fail: { words: 500 } }), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/lookup/words.json')).toHaveLength(1)
    expect(assets.words).toEqual([])
    expect(assets.stores).toEqual([{ id: 3, items: [61, 0] }])
  })

  it('G01-C03 battle-sprites.json 404 时精灵 map 为空，背景 8 仍解码', async () => {
    silenceWarn()
    const { calls } = installLoadAll(loadAllScript({ fail: { battleSprites: 404 } }), pngs)
    const assets = await loadAll(7)
    expect(assets.battleSprites.size).toBe(0)
    expect(calls.some((url) => url.includes('/battle-sprite/'))).toBe(false)
    expect(Array.from(assets.battleBgs.get(8)?.indices ?? [])).toEqual([8, 9])
  })

  it('G01-C04 battle-bgs.json 404 时背景 map 为空，player-2 精灵仍在', async () => {
    silenceWarn()
    const { calls } = installLoadAll(loadAllScript({ fail: { battleBgs: 404 } }), pngs)
    const assets = await loadAll(7)
    expect(assets.battleBgs.size).toBe(0)
    expect(calls.some((url) => url.includes('/images/battle/bg/'))).toBe(false)
    expect(assets.battleSprites.has('player-2')).toBe(true)
    expect(assets.battleSprites.get('player-2')?.frames).toHaveLength(2)
  })

  it('G01-C05 事件精灵 9 的 RLE 404 被跳过，71 与 73 仍在', async () => {
    silenceWarn()
    const { calls } = installLoadAll(loadAllScript({ fail: { sprites: [9] } }), pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/data/sprite/9.rle')).toHaveLength(1)
    expect(assets.characterSprites.has(9)).toBe(false)
    expect(assets.characterSprites.has(2)).toBe(true)
    expect(assets.characterSprites.has(71)).toBe(true)
    expect(assets.characterSprites.has(73)).toBe(true)
  })

  it('G01-C06 enemy-4 RLE 404 被跳过，player-2 的第二帧像素仍是 0x22', async () => {
    silenceWarn()
    installLoadAll(loadAllScript({ fail: { battleSpriteKeys: ['enemy-4'] } }), pngs)
    const loaded = await loadAll(7)
    expect(loaded.battleSprites.has('enemy-4')).toBe(false)
    expect(Array.from(loaded.battleSprites.get('player-2')?.frames[1]?.indices ?? [])).toEqual([
      0x22,
    ])
  })

  it('G01-C07 背景 8 的 PNG 404 被跳过，背景 9 的像素保留', async () => {
    silenceWarn()
    const script = loadAllScript({
      battleBgIds: [8, 9],
      fail: { battleBgIds: [8] },
    })
    const { calls } = installLoadAll(script, pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/images/battle/bg/008.png')).toHaveLength(1)
    expect(callsEnding(calls, '/images/battle/bg/009.png')).toHaveLength(1)
    expect(assets.battleBgs.has(8)).toBe(false)
    expect(assets.battleBgs.get(9)?.width).toBe(2)
    expect(Array.from(assets.battleBgs.get(9)?.indices ?? [])).toEqual([9, 10])
  })

  it('G01-C08 effect.rle 404 时 effectSprite 缺席，法术 chunk 0 仍在', async () => {
    silenceWarn()
    installLoadAll(loadAllScript({ fail: { effect: 404 } }), pngs)
    const loaded = await loadAll(7)
    expect(loaded.effectSprite).toBeUndefined()
    expect(loaded.magicSprites.has(0)).toBe(true)
  })

  it('G01-C09 fire-sprites.json 404 时法术 map 为空，命中特效帧仍加载', async () => {
    silenceWarn()
    installLoadAll(loadAllScript({ fail: { fireMeta: 404 } }), pngs)
    const assets = await loadAll(7)
    expect(assets.magicSprites.size).toBe(0)
    expect(assets.effectSprite?.frames).toHaveLength(2)
    expect(Array.from(assets.effectSprite?.frames[0]?.indices ?? [])).toEqual([0x11])
  })

  it('G01-C10 UI 帧 1 与物品 12 失败时，其余成员按原顺序和原键保留', async () => {
    silenceWarn()
    const script = loadAllScript({
      fail: { uiFrames: [1], itemIcons: [12] },
    })
    const { calls } = installLoadAll(script, pngs)
    const assets = await loadAll(7)
    expect(callsEnding(calls, '/images/ui/frame-01.png')).toHaveLength(1)
    expect(assets.uiSpriteFrames).toHaveLength(2)
    expect(Array.from(assets.uiSpriteFrames[0]?.indices ?? [])).toEqual([0, 1])
    expect(Array.from(assets.uiSpriteFrames[1]?.indices ?? [])).toEqual([2, 3])
    expect(assets.itemIcons.has(12)).toBe(false)
    expect(Array.from(assets.itemIcons.get(3)?.indices ?? [])).toEqual([3, 4])
  })
})
