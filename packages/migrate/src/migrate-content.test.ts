// M1a golden 测:迁移器输出对「已核真值」——demo 手作数据(一手核验过)+ 已知原版事实。
// 读真实 data/extracted(同 demo-project.test 惯例;migrate 有 node fs)。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildWorld, validateActors, validateItems, validateLocale, validateSkills, validateSprites } from '@type-pal/content'
import type { ActorDef, SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  buildLabelIndex,
  mergeExtras,
  migrateAll,
  walkDesc,
  type MigrateSources,
  type SourceCmd,
} from './migrate-content.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(root + rel, 'utf8')) as T

// ── 源(真实 extracted)──
const allJson = readJson<{ segments: { commands: SourceCmd[] }[] }>('data/extracted/events/all.json')
const src: MigrateSources = {
  roles: readJson<{ roles: MigrateSources['roles'] }>('data/extracted/data/player-roles.json').roles,
  levelUpExp: readJson('data/extracted/data/level-up-exp.json'),
  levelUpMagic: readJson('data/extracted/data/level-up-magic.json'),
  spells: readJson('data/extracted/data/spells.json'),
  magic: readJson('data/extracted/data/magic.json'),
  items: readJson('data/extracted/data/items.json'),
  commands: allJson.segments.flatMap((s) => s.commands),
}
const out = migrateAll(src)

// ── oracle(demo 手作,一手核验)──
const demoActors = readJson<ActorDef[]>('projects/demo/content/actors.json')
const demoLi = demoActors.find((a) => a.id === 'li-xiaoyao')!
const demoItems = readJson<{ id: string; name: string; icon: number; buyPrice: number; sellPrice: number; sellable: boolean; desc: string[] }[]>(
  'projects/demo/content/items.json',
)

describe('M1a · 角色(装备槽真序哨兵)', () => {
  test('mapActor(role0) 与 demo 手作 li-xiaoyao 深等(baseStats/initialEquipment/initialMagic/spriteId)', () => {
    const li = out.actors.find((a) => a.id === 'li-xiaoyao')!
    expect(li.spriteId).toBe(demoLi.spriteId)
    expect(li.name).toBe(demoLi.name)
    expect(li.battler!.baseStats).toEqual(demoLi.battler!.baseStats)
    expect(li.battler!.initialEquipment).toEqual(demoLi.battler!.initialEquipment) // ⚠ 槽序雷的自动哨兵
    // 原版真值:role0 初始只会气疗术(296)。demo 手作的 ['296','298','299'] 是菜单演示播种
    // (startWorld.learnedSkills 才是 demo 的种子源),此处以原版为准,不对齐 demo。
    expect(li.battler!.initialMagic).toEqual(['296'])
  })
  test('6 角色齐 + expTable 100 级 + 战斗精灵号', () => {
    expect(out.actors.map((a) => a.id)).toEqual(['li-xiaoyao', 'zhao-linger', 'lin-yueru', 'wu-hou', 'anu', 'gai-luojiao'])
    for (const a of out.actors) {
      expect(a.battler!.leveling!.expTable).toHaveLength(100)
      expect(typeof a.battler!.battleSpriteNum).toBe('number')
    }
    expect(out.localeNames['name.li-xiaoyao']).toBe('李逍遥')
    expect(out.localeNames['name.anu']).toBe('阿奴') // roleId 4 = 阿奴(3/4 对调 parser 已修的确认)
    expect(out.localeNames['name.wu-hou']).toBe('巫后')
  })
  test('levelUp 李逍遥列 = 已核 9 条(列主序取对)', () => {
    expect(out.skills.levelUp['li-xiaoyao']).toEqual([
      { level: 7, skillId: '349' },
      { level: 8, skillId: '311' },
      { level: 10, skillId: '298' },
      { level: 12, skillId: '346' },
      { level: 17, skillId: '299' },
      { level: 20, skillId: '310' },
      { level: 22, skillId: '348' },
      { level: 26, skillId: '392' },
      { level: 34, skillId: '363' },
    ])
  })
})

describe('M1a · 精灵表', () => {
  test('6 张,号=player-roles.spriteNum,布局 directional×(walkFrames||3)', () => {
    expect(out.sprites.map((s) => s.spriteNum)).toEqual([2, 3, 7, 525, 5, 26])
    for (const s of out.sprites) expect(s.layout).toEqual({ kind: 'directional', framesPerDir: 3 })
  })
})

