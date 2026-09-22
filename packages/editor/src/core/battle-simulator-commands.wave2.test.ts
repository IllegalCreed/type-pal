/**
 * TEST-NONVISUAL-COVERAGE-2 W2-B B03：battle-simulator-commands 依赖确认集合过期臂（wave2）。
 * 既有 scripts/battle-simulator-ui.test.tsx 十项已证命令主干/undo/错误恢复；
 * 本文件补冻结定位 :32-63 六臂——put 按 stable ID 插入或原位替换、依赖方案集合精确匹配
 * （空确认/部分确认/过期确认/完整确认）、预设不存在拒绝、捕获前 invert 拒绝。
 */
import { describe, expect, test } from 'vitest'
import {
  BattleSimulatorPresetInUseError,
  battleSimulatorDependentPlans,
  deleteBattleSimulatorRecord,
  putBattleSimulatorRecord,
  SetBattleSimulatorLibraryCommand,
} from './battle-simulator-commands.js'
import type { BattleSimulatorLibrary } from './battle-simulator-library.js'
import { emptyBattleSimulatorLibrary } from './battle-simulator-library.js'

const bagRecord = (id: string) =>
  ({ id, name: `包${id}`, description: '', config: { items: [] } }) as never

const planUsingBag = (id: string, bagId: string) =>
  ({
    id,
    name: `方案${id}`,
    description: '',
    config: {
      party: { kind: 'inline', config: { members: [] } },
      enemies: { kind: 'inline', config: { kind: 'slots', slots: [null, null, null, null, null] } },
      bag: { kind: 'preset', presetId: bagId },
      fieldId: 0,
      music: { kind: 'default' },
      money: 0,
      auto: false,
      boss: false,
      overrides: {},
    },
  }) as never

const libraryWithDependency = (): BattleSimulatorLibrary =>
  ({
    ...emptyBattleSimulatorLibrary(),
    bags: [bagRecord('bag-1')],
    plans: [planUsingBag('plan-1', 'bag-1'), planUsingBag('plan-2', 'bag-1')],
  }) as unknown as BattleSimulatorLibrary

describe('W2-B B03 putBattleSimulatorRecord', () => {
  test('新 stable ID 追加到目录尾部；同 ID 原位替换保序', () => {
    const lib = emptyBattleSimulatorLibrary()
    const one = putBattleSimulatorRecord(lib, 'bags', bagRecord('b1'))
    expect(one.bags.map((row) => row.id)).toEqual(['b1'])
    const two = putBattleSimulatorRecord(one, 'bags', bagRecord('b2'))
    expect(two.bags.map((row) => row.id)).toEqual(['b1', 'b2']) // 追加
    const replaced = putBattleSimulatorRecord(two, 'bags', bagRecord('b1'))
    expect(replaced.bags.map((row) => row.id)).toEqual(['b1', 'b2']) // 原位保序
    expect(replaced.bags[0]!.name).toBe('包b1')
  })
})

describe('W2-B B03 deleteBattleSimulatorRecord 依赖确认集合', () => {
  test('battleSimulatorDependentPlans：plans 目录恒空；allies/bags/enemies 映射分节', () => {
    const lib = libraryWithDependency()
    expect(battleSimulatorDependentPlans(lib, 'plans', 'plan-1')).toEqual([])
    expect(battleSimulatorDependentPlans(lib, 'bags', 'bag-1')).toEqual(['plan-1', 'plan-2'])
  })

  test('无依赖：直接删除成功；预设不存在 throw', () => {
    const lib = libraryWithDependency()
    expect(() => deleteBattleSimulatorRecord(lib, 'bags', 'ghost')).toThrow('预设不存在：ghost')
    const noDependency = { ...lib, plans: [] } as typeof lib
    const after = deleteBattleSimulatorRecord(noDependency, 'bags', 'bag-1', [])
    expect(after.bags).toEqual([]) // 依赖集为空 → 空确认即通过
  })

  test('有依赖：空确认/部分确认/过期确认均拒绝并携带精确依赖集合', () => {
    const lib = libraryWithDependency()
    const expected = ['plan-1', 'plan-2']
    for (const confirmed of [[], ['plan-1'], ['plan-1', 'stale-plan']] as const) {
      try {
        deleteBattleSimulatorRecord(lib, 'bags', 'bag-1', confirmed)
        throw new Error('should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BattleSimulatorPresetInUseError)
        expect((error as BattleSimulatorPresetInUseError).planIds).toEqual(expected)
      }
    }
  })

  test('完整且仅含当前依赖的确认集合通过删除', () => {
    const lib = libraryWithDependency()
    const after = deleteBattleSimulatorRecord(lib, 'bags', 'bag-1', ['plan-2', 'plan-1']) // 顺序无关
    expect(after.bags).toEqual([])
    expect(after.plans).toHaveLength(2) // 方案记录本身保留（悬空引用另行诊断）
  })
})

describe('W2-B B03 SetBattleSimulatorLibraryCommand', () => {
  const baseState = () => ({ battleSimulator: undefined }) as never

  test('apply 捕获前值；invert 恢复；未执行即 invert 拒绝', () => {
    const lib = libraryWithDependency()
    const command = new SetBattleSimulatorLibraryCommand(lib)
    const applied = command.apply(baseState())
    expect(applied.battleSimulator).toBeDefined()
    const inverted = command.invert(applied)
    expect(inverted.battleSimulator).toBeUndefined() // 恢复捕获前值
    const fresh = new SetBattleSimulatorLibraryCommand(lib)
    expect(() => fresh.invert(baseState())).toThrow('尚未执行')
  })
})
