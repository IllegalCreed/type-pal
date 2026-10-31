// Public BattleState construction: player projection, enemy slots, and per-battle initialization.
// Script execution, target selection and rendering have separate callers and are not exercised here.
import type { Enemy, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import {
  makeBattleFieldRecord,
  makeEnemyRecord,
  makeRoleRecord,
} from '../../../__tests__/battle-records.js'
import { createInitialGameState } from '../../game-state.js'
import { createSeedableRng } from '../../rng.js'
import { createBattleState } from '../battle-state.js'
import { buildActionQueue } from '../turn-queue.js'

function makeProjectionRole(id: number): PlayerRole {
  return makeRoleRecord(id, { maxHP: 200, maxMP: 30, hp: 200, mp: 30 })
}
function makeProjectionEnemy(id: number, health = 50): Enemy {
  return makeEnemyRecord({ id, health })
}
function makeStateWithEnemyGap(opts: { fAutoBattle?: boolean }) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.partyMembers = [0]
  if (opts.fAutoBattle) gs.fAutoBattle = true
  const playerRoles: PlayerRoles = { roles: [makeRoleRecord(0, { hp: 123, mp: 45, maxMP: 60 })] }
  const sourceEnemy = makeEnemyRecord({ id: 100, health: 900 })
  const state = createBattleState({
    gs,
    playerRoles,
    enemies: [sourceEnemy, null],
    field: makeBattleFieldRecord(),
    isBoss: false,
    rng: createSeedableRng(7),
    enemyPos: {
      layouts: [
        [{ x: 160, y: 80 }],
        [
          { x: 120, y: 78 },
          { x: 212, y: 88 },
        ],
      ],
    },
  })
  return { state, sourceEnemy }
}