describe('M1a · desc 提取', () => {
  const labelIndex = buildLabelIndex(src.commands)
  test('观音符(61)desc = 已核两行;气疗术(296 scriptDesc)= 已核一行', () => {
    expect(walkDesc(src.commands, labelIndex, 40661).lines).toEqual(['以观音圣水书写的灵符。', 'HP+150'])
    expect(walkDesc(src.commands, labelIndex, 43275).lines).toEqual(['我方单人HP+75'])
  })
  test('全量护栏零命中(337 条链全干净,2026-07-02 实测钉住)', () => {
    expect(out.report.blockedDescs).toEqual([])
  })
})

describe('M1a · 物品表字段', () => {
  test('234 件;demo 9 件手作的表字段逐件一致(name/icon/buy/sell/sellable/desc)', () => {
    expect(out.items).toHaveLength(234)
    const byId = new Map(out.items.map((i) => [i.id, i]))
    for (const d of demoItems) {
      const m = byId.get(d.id)!
      expect(m, d.id).toBeDefined()
      expect(m.name, d.id).toBe(d.name)
      expect(m.icon, d.id).toBe(d.icon)
      expect(m.buyPrice, d.id).toBe(d.buyPrice)
      expect(m.sellPrice, d.id).toBe(d.sellPrice)
      expect(m.sellable, d.id).toBe(d.sellable)
      expect(m.desc, d.id).toEqual(d.desc)
    }
  })
})

describe('M1b · 装备效果(scriptOnEquip → EquipSpec)', () => {
  const byId = new Map(out.items.map((i) => [i.id, i]))
  test('demo 7 件手作装备的 slot + effects 逐件深等(equipableBy 以原版多人为真,仅断言含 li-xiaoyao)', () => {
    for (const d of demoItems) {
      const de = (d as { equip?: { slot: string; equipableBy: string[]; effects: unknown[] } }).equip
      if (!de) continue
      const m = byId.get(d.id)!
      expect(m.equip, d.id).toBeDefined()
      expect(m.equip!.slot, d.id).toBe(de.slot)
      expect(m.equip!.effects, d.id).toEqual(de.effects)
      expect(m.equip!.equipableBy, d.id).toContain('li-xiaoyao')
    }
  })
  test('106 件全有 equip 块;仙女剑系连击 ×5;长鞭系 attackAll ×4;授技(合击/召唤)×7', () => {
    const equipped = out.items.filter((i) => i.equip)
    expect(equipped).toHaveLength(106)
    const effs = equipped.flatMap((i) => i.equip!.effects)
    expect(effs.filter((e) => e.kind === 'grantStatus' && e.status === 'dualAttack')).toHaveLength(5)
    expect(effs.filter((e) => e.kind === 'attackAll')).toHaveLength(4)
    expect(effs.filter((e) => e.kind === 'grantSkill')).toHaveLength(7)
  })
  test('pending 恰为已知系统缺口:战斗精灵切换 ×7 + 装备授毒 ×2', () => {
    const ops = out.report.pendingEquip.flatMap((p) => p.ops)
    expect(ops.filter((o) => o.reason.includes('战斗精灵'))).toHaveLength(7)
    expect(ops.filter((o) => o.reason.includes('毒'))).toHaveLength(2)
    expect(ops).toHaveLength(9)
  })
  test('土灵珠(267)= 避土 50 + 授技 336(demo 已核真值)', () => {
    expect(byId.get('267')!.equip!.effects).toEqual([
      { kind: 'resistance', element: 'earth', percent: 50 },
      { kind: 'grantSkill', skillId: '336' },
    ])
  })
  test('端到端:迁移物品 × buildWorld × effectiveStat = 防御 41 / 武术 35(状态板真值)', async () => {
    const { effectiveStat } = await import('@type-pal/content')
    const actorsById = Object.fromEntries(out.actors.map((a) => [a.id, a]))
    const demoManifest = readJson<{ startWorld: Parameters<typeof buildWorld>[0] }>('projects/demo/manifest.json')
    const li = buildWorld(demoManifest.startWorld, actorsById).party[0]!
    const itemsById = Object.fromEntries(out.items.map((i) => [i.id, i]))
    expect(effectiveStat(li, 'defense', itemsById)).toBe(41) // 32 + 六件装备Σ9(全来自翻译的 scriptOnEquip)
    expect(effectiveStat(li, 'attack', itemsById)).toBe(35) // 33 + 木剑 2
  })
})

