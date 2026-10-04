/**
 * TEST-GLM-EDITOR-BATTLE-REGISTRY-1（GLM）：planBattleSpriteFrameDeletion 坏输入守卫
 * 的当前合同。目标源 BattleSpriteLibrary.tsx:108-115（导出纯函数）。
 *
 * 旧断言去重：SpriteFrameDeletion.test.ts 已证成功路径——未配置资源空修复计划、玩家槽位与
 * 敌人连续分段随中间帧原子修复、world 侧删除规划；BattleSpriteLibrary.c02-g01-05/06 已证
 * UI 删帧确认窗口的消费者漂移 fail-closed；kimi-workflows K01 已证真实删帧事务。两处守卫
 * 消息「待删除的战斗精灵帧不存在」「战斗精灵至少必须保留 1 帧」在全旧测零命中（grep 举证），
 * 本文件只补这两个拒绝分支与合法边界不抛的对照。
 */
import type { BattleSpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { planBattleSpriteFrameDeletion } from './BattleSpriteLibrary.js'

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

describe('BR-04 战斗精灵删帧规划守卫', () => {
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
