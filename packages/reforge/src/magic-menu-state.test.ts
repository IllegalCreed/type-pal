import type { SkillData, WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  castOutdoorSkill,
  closeMagicMenu,
  type MagicMenuState,
  magicBackFromTarget,
  magicConfirmCaster,
  magicConfirmSpell,
  magicMoveCaster,
  magicMoveCursor,
  magicMoveTarget,
  openMagicMenu,
  resolveOutdoorSkills,
} from './magic-menu-state.js'
import { makeTestSkills, makeTestWorld } from './test-fixtures.js'

/** 双人队 world(fixtures 是单人;第二人 clone 改 id —— learnedSkills 无她,空列表真值 L37)。 */
function twoPartyWorld(): WorldState {
  const w = makeTestWorld()
  w.party.push({ ...w.party[0]!, id: 'zhao-linger', template: 'zhao-linger' })
  return w
}

const SKILL_ALL: SkillData = {
  id: '300',
  name: '五气朝元',
  desc: '',
  cost: { mp: 40 },
  usableOutsideBattle: true,
  target: 'allAllies',
  effects: [{ kind: 'healHp', amount: 150 }],
  animation: { effectSprite: 30 },
}
const SKILL_REVIVE: SkillData = {
  id: '301',
  name: '还魂咒',
  desc: '',
  cost: { mp: 16 },
  usableOutsideBattle: true,
  target: 'oneAlly',
  effects: [{ kind: 'revive', hpPercent: 25 }],
  animation: { effectSprite: 0 },
}

/** 直拼 pick-spell 态(网格导航测试用;绕过解析)。 */
const gridState = (n: number): MagicMenuState => ({
  active: true,
  phase: 'pick-spell',
  casterIdx: 0,
  spells: Array.from({ length: n }, (_, i) => ({ id: String(i), cost: {} }) as SkillData),
  cursor: 0,
  targetIdx: 0,
})

describe('resolveOutdoorSkills', () => {
  test('李逍遥 demo:learnedSkills → skills,全 outdoor', () => {
    const world = makeTestWorld()
    const spells = resolveOutdoorSkills(world, 'li-xiaoyao', makeTestSkills())
    expect(spells.map((s) => s.id)).toEqual(['296', '298', '299'])
    expect(spells.every((s) => s.usableOutsideBattle)).toBe(true)
  })
  test('未知角色 → 空', () => {
    expect(resolveOutdoorSkills(makeTestWorld(), 'nobody', makeTestSkills())).toEqual([])
  })
})

describe('openMagicMenu(单人跳过选人/多人选施法人 + 光标记忆)', () => {
  test('单人队直进 pick-spell,技能已解析(uigame.c:677-681)', () => {
    const s = openMagicMenu(makeTestWorld(), makeTestSkills())
    expect(s.phase).toBe('pick-spell')
    expect(s.spells.map((x) => x.id)).toEqual(['296', '298', '299'])
  })
  test('多人队进 pick-caster;光标 = 上次记忆,越界归 0(DL22 static w)', () => {
    const w = twoPartyWorld()
    expect(openMagicMenu(w, makeTestSkills()).phase).toBe('pick-caster')
    expect(openMagicMenu(w, makeTestSkills(), 1).casterIdx).toBe(1)
    expect(openMagicMenu(w, makeTestSkills(), 9).casterIdx).toBe(0)
  })
  test('closeMagicMenu:active false', () => {
    expect(closeMagicMenu().active).toBe(false)
  })
})

describe('pick-caster(上下循环;死人确认拦)', () => {
  test('光标上下循环(一阶段 moveSelection % n)', () => {
    const w = twoPartyWorld()
    const s = openMagicMenu(w, makeTestSkills())
    expect(magicMoveCaster(s, w, 'down').casterIdx).toBe(1)
    expect(magicMoveCaster(s, w, 'up').casterIdx).toBe(1) // 0 上翻 wrap 到末位
  })
  test('确认活人 → pick-spell + 解析其技能;死人不动(uigame.c:707 fEnabled)', () => {
    const w = twoPartyWorld()
    const s = openMagicMenu(w, makeTestSkills())
    const ok = magicConfirmCaster(s, w, makeTestSkills())
    expect(ok.phase).toBe('pick-spell')
    expect(ok.spells.length).toBe(3)
    w.party[0]!.hp = 0
    expect(magicConfirmCaster(s, w, makeTestSkills()).phase).toBe('pick-caster')
  })
  test('确认无 outdoor 技的活人:进 pick-spell 空列表(原版 L37 仍可进)', () => {
    const w = twoPartyWorld()
    const s = magicMoveCaster(openMagicMenu(w, makeTestSkills()), w, 'down')
    const ok = magicConfirmCaster(s, w, makeTestSkills())
    expect(ok.phase).toBe('pick-spell')
    expect(ok.spells).toEqual([])
  })
})

