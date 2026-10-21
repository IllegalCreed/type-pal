// src/tools/save-io.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createInitialGameState, type GameState } from '../core/game-state.js'
import { Save } from '../core/save/api.js'
import { parseImportedSave, serializeSave } from './save-io.js'

function saveState(scene: number, cash = 0): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.wNumScene = scene
  gs.dwCash = cash
  return gs
}

afterEach(async () => {
  await Save._clearAllForTest()
  vi.unstubAllGlobals()
})

describe('save-io', () => {
  it('serializeSave:gs → 带版本头的 JSON 字符串', () => {
    const json = serializeSave(saveState(5, 100))
    const obj = JSON.parse(json)
    expect(obj.format).toBe('type-pal-save')
    expect(obj.version).toBe(1)
    expect(obj.gs.wNumScene).toBe(5)
  })
  it('parseImportedSave:合法 → 返回 gs;格式错 → 抛', () => {
    const json = serializeSave(saveState(9))
    expect(parseImportedSave(json).wNumScene).toBe(9)
    expect(() => parseImportedSave('{}')).toThrow(/格式/)
    expect(() => parseImportedSave('not json')).toThrow()
    expect(() => parseImportedSave(JSON.stringify({ format: 'x' }))).toThrow(/格式/)
  })
  it('parseImportedSave:缺必要字段(partyMembers)→ 抛', () => {
    const gs: Partial<GameState> = saveState(1)
    delete gs.partyMembers
    const bad = JSON.stringify({ format: 'type-pal-save', version: 1, gs })
    expect(() => parseImportedSave(bad)).toThrow(/字段/)
  })
  it('parseImportedSave:partyMembers 合法但 wNumScene 缺失或为文本 → 拒绝', () => {
    const missing: Partial<GameState> = saveState(5)
    delete missing.wNumScene
    for (const gs of [missing, { ...saveState(5), wNumScene: '5' }]) {
      const text = JSON.stringify({ format: 'type-pal-save', version: 1, gs })
      expect(() => parseImportedSave(text)).toThrow(/存档缺必要字段/)
    }
  })
  it('parseImportedSave:未知 version → 拒绝，不把未来/旧 envelope 交给 Save API', () => {
    const raw = JSON.parse(serializeSave(saveState(1)))
    raw.version = 2
    expect(() => parseImportedSave(JSON.stringify(raw))).toThrow(/版本/)
  })

  it('现金被改成文本时，在调用真实 Save 写入前拒绝，原槽位与预览保持不变', async () => {
    // 本例核真实内存 Save 门面，不访问浏览器用户的 IndexedDB。
    vi.stubGlobal('indexedDB', undefined)
    await Save.saveSlot(5, saveState(4, 55))
    const originalMeta = await Save.listSlots()
    const damaged = JSON.stringify({
      format: 'type-pal-save',
      version: 1,
      gs: { ...saveState(9, 900), dwCash: 'broken' },
    })

    await expect(async () => {
      await Save.saveSlot(5, parseImportedSave(damaged))
    }).rejects.toThrow(/dwCash/)

    expect(await Save.loadSlot(5)).toMatchObject({ wNumScene: 4, dwCash: 55 })
    expect(await Save.listSlots()).toEqual(originalMeta)
  })

  it('现金数值溢出为 Infinity 时拒绝；正常 V1 的真实 0 保留', () => {
    const legal = serializeSave(saveState(9, 900))
    const overflow = legal.replace('"dwCash":900', '"dwCash":1e400')
    expect(overflow).not.toBe(legal)
    expect(() => parseImportedSave(overflow)).toThrow(/dwCash/)
    expect(parseImportedSave(serializeSave(saveState(9, 0))).dwCash).toBe(0)
  })
})