describe('M1a+M1c · 技能(纯表 57 + 线性脚本翻译 18)', () => {
  const byId = new Map(out.skills.skills.map((s) => [s.id, s]))
  test('总量与去向:75 迁 / 28 pending(7 summon + 动态公式 + 5 门类),笔笔有名目', () => {
    expect(out.skills.skills).toHaveLength(75)
    expect(out.skills.skills.filter((s) => s.effects[0]?.kind === 'damage')).toHaveLength(57)
    expect(out.report.pendingSkills).toHaveLength(28)
    expect(out.report.pendingSkills.filter((p) => p.reason.includes('summon'))).toHaveLength(9) // 7 纯表 + 风神等带脚本的 summon 型
    // 门类 5 个点名:概率门(回梦/鬼降)/阈值+概率(夺魂/灵葫咒)/goto 循环(灵血咒)→ M1c-2
    const gateIds = out.report.pendingSkills.filter((p) => /超出线性集/.test(p.reason)).map((p) => p.id).sort()
    expect(gateIds).toEqual([303, 304, 305, 308, 384])
  })
  test('demo curated 三技能被解析器取代且值逐一致(diff 验证)', () => {
    expect(byId.get('296')?.effects).toEqual([{ kind: 'healHp', amount: 75 }])
    expect(byId.get('296')?.desc).toBe('我方单人HP+75')
    expect(byId.get('298')?.effects).toEqual([{ kind: 'healHp', amount: 220 }])
    expect(byId.get('298')?.cost.mp).toBe(18)
    expect(byId.get('299')?.effects).toEqual([{ kind: 'healHp', amount: 500 }])
    expect(byId.get('299')?.name).toBe('元灵归心术')
  })
  test('M1c 翻译批 spot(语义真值:还魂10%/赎魂30%/护体/狂勇/催眠系解/蛇毒/偷/变身)', () => {
    expect(byId.get('301')?.effects).toEqual([{ kind: 'revive', hpPercent: 10 }]) // 还魂咒 maxHP×1/10
    expect(byId.get('302')?.effects).toEqual([{ kind: 'revive', hpPercent: 30 }]) // 赎魂 ×3/10
    expect(byId.get('309')?.effects).toEqual([{ kind: 'applyStatus', status: 'protect', turns: 7 }]) // 金刚咒
    expect(byId.get('311')?.effects).toEqual([{ kind: 'applyStatus', status: 'bravery', turns: 7 }]) // 天罡战气
    expect(byId.get('307')?.effects).toEqual([
      { kind: 'removeStatus', statuses: ['confused', 'paralyzed', 'sleep'] }, // 冰心诀(去重)
    ])
    expect(byId.get('306')?.effects).toEqual([
      { kind: 'curePoison', poisonId: '551' },
      { kind: 'curePoison', poisonId: '553' },
      { kind: 'curePoison', poisonId: '552' },
    ]) // 净衣咒
    expect(byId.get('376')?.effects).toEqual([{ kind: 'applyPoison', poisonId: '553' }]) // 咒蛇
    expect(byId.get('377')?.effects).toEqual([{ kind: 'steal', rate: 6 }]) // 飞龙探云手(0x47 音效有损注)
    expect(byId.get('295')?.effects).toEqual([
      { kind: 'trance', sprite: 5 },
      { kind: 'buffStat', stat: 'attack', percent: 100, duration: 'battle' },
      { kind: 'buffStat', stat: 'dexterity', percent: 100, duration: 'battle' },
    ]) // 梦蛇
    expect(byId.get('295')?.target).toBe('self')
  })
  test('有损点登记:飞龙 0x47 音效;0x68 三连(三尸/万蛊/毒吞)实为双脚本 → 正确落 pending', () => {
    expect(out.report.lossySkills.map((l) => l.id)).toEqual([377])
    const dual = out.report.pendingSkills.filter((p) => [352, 372, 373].includes(p.id))
    expect(dual).toHaveLength(3)
    for (const d of dual) expect(d.reason).toContain('scriptOnUse') // onUse 带毒伤动态公式,非线性可译
  })
})

describe('M1a · 输出过 content 契约 + 可 buildWorld', () => {
  test('validate* 全过;merge demo extras 后 buildWorld(demo startWorld)不 throw', () => {
    const actors = mergeExtras(out.actors, demoActors)
    const sprites = mergeExtras(out.sprites, readJson<SpriteDef[]>('projects/demo/content/sprites.json'))
    expect(() => validateActors(actors)).not.toThrow()
    expect(() => validateSprites(sprites)).not.toThrow()
    expect(() => validateItems(out.items)).not.toThrow()
    expect(() => validateSkills(out.skills)).not.toThrow()
    expect(() => validateLocale({ ...out.localeNames })).not.toThrow()
    const actorsById = Object.fromEntries(actors.map((a) => [a.id, a]))
    const demoManifest = readJson<{ startWorld: Parameters<typeof buildWorld>[0] }>('projects/demo/manifest.json')
    const w = buildWorld(demoManifest.startWorld, actorsById)
    expect(w.party[0]?.hp).toBe(100) // seedStats 仍生效(pal 工程沿用 demo startWorld)
  })
})
