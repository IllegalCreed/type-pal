/** Automatic spell/target choice; projection uses the real runtime ownership chain. */
import type { Magic, PlayerRoles } from '@type-pal/shared'
import { describe, expect, test } from 'vitest'
import {
  createInitialGameState,
  hydratePlayerRolesRuntime,
  projectRuntimeToBattleRoles,
} from '../../game-state.js'
import type { BattleState } from '../battle-state.js'
import { pickAutoMagic, selectAutoTargetFrom } from '../battle-system.js'
import { makeMagic, makeRole, makeSpell, makeState } from './magic-action.test-fixtures.js'

const gs = () => createInitialGameState({ x: 0, y: 0, facing: 'down' })
const state = () => makeState({}, [{}]).state
const role = makeRole
const spell = (id: number) => makeSpell({ id, magicNumber: id })
const magic = (id: number, options: Partial<Magic> = {}) =>
  makeMagic({ id, baseDamage: 30, elemental: 0, ...options })
function slot(health: number): BattleState['enemies'][number] {
  return makeState({}, [{ health }]).state.enemies[0]!
}

describe('automatic enemy target boundaries', () => {
  test('begin<0 规范化为从 0 起扫首个活敌', () => {
    const enemies: BattleState['enemies'] = [slot(50), slot(0)]
    expect(selectAutoTargetFrom(enemies, -1, -1)).toBe(0)
  })

  test('prevTarget 越界(≥n)时回 begin 起扫，不读越界槽', () => {
    const enemies: BattleState['enemies'] = [slot(0), slot(50)]
    expect(selectAutoTargetFrom(enemies, 1, 9)).toBe(1) // prev 9 越界 → begin=1 活敌命中
    expect(selectAutoTargetFrom(enemies, 0, 9)).toBe(1) // begin=0 死敌 → 环绕到 1
  })
})

describe('automatic spell selection', () => {
  function projectedRoles(learned: number[]): PlayerRoles {
    const game = gs()
    const staticRoles: PlayerRoles = { roles: [role()] }
    hydratePlayerRolesRuntime(game.PlayerRolesRuntime, staticRoles)
    for (const [slot, magicId] of learned.entries())
      game.PlayerRolesRuntime.rgwMagic[slot]![0] = magicId
    return projectRuntimeToBattleRoles(game.PlayerRolesRuntime, staticRoles)
  }

  function autoState(statusSilence = 0): BattleState {
    const st = state()
    st.selectingPlayerIdx = 0
    if (statusSilence) st.players[0]!.status.silence = statusSilence
    return st
  }

  test('公开投影链把 rgwMagic 槽位真实投影为 role.magic（caller 同路）', () => {
    const projected = projectedRoles([0, 297, 0, 296])
    expect(projected.roles[0]!.magic).toEqual([
      0, 297, 0, 296, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0,
    ])
  })

  test('silence>0 → 直接返回 0（物理攻击），不查法术表', () => {
    const r = pickAutoMagic(autoState(3), projectedRoles([297]), [spell(297)], [magic(297)], 9999)
    expect(r).toBe(0)
  })

  test('selectingPlayerIdx 缺席（undefined）→ 返回 0', () => {
    const st = state() // 不设 selectingPlayerIdx
    expect(pickAutoMagic(st, projectedRoles([297]), [spell(297)], [magic(297)], 9999)).toBe(0)
  })

  test('已学槽法术 resolve 失败（spell 不在表）→ 该槽跳过，返回 0', () => {
    const r = pickAutoMagic(
      autoState(),
      projectedRoles([400]),
      [spell(297)], // 表里没有 400
      [magic(297)],
      0,
    )
    expect(r).toBe(0)
  })

  test('costMP=1 极限技门（sdlpal uibattle.c:763-766 筛除极限技）→ 跳过不选；合法耗魔法术正常入选', () => {
    const r = pickAutoMagic(
      autoState(),
      projectedRoles([296, 297]),
      [spell(296), spell(297)],
      [magic(296, { costMP: 1 }), magic(297, { costMP: 2 })],
      0,
    )
    expect(r).toBe(297)
  })

  test('唯一已学法术 MP 不足（costMP>role.mp）→ 跳过返回 0', () => {
    const projected = projectedRoles([297])
    expect(projected.roles[0]!.mp).toBe(30)
    const r = pickAutoMagic(autoState(), projected, [spell(297)], [magic(297, { costMP: 31 })], 0)
    expect(r).toBe(0)
  })

  test('威力择优（range=0 消随机项）：更高 baseDamage 者替换先遇者', () => {
    const r = pickAutoMagic(
      autoState(),
      projectedRoles([296, 297]),
      [spell(296), spell(297)],
      [magic(296, { baseDamage: 10 }), magic(297, { baseDamage: 30 })],
      0,
    )
    expect(r).toBe(297)
  })

  test('同威力保留先遇（strict power>maxPower）：range=0 下两法术 baseDamage 相同 → 返回先遇到的 296', () => {
    const r = pickAutoMagic(
      autoState(),
      projectedRoles([296, 297]),
      [spell(296), spell(297)],
      [magic(296, { baseDamage: 30 }), magic(297, { baseDamage: 30 })],
      0,
    )
    expect(r).toBe(296)
  })
})