describe('仙术网格导航', () => {
  test('↓ = +3(列数),↑ 边界 clamp 不动', () => {
    expect(magicMoveCursor(gridState(6), 'down').cursor).toBe(3)
    expect(magicMoveCursor(gridState(6), 'up').cursor).toBe(0)
  })
  test('→ = +1,← 边界 clamp;下越界吸附尾', () => {
    expect(magicMoveCursor(gridState(6), 'right').cursor).toBe(1)
    expect(magicMoveCursor({ ...gridState(6), cursor: 5 }, 'down').cursor).toBe(5)
    expect(magicMoveCursor({ ...gridState(6), cursor: 0 }, 'left').cursor).toBe(0)
  })
  test('空列表导航不崩', () => {
    expect(magicMoveCursor(gridState(0), 'down').cursor).toBe(0)
  })
})

describe('magicConfirmSpell(MP 门/单体进选目标/全体直放)', () => {
  test('oneAlly → toTarget + phase 切 pick-target;MP 不足 → null 不动', () => {
    const w = makeTestWorld() // mp 30
    const s = openMagicMenu(w, makeTestSkills())
    expect(magicConfirmSpell(s, w)).toEqual({ kind: 'toTarget' }) // 296 mp6 ≤ 30
    expect(s.phase).toBe('pick-target')
    const s2 = { ...openMagicMenu(w, makeTestSkills()), cursor: 2 } // 299 mp40 > 30
    expect(magicConfirmSpell(s2, w)).toBeNull()
    expect(s2.phase).toBe('pick-spell')
  })
  test('allAllies → castAll 返回技能,phase 留 pick-spell(连放)', () => {
    const w = makeTestWorld()
    w.party[0]!.mp = 50
    const s: MagicMenuState = { ...gridState(0), spells: [SKILL_ALL] }
    expect(magicConfirmSpell(s, w)).toEqual({ kind: 'castAll', skill: SKILL_ALL })
    expect(s.phase).toBe('pick-spell')
  })
})

describe('pick-target(±1 不 wrap;返回回选技能)', () => {
  test('边界 noop(uigame.c:841/849)', () => {
    const w = twoPartyWorld()
    const s: MagicMenuState = { ...gridState(1), phase: 'pick-target' }
    expect(magicMoveTarget(s, w, 'up').targetIdx).toBe(0) // 0 上 → 不动(不 wrap)
    expect(magicMoveTarget(s, w, 'down').targetIdx).toBe(1)
    expect(magicMoveTarget({ ...s, targetIdx: 1 }, w, 'down').targetIdx).toBe(1)
  })
  test('返回 → pick-spell', () => {
    const s: MagicMenuState = { ...gridState(1), phase: 'pick-target' }
    expect(magicBackFromTarget(s).phase).toBe('pick-spell')
  })
})

describe('castOutdoorSkill(fSuccess 语义:有真实变化才扣 MP)', () => {
  const heal = (): SkillData => makeTestSkills()['296']! // 奶 75 / mp 6

  test('奶伤员:HP 涨 clamp 到 max,扣 MP', () => {
    const w = makeTestWorld()
    const c = w.party[0]!
    c.hp = 40
    expect(castOutdoorSkill(w, heal(), 0, 0)).toBe(true)
    expect(c.hp).toBe(Math.min(c.maxHP, 40 + 75))
    expect(c.mp).toBe(30 - 6)
  })
  test('满血奶 → 无效果不扣 MP(global.c:1324 avoid over treatment)', () => {
    const w = makeTestWorld()
    const c = w.party[0]!
    c.hp = c.maxHP
    expect(castOutdoorSkill(w, heal(), 0, 0)).toBe(false)
    expect(c.mp).toBe(30)
  })
  test('死人奶 → 无效果不扣 MP(仅活人,global.c:1287)', () => {
    const w = twoPartyWorld()
    w.party[1]!.hp = 0
    expect(castOutdoorSkill(w, heal(), 0, 1)).toBe(false)
    expect(w.party[0]!.mp).toBe(30)
  })
  test('还魂咒:死人 HP = trunc(max×%) + 扣 MP;复活活人无效果不扣', () => {
    const w = twoPartyWorld()
    const t = w.party[1]!
    t.hp = 0
    expect(castOutdoorSkill(w, SKILL_REVIVE, 0, 1)).toBe(true)
    expect(t.hp).toBe(Math.trunc((t.maxHP * 25) / 100))
    expect(w.party[0]!.mp).toBe(30 - 16)
    expect(castOutdoorSkill(w, SKILL_REVIVE, 0, 0)).toBe(false) // 自己活着
    expect(w.party[0]!.mp).toBe(30 - 16)
  })
  test("全体奶('all'):部分满血部分残 → success,MP 只扣一次", () => {
    const w = twoPartyWorld()
    w.party[0]!.mp = 50
    w.party[1]!.hp = 10
    expect(castOutdoorSkill(w, SKILL_ALL, 0, 'all')).toBe(true)
    expect(w.party[1]!.hp).toBe(Math.min(w.party[1]!.maxHP, 10 + 150))
    expect(w.party[0]!.mp).toBe(50 - 40)
  })
  test('MP 不够 → 直接 false 无副作用(状态机已拦,守卫兜底)', () => {
    const w = makeTestWorld()
    w.party[0]!.mp = 3
    w.party[0]!.hp = 1
    expect(castOutdoorSkill(w, heal(), 0, 0)).toBe(false)
    expect(w.party[0]!.hp).toBe(1)
  })
})
