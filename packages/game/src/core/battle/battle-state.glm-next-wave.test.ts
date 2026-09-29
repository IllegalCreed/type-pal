/**
 * TEST-GLM-NEW-H-1 / H04 — battle-state 当前公开合同补测。
 *
 * createBattleState 在 battle-state.test.ts 已证投影/站位/seed 主干;本文件只补未证合同:
 *  - DH1:敌队 0 占位槽(null)→ defeated 空槽(wObjectID=0、e 全零、不参与脚本/目标;
 *    battle.c:1598-1720 memset 零槽 + `w==0` 仍 `rgEnemy[i++].wObjectID = w` 计入 wMaxEnemyIndex)
 *  - gpGlobals->fAutoBattle(0x8A 持久)seed 进战斗 state(B4(3))
 *  - players scriptPrevHp 战前快照(0x64 类脚本 show-once 判定基线)
 */
import type { PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  makeHEnemy,
  makeHField,
  makeHRole,
  seededRng,
} from '../../__tests__/glm-next-wave/H/harness.js'
import { createInitialGameState } from '../game-state.js'
import { createBattleState } from './battle-state.js'

function boot(opts: { fAutoBattle?: boolean }) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  if (opts.fAutoBattle) gs.fAutoBattle = true
  const playerRoles: PlayerRoles = { roles: [makeHRole(0, { hp: 123, mp: 45 })] }
  const sourceEnemy = makeHEnemy({ id: 100, health: 900 })
  const state = createBattleState({
    gs,
    playerRoles,
    enemies: [sourceEnemy, null],
    field: makeHField(),
    isBoss: false,
    rng: seededRng(7),
  })
  return { gs, playerRoles, state, sourceEnemy }
}

describe('createBattleState —— DH1 零占位槽(battle.c:1598-1720)', () => {
  it('null 槽 → defeated 空槽:objectId=0、e 全零、无脚本、不参与目标(defeated)', () => {
    const { state } = boot({})
    expect(state.enemies.length).toBe(2)
    const slot = state.enemies[1]!
    expect(slot.defeated).toBe(true)
    expect(slot.objectId).toBe(0) // wObjectID=0 空槽标记
    expect(slot.e.health).toBe(0)
    expect(slot.e.id).toBe(0)
    expect(slot.scriptOnTurnStart).toBe(0)
    expect(slot.scriptOnReady).toBe(0)
    expect(slot.scriptOnBattleEnd).toBe(0)
    expect(slot.prevHp).toBe(0)
    expect(slot.maxHealth).toBe(0)
    expect(slot.poisons).toEqual([])
    // 站位仍按 2 列布局生成(撑起列数/召唤房间)
    expect(slot.posOriginal).toBeDefined()
    expect(slot.currentFrame).toBeUndefined()
  })

  it('真实槽不受空槽影响:e shallow copy + maxHealth=战前满血(0x64 真值基线)', () => {
    const { state, sourceEnemy } = boot({})
    const real = state.enemies[0]!
    expect(real.defeated).toBeUndefined() // 真实槽无 defeated 标记(空槽才 true)
    expect(real.objectId).toBe(100) // 无对象身份 → fallback enemyId
    expect(real.maxHealth).toBe(900)
    expect(real.e).not.toBe(sourceEnemy) // e shallow copy:改战斗内 health 不污染原数据
  })
})

describe('createBattleState —— 开战 seed', () => {
  it('gs.fAutoBattle(true)→ state.fAutoBattle(true);缺省 false(0x8A 跨战斗持久)', () => {
    expect(boot({ fAutoBattle: true }).state.fAutoBattle).toBe(true)
    expect(boot({}).state.fAutoBattle).toBe(false)
  })

  it('players prevHp/prevMp/scriptPrevHp 三快照 = 战前 role.hp/mp', () => {
    const { state } = boot({})
    const p = state.players[0]!
    expect(p.prevHp).toBe(123)
    expect(p.prevMp).toBe(45)
    expect(p.scriptPrevHp).toBe(123)
  })
})
