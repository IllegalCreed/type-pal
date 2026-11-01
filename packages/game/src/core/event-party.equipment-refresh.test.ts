/** Real event tick changes party, clears old poison slots and rebuilds new equipment effects. Independent of synchronous battle raw fallback. */
import type { Item } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { makeRoleRecord as makeRole } from '../__tests__/battle-records.js'
import { updateAllEquipments } from './equip-effect.js'
import { setRefreshEquipmentsHandler, tickEventSystem } from './event-system.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from './game-state.js'
import { setObjectPoisons } from './player-poison-state.js'
import { setGlobalEvents } from './script-catalog.js'

afterEach(() => {
  setRefreshEquipmentsHandler(null)
  setObjectPoisons([])
  setGlobalEvents([])
})
describe('世界/隊伍 opcode', () => {
  it('0x75 SetParty:事件换队先清旧毒，再为新队伍重建寿葫芦效果', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, {
      roles: Array.from({ length: 6 }, (_, id) => makeRole(id)),
    })
    gs.partyMembers = [4, 1]
    gs.rgPoisonStatus['0_0'] = { wPoisonID: 552, wPoisonScript: 1 }
    gs.rgPoisonStatus['0_1'] = { wPoisonID: 553, wPoisonScript: 1 }
    gs.PlayerRolesRuntime.rgwHP[0] = 30
    gs.PlayerRolesRuntime.rgwHP[1] = 40
    gs.PlayerRolesRuntime.rgwMP[1] = 10
    gs.PlayerRolesRuntime.rgwEquipment = Array.from({ length: 6 }, (_, part) =>
      Array.from({ length: 6 }, (_, role) => (part === 5 && (role === 0 || role === 1) ? 269 : 0)),
    )
    // items.json 269；全局脚本39163/40860/40858的原始opcode，压缩数组用原label解析。
    const gourd: Item = {
      id: 269,
      bitmap: 8,
      price: 8600,
      scriptOnUse: 0,
      scriptOnEquip: 39163,
      scriptOnThrow: 0,
      scriptDesc: 40275,
      flags: {
        usable: false,
        equipable: true,
        throwable: false,
        consuming: false,
        applyToAll: false,
        sellable: true,
        equipableBy: [true, true, true, false, true, false],
      },
    }
    setGlobalEvents([
      { op: 'raw', opcode: 0x75, operands: [2, 3, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x18, operands: [16, 269, 0], label: 'L_39163' },
      { op: 'raw', opcode: 0x29, operands: [0, 563, 0] },
      { op: 'raw', opcode: 0x29, operands: [0, 564, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x1b, operands: [0, 20, 0], label: 'L_40860' },
      { op: 'end' },
      { op: 'raw', opcode: 0x1c, operands: [0, 20, 0], label: 'L_40858' },
      { op: 'end' },
    ])
    setObjectPoisons([
      { id: 552, level: 1, color: 64, playerScript: 40866, enemyScript: 40868 },
      { id: 553, level: 1, color: 33, playerScript: 40870, enemyScript: 40872 },
      { id: 563, level: 99, color: 0, playerScript: 40860, enemyScript: 0 },
      { id: 564, level: 99, color: 0, playerScript: 40858, enemyScript: 0 },
    ])
    // bootstrap 的刷新回调同样委派真实装备重建；核角色与完整毒槽结果。
    setRefreshEquipmentsHandler((state) => updateAllEquipments(state, [gourd]))
    gs.eventCursor = { ip: 0 }
    gs.mode = 'event'
    tickEventSystem(gs, { held: new Set(), pressed: new Set(), frameNum: 0 })

    expect(gs.partyMembers).toEqual([1, 2])
    expect(gs.rgPoisonStatus).toEqual({
      ...Object.fromEntries(
        Array.from({ length: 16 }, (_, slot) => [`${slot}_0`, { wPoisonID: 0, wPoisonScript: 0 }]),
      ),
      '0_0': { wPoisonID: 563, wPoisonScript: 6 },
      '1_0': { wPoisonID: 564, wPoisonScript: 8 },
    })
    expect(gs.PlayerRolesRuntime.rgwHP[1]).toBe(60)
    expect(gs.PlayerRolesRuntime.rgwMP[1]).toBe(30)
    expect(gs.PlayerRolesRuntime.rgwHP[0]).toBe(30) // 离队role0的装备仍被遍历，但不得施毒/跑入口。
    expect(gs.mode).toBe('explore')
  })
})
