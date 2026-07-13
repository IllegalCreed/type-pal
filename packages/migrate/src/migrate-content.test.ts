// M1a golden 测:迁移器输出对「已核真值」——demo 手作数据(一手核验过)+ 已知原版事实。
// 读真实 data/extracted(同 demo-project.test 惯例;migrate 有 node fs)。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ActorDef, Command, SceneDef, ScriptChunkV1, SpriteDef } from '@type-pal/content'
import {
  buildWorld,
  mapRoom,
  pixelToGrid,
  reuseMapNum,
  validateActors,
  validateItems,
  validateLocale,
  validateSkills,
  validateSprites,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  buildLabelIndex,
  type MigrateSources,
  mapScenesStatic,
  mergeSceneScriptBindings,
  mergeExtras,
  migrateAll,
  type SourceCmd,
  type SourceScene,
  sceneSlug,
  walkDesc,
} from './migrate-content.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(root + rel, 'utf8')) as T

/** 测试观察器：沿 ref 展开行为视图，不改变真实迁移产物的去内联结构。 */
function materializeScenes(
  scenes: SceneDef[],
  chunks: Record<string, ScriptChunkV1>,
): SceneDef[] {
  const scripts = new Map(
    Object.values(chunks).flatMap((chunk) => Object.entries(chunk.scripts)),
  )
  const expand = (body: readonly Command[], stack = new Set<string>()): Command[] =>
    body.flatMap((cmd): Command[] => {
      if (cmd.kind === 'callScript' || cmd.kind === 'jumpScript') {
        if (stack.has(cmd.ref.id)) return []
        const target = scripts.get(cmd.ref.id) ?? []
        return expand(target, new Set([...stack, cmd.ref.id]))
      }
      if (cmd.kind === 'branch')
        return [{ ...cmd, then: expand(cmd.then, stack), ...(cmd.else ? { else: expand(cmd.else, stack) } : {}) }]
      return [cmd]
    })
  const stages = (value: SceneDef['onEnter']): SceneDef['onEnter'] =>
    value?.map((stage) => ({ ...stage, body: expand(stage.body) }))
  return scenes.map((scene) => ({
    ...scene,
    onEnter: stages(scene.onEnter),
    onTeleport: stages(scene.onTeleport),
    entities: scene.entities.map((entity) => ({
      ...entity,
      pages: entity.pages?.map((page) => ({
        ...page,
        trigger: page.trigger ? { ...page.trigger, stages: stages(page.trigger.stages)! } : undefined,
        auto: page.auto ? { stages: stages(page.auto.stages)! } : undefined,
      })),
    })),
  }))
}

// ── 源(真实 extracted)──
const allJson = readJson<{ segments: { commands: SourceCmd[] }[] }>(
  'data/extracted/events/all.json',
)
const src: MigrateSources = {
  roles: readJson<{ roles: MigrateSources['roles'] }>('data/extracted/data/player-roles.json')
    .roles,
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
const demoItems = readJson<
  {
    id: string
    name: string
    icon: number
    buyPrice: number
    sellPrice: number
    sellable: boolean
    desc: string[]
  }[]
>('projects/demo/content/items.json')

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
    // C1:头像组(主头像 = role.avatar;命名表情由编辑器人工加)
    expect(li.portraits).toEqual({ default: 1 })
  })
  test('6 角色齐 + expTable 100 级 + 战斗精灵号', () => {
    expect(out.actors.map((a) => a.id)).toEqual([
      'li-xiaoyao',
      'zhao-linger',
      'lin-yueru',
      'wu-hou',
      'anu',
      'gai-luojiao',
    ])
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
    expect(walkDesc(src.commands, labelIndex, 40661).lines).toEqual([
      '以观音圣水书写的灵符。',
      'HP+150',
    ])
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
      const de = (d as { equip?: { slot: string; equipableBy: string[]; effects: unknown[] } })
        .equip
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
    expect(effs.filter((e) => e.kind === 'grantStatus' && e.status === 'dualAttack')).toHaveLength(
      5,
    )
    expect(effs.filter((e) => e.kind === 'attackAll')).toHaveLength(4)
    expect(effs.filter((e) => e.kind === 'grantSkill')).toHaveLength(7)
  })
  test('pending 恰为已知系统缺口:战斗精灵切换 ×7(寿葫芦 0x29 已正名为 regen 词条,不再 pending)', () => {
    const ops = out.report.pendingEquip.flatMap((p) => p.ops)
    expect(ops.filter((o) => o.reason.includes('战斗精灵'))).toHaveLength(7)
    expect(ops.filter((o) => o.reason.includes('授毒'))).toHaveLength(0) // 563/564 → regenHp/regenMp
    expect(ops).toHaveLength(7)
  })
  test('寿葫芦(269)0x29 回补伪毒 → clean regen 词条(+20 HP/+20 MP;不借毒系统)', () => {
    expect(byId.get('269')!.equip!.effects).toEqual([
      { kind: 'regenHp', amount: 20 },
      { kind: 'regenMp', amount: 20 },
    ])
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
    const demoManifest = readJson<{ startWorld: Parameters<typeof buildWorld>[0] }>(
      'projects/demo/manifest.json',
    )
    const li = buildWorld(demoManifest.startWorld, actorsById).party[0]!
    const itemsById = Object.fromEntries(out.items.map((i) => [i.id, i]))
    expect(effectiveStat(li, 'defense', itemsById)).toBe(41) // 32 + 六件装备Σ9(全来自翻译的 scriptOnEquip)
    expect(effectiveStat(li, 'attack', itemsById)).toBe(35) // 33 + 木剑 2
  })
})

