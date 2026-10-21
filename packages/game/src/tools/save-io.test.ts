// src/tools/save-io.test.ts
import { describe, expect, it } from 'vitest'
import { createInitialGameState, type GameState } from '../core/game-state.js'
import { parseImportedSave, serializeSave } from './save-io.js'

function saveState(scene: number, cash = 0): GameState {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.wNumScene = scene
  gs.dwCash = cash
  return gs
}

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
    const bad = JSON.stringify({ format: 'type-pal-save', version: 1, gs: { wNumScene: 1 } })
    expect(() => parseImportedSave(bad)).toThrow(/字段/)
  })
  it('parseImportedSave:partyMembers 合法但 wNumScene 缺失或为文本 → 拒绝', () => {
    for (const gs of [{ partyMembers: [0] }, { partyMembers: [0], wNumScene: '5' }]) {
      const text = JSON.stringify({ format: 'type-pal-save', version: 1, gs })
      expect(() => parseImportedSave(text)).toThrow(/存档缺必要字段/)
    }
  })
  it('parseImportedSave:未知 version → 拒绝，不把未来/旧 envelope 交给 Save API', () => {
    const raw = JSON.parse(serializeSave(saveState(1)))
    raw.version = 2
    expect(() => parseImportedSave(JSON.stringify(raw))).toThrow(/版本/)
  })
})
