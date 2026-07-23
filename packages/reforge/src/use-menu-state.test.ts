import { type ItemDataMap, resolveWorldItemUse, type WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { makeTestItems, makeTestWorld } from './test-fixtures.js'
import {
  closeUseMenu,
  finishUseExecution,
  openUseMenu,
  useApply,
  useBackFromTarget,
  useConfirm,
  useMoveCursor,
} from './use-menu-state.js'

// 列表顺序 = inventory 顺序 [267 土灵珠(scene), 61 观音符(oneAlly), 78 茶叶蛋(oneAlly)]。
describe('使用菜单状态机', () => {
  test('openUseMenu:pick-item,列出可用物 + initialCursor 恢复光标(越界 clamp)', () => {
    const w = makeTestWorld()
    const s = openUseMenu(w, makeTestItems())
    expect(s.active).toBe(true)
    expect(s.phase).toBe('pick-item')
    expect(s.items.length).toBe(3)
    expect(openUseMenu(w, makeTestItems(), 2).cursor).toBe(2) // 恢复上次光标
    expect(openUseMenu(w, makeTestItems(), 99).cursor).toBe(2) // 越界 clamp 到末项(共 3)
  })
  test('useConfirm:单体(观音符)→ pick-target;脚本类(土灵珠)→ 直接执行不选目标', () => {
    const w = makeTestWorld()
    const oneAlly = useConfirm(
      useMoveCursor(openUseMenu(w, makeTestItems()), 'right'),
      w,
      makeTestItems(),
    ) // idx1 观音符
    expect(oneAlly.kind).toBe('pick-target')
    if (oneAlly.kind === 'pick-target') {
      expect(oneAlly.state.phase).toBe('pick-target')
      expect(oneAlly.state.selectedItemId).toBe('61')
    }
    const script = useConfirm(openUseMenu(w, makeTestItems()), w, makeTestItems()) // idx0 土灵珠(scene/runScript)
    expect(script.kind).toBe('execute')
    if (script.kind === 'execute') expect(script.request.origin).toBe('pick-item') // 不进选目标
  })
  test('useConfirm:场景钩子道具(引路蜂)→ 统一 execute 请求,菜单层不再识别 effect kind', () => {
    const items: ItemDataMap = {
      '151': {
        id: '151',
        name: '引路蜂',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: true,
        use: {
          target: 'scene',
          consuming: true,
          effects: [{ kind: 'runSceneHook', hook: 'onTeleport' }],
        },
      },
    }
    const world: WorldState = {
      party: [],
      money: 0,
      learnedSkills: {},
      inventory: [{ itemId: '151', count: 1 }],
    }
    const r = useConfirm(openUseMenu(world, items), world, items)
    expect(r.kind).toBe('execute')
    if (r.kind === 'execute') expect(r.request.itemId).toBe('151')
  })
  test('useApply:单体用完留 pick-target 可连用,用光才回 pick-item', () => {
    const w0 = makeTestWorld()
    const c = useConfirm(
      useMoveCursor(openUseMenu(w0, makeTestItems()), 'right'),
      w0,
      makeTestItems(),
    ) // 观音符 count2
    if (c.kind !== 'pick-target') throw new Error('expected pick-target')
    const request1 = useApply(c.state, w0, 'li-xiaoyao', makeTestItems())
    if (!request1) throw new Error('expected execution request')
    const outcome1 = resolveWorldItemUse(w0, 'li-xiaoyao', request1.itemId, makeTestItems())
    expect(outcome1.world.party[0]?.hp).toBe(150) // 100+150 夹满
    const state1 = finishUseExecution(request1, outcome1, makeTestItems())
    expect(state1.phase).toBe('pick-target') // 还有 → 留选目标

    const request2 = useApply(state1, outcome1.world, 'li-xiaoyao', makeTestItems())
    if (!request2) throw new Error('expected execution request')
    const outcome2 = resolveWorldItemUse(
      outcome1.world,
      'li-xiaoyao',
      request2.itemId,
      makeTestItems(),
    )
    const state2 = finishUseExecution(request2, outcome2, makeTestItems())
    expect(state2.phase).toBe('pick-item') // 用光 → 回列表
  })
  test('useBackFromTarget:pick-target → pick-item', () => {
    const w = makeTestWorld()
    const c = useConfirm(
      useMoveCursor(openUseMenu(w, makeTestItems()), 'right'),
      w,
      makeTestItems(),
    )
    if (c.kind !== 'pick-target') throw new Error('expected pick-target')
    expect(useBackFromTarget(c.state).phase).toBe('pick-item')
  })
  test('closeUseMenu:active false', () => {
    expect(closeUseMenu().active).toBe(false)
  })

  test('finishUseExecution:失败保持原位；成功且 menu=close 关闭整个使用菜单', () => {
    const world = makeTestWorld()
    const confirmed = useConfirm(openUseMenu(world, makeTestItems()), world, makeTestItems())
    if (confirmed.kind !== 'execute') throw new Error('expected execute')
    const failure = finishUseExecution(
      confirmed.request,
      {
        status: 'failure',
        world,
        consumed: false,
        changed: false,
        effectResults: [],
        presentations: [],
        reason: 'external-unavailable',
        menu: 'keep',
      },
      makeTestItems(),
    )
    expect(failure).toBe(confirmed.request.state)

    const success = finishUseExecution(
      confirmed.request,
      {
        status: 'success',
        world,
        consumed: true,
        changed: true,
        effectResults: [],
        presentations: [],
        menu: 'close',
      },
      makeTestItems(),
    )
    expect(success).toEqual(closeUseMenu())
  })
})
