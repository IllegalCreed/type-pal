// src/tools/save-io.test.ts
import { describe, expect, it } from 'vitest'
import { parseImportedSave, serializeSave } from './save-io.js'

describe('save-io', () => {
  it('serializeSave:gs → 带版本头的 JSON 字符串', () => {
    const json = serializeSave({ wNumScene: 5, dwCash: 100 } as never)
    const obj = JSON.parse(json)
    expect(obj.format).toBe('type-pal-save')
    expect(obj.version).toBe(1)
    expect(obj.gs.wNumScene).toBe(5)
  })
  it('parseImportedSave:合法 → 返回 gs;格式错 → 抛', () => {
    const json = serializeSave({ wNumScene: 9, partyMembers: [0] } as never)
    expect(parseImportedSave(json).wNumScene).toBe(9)
    expect(() => parseImportedSave('{}')).toThrow(/格式/)
    expect(() => parseImportedSave('not json')).toThrow()
    expect(() => parseImportedSave(JSON.stringify({ format: 'x' }))).toThrow(/格式/)
  })
  it('parseImportedSave:缺必要字段(partyMembers)→ 抛', () => {
    const bad = JSON.stringify({ format: 'type-pal-save', version: 1, gs: { wNumScene: 1 } })
    expect(() => parseImportedSave(bad)).toThrow(/字段/)
  })
})
