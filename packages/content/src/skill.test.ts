import { describe, expect, test } from 'vitest'
import { DEMO_SKILLS, LEVEL_UP_SKILLS } from './skill.js'

describe('SkillData 技能定义', () => {
  test('气疗术(296)字段正确', () => {
    const s = DEMO_SKILLS['296']
    expect(s?.name).toBe('气疗术')
    expect(s?.cost.mp).toBe(6)
    expect(s?.usableOutsideBattle).toBe(true)
    expect(s?.target).toBe('oneAlly')
    expect(s?.effects).toEqual([{ kind: 'healHp', amount: 75 }])
    expect(s?.animation.effectSprite).toBe(27)
  })
  test('三个 demo 技能全是 outdoor 治疗(供大世界菜单)', () => {
    const ids = Object.keys(DEMO_SKILLS)
    expect(ids).toEqual(['296', '298', '299'])
    for (const id of ids) {
      const s = DEMO_SKILLS[id]
      expect(s?.usableOutsideBattle).toBe(true)
      expect(s?.effects[0]?.kind).toBe('healHp')
    }
  })
})

describe('levelUpSkills 习得规则', () => {
  test('李逍遥等级表 = 原版 level-up-magic 的 role0 【列】(非某一行)', () => {
    expect(LEVEL_UP_SKILLS['li-xiaoyao']).toEqual([
      { level: 7, skillId: '349' }, // 天师符法
      { level: 8, skillId: '311' }, // 天罡战气
      { level: 10, skillId: '298' }, // 凝神归元
      { level: 12, skillId: '346' }, // 万剑诀
      { level: 17, skillId: '299' }, // 元灵归心术
      { level: 20, skillId: '310' }, // 真元护体
      { level: 22, skillId: '348' }, // 天剑
      { level: 26, skillId: '392' }, // 金蝉脱壳
      { level: 34, skillId: '363' }, // 剑神
    ])
  })
  test('不含原版空槽 {level:0}', () => {
    for (const e of LEVEL_UP_SKILLS['li-xiaoyao'] ?? []) {
      expect(e.level).toBeGreaterThan(0)
      expect(e.skillId).not.toBe('0')
    }
  })
})
