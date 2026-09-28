/**
 * TEST-GLM-PHASE1-LEAVES-3 L04（equip-menu.ts）— 去重表：
 *  - equip-menu.test（.list 结构/全显示/确认门/请求对象/cancel 复位/Up-Down wrap/list 相 noop）→ 不重复
 *  - equip-menu.boundaries.test（inUse 耗尽/非顺序 roleId/意图不改装备钱库存/done 相零副作用）→ 不重复
 *  - 新差异：createEquipMenu 固定 filter='equip' 入 list、目录缺 item 的确认 no-op（!item 分支）、
 *    done 相 equipMoveUp/Down 与 cancelEquipMenu 零触达、单人队 pick-role Down 环绕自返。
 * 显示 vs 执行：confirmEquipRole 只回请求对象，不证明装备 swap 已发生（dispatcher 跑 0x18）。
 */
import type { Item } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../game-state.js'
import {
  cancelEquipMenu,
  confirmEquipItem,
  createEquipMenu,
  equipMoveDown,
  equipMoveUp,
} from './equip-menu.js'

const ITEMS: Item[] = [
  {
    id: 500,
    _name: '木剑',
    bitmap: 0,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 0,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: true,
      throwable: false,
      consuming: false,
      applyToAll: false,
      sellable: false,
      equipableBy: [true, true, true, true, true, true],
    },
  },
]

function gsOne(): ReturnType<typeof createInitialGameState> {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  gs.inventory = [{ itemId: 500, count: 1 }]
  return gs
}

describe('L04 equip-menu 剩余合同', () => {
  it('createEquipMenu 的 list 固定 filter=equip（equipable 入口合同）', () => {
    const state = createEquipMenu(gsOne(), ITEMS)
    expect(state.list.filter).toBe('equip')
    expect(state.phase).toBe('list')
    expect(state.playerCursor).toBe(0)
  })

  it('库存条目 itemId 不在目录 → confirmEquipItem no-op 留 list（!item 分支）', () => {
    const gs = gsOne()
    gs.inventory = [{ itemId: 777, count: 1 }] // 目录外
    const state = createEquipMenu(gs, ITEMS)
    state.list.cursor = 0
    confirmEquipItem(state, ITEMS, { roles: [] }, [0])
    expect(state.phase).toBe('list')
    expect(state.selectedItemId).toBeUndefined()
  })

  it('done 相：equipMoveUp/Down 与 cancelEquipMenu 零触达', () => {
    const state = createEquipMenu(gsOne(), ITEMS)
    state.list.cursor = 0
    confirmEquipItem(state, ITEMS, { roles: [] }, [0])
    cancelEquipMenu(state) // pick-role → list
    expect(state.phase).toBe('list')
    cancelEquipMenu(state) // list → done
    expect(state.phase).toBe('done')
    const snapshot = structuredClone(state)
    equipMoveUp(state)
    equipMoveDown(state)
    cancelEquipMenu(state)
    expect(state).toEqual(snapshot)
  })

  it('单人队 pick-role：Down/Up 环绕自返（wMaxPartyMemberIndex=0）', () => {
    const state = createEquipMenu(gsOne(), ITEMS)
    state.list.cursor = 0
    confirmEquipItem(state, ITEMS, { roles: [] }, [0])
    expect(state.phase).toBe('pick-role')
    equipMoveDown(state)
    expect(state.playerCursor).toBe(0)
    equipMoveUp(state)
    expect(state.playerCursor).toBe(0)
  })
})