describe('M1a+M1c · 技能(纯表 57 + 线性脚本 18 + 门类 5)', () => {
  const byId = new Map(out.skills.skills.map((s) => [s.id, s]))
  test('总量与去向:89 迁(含 9 召唤,2026-07-05 战斗期补翻)/ 14 pending(动态公式),笔笔有名目', () => {
    expect(out.skills.skills).toHaveLength(89)
    expect(out.skills.skills.filter((s) => s.effects[0]?.kind === 'damage')).toHaveLength(57)
    const summons = out.skills.skills.filter((s) => s.effects[0]?.kind === 'summon')
    expect(summons).toHaveLength(9)
    // 召唤形状:summon(godId=wSummonEffect) + damage 结算;打全体
    for (const sk of summons) {
      expect(sk.target).toBe('allEnemies')
      expect(sk.effects[1]?.kind).toBe('damage')
    }
    expect(out.report.pendingSkills).toHaveLength(14)
    expect(out.report.pendingSkills.filter((p) => p.reason.includes('scriptOnUse'))).toHaveLength(
      14,
    )
  })
  test('M1c-2 门类 5 技:门语义与原版脚本同构(概率/HP阈值/抗性掷,顺序截断)', () => {
    expect(byId.get('303')?.effects).toEqual([
      { kind: 'gate', chance: 60 },
      { kind: 'applyStatus', status: 'sleep', turns: 4 },
    ]) // 回梦:60% → 催眠(0x68 敌方分支有损注)
    expect(byId.get('305')?.effects).toEqual([
      { kind: 'gate', chance: 44 },
      { kind: 'applyStatus', status: 'confused', turns: 4 },
    ]) // 鬼降
    expect(byId.get('304')?.effects).toEqual([
      { kind: 'gate', magicResist: true },
      { kind: 'gate', chance: 33 },
      { kind: 'instantKill' },
    ]) // 夺魂:抗性掷 + 33% + 即死
    expect(byId.get('384')?.effects).toEqual([
      { kind: 'gate', hpAtMostPercent: 25 },
      { kind: 'gate', chance: 60 },
      { kind: 'collectTreasure' },
      { kind: 'instantKill' },
    ]) // 灵葫咒:HP≤25% 处决条件 + 60% + 收宝 + 即死(修正设计文档早期例的静默丢门)
    expect(byId.get('308')?.effects).toEqual([
      { kind: 'curePoison', curesTier: 'common' },
      { kind: 'removeStatus', statuses: ['confused', 'paralyzed', 'sleep'] },
    ]) // 灵血咒:goto 尾调用跟进共享清状态子程序(L_39349)
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
  test('有损点登记:0x68 敌方分支(回梦/夺魂/鬼降)+ 飞龙 0x47 音效;三尸三连双脚本 → 正确 pending', () => {
    expect(out.report.lossySkills.map((l) => l.id).sort((a, b) => a - b)).toEqual([
      303, 304, 305, 370, 377, // 370 = 酒神(summon 动态伤害直译占位,2026-07-05)
    ])
    const dual = out.report.pendingSkills.filter((p) => [352, 372, 373].includes(p.id))
    expect(dual).toHaveLength(3)
    for (const d of dual) expect(d.reason).toContain('scriptOnUse') // onUse 带毒伤动态公式,非线性可译
  })
})

describe('M1a · 输出过 content 契约 + 可 buildWorld', () => {
  test('validate* 全过;merge demo extras 后 buildWorld(demo startWorld)不 throw', () => {
    const actors = mergeExtras(out.actors, demoActors)
    const sprites = mergeExtras(
      out.sprites,
      readJson<SpriteDef[]>('projects/demo/content/sprites.json'),
    )
    expect(() => validateActors(actors)).not.toThrow()
    expect(() => validateSprites(sprites)).not.toThrow()
    expect(() => validateItems(out.items)).not.toThrow()
    expect(() => validateSkills(out.skills)).not.toThrow()
    expect(() => validateLocale({ ...out.localeNames })).not.toThrow()
    const actorsById = Object.fromEntries(actors.map((a) => [a.id, a]))
    const demoManifest = readJson<{ startWorld: Parameters<typeof buildWorld>[0] }>(
      'projects/demo/manifest.json',
    )
    const w = buildWorld(demoManifest.startWorld, actorsById)
    expect(w.party[0]?.hp).toBe(100) // seedStats 仍生效(pal 工程沿用 demo startWorld)
  })
})

describe('M1d · 使用效果(scriptOnUse → UseSpec)', () => {
  const byId = new Map(out.items.map((i) => [i.id, i]))
  test('demo 手作使用件 oracle:观音符(61)/茶叶蛋(78)deep-equal;土灵珠(267)灵珠剧情 → pending', () => {
    expect(byId.get('61')!.use).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'healHp', amount: 150 }],
    })
    expect(byId.get('78')!.use).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [
        { kind: 'healHp', amount: 15 },
        { kind: 'healMp', amount: 15 },
      ],
    })
    expect(byId.get('267')!.use).toBeUndefined()
    expect(out.report.pendingUse.some((p) => p.itemId === 267)).toBe(true)
  })
  test('新 kind spot:舍利子 maxMP+3 / 雪蛤蟆三永久成长 / 盐巴概率门 / 尸腐肉下毒 / 还魂香复活10%', () => {
    expect(byId.get('72')!.use!.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'maxMP', delta: 3 },
    ])
    expect(byId.get('132')!.use!.effects).toEqual([
      { kind: 'permanentStatBoost', stat: 'attack', delta: 2 },
      { kind: 'permanentStatBoost', stat: 'defense', delta: 2 },
      { kind: 'permanentStatBoost', stat: 'magicAttack', delta: 2 },
    ])
    expect(byId.get('77')!.use!.effects).toEqual([
      { kind: 'gate', chance: 50 },
      { kind: 'curePoison', poisonId: '551' },
    ])
    expect(byId.get('116')!.use!.effects).toEqual([{ kind: 'applyPoison', poisonId: '552' }])
    expect(byId.get('95')!.use!.effects).toEqual([{ kind: 'revive', hpPercent: 10 }])
  })
  test('毒龙胆/九阴散:0x61「没中毒则秒杀」→ dieIfNotPoisoned gate + 后效(不再有损)', () => {
    expect(byId.get('136')!.use!.effects).toEqual([
      { kind: 'dieIfNotPoisoned' },
      { kind: 'healHp', amount: 999 },
    ])
    expect(byId.get('278')!.use!.effects).toEqual([
      { kind: 'dieIfNotPoisoned' },
      { kind: 'curePoison', curesTier: 'severe' },
    ])
    // 0x61 现已表达 → 136/278 不再进 lossyUse
    expect(out.report.lossyUse.map((l) => l.itemId)).not.toContain(136)
    expect(out.report.lossyUse.map((l) => l.itemId)).not.toContain(278)
  })
  test('引路蜂(151):0x38 传送出口 → teleportOut(target scene, 消耗);土灵珠(267)0x81 场景交互仍 pending', () => {
    expect(byId.get('151')!.use).toEqual({
      target: 'scene',
      consuming: true,
      effects: [{ kind: 'teleportOut' }],
    })
    // 土灵珠 use 脚本以 0x81(是否面对指定 event object)开头 = 场景交互,系统未落地 → 保持 pending
    expect(byId.get('267')!.use).toBeUndefined()
    expect(out.report.pendingUse.some((p) => p.itemId === 267)).toBe(true)
  })
  test('大蒜(84):0x17 SetPlayerExtraAttribute(层6 行22=毒抗)→ extraPoisonRes(临时毒抗)', () => {
    expect(byId.get('84')!.use).toEqual({
      target: 'oneAlly',
      consuming: true,
      effects: [{ kind: 'extraPoisonRes', amount: 30 }],
    })
  })
  test('总账:100 usable 全有下落(use 块 + pendingUse = 100),pending 原因均指向未落地系统', () => {
    const withUse = out.items.filter((i) => i.use).length
    expect(withUse + out.report.pendingUse.length).toBe(100)
    expect(withUse).toBeGreaterThanOrEqual(60)
    for (const p of out.report.pendingUse) expect(p.reason).toMatch(/系统|B2|剧情|空链/)
  })
})