describe('createBattleState initialization', () => {
  it('从 GameState + fixture 派生', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [makeProjectionRole(0)] },
      enemies: [makeProjectionEnemy(100)],
      field: makeBattleFieldRecord(),
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

  it('每场pendingActions/prevActions和行动队列独立，不泄漏到下一场', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const input = {
      gs,
      playerRoles: { roles: [makeProjectionRole(0)] },
      enemies: [],
      field: makeBattleFieldRecord(),
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

  it('fAutoBattle从GameState复制，缺省false', () => {
    expect(makeStateWithEnemyGap({ fAutoBattle: true }).state.fAutoBattle).toBe(true)
    expect(makeStateWithEnemyGap({}).state.fAutoBattle).toBe(false)
  })
})

describe('createBattleState players', () => {
  it('players prevHp/prevMp 拷贝战前值', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const role = makeProjectionRole(0)
    const state = createBattleState({
      gs,
      playerRoles: { roles: [role] },
      enemies: [],
      field: makeBattleFieldRecord(),
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

  it('未知 roleId 抛错', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [99]
    expect(() =>
      createBattleState({
        gs,
        playerRoles: { roles: [makeProjectionRole(0)] },
        enemies: [],
        field: makeBattleFieldRecord(),
        isBoss: false,
        rng: createSeedableRng(1),
      }),
    ).toThrow(/role id 99/)
  })

  // CLASSIC状态按roleId读取；傀儡在正式开战复活路径清零，不伪造活人傀儡输入。
  it('gs.rgPlayerStatus 九槽按角色身份映射，保留普通及装备计数', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [2, 0]
    gs.rgPlayerStatus[2] = [1, 2, 3, 4, 0, 1000, 999, 32760, 6]
    gs.rgPlayerStatus[0] = [7, 8, 9, 10, 0, 11, 12, 13, 14]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [0, 1, 2].map(makeProjectionRole) },
      enemies: [],
      field: makeBattleFieldRecord(),
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

  it('无装备状态 → player.status 全 0(默认)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [makeProjectionRole(0)] },
      enemies: [],
      field: makeBattleFieldRecord(),
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

  it('partyMembers > 3 抛错(sdlpal g_rgPlayerPos[3][3][2] 真值)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1, 2, 3] // 4 个,超 3 上限
    expect(() =>
      createBattleState({
        gs,
        playerRoles: { roles: [0, 1, 2, 3].map((i) => makeProjectionRole(i)) },
        enemies: [],
        field: makeBattleFieldRecord(),
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
      playerRoles: { roles: [0, 1].map(makeProjectionRole) },
      enemies: [],
      field: makeBattleFieldRecord(),
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

  it('partyMembers <= 3 正常构造', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1, 2] // 3 个,边界 OK
    const state = createBattleState({
      gs,
      playerRoles: { roles: [0, 1, 2].map((i) => makeProjectionRole(i)) },
      enemies: [],
      field: makeBattleFieldRecord(),
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.players).toHaveLength(3)
  })

  it('player pos/posOriginal = g_rgPlayerPos[count-1][i](battle.c:27)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1] // 2 人 layout
    const state = createBattleState({
      gs,
      playerRoles: { roles: [0, 1].map((i) => makeProjectionRole(i)) },
      enemies: [],
      field: makeBattleFieldRecord(),
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
})

describe('createBattleState enemies', () => {
  it('enemies prevHp = e.health 拷贝', () => {
    const sourceEnemy = makeProjectionEnemy(100, 75)
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const state = createBattleState({
      gs,
      playerRoles: { roles: [] },
      enemies: [sourceEnemy],
      field: makeBattleFieldRecord(),
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

  it('enemy pos/posOriginal = EnemyPos.layouts[count-1][i] + yPosOffset(battle.c:936-939)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [makeProjectionRole(0)] },
      enemies: [makeProjectionEnemy(100), makeProjectionEnemy(200)], // 2 enemies
      field: makeBattleFieldRecord(),
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

  it('未提供enemyPos时使用固定fallback坐标(160,80)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const state = createBattleState({
      gs,
      playerRoles: { roles: [makeProjectionRole(0)] },
      enemies: [makeProjectionEnemy(100)],
      field: makeBattleFieldRecord(),
      isBoss: false,
      rng: createSeedableRng(1),
    })
    expect(state.enemies[0]!.pos).toEqual({ x: 160, y: 80 })
  })

  it('enemy yPosOffset 叠加到 posOriginal.y', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0]
    const e = makeProjectionEnemy(100)
    e.yPosOffset = 15
    const state = createBattleState({
      gs,
      playerRoles: { roles: [makeProjectionRole(0)] },
      enemies: [e],
      field: makeBattleFieldRecord(),
      isBoss: false,
      rng: createSeedableRng(1),
      enemyPos: { layouts: [[{ x: 160, y: 80 }]] },
    })
    expect(state.enemies[0]!.posOriginal).toEqual({ x: 160, y: 95 }) // 80 + 15
  })

  it('null槽保留零值、空脚本入口与站位列数', () => {
    const { state } = makeStateWithEnemyGap({})
    expect(state.enemies.length).toBe(2)
    const slot = state.enemies[1]!
    expect(slot.defeated).toBe(true)
    expect(slot.objectId).toBe(0) // wObjectID=0 空槽标记
    const { elemResistance, ...scalarStats } = slot.e
    for (const [stat, value] of Object.entries(scalarStats)) {
      expect(value, stat).toBe(0)
    }
    expect(elemResistance).toEqual({ wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 })
    expect(slot.scriptOnTurnStart).toBe(0)
    expect(slot.scriptOnReady).toBe(0)
    expect(slot.scriptOnBattleEnd).toBe(0)
    expect(slot.prevHp).toBe(0)
    expect(slot.maxHealth).toBe(0)
    expect(slot.poisons).toEqual([])
    // 站位仍按 2 列布局生成(撑起列数/召唤房间)
    expect(state.enemies[0]!.posOriginal).toEqual({ x: 120, y: 78 })
    expect(state.enemies[0]!.pos).toEqual({ x: 120, y: 78 })
    expect(slot.currentFrame).toBeUndefined()
  })

  it('含空槽时，真实敌槽保留身份、满血基准与独立属性副本', () => {
    const { state, sourceEnemy } = makeStateWithEnemyGap({})
    const realEnemy = state.enemies[0]!
    expect(realEnemy.defeated).toBeUndefined() // 真实槽无 defeated 标记(空槽才 true)
    expect(realEnemy.objectId).toBe(100) // 无对象身份 → fallback enemyId
    expect(realEnemy.maxHealth).toBe(900)
    expect(realEnemy.e).not.toBe(sourceEnemy) // e shallow copy:改战斗内 health 不污染原数据
  })
})
