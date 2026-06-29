import { initialWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  closeUseMenu,
  openUseMenu,
  useApply,
  useBackFromTarget,
  useConfirmItem,
  useMoveCursor,
} from './use-menu-state.js'

describe('使用菜单状态机', () => {
  test('openUseMenu:pick-item,列出可用物', () => {
    const s = openUseMenu(initialWorld())
    expect(s.active).toBe(true)
    expect(s.phase).toBe('pick-item')
    expect(s.items.length).toBe(3) // 土灵珠/观音符/茶叶蛋
  })
  test('useConfirmItem:pick-item → pick-target,记选中', () => {
    const s = useConfirmItem(openUseMenu(initialWorld()))
    expect(s.phase).toBe('pick-target')
    expect(s.selectedItemId).toBeDefined()
  })
  test('useApply:施用回写 world + 消耗 + 回 pick-item 重算', () => {
    const w0 = initialWorld()
    // 把光标移到观音符(id 61);demo 列表顺序 = inventory 顺序 [267,61,78] → index 1
    let s = openUseMenu(w0)
    s = useMoveCursor(s, 'right') // 0→1 = 观音符
    s = useConfirmItem(s)
    const r = useApply(s, w0, 'li-xiaoyao')
    expect(r.world.party[0]?.hp).toBe(150) // 100+150 夹满
    expect(r.state.phase).toBe('pick-item') // 回列表
  })
  test('useBackFromTarget:pick-target → pick-item', () => {
    const s = useBackFromTarget(useConfirmItem(openUseMenu(initialWorld())))
    expect(s.phase).toBe('pick-item')
  })
  test('closeUseMenu:active false', () => {
    expect(closeUseMenu().active).toBe(false)
  })
})
