import { describe, expect, test } from 'vitest'
import { enemyCast, palSkill, playerCast } from '../__tests__/battle-workflows/pal-skill-driver.js'
import { expectDefined } from '../defined.js'

const wineGod = palSkill('370')

describe('酒神的真气、材料与施法侧别', () => {
  test('MP=1 时先扣常规 MP，余量为 0，不产生第二份占位伤害', () => {
    const state = playerCast(wineGod, 1, 1)
    expect(state.players[0]!.mp).toBe(0)
    expect(state.inventory).toEqual([{ itemId: '86', count: 0 }])
    expect(state.enemies[0]!.hp).toBe(999)
  })

  test('酒神将（扣 1 后余量）×8 作为法术基础伤害，再按灵力和目标防御结算', () => {
    const state = playerCast(wineGod, 30, 1)
    expect(state.players[0]!.mp).toBe(0)
    // SDLPal 0x57 writes base damage 232. A 30-strength cast against defense 28 adds floor(15 / 4).
    expect(state.enemies[0]!.hp).toBe(999 - 235)
    expect(state.inventory).toEqual([{ itemId: '86', count: 0 }])
  })

  test('酒不足仍扣常规 MP，跳过伤害并保留施法成长', () => {
    const state = playerCast(wineGod, 30, 0)
    expect(state.players[0]!.mp).toBe(29)
    expect(state.enemies[0]!.hp).toBe(999)
    expect(state.players[0]!.hiddenCounts.magicAttack).toBe(1)
    expect(state.log.some((line) => line.includes('物品不足,酒神 施放失败'))).toBe(true)
  })

  test('MP 不足时降级普攻且不消费酒；敌方施放不误用玩家 prepare 或背包门', () => {
    const insufficient = playerCast(wineGod, 0, 1)
    expect(insufficient.players[0]!.mp).toBe(0)
    expect(insufficient.inventory).toEqual([{ itemId: '86', count: 1 }])
    expect(insufficient.log.some((line) => line.includes('降级普攻'))).toBe(true)

    const hostile = enemyCast(wineGod)
    expect(hostile.players[0]!.mp).toBe(30)
    expect(hostile.inventory).toEqual([{ itemId: '86', count: 1 }])
    // 灵力 92、目标防御 30，基础伤害 34 + 3，再除以被动格挡的 2。
    expect(hostile.players[0]!.hp).toBe(82)
  })
})

describe('酒神终身使用上限', () => {
  test('跨战斗累计 9 次成功施放：第 9 次入账 usesAfter=9、removed=true 并提示用尽', () => {
    let uses = 0
    for (let encounter = 1; encounter < 9; encounter++) {
      const state = playerCast(wineGod, 30, 1, uses)
      expect(state.players[0]?.skills).toContain(wineGod.id)
      uses = expectDefined(state.skillUseCounts.hero?.[wineGod.id])
      expect(uses).toBe(encounter)
    }
    const final = playerCast(wineGod, 30, 1, uses)
    expect(final.skillUseCounts.hero?.[wineGod.id]).toBe(9)
    const skillUse = expectDefined(final.pendingWorldMutations.find((m) => m.kind === 'skillUse'))
    expect(skillUse).toMatchObject({
      kind: 'skillUse',
      characterId: 'hero',
      skillId: '370',
      usesAfter: 9,
      removed: true,
    })
    expect(final.log.some((line) => line.includes('使用次数已用尽，技能已移除'))).toBe(true)
    expect(final.inventory).toEqual([{ itemId: '86', count: 0 }])
    expect(final.players[0]!.skills).not.toContain('370')
  })

  test('第 10 次（计数已满 9）在消耗前被拦截：不扣 MP/酒、无 mutation', () => {
    const state = playerCast(wineGod, 30, 1, 9)
    expect(state.players[0]!.mp).toBe(30)
    expect(state.inventory).toEqual([{ itemId: '86', count: 1 }])
    expect(state.pendingWorldMutations.some((m) => m.kind === 'skillUse')).toBe(false)
    expect(state.log.some((line) => line.includes('使用次数已用尽'))).toBe(true)
  })

  test('酒不足的失败施放不计数', () => {
    const state = playerCast(wineGod, 30, 0, 8)
    expect(state.skillUseCounts.hero!['370']).toBe(8)
    expect(state.pendingWorldMutations.some((m) => m.kind === 'skillUse')).toBe(false)
  })
})
