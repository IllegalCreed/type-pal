/**
 * TEST-NONVISUAL-COVERAGE-2 W2-B B02：battle-simulator-library 冻结剩余分支臂（wave2）。
 * 既有 battle-simulator-library.test.ts 三标题已证解析/深拷贝/悬空修复/内联方案；
 * 本文件补 :29/:103/:151-152/:177 五臂——records 空数组默认、名称空白拒绝、
 * description 非字符串拒绝、解析输出与输入别名隔离。
 */
import { describe, expect, test } from 'vitest'
import {
  emptyBattleSimulatorLibrary,
  parseBattleSimulatorLibrary,
} from './battle-simulator-library.js'

const legalRecord = (id: string): Record<string, unknown> => ({
  id,
  name: `预设${id}`,
  description: '',
  config: { items: [] },
})

const libraryValue = (bags: unknown[]): Record<string, unknown> => ({
  kind: 'type-pal-battle-simulator',
  version: 1,
  allies: [],
  enemies: [{ id: 'e1', name: '敌', description: '', config: { kind: 'team', teamId: 't' } }],
  bags,
  plans: [],
})

describe('W2-B B02 parseBattleSimulatorLibrary 剩余臂', () => {
  test('records 空数组直通与未知字段拒绝（:29 臂为空数组默认调用方省略键）', () => {
    const minimal = {
      kind: 'type-pal-battle-simulator',
      version: 1,
      allies: [],
      enemies: [],
      bags: [],
      plans: [],
    }
    const parsed = parseBattleSimulatorLibrary(minimal)
    expect(parsed.allies).toEqual([])
    expect(parsed.bags).toEqual([])
    const unknown = { ...minimal, extra: 1 }
    expect(() => parseBattleSimulatorLibrary(unknown)).toThrow('extra: 未知字段')
    expect(() => parseBattleSimulatorLibrary({ kind: 'other', version: 1 })).toThrow(
      '仅支持当前kind/type-pal-battle-simulator与version/1',
    )
  })

  test('名称空白拒绝（:103 臂）；重复预设 ID 拒绝', () => {
    const blankName = libraryValue([{ ...legalRecord('b1'), name: '   ' }])
    expect(() => parseBattleSimulatorLibrary(blankName)).toThrow('名称不能为空')
    const dup = libraryValue([legalRecord('b1'), legalRecord('b1')])
    expect(() => parseBattleSimulatorLibrary(dup)).toThrow('重复预设ID b1')
  })

  test('description 非字符串拒绝（:151-152 臂）；id 空白拒绝', () => {
    const badDescription = libraryValue([{ ...legalRecord('b1'), description: 7 }])
    expect(() => parseBattleSimulatorLibrary(badDescription)).toThrow('期望说明文本')
    const badId = libraryValue([{ ...legalRecord('  b1  ') }])
    expect(() => parseBattleSimulatorLibrary(badDescription)).toThrow()
    expect(() => parseBattleSimulatorLibrary(badId)).toThrow('无首尾空白')
  })

  test('解析输出与输入别名隔离（:177 臂）：改输出不动输入', () => {
    const value = libraryValue([legalRecord('b1')])
    const snapshot = structuredClone(value)
    const parsed = parseBattleSimulatorLibrary(value)
    parsed.bags[0]!.config.items.push({ itemId: 'x', quantity: 1 } as never)
    expect(value).toEqual(snapshot)
    expect(emptyBattleSimulatorLibrary().plans).toEqual([])
  })
})
