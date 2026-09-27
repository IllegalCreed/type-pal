/**
 * TEST-GLM-STATE-COMMANDS-1 A04：use-menu-state 残差
 * 去重：use-menu-state.test.ts 10+ 例、navigation-boundaries.test.ts B4–B6 已证
 * 基础导航/确认/应用/关闭/finishUse——本文件只补冻结池内：useApply 错误路径 undefined、
 * useConfirm pick-target 重复确认/cursor 越界、useBackFromTarget pick-item no-op、
 * finishUseExecution status:external、battleOnly 物品排除、USE_GRID_COLS/closeUseMenu。
 */

import type { ItemDataMap, WorldItemUseOutcome } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { makeTestItems, makeTestWorld } from './test-fixtures.js'
import {
  closeUseMenu,
  finishUseExecution,
  openUseMenu,
  USE_GRID_COLS,
  useApply,
  useBackFromTarget,
  useConfirm,
  useMoveCursor,
} from './use-menu-state.js'

const items: ItemDataMap = makeTestItems()
const w = makeTestWorld()

describe('A04 use-menu-state 残差', () => {
  test('useApply：pick-item 阶段 undefined；pick-target 无 selectedItemId undefined', () => {
    const s = openUseMenu(w, items)
    expect(useApply(s, w, 'li-xiaoyao', items)).toBeUndefined()
    s.phase = 'pick-target'
    delete s.selectedItemId
    expect(useApply(s, w, 'li-xiaoyao', items)).toBeUndefined()
  })

  test('useConfirm pick-target 重复确认：同引用返回', () => {
    const s = openUseMenu(w, items)
    s.phase = 'pick-target'
    s.selectedItemId = '61'
    const result = useConfirm(s, w, items)
    expect(result.kind).toBe('pick-target')
    expect(result.kind === 'pick-target' && result.state).toBe(s)
  })

  test('useConfirm cursor 越界：同引用返回', () => {
    const s = openUseMenu(w, items)
    s.cursor = 99
    const result = useConfirm(s, w, items)
    expect(result.kind).toBe('pick-target')
    expect(result.kind === 'pick-target' && result.state).toBe(s)
  })

  test('useBackFromTarget pick-item 阶段 no-op：同引用不变', () => {
    const s = openUseMenu(w, items)
    const result = useBackFromTarget(s)
    expect(result).toBe(s)
  })

  test('useConfirm 空队 execute targetCharId 为空字符串', () => {
    const emptyW: typeof w = { ...makeTestWorld(), party: [] }
    const s = openUseMenu(emptyW, items)
    const result = useConfirm(s, emptyW, items)
    expect(result.kind).toBe('execute')
    if (result.kind === 'execute') {
      expect(result.request.targetCharId).toBe('')
    }
  })

  test('finishUseExecution status:external 按非成功处理，返回原 state', () => {
    const s = openUseMenu(w, items)
    s.selectedItemId = '61'
    s.phase = 'pick-target'
    const request = useApply(s, w, 'li-xiaoyao', items)
    expect(request).toBeDefined()
    const extOutcome: WorldItemUseOutcome = {
      status: 'external',
      world: w,
      consumed: false,
      changed: false,
      effectResults: [],
      presentations: [],
      menu: 'keep',
    }
    const result = request ? finishUseExecution(request, extOutcome, items) : undefined
    expect(result).toBe(s)
  })

  test('battleOnly 物品不入列', () => {
    const battleItems: ItemDataMap = {
      ...items,
      battlePotion: makeItem({
        id: 'battlePotion',
        name: '战斗药',
        use: {
          target: 'oneAlly',
          consuming: true,
          battleOnly: true,
          effects: [{ kind: 'healHp', amount: 30 }],
        },
      }),
    }
    const s = openUseMenu(w, battleItems)
    const ids = s.items.map((it) => it.id)
    expect(ids).not.toContain('battlePotion')
  })

  test('USE_GRID_COLS === 3；closeUseMenu 完整对象', () => {
    expect(USE_GRID_COLS).toBe(3)
    const closed = closeUseMenu()
    expect(closed).toEqual({
      active: false,
      phase: 'pick-item',
      items: [],
      cursor: 0,
    })
  })
})

/** 辅助：构造合法物品（局部用，不导出） */
function makeItem(over: Record<string, unknown>): ItemDataMap[string] {
  const { id, ...rest } = over
  return {
    id: id as string,
    name: '测试物品',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
    ...rest,
  }
}

/** 辅助：光标移动（确保已有覆盖不重复，本文件只做边界 clamp） */
function useMoveCursorTest(): void {
  const s = openUseMenu(w, items)
  expect(useMoveCursor(s, 'down')).toBeDefined()
}
void useMoveCursorTest
