import { describe, expect, it, vi } from 'vitest'
import { extractBattleSprites } from './battle-sprite.js'

describe('extractBattleSprites', () => {
  it('给定 sprite id 集合,从 chunk map 提取每个 sprite 的全部帧', () => {
    const fakeChunks = new Map<string, Uint8Array>()
    // 空 sprite chunk:imagecount = 0(同 M2 extractCharacterSprites 的 spec test)
    const emptySpriteChunk = new Uint8Array(4)
    new DataView(emptySpriteChunk.buffer).setUint16(0, 0, true)
    fakeChunks.set('enemy:100', emptySpriteChunk)

    const result = extractBattleSprites([{ id: 100, kind: 'enemy' }], fakeChunks)
    expect(result).toHaveLength(1)
    expect(result[0]?.battleSpriteId).toBe(100)
    expect(result[0]?.kind).toBe('enemy')
    expect(result[0]?.frames).toEqual([])
  })

  it('chunk 缺 → skip + warn,不抛错', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = extractBattleSprites(
      [{ id: 999, kind: 'player' }],
      new Map<string, Uint8Array>(),
    )
    expect(result).toHaveLength(0)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('battle sprite 999'))
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('player'))
    warnSpy.mockRestore()
  })

  it('player 和 enemy 同 id 不冲突(kind:id 复合键)', () => {
    const chunks = new Map<string, Uint8Array>()
    // 两个空 sprite chunk(frame count 0):验证 kind:id 复合键能分别索引
    const empty = new Uint8Array(4)
    new DataView(empty.buffer).setUint16(0, 0, true)
    chunks.set('player:5', empty)
    chunks.set('enemy:5', empty)

    const result = extractBattleSprites(
      [
        { id: 5, kind: 'player' },
        { id: 5, kind: 'enemy' },
      ],
      chunks,
    )
    expect(result).toHaveLength(2)
    expect(result[0]?.kind).toBe('player')
    expect(result[1]?.kind).toBe('enemy')
  })
})