describe('M2b · 场景静态迁移 + 窄扫描(s001 盛渔村客栈 / s004 切片 golden)', () => {
  const readScene = (n: number) => readJson<SourceScene>(`data/extracted/data/scene/${n}.json`)
  const readEvents = (n: number) =>
    readJson<{ segments: { commands: SourceCmd[] }[] }>(
      `data/extracted/events/scene-${String(n).padStart(3, '0')}.json`,
    ).segments.flatMap((s) => s.commands)
  const readShared = () =>
    readJson<{ segments: { commands: SourceCmd[] }[] }>(
      'data/extracted/events/shared.json',
    ).segments.flatMap((s) => s.commands)
  const out2 = mapScenesStatic(
    [readScene(1), readScene(3), readScene(4), readScene(5)],
    new Map([
      [1, readEvents(1)],
      [3, readEvents(3)], // s001 loadScene→operand4 → index3 = s003(off-by-one 修复后 s001 的正确目标)
      [4, readEvents(4)],
      [5, readEvents(5)],
      [-1, readShared()], // 共享段:s005 的 autoLabel(L_35636/L_35639)在此
    ]),
  )
  const byId = new Map(out2.scenes.map((s) => [s.id, s]))
  const expandedScenes = materializeScenes(out2.scenes, out2.scriptChunks)
  const expandedById = new Map(expandedScenes.map((s) => [s.id, s]))

  test('s001:mapNum/实体数/坐标零换算/触发区跳过', () => {
    const s1 = byId.get('s001')!
    expect(reuseMapNum(s1.map)).toBe(12)
    expect(mapRoom(s1.map)).toBeUndefined() // 原版无房间概念 → 整图
    // 32 对象 = 13 可见实体 + 19 隐形触发区(M3a 起 zone 实体随触发脚本全迁)
    expect(s1.entities).toHaveLength(32)
    expect(s1.entities.filter((e) => 'zone' in e)).toHaveLength(19)
    expect(s1.entities.filter((e) => 'sprite' in e)).toHaveLength(13)
    const src1 = readScene(1)
    const firstVisible = src1.eventObjects.find((o) => o.spriteNum > 0)!
    const e = s1.entities.find((x) => x.id === `e${firstVisible.id}`)!
    expect(e.pos).toEqual({ ...pixelToGrid(firstVisible.x, firstVisible.y), height: 0 }) // 像素↔菱形格精确往返
  })
  test('s003:from-s001 入口 = setPartyPos(49,94) 精确落格(loadScene off-by-one 修复:operand4→index3=s003)', () => {
    // loadScene operand 1-based:s001 的 loadScene→operand4 = 0-based index3 = s003(修复前错落 s004)
    const s3 = byId.get('s003')!
    expect(s3.entries?.['from-s001']?.pos).toEqual({ ...pixelToGrid(49 * 32, 94 * 16), height: 0 })
    expect(s3.entry.pos).toEqual(Object.values(s3.entries!)[0]!.pos) // entry 兜底 = 首个已知入口
  })
  test('实体语义映射:hidden=sState0 / collide=sState≥2 / facing=direction 表 / zBias=sLayer', () => {
    const src1 = readScene(1)
    const s1 = byId.get('s001')!
    for (const eo of src1.eventObjects) {
      if (eo.spriteNum <= 0) continue
      const e = s1.entities.find((x) => x.id === `e${eo.id}`)!
      expect(e.hidden ?? false, `e${eo.id} hidden`).toBe((eo.sState ?? 1) === 0)
      expect(e.collide ?? false, `e${eo.id} collide`).toBe((eo.sState ?? 0) >= 2)
      // 朝向:无 autoScript 时 = direction 表(有 autoScript 时链首可覆盖,另测)
      if (eo.direction && !eo.autoLabel)
        expect(e.facing).toBe(['down', 'left', 'up', 'right'][eo.direction])
      if (eo.sLayer) expect(e.zBias).toBe(eo.sLayer)
    }
  })
  test('朝向折叠:autoScript 链首 0x0F 覆盖数据 direction(s005 盛渔村市集,用户实测回归)', () => {
    const s5 = byId.get('s005')!
    const facing = (id: number) => s5.entities.find((x) => x.id === `e${id}`)?.facing
    // 数据 dir=0 但 autoScript 首拍 0x0F 改写:e127→West(0x0F[1])、e128/129/130→East(0x0F[3])
    expect(facing(127)).toBe('left')
    expect(facing(128)).toBe('right')
    expect(facing(129)).toBe('right')
    expect(facing(130)).toBe('right')
    // 无 autoScript → 数据字段直译:e124/125 dir=3 → right
    expect(facing(124)).toBe('right')
    expect(facing(125)).toBe('right')
    // 0x14 链首(设帧强制朝南)/ 0x87 纯动画:朝向落 South → facing 省略(默认 down)
    expect(facing(116)).toBeUndefined()
    expect(facing(118)).toBeUndefined()
    expect(out2.report.facingFromAuto).toBeGreaterThanOrEqual(4)
  })
  test('M3a 门模式折叠:门触发 = 单条 loadScene{scene,pos}(setPartyPos/fadeOut 被吸收)', () => {
    const doors = expandedScenes
      .flatMap((s) =>
        s.entities.flatMap((e) => e.pages?.flatMap((p) => p.trigger?.stages ?? []) ?? []),
      )
      .filter((st) => st.body.some((c) => c.kind === 'loadScene'))
    expect(doors.length).toBeGreaterThan(5)
    const folded = doors.filter((st) => {
      const i = st.body.findIndex((c) => c.kind === 'loadScene')
      const ls = st.body[i]! as { kind: 'loadScene'; pos?: unknown }
      const rest = st.body.slice(i + 1)
      return (
        ls.pos !== undefined && !rest.some((c) => c.kind === 'teleportParty' || c.kind === 'fade')
      )
    })
    // 主流门链(loadScene setPartyPos fadeOut end)全部折叠成单命令
    expect(folded.length).toBeGreaterThan(doors.length * 0.6)
  })
  test('M3a 对话成组:渔翁(s005)= speaker 行折 speaker 字段,正文行拼一页进 locale', () => {
    const s5 = expandedById.get('s005')!
    const dialogs = s5.entities
      .flatMap(
        (e) => e.pages?.flatMap((p) => p.trigger?.stages.flatMap((st) => st.body) ?? []) ?? [],
      )
      .filter((c): c is Extract<typeof c, { kind: 'dialog' }> => c.kind === 'dialog')
    const yuwong = dialogs.find((d) => d.line.speaker === 'spk.渔翁')
    expect(yuwong).toBeDefined()
    expect(out2.scriptLocale['spk.渔翁']).toBe('渔翁')
    const text = out2.scriptLocale[yuwong!.line.text]!
    expect(text.startsWith('传说～当年观音菩萨')).toBe(true)
    expect(text.length).toBeGreaterThan(20) // 多行拼接成页,不是单行
  })
  test('M3c 立绘:对话样式 op 的 arg0 → DialogueLine.portrait(top→左 / bottom→右;用户实测漏显回归)', () => {
    // 全量对话(含 onEnter/触发)扫立绘
    const allDialogs = expandedScenes
      .flatMap((s) => [
        ...(s.onEnter ?? []).flatMap((st) => st.body),
        ...s.entities.flatMap(
          (e) => e.pages?.flatMap((p) => p.trigger?.stages.flatMap((st) => st.body) ?? []) ?? [],
        ),
      ])
      .filter((c): c is Extract<typeof c, { kind: 'dialog' }> => c.kind === 'dialog')
    const withPortrait = allDialogs.filter((d) => d.line.portrait)
    expect(withPortrait.length).toBeGreaterThan(3) // 客栈开场李大娘/李逍遥多页带立绘
    // side 约定:top slot → 左,bottom slot(缺省)→ 右;icon 为正整数(RGM 立绘号)
    for (const d of withPortrait) {
      const p = d.line.portrait!
      expect(p.icon).toBeGreaterThan(0)
      expect(p.side).toBe(d.line.slot === 'top' ? 'left' : 'right')
    }
    // 李大娘(icon 55)确在开场
    expect(withPortrait.some((d) => d.line.portrait!.icon === 55)).toBe(true)
    // narration/center 无立绘(arg0 是颜色不是脸)
    expect(allDialogs.every((d) => d.line.slot !== 'narration' || !d.line.portrait)).toBe(true)
  })
  test('M3a stages:存在 advance 多段触发与 reset 回跳;onEnter 翻译含 playMusic', () => {
    const allStages = expandedScenes.flatMap((s) =>
      s.entities.flatMap((e) => e.pages?.flatMap((p) => p.trigger?.stages ?? []) ?? []),
    )
    expect(allStages.some((st) => st.next === 'advance')).toBe(true)
    expect(allStages.some((st) => typeof st.next === 'number')).toBe(true)
    const s4 = expandedById.get('s004')!
    expect(s4.onEnter?.length).toBeGreaterThan(0)
    expect(s4.onEnter![0]!.body.some((c) => c.kind === 'playMusic' && c.musicId === 49)).toBe(true)
    // 覆盖统计存在;跳转族截断如实上报
    expect(out2.scriptReport.chains).toBeGreaterThan(30)
    expect(out2.scriptReport.commands).toBeGreaterThan(300)
  })
  test('D24 传送出口:onTeleportLabel → onTeleport(setPartyPos+loadScene+fade 折叠成单 loadScene)', () => {
    // 场景 7 有 wScriptOnTeleport(引路蜂出口);其脚本 L_2201 在 shared 段(跨场景传送脚本)
    const out = mapScenesStatic(
      [readScene(7)],
      new Map([
        [7, readEvents(7)],
        [-1, readShared()],
      ]),
    )
    const s7 = materializeScenes(out.scenes, out.scriptChunks)[0]!
    expect(s7.onTeleport?.length).toBeGreaterThan(0)
    // 门模式折叠:出口脚本核心是一条 loadScene(回上层/洞口)
    const hasLoad = s7.onTeleport!.some((st) => st.body.some((c) => c.kind === 'loadScene'))
    expect(hasLoad).toBe(true)
    // 无出口场景(s001)不产 onTeleport 槽
    expect(byId.get('s001')!.onTeleport).toBeUndefined()
  })
  test('M3a 0xFFFF 自指:setEntityState(0xFFFF) → 属主实体(拾取消失例)', () => {
    // 全场景搜:某实体的触发脚本里 setEntityState 指向自己(原版拾取 = 0x49[0xFFFF,0] 自灭)
    const selfVanish = expandedScenes
      .flatMap((s) => s.entities)
      .some((e) =>
        e.pages?.[0]?.trigger?.stages.some((st) =>
          st.body.some((c) => c.kind === 'setEntityState' && c.entity === e.id && c.state <= 0),
        ),
      )
    expect(selfVanish).toBe(true)
    // 字面 e65535 不应存在
    const literal = expandedScenes
      .flatMap((s) => s.entities)
      .some((e) =>
        e.pages?.[0]?.trigger?.stages.some((st) =>
          st.body.some((c) => 'entity' in c && c.entity === 'e65535'),
        ),
      )
    expect(literal).toBe(false)
  })
  test('精灵批量登记:npc-<num>,布局 directional×n(n>0)/ static(n=0)', () => {
    const src1 = readScene(1)
    const visible = src1.eventObjects.filter((o) => o.spriteNum > 0)
    for (const eo of visible) {
      const def = out2.sprites.find(
        (d) => d.spriteNum === eo.spriteNum && d.id.startsWith(`npc-${eo.spriteNum}`),
      )!
      expect(def, `npc-${eo.spriteNum}`).toBeDefined()
      if ((eo.nSpriteFrames ?? 0) > 0)
        expect(def.layout.kind === 'directional' || def.id.includes('-f'), def.id).toBe(true)
    }
    expect(sceneSlug(4)).toBe('s004')
  })
})

