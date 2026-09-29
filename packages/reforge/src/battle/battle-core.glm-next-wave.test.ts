/**
 * TEST-GLM-NEW-G-1 G01：battle-core 公开边界残差。
 * 旧证（battle-core.test.ts ~100 题）已证回合公式/AI/毒/合击/投掷主链；
 * 本文件只补旧题未覆盖的公开合同：
 *   1) createBattleState 敌槽 >5 上限守卫（battle-core.ts:324-325）；
 *   2) runBattleToEnd maxSteps 上限守卫（battle-core.ts:2735-2743）；
 *   3) applyEnemyEffect transform 缺目标定义门（battle-core.ts:992-994）；
 *   4) applyEnemyEffect divide 唯一活敌 hp≤1 门（battle-core.ts:1002-1004）。
 * 全部经现行公开导出与合法输入（负臂为合法输入的单点变异），不造非法 fixture。
 */
import type { EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  applyEnemyEffect,
  type CreatePlayerInput,
  createBattleState,
  runBattleToEnd,
} from './battle-core.js'

function mkEnemy(id: string, o: Partial<EnemyDef['stats']> = {}): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: `battle-sprite.${id}`,
    yPosOffset: 0,
    stats: {
      health: 30,
      level: 1,
      exp: 5,
      cash: 3,
      attackStrength: 20,
      magicStrength: 0,
      defense: 10,
      dexterity: 10,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...o,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {},
  }
}

const player = (roleId: string, o: Partial<CreatePlayerInput> = {}): CreatePlayerInput => ({
  roleId,
  actorTemplateId: roleId,
  hp: 100,
  maxHp: 100,
  mp: 30,
  maxMp: 30,
  attackStrength: 40,
  defense: 30,
  magicStrength: 20,
  baseDexterity: 50,
  skills: [],
  fleeRate: 20,
  ...o,
})

describe('G01 battle-core 公开边界残差', () => {
  test('enemySlots 超上限 5 在状态工厂 fail-loud；5 槽对照合法', () => {
    const slots = Array.from({ length: 6 }, (_, i) => mkEnemy(`overflow-${i}`))
    expect(() => createBattleState({ players: [player('p1')], enemySlots: slots })).toThrowError(
      /槽位数 6 超上限 5/,
    )
    // 对照：恰 5 槽是现行上限内的合法输入。
    expect(() =>
      createBattleState({
        players: [player('p1')],
        enemySlots: Array.from({ length: 5 }, (_, i) => mkEnemy(`five-${i}`)),
      }),
    ).not.toThrow()
  })

  test('runBattleToEnd 超 maxSteps 未终结 → 精确 fail-loud（不静默返回）', () => {
    const state = createBattleState({
      players: [player('p1', { hp: 1, maxHp: 1 })],
      enemies: [mkEnemy('stalled', { health: 1, attackStrength: 0 })],
    })
    // chooseActions 恒不填 pendingActions → selectAction 永不推进 → 只能撞上限。
    expect(() =>
      runBattleToEnd(
        state,
        () => undefined,
        () => 0,
        3,
      ),
    ).toThrowError('runBattleToEnd: 超过 maxSteps 未终结')
    // 对照：同一死局在默认上限内同样抛出（守卫与步数无关，始终 fail-loud）。
    expect(() =>
      runBattleToEnd(
        state,
        () => undefined,
        () => 0,
      ),
    ).toThrowError(/超过 maxSteps 未终结/)
  })

  test('applyEnemyEffect transform 缺目标定义门：failed 且零 mutation；登记后对照成功', () => {
    const source = mkEnemy('source')
    const target = mkEnemy('target')
    const state = createBattleState({
      players: [player('hero')],
      enemies: [source],
      enemiesById: {},
    })
    const result = applyEnemyEffect(state, 0, { kind: 'transform', enemyId: 'target' })
    expect(result).toEqual({ outcome: 'failed', kind: 'transform' })
    expect(state.enemies[0]?.def).toBe(source)
    // 对照：同一状态登记 target 后现行变身为真实成功路径。
    state.enemiesById.target = target
    const ok = applyEnemyEffect(state, 0, { kind: 'transform', enemyId: 'target' })
    expect(ok.outcome).toBe('succeeded')
    expect(state.enemies[0]?.def).toBe(target)
  })

  test('applyEnemyEffect divide 唯一活敌 hp≤1 门：failed；hp 2 对照成功分裂', () => {
    const lone = mkEnemy('lone', { health: 1 })
    const state = createBattleState({ players: [player('hero')], enemies: [lone] })
    expect(applyEnemyEffect(state, 0, { kind: 'divide', copies: 1 }).outcome).toBe('failed')
    expect(state.enemies[0]?.hp).toBe(1)
    expect(state.enemies[1]).toBeNull()
    // 对照：唯一差异是 hp 单点抬到 2 → 现行分裂成功且血量均分。
    state.enemies[0]!.hp = 2
    const ok = applyEnemyEffect(state, 0, { kind: 'divide', copies: 1 })
    expect(ok.outcome).toBe('succeeded')
    expect(state.enemies[0]?.hp).toBe(1)
    expect(state.enemies[1]?.hp).toBe(1)
  })
})
