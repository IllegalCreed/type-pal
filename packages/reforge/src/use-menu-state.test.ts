import { DEMO_ITEMS, initialWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  closeUseMenu,
  openUseMenu,
  useApply,
  useBackFromTarget,
  useConfirm,
  useMoveCursor,
} from './use-menu-state.js'

// 列表顺序 = inventory 顺序 [267 土灵珠(scene), 61 观音符(oneAlly), 78 茶叶蛋(oneAlly)]。
describe('使用菜单状态机', () => {
  test('openUseMenu:pick-item,列出可用物 + initialCursor 恢复光标(越界 clamp)', () => {
    const w = initialWorld()
    const s = openUseMenu(w, DEMO_ITEMS)
    expect(s.active).toBe(true)
    expect(s.phase).toBe('pick-item')
    expect(s.items.length).toBe(3)
    expect(openUseMenu(w, DEMO_ITEMS, 2).cursor).toBe(2) // 恢复上次光标
    expect(openUseMenu(w, DEMO_ITEMS, 99).cursor).toBe(2) // 越界 clamp 到末项(共 3)
  })
  test('useConfirm:单体(观音符)→ pick-target;脚本类(土灵珠)→ 直接执行不选目标', () => {
    const w = initialWorld()
    const oneAlly = useConfirm(useMoveCursor(openUseMenu(w, DEMO_ITEMS), 'right'), w, DEMO_ITEMS) // idx1 观音符
    expect(oneAlly.kind).toBe('pick-target')
    if (oneAlly.kind === 'pick-target') {
      expect(oneAlly.state.phase).toBe('pick-target')
      expect(oneAlly.state.selectedItemId).toBe('61')
    }
    const script = useConfirm(openUseMenu(w, DEMO_ITEMS), w, DEMO_ITEMS) // idx0 土灵珠(scene/triggerScript)
    expect(script.kind).toBe('direct')
    if (script.kind === 'direct') expect(script.state.phase).toBe('pick-item') // 不进选目标
  })
  test('useApply:单体用完留 pick-target 可连用,用光才回 pick-item', () => {
    const w0 = initialWorld()
    const c = useConfirm(useMoveCursor(openUseMenu(w0, DEMO_ITEMS), 'right'), w0, DEMO_ITEMS) // 观音符 count2
    if (c.kind !== 'pick-target') throw new Error('expected pick-target')
    const r1 = useApply(c.state, w0, 'li-xiaoyao', DEMO_ITEMS) // 用 1 颗 2→1
    expect(r1.world.party[0]?.hp).toBe(150) // 100+150 夹满
    expect(r1.state.phase).toBe('pick-target') // 还有 → 留选目标
    const r2 = useApply(r1.state, r1.world, 'li-xiaoyao', DEMO_ITEMS) // 用第 2 颗 1→0
    expect(r2.state.phase).toBe('pick-item') // 用光 → 回列表
  })
  test('useBackFromTarget:pick-target → pick-item', () => {
    const w = initialWorld()
    const c = useConfirm(useMoveCursor(openUseMenu(w, DEMO_ITEMS), 'right'), w, DEMO_ITEMS)
    if (c.kind !== 'pick-target') throw new Error('expected pick-target')
    expect(useBackFromTarget(c.state).phase).toBe('pick-item')
  })
  test('closeUseMenu:active false', () => {
    expect(closeUseMenu().active).toBe(false)
  })
})