describe('M1d · 投掷效果(scriptOnThrow → ThrowSpec)', () => {
  const byId = new Map(out.items.map((i) => [i.id, i]))
  test('食妖虫(144)/碧血蚕(147)投掷 → 下寄生毒(养蛊源:0x28 → applyPoison)', () => {
    expect(byId.get('144')!.throw!.effects).toEqual([{ kind: 'applyPoison', poisonId: '561' }])
    expect(byId.get('147')!.throw!.effects).toEqual([{ kind: 'applyPoison', poisonId: '562' }])
  })
  test('毒食投掷 → 下常规毒(尸腐肉116→尸毒552/毒蛇卵117→赤毒551)', () => {
    expect(byId.get('116')!.throw!.effects).toEqual([{ kind: 'applyPoison', poisonId: '552' }])
    expect(byId.get('117')!.throw!.effects).toEqual([{ kind: 'applyPoison', poisonId: '551' }])
  })
  test('六大毒药对己 use → applyPoison(本毒)(相克三段链整链化;相克/致死走 PoisonDef 数据)', () => {
    // 鹤顶红122 use = 下本毒 556(以毒攻毒/致死靠 counters/lethalWith)
    expect(byId.get('122')!.use!.effects).toEqual([{ kind: 'applyPoison', poisonId: '556' }])
    expect(byId.get('139')!.use!.effects).toEqual([{ kind: 'applyPoison', poisonId: '560' }])
  })
  test('六大毒药投掷 → applyPoison(致死 0x5E/0x60 数据化进 lethalWith,不再 pendingThrow)', () => {
    // 鹤顶红122→556 / 三尸蛊138→555:throw 0x28 下毒 + 0x5E/0x60 致死(跳,运行时按 lethalWith 判)
    expect(byId.get('122')!.throw!.effects).toEqual([{ kind: 'applyPoison', poisonId: '556' }])
    expect(byId.get('138')!.throw!.effects).toEqual([{ kind: 'applyPoison', poisonId: '555' }])
    // 剩余 pendingThrow 仅相克 use 链(0x5D/0x2B 以毒攻毒),非六大毒药投掷
    expect(out.report.pendingThrow.every((p) => p.reason.includes('相克 use'))).toBe(true)
  })
})

