import type { Enemy, PlayerRole } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { makeHEnemy, makeHField, makeHRole } from '../../../__tests__/glm-next-wave/H/harness.js'
import { createInitialGameState } from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
import { createBattleState } from '../battle-state.js'
import { buildActionQueue } from '../turn-queue.js'

/**
 * BattleState 测试 —— M3 T16。
 *
 * 覆盖:工厂从 GameState + fixture 派生、players prevHp/prevMp 拷贝、enemies
 * health 隔离、roleId/人数边界、九状态按角色映射与每场局部 ownership。
 */

function minimalRole(id: number): PlayerRole {
  return makeHRole(id, { maxHP: 200, maxMP: 30, hp: 200, mp: 30 })
}

function minimalEnemy(id: number, health = 50): Enemy {
  return makeHEnemy({ id, health })
}

describe('createBattleState', () => {
  it('从 GameState + fixture 派生', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      enemies: [minimalEnemy(100)],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(42),
    })
    expect(state.phase).toBe('preBattle')
    expect(state.players).toHaveLength(1)
    expect(state.enemies).toHaveLength(1)
    expect(state.expGained).toBe(0)
    expect(state.turn).toBe(0)
    expect(state.uiState).toBe('hidden')
  })

  it('players prevHp/prevMp 拷贝战前值', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const role = minimalRole(0)
    const state = createBattleState({
      gs,
      playerRoles: { roles: [role] },
      enemies: [],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.players[0]?.prevHp).toBe(200)
    expect(state.players[0]?.prevMp).toBe(30)
    expect(state.players[0]?.scriptPrevHp).toBe(200)
    role.hp = 9
    role.mp = 8
    expect(state.players[0]?.prevHp).toBe(200)
    expect(state.players[0]?.prevMp).toBe(30)
    expect(state.players[0]?.scriptPrevHp).toBe(200)
  })

  it('enemies prevHp = e.health 拷贝', () => {
    const sourceEnemy = minimalEnemy(100, 75)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const state = createBattleState({
      gs,
      playerRoles: { roles: [] },
      enemies: [sourceEnemy],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.enemies[0]?.prevHp).toBe(75)
    expect(state.enemies[0]?.e.health).toBe(75)
    const enemy = state.enemies[0]!
    expect(enemy.objectId).toBe(100) // 未提供对象脚本元数据时的显式fallback合同。
    expect(enemy.maxHealth).toBe(75)
    expect(enemy.e).not.toBe(sourceEnemy)
    enemy.e.health = 25
    expect(sourceEnemy.health).toBe(75)
    expect(enemy.prevHp).toBe(75)
    expect(enemy.maxHealth).toBe(75)
    sourceEnemy.health = 60
    expect(enemy.e.health).toBe(25)
  })

  it('未知 roleId 抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [99]
    expect(() =>
      createBattleState({
        gs,
        playerRoles: { roles: [minimalRole(0)] },
        enemies: [],
        field: makeHField(),
        isBoss: false,
        rng: createSeedableRng(1),
      }),
    ).toThrow(/role id 99/)
  })

  // CLASSIC状态按roleId读取；傀儡在正式开战复活路径清零，不伪造活人傀儡输入。
  it('D14:gs.rgPlayerStatus 九槽按角色身份映射，保留普通及装备计数', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [2, 0]
    gs.rgPlayerStatus[2] = [1, 2, 3, 4, 0, 1000, 999, 32760, 6]
    gs.rgPlayerStatus[0] = [7, 8, 9, 10, 0, 11, 12, 13, 14]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [0, 1, 2].map(minimalRole) },
      enemies: [],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.players.map((p) => p.roleId)).toEqual([2, 0])
    expect(state.players.map((p) => p.status)).toEqual([
      {
        confused: 1,
        paralyzed: 2,
        sleep: 3,
        silence: 4,
        puppet: 0,
        bravery: 1000,
        protect: 999,
        haste: 32760,
        dualAttack: 6,
        slow: 0,
      },
      {
        confused: 7,
        paralyzed: 8,
        sleep: 9,
        silence: 10,
        puppet: 0,
        bravery: 11,
        protect: 12,
        haste: 13,
        dualAttack: 14,
        slow: 0,
      },
    ])
  })

  it('D14:无装备状态 → player.status 全 0(默认)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      enemies: [],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.players[0]?.status).toEqual({
      confused: 0,
      paralyzed: 0,
      sleep: 0,
      silence: 0,
      puppet: 0,
      bravery: 0,
      protect: 0,
      haste: 0,
      dualAttack: 0,
      slow: 0,
    })
  })

  it('每场pendingActions/prevActions和行动队列独立，不泄漏到下一场', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const input = {
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      enemies: [],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
    }
    const first = createBattleState(input)
    first.pendingActions.set(0, { type: 'defend', target: 0 })
    first.prevActions?.set(0, { type: 'attack', target: 0 })
    first.actionQueue.push(...buildActionQueue({ players: [{ idx: 0, dex: 30 }], enemies: [] }))
    const next = createBattleState(input)
    expect(next.pendingActions.size).toBe(0)
    expect(next.prevActions?.size).toBe(0)
    expect(next.actionQueue).toEqual([])
    expect(first.pendingActions.get(0)).toEqual({ type: 'defend', target: 0 })
    expect(first.prevActions?.get(0)).toEqual({ type: 'attack', target: 0 })
    expect(first.actionQueue).toEqual([{ isEnemy: false, idx: 0, dex: 30, fIsSecond: false }])
  })

  // ── M5.B-w0.2: PLAYER_POSITIONS 真值(sdlpal battle.c:27 g_rgPlayerPos[3][3][2])──
  it('B-w0.2:partyMembers > 3 抛错(sdlpal g_rgPlayerPos[3][3][2] 真值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1, 2, 3] // 4 个,超 3 上限
    expect(() =>
      createBattleState({
        gs,
        playerRoles: { roles: [0, 1, 2, 3].map((i) => minimalRole(i)) },
        enemies: [],
        field: makeHField(),
        isBoss: false,
        rng: createSeedableRng(1),
      }),
    ).toThrow(/最多 3 player|partyMembers.length=4 > 3/)
  })

  it('战斗状态副本与持久状态及其它队员相互隔离', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1]
    gs.rgPlayerStatus[0]![6] = 7
    const input = {
      gs,
      playerRoles: { roles: [0, 1].map(minimalRole) },
      enemies: [],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
    }
    const state = createBattleState(input)
    const first = state.players[0]!.status
    const second = state.players[1]!.status
    first.protect = 6
    expect(gs.rgPlayerStatus[0]![6]).toBe(7)
    expect(second.protect).toBe(0)
    gs.rgPlayerStatus[0]![6] = 0
    expect(first.protect).toBe(6)
    second.haste = 3
    expect(first.haste).toBe(0)
    expect(gs.rgPlayerStatus[1]![7]).toBe(0)
    const next = createBattleState(input)
    expect(next.players[0]!.status.protect).toBe(0)
    expect(next.players[1]!.status.haste).toBe(0)
    expect(first.protect).toBe(6)
  })

  it('B-w0.2:partyMembers <= 3 正常构造', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1, 2] // 3 个,边界 OK
    const state = createBattleState({
      gs,
      playerRoles: { roles: [0, 1, 2].map((i) => minimalRole(i)) },
      enemies: [],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.players).toHaveLength(3)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // D17a:fighter render state 初值(pos / posOriginal / currentFrame / iColorShift)
  // ──────────────────────────────────────────────────────────────────────────
  it('D17a:player pos/posOriginal = g_rgPlayerPos[count-1][i](battle.c:27)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1] // 2 人 layout
    const state = createBattleState({
      gs,
      playerRoles: { roles: [0, 1].map((i) => minimalRole(i)) },
      enemies: [],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
    })
    // 2 players:(200,176) / (256,152)(sdlpal g_rgPlayerPos[1])
    expect(state.players[0]!.pos).toEqual({ x: 200, y: 176 })
    expect(state.players[0]!.posOriginal).toEqual({ x: 200, y: 176 })
    expect(state.players[1]!.pos).toEqual({ x: 256, y: 152 })
    expect(state.players[1]!.posOriginal).toEqual({ x: 256, y: 152 })
    // pos 与 posOriginal 是独立对象(后续动画 mutate pos 不污染 posOriginal)
    expect(state.players[0]!.pos).not.toBe(state.players[0]!.posOriginal)
    expect(state.players[0]!.currentFrame).toBe(0)
    expect(state.players[0]!.iColorShift).toBe(0)
  })

  it('D17a:enemy pos/posOriginal = EnemyPos.layouts[count-1][i] + yPosOffset(battle.c:936-939)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      enemies: [minimalEnemy(100), minimalEnemy(200)], // 2 enemies
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
      enemyPos: {
        layouts: [
          [{ x: 160, y: 80 }],
          [
            { x: 100, y: 60 },
            { x: 220, y: 60 },
          ],
        ],
      },
    })
    expect(state.enemies[0]!.pos).toEqual({ x: 100, y: 60 })
    expect(state.enemies[0]!.posOriginal).toEqual({ x: 100, y: 60 })
    expect(state.enemies[1]!.pos).toEqual({ x: 220, y: 60 })
    // 敌人 idle 期 currentFrame = undefined → 渲染层 idle 时钟轮播(D17c 不被冻结)。
    expect(state.enemies[0]!.currentFrame).toBeUndefined()
    expect(state.enemies[0]!.iColorShift).toBe(0)
  })

  it('D17a:无 enemyPos → fallback 表(160,80)(向后兼容旧 fixture)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      enemies: [minimalEnemy(100)],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.enemies[0]!.pos).toEqual({ x: 160, y: 80 })
  })

  it('D17a:enemy yPosOffset 叠加到 posOriginal.y', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const e = minimalEnemy(100)
    e.yPosOffset = 15
    const state = createBattleState({
      gs,
      playerRoles: { roles: [minimalRole(0)] },
      enemies: [e],
      field: makeHField(),
      isBoss: false,
      rng: createSeedableRng(1),
      enemyPos: { layouts: [[{ x: 160, y: 80 }]] },
    })
    expect(state.enemies[0]!.posOriginal).toEqual({ x: 160, y: 95 }) // 80 + 15
  })
})
