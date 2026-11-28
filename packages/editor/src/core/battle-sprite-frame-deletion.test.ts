import type { BattleSpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { planBattleSpriteFrameDeletion } from './battle-sprite-frame-deletion.js'

function enemyDefinition(): BattleSpriteDef {
  return {
    id: 'guard-enemy',
    label: '守卫敌人',
    asset: 'battle-sprite.authored.guard',
    profile: {
      kind: 'enemy',
      idle: { start: 0, count: 2 },
      magic: { start: 2, count: 1 },
      attack: { start: 3, count: 1 },
      idleTicksPerFrame: 5,
      actTicksPerFrame: 1,
    },
  }
}

describe('战斗精灵源帧修复', () => {
  test('无用途的源帧删除不生成修复记录', () => {
    expect(planBattleSpriteFrameDeletion([], 1, 3)).toEqual({
      repairs: {},
      consumerSnapshots: {},
      changes: [],
    })
  })

  test('战斗玩家槽位与敌人连续分段随中间帧原子修复', () => {
    const player: BattleSpriteDef = {
      id: 'fighter',
      label: '战士',
      asset: 'battle.shared',
      profile: {
        kind: 'player-fighter',
        frames: {
          idle: 0,
          dying: 1,
          dead: 2,
          defend: 3,
          hurt: 4,
          preMagic: 5,
          magic: 6,
          attackWindup: 7,
          attackRush: 8,
          attackStrike: 9,
          steal: 10,
        },
        castEffectBase: 0,
        attackEffectBase: 0,
      },
    }
    const enemy: BattleSpriteDef = {
      id: 'enemy',
      label: '敌人',
      asset: 'battle.shared',
      profile: {
        kind: 'enemy',
        idle: { start: 0, count: 2 },
        magic: { start: 2, count: 2 },
        attack: { start: 4, count: 3 },
        idleTicksPerFrame: 5,
        actTicksPerFrame: 1,
      },
    }
    const plan = planBattleSpriteFrameDeletion([player, enemy], 3, 11)
    expect(plan.repairs.fighter?.profile).toMatchObject({
      kind: 'player-fighter',
      frames: {
        defend: 3,
        hurt: 3,
        attackStrike: 8,
        steal: 9,
      },
    })
    expect(plan.consumerSnapshots.fighter?.profile).toEqual(player.profile)
    expect(plan.repairs.enemy?.profile).toEqual({
      kind: 'enemy',
      idle: { start: 0, count: 2 },
      magic: { start: 2, count: 1 },
      attack: { start: 3, count: 3 },
      idleTicksPerFrame: 5,
      actTicksPerFrame: 1,
    })
  })
})

describe('战斗精灵源帧删除边界', () => {
  test('越界或非整数帧号、末帧清空一律拒绝；合法边界 0 与 frameCount-1 不抛', () => {
    const enemy = enemyDefinition()
    // 越界（负数 / 等于帧数 / 超出）与非整数都命中同一个守卫。
    expect(() => planBattleSpriteFrameDeletion([enemy], -1, 4)).toThrow('待删除的战斗精灵帧不存在')
    expect(() => planBattleSpriteFrameDeletion([enemy], 4, 4)).toThrow('待删除的战斗精灵帧不存在')
    expect(() => planBattleSpriteFrameDeletion([enemy], 9, 4)).toThrow('待删除的战斗精灵帧不存在')
    expect(() => planBattleSpriteFrameDeletion([enemy], 1.5, 4)).toThrow('待删除的战斗精灵帧不存在')
    // 只剩 1 帧时拒绝清空（索引本身合法，走帧数下限守卫）。
    expect(() => planBattleSpriteFrameDeletion([enemy], 0, 1)).toThrow('战斗精灵至少必须保留 1 帧')
    // 合法边界：首帧与末帧都能规划，且对同一消费者产出修复条目。
    for (const index of [0, 3]) {
      const plan = planBattleSpriteFrameDeletion([enemy], index, 4)
      expect(plan.repairs['guard-enemy']).toBeDefined()
      expect(plan.consumerSnapshots['guard-enemy']).toEqual({ profile: enemy.profile })
    }
  })
})