describe('M3 写盘白名单', () => {
  test('只替换脚本 stages，保留实体与页面静态字段', () => {
    const disk: SceneDef = {
      id: 's001',
      map: { reuseOriginalMap: 1 },
      entry: { pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      entities: [{
        id: 'e1',
        pos: { col: 3, row: 4, height: 0 },
        zone: true,
        collide: true,
        pages: [{
          state: 7,
          trigger: {
            on: 'interact',
            range: 3,
            stages: [{ body: [{ kind: 'playSound', soundId: 1 }] }],
          },
          auto: { stages: [{ body: [{ kind: 'wait', ms: 100 }] }] },
        }, {
          state: 9,
          trigger: { on: 'touch', stages: [{ body: [{ kind: 'playSound', soundId: 9 }] }] },
        }],
      }],
      onEnter: [{ body: [{ kind: 'playSound', soundId: 2 }] }],
    }
    const ref = { chunk: 'scene/s001', id: 'scene/s001/root' }
    const fresh: SceneDef = {
      ...disk,
      map: { reuseOriginalMap: 99 },
      entities: [{
        id: 'e1',
        pos: { col: 99, row: 99, height: 0 },
        zone: true,
        pages: [{
          trigger: { on: 'touch', range: 0, stages: [{ body: [{ kind: 'callScript', ref }] }] },
        }],
      }],
      onEnter: [{ body: [{ kind: 'callScript', ref }] }],
    }

    const merged = mergeSceneScriptBindings(disk, fresh)
    expect(merged.map).toEqual(disk.map)
    expect(merged.entities[0]!.pos).toEqual(disk.entities[0]!.pos)
    expect(merged.entities[0]!.collide).toBe(true)
    expect(merged.entities[0]!.pages?.[0]?.state).toBe(7)
    expect(merged.entities[0]!.pages?.[0]?.trigger).toEqual({
      on: 'interact',
      range: 3,
      stages: [{ body: [{ kind: 'callScript', ref }] }],
    })
    expect(merged.entities[0]!.pages?.[0]?.auto).toBeUndefined()
    expect(merged.entities[0]!.pages?.[1]).toEqual({ state: 9 })
    expect(merged.onEnter).toEqual(fresh.onEnter)
  })
})
