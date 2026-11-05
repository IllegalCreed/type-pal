/** Player poison queries, party-slot ownership, and synchronous entry handoff. */
import type { Command } from '@type-pal/shared'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { freshPlayerOpcodeState } from './event-opcode-player.test-fixtures.js'
import { runPlayerPoisonEntrySync } from './event-system.js'
import type { GameState } from './game-state.js'
import {
  addPoisonForPlayer,
  curePlayerPoisonByKind,
  curePlayerPoisonByLevel,
  isPlayerPoisoned,
  removePoisonLevel99,
  setObjectPoisons,
} from './player-poison-state.js'
import { setGlobalEvents } from './script-catalog.js'

function seed(state: GameState, roleId: number, slot: number, poisonId: number, script = 0): void {
  const partySlot = state.partyMembers.indexOf(roleId)
  if (partySlot < 0) throw new Error(`test fixture role ${roleId} is not in party`)
  state.rgPoisonStatus[`${slot}_${partySlot}`] = { wPoisonID: poisonId, wPoisonScript: script }
}
afterEach(() => {
  setObjectPoisons([])
  setGlobalEvents([])
})
describe('离队角色没有毒槽 ownership', () => {
  function partyWithPoisons(): GameState {
    const state = freshPlayerOpcodeState()
    state.partyMembers = [4, 1]
    setObjectPoisons([
      { id: 552, level: 1, color: 64, playerScript: 10, enemyScript: 0 },
      { id: 553, level: 2, color: 64, playerScript: 20, enemyScript: 0 },
      { id: 563, level: 99, color: 0, playerScript: 30, enemyScript: 0 },
    ])
    state.rgPoisonStatus = {
      '0_0': { wPoisonID: 552, wPoisonScript: 11 },
      '1_0': { wPoisonID: 563, wPoisonScript: 31 },
      '0_1': { wPoisonID: 553, wPoisonScript: 21 },
    }
    return state
  }

  // role 0 是合法角色，但不在当前队伍；其 ID 恰好与 role 4 的队伍槽 0 相同。
  // SDLPal poison query/cure functions first map the role to a party slot.
  test('查询离队角色不能读到当前首槽角色的真毒或指定毒', () => {
    const state = partyWithPoisons()
    expect(isPlayerPoisoned(state, 0)).toBe(false)
    expect(isPlayerPoisoned(state, 0, 552)).toBe(false)
    expect(isPlayerPoisoned(state, 4, 552)).toBe(true)
  })

  test('向离队角色施毒不执行入口，也不创建槽或改变在队角色的毒', () => {
    const state = partyWithPoisons()
    const before = structuredClone(state.rgPoisonStatus)
    const runner = vi.fn((ip: number) => ip + 1)
    addPoisonForPlayer(state, 0, 553, runner)
    expect(runner).not.toHaveBeenCalled()
    expect(state.rgPoisonStatus).toEqual(before)
  })

  test.each([
    { name: '按种类解毒', run: (state: GameState) => curePlayerPoisonByKind(state, 0, 552) },
    { name: '按等级解毒', run: (state: GameState) => curePlayerPoisonByLevel(state, 0, 3) },
    { name: '卸装备清伪毒', run: (state: GameState) => removePoisonLevel99(state, 0) },
  ])('$name：离队角色操作不能修改当前队伍毒表', ({ run }) => {
    const state = partyWithPoisons()
    const before = structuredClone(state.rgPoisonStatus)
    run(state)
    expect(state.rgPoisonStatus).toEqual(before)
  })
})
describe('isPlayerPoisoned', () => {
  test('ByKind 只查指定毒 id，不看等级与其它毒', () => {
    setObjectPoisons([
      { id: 5, level: 1, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 7, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    const state = freshPlayerOpcodeState()
    expect(isPlayerPoisoned(state, 0)).toBe(false)
    seed(state, 0, 0, 7)
    expect(isPlayerPoisoned(state, 0)).toBe(false)
    expect(isPlayerPoisoned(state, 0, 7)).toBe(true)
    expect(isPlayerPoisoned(state, 0, 5)).toBe(false)
  })

  test('ByLevel(role,0)：level>=99 装备伪毒不算中毒', () => {
    setObjectPoisons([
      { id: 5, level: 1, color: 0, playerScript: 0, enemyScript: 0 },
      { id: 90, level: 99, color: 0, playerScript: 0, enemyScript: 0 },
    ])
    const state = freshPlayerOpcodeState()
    seed(state, 0, 0, 90) // 寿葫芦类伪毒
    expect(isPlayerPoisoned(state, 0)).toBe(false)
    seed(state, 0, 1, 5) // 真毒
    expect(isPlayerPoisoned(state, 0)).toBe(true)
  })

  test('missing poison definitions use the existing level-zero fallback', () => {
    setObjectPoisons([])
    const state = freshPlayerOpcodeState()
    seed(state, 0, 0, 90)
    expect(isPlayerPoisoned(state, 0)).toBe(true)
  })
})
describe('cure / remove', () => {
  test('curePlayerPoisonByKind 只清该毒全部槽位', () => {
    const state = freshPlayerOpcodeState()
    seed(state, 0, 0, 7, 11)
    seed(state, 0, 3, 7, 22)
    seed(state, 0, 5, 9, 33)
    curePlayerPoisonByKind(state, 0, 7)
    expect(state.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(state.rgPoisonStatus['3_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
    expect(state.rgPoisonStatus['5_0']).toEqual({ wPoisonID: 9, wPoisonScript: 33 })
  })

  test('curePlayerPoisonByLevel 无 99 例外：maxLevel 内连装备毒一并清', () => {
    setObjectPoisons([{ id: 90, level: 99, color: 0, playerScript: 0, enemyScript: 0 }])
    const state = freshPlayerOpcodeState()
    seed(state, 0, 0, 90, 66)
    curePlayerPoisonByLevel(state, 0, 99)
    expect(state.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 0, wPoisonScript: 0 })
  })
})
describe('poison insertion boundaries', () => {
  test('去重：已有同毒不落第二槽', () => {
    const state = freshPlayerOpcodeState()
    seed(state, 0, 2, 7, 11)
    addPoisonForPlayer(state, 0, 7)
    const occupied = Object.entries(state.rgPoisonStatus).filter(([, p]) => p && p.wPoisonID === 7)
    expect(occupied).toHaveLength(1)
    expect(state.rgPoisonStatus['2_0']?.wPoisonScript).toBe(11)
  })
  test('a zero entry stores the poison without invoking the runner', () => {
    setObjectPoisons([{ id: 7, level: 1, color: 0, playerScript: 0, enemyScript: 0 }])
    const state = freshPlayerOpcodeState()
    const runner = vi.fn((ip: number) => ip)
    addPoisonForPlayer(state, 0, 7, runner)
    expect(state.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 7, wPoisonScript: 0 })
    expect(runner).not.toHaveBeenCalled()
  })
  test('sixteen occupied slots reject another poison without changing their entries', () => {
    const state = freshPlayerOpcodeState()
    setObjectPoisons(
      Array.from({ length: 17 }, (_, i) => ({
        id: 100 + i,
        level: 1,
        color: 0,
        playerScript: 0,
        enemyScript: 0,
      })),
    )
    for (let slot = 0; slot < 16; slot++) seed(state, 0, slot, 100 + slot)
    const before = structuredClone(state.rgPoisonStatus)
    addPoisonForPlayer(state, 0, 116)
    expect(state.rgPoisonStatus).toEqual(before)
  })
})
function installEntry() {
  const state = freshPlayerOpcodeState()
  setObjectPoisons([{ id: 7, level: 1, color: 0, playerScript: 1, enemyScript: 0 }])
  setGlobalEvents([
    { op: 'end', label: 'L_0' },
    { op: 'raw', opcode: 0x1e, operands: [7, 0, 0], label: 'L_1' },
    { op: 'end', advance: true, label: 'L_2' },
    { op: 'end', label: 'L_3' },
  ] satisfies Command[])
  return state
}
describe('poison entry handoff', () => {
  test('the injected real entry runs once and its returned checkpoint belongs to the poison', () => {
    const state = installEntry()
    const seen: number[] = []
    addPoisonForPlayer(state, 0, 7, (ip) => {
      seen.push(ip)
      return runPlayerPoisonEntrySync(state, 0, ip)
    })
    expect(state.dwCash).toBe(7)
    expect(seen).toEqual([1])
    expect(state.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 7, wPoisonScript: 3 })
  })
  test('without an entry runner the original checkpoint is retained without executing it', () => {
    const state = installEntry()
    addPoisonForPlayer(state, 0, 7)
    expect(state.dwCash).toBe(0)
    expect(state.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 7, wPoisonScript: 1 })
  })
})
