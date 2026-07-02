/**
 * M1 数据表批量迁移器 · 纯函数核(见 docs/phase2/foundation/migrator-m1-plan.md)。
 *
 * 输入 = data/extracted 的原始表(player-roles/spells/magic/items/level-up-*)+ events/all.json 命令流;
 * 输出 = projects/<id>/content 的 ActorDef/SkillData/ItemData/SpriteDef/locale 片段(经 content validate 契约)。
 * IO(读盘/写盘/资产复制)在 scripts/migrate-content.mts;本文件全纯函数,vitest golden 测钉真值。
 *
 * M1a 范围:表格域——6 角色 / 6 精灵表 / 234 物品表字段(equip/use 留 M1b/M1d)/
 * 57 纯伤害技能(scriptOnSuccess=0 且 scriptOnUse=0 且非 summon 型)+ curated 已核技能 / 全量 desc。
 */
import type {
  ActorDef,
  ItemData,
  LevelUpSkill,
  SkillData,
  SpriteDef,
} from '@type-pal/content'

// ── 源数据形状(结构最小化;字段名 2026-07-02 对 data/extracted 实测钉死)──
export interface SourceRole {
  id: number
  _name: string
  avatar: number
  spriteNum: number
  spriteNumInBattle: number
  walkFrames: number
  level: number
  hp: number
  maxHP: number
  mp: number
  maxMP: number
  attackStrength: number
  magicStrength: number
  defense: number
  dexterity: number
  fleeRate: number
  equipment: number[]
  magic: number[]
}
export interface SourceSpell {
  id: number
  magicNumber: number
  scriptOnSuccess: number
  scriptOnUse: number
  scriptDesc: number
  _name: string
  flags: { usableOutsideBattle: boolean; usableInBattle: boolean; usableToEnemy: boolean; applyToAll: boolean }
}
export interface SourceMagic {
  id: number
  type: string // normal / attackAll / attackField / attackWhole / applyToPlayer / applyToParty / summon / trance
  costMP: number
  baseDamage: number
  elemental: number
  effect: number
}
export interface SourceItem {
  id: number
  _name: string
  bitmap: number
  price: number
  scriptOnUse: number
  scriptOnEquip: number
  scriptOnThrow: number
  scriptDesc: number
  flags: { usable: boolean; equipable: boolean; throwable: boolean; consuming: boolean; applyToAll: boolean; sellable: boolean; equipableBy: boolean[] }
}
/** all.json 命令(disasm 只具名 end/goto/showDialog/giveItem,其余 raw)。 */
export interface SourceCmd {
  label?: string
  op?: string
  text?: string
  opcode?: number
  operands?: number[]
}
export interface LevelUpMagicCell {
  level: number
  magic: number
}

// ── 身份/槽位真值 ──────────────────────────────────────────
/** roleId → 语义 slug(原版 6 角色固定;roleId 3=巫后 4=阿奴,勿按 words 顺序重取——parser 已修对调)。 */
export const ROLE_SLUGS = ['li-xiaoyao', 'zhao-linger', 'lin-yueru', 'wu-hou', 'anu', 'gai-luojiao'] as const

/**
 * role.equipment[] 下标 → 装备槽真序。
 * ⚠ pal-extract player-roles.ts:130 的注释(0=武器…)是**错的**:role0 = [196头巾,225披风,208布袍,166木剑,235草鞋,249护腕]
 * 对已核物品名逐位验证 → 真序如下(= sdlpal 身体部位枚举 Head/Body(→cloak)/Shoulder(→body)/Hand/Feet/Wear)。
 * golden 测:mapActor(role0).initialEquipment 必须深等 demo 手作 li-xiaoyao。
 */
export const EQUIP_INDEX_TO_SLOT = ['head', 'cloak', 'body', 'weapon', 'feet', 'accessory'] as const

// ── desc 提取(scriptDesc → showDialog 链)──────────────────
export function buildLabelIndex(commands: readonly SourceCmd[]): Map<string, number> {
  const m = new Map<string, number>()
  commands.forEach((c, i) => {
    if (c.label) m.set(c.label, i)
  })
  return m
}

export interface DescResult {
  lines: string[]
  /** 链中出现非 showDialog/end/label 的命令 → 记录护栏命中(进待手修清单),lines 为命中前已收部分。 */
  blockedAt?: { op?: string; opcode?: number }
}

/**
 * 从 L_<ip> 标签起收连续 showDialog 文本,end 止。
 * ⚠ label **挂在命令上**(`{op:'end',label:'L_0'}`),非独立行 → 从 start 本身开始按 op 处理;
 *   仅当该行只有 label 没有 op 时才当纯标签跳过。ip=0 = 原版"无描述"哨兵,直接空。
 * 全量 337 条(234 物品 + 103 技能)实测零护栏命中(2026-07-02;含 scriptDesc=0 的 34 条空描述)。
 */
export function walkDesc(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
): DescResult {
  if (ip === 0) return { lines: [] } // 原版 scriptDesc=0 = 无描述
  const start = labelIndex.get(`L_${ip}`)
  if (start === undefined) return { lines: [] }
  const lines: string[] = []
  for (let i = start; i < commands.length; i++) {
    const c = commands[i]!
    if (c.op === 'showDialog') {
      if (c.text) lines.push(c.text)
    } else if (c.op === 'end') {
      return { lines }
    } else if (c.label !== undefined && c.op === undefined) {
      // 纯标签行(无 op),跳过
    } else if (c.opcode === 167) {
      // 实测:每条文本块以 raw 167(0xA7)[0,0,0] 开头(label 挂它身上)—— 块头标记,跳过
    } else {
      return { lines, blockedAt: { op: c.op, opcode: c.opcode } }
    }
  }
  return { lines }
}

// ── 角色 ──────────────────────────────────────────────────
export function mapActor(role: SourceRole, expTable: readonly number[]): ActorDef {
  const slug = ROLE_SLUGS[role.id]
  if (!slug) throw new Error(`mapActor: 未知 roleId ${role.id}`)
  const initialEquipment: Record<string, string> = {}
  role.equipment.forEach((itemId, i) => {
    const slot = EQUIP_INDEX_TO_SLOT[i]
    if (slot && itemId > 0) initialEquipment[slot] = String(itemId)
  })
  return {
    id: slug,
    name: `name.${slug}`,
    spriteId: slug,
    portrait: role.avatar,
    battler: {
      baseStats: {
        level: role.level,
        hp: role.hp,
        maxHP: role.maxHP,
        mp: role.mp,
        maxMP: role.maxMP,
        attack: role.attackStrength,
        defense: role.defense,
        magicAttack: role.magicStrength,
        speed: role.dexterity,
        luck: role.fleeRate,
      },
      initialEquipment,
      initialMagic: role.magic.filter((m) => m > 0).map(String),
      leveling: { expTable: [...expTable] },
      battleSpriteNum: role.spriteNumInBattle,
    },
  }
}

/** 6 角色的大世界精灵表登记(walkFrames 0 = 默认 3;非字面拷贝)。 */
export function mapSprites(roles: readonly SourceRole[]): SpriteDef[] {
  return roles.map((r) => {
    const slug = ROLE_SLUGS[r.id]
    if (!slug) throw new Error(`mapSprites: 未知 roleId ${r.id}`)
    return {
      id: slug,
      spriteNum: r.spriteNum,
      label: `${r._name}(大世界)`,
      layout: { kind: 'directional' as const, framesPerDir: r.walkFrames || 3 },
    }
  })
}

/** level-up-magic:20 行 × 5 列,**列 = roleId**(列主序;行内取列,勿按行)。空槽 level/magic=0 滤掉。 */
export function mapLevelUp(rows: readonly (readonly LevelUpMagicCell[])[]): Record<string, LevelUpSkill[]> {
  const out: Record<string, LevelUpSkill[]> = {}
  const cols = rows[0]?.length ?? 0
  for (let col = 0; col < cols; col++) {
    const slug = ROLE_SLUGS[col]
    if (!slug) continue
    const list: LevelUpSkill[] = []
    for (const row of rows) {
      const cell = row[col]
      if (cell && cell.level > 0 && cell.magic > 0) list.push({ level: cell.level, skillId: String(cell.magic) })
    }
    if (list.length) out[slug] = list
  }
  return out
}

// ── 技能(M1a:纯表驱动伤害技)─────────────────────────────
const DAMAGE_TARGET: Record<string, SkillData['target']> = {
  normal: 'oneEnemy',
  attackAll: 'allEnemies',
  attackField: 'allEnemies',
  attackWhole: 'allEnemies',
}

export interface SkillMigrationResult {
  skills: SkillData[]
  /** 未自动迁移的技能(scriptOnSuccess/scriptOnUse ≠0,或 summon 型)→ M1c。 */
  pending: { id: number; name: string; reason: string }[]
}

export function mapPureSkills(
  spells: readonly SourceSpell[],
  magicById: ReadonlyMap<number, SourceMagic>,
  descOf: (ip: number) => string[],
): SkillMigrationResult {
  const skills: SkillData[] = []
  const pending: SkillMigrationResult['pending'] = []
  for (const s of spells) {
    const m = magicById.get(s.magicNumber)
    if (!m) {
      pending.push({ id: s.id, name: s._name, reason: `magicNumber ${s.magicNumber} 不在 magic.json` })
      continue
    }
    if (s.scriptOnSuccess !== 0 || s.scriptOnUse !== 0) {
      pending.push({ id: s.id, name: s._name, reason: `脚本效果(onSuccess=${s.scriptOnSuccess} onUse=${s.scriptOnUse})→ M1c` })
      continue
    }
    const target = DAMAGE_TARGET[m.type]
    if (!target) {
      pending.push({ id: s.id, name: s._name, reason: `type=${m.type} 非纯伤害(summon/trance 等)→ M1c` })
      continue
    }
    skills.push({
      id: String(s.id),
      name: s._name,
      desc: descOf(s.scriptDesc).join('\n'),
      cost: { mp: m.costMP },
      usableOutsideBattle: s.flags.usableOutsideBattle,
      target,
      effects: [{ kind: 'damage', power: m.baseDamage, elemental: m.elemental }],
      animation: { effectSprite: m.effect },
    })
  }
  return { skills, pending }
}

/**
 * curated 已核技能(demo 手作,一手核验出处见 projects/demo 历史与 skill-data-design):
 * 296/298/299 outdoor 治疗 —— healHp 量来自原版 scriptOnSuccess 0x1B 实测(75/220/500)。
 * M1c 落地脚本解析后可移除此表(以解析结果取代,并 diff 验证一致)。
 */
export const CURATED_SKILLS: SkillData[] = [
  {
    id: '296',
    name: '气疗术',
    desc: '我方单人HP+75',
    cost: { mp: 6 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 75 }],
    animation: { effectSprite: 27 },
  },
  {
    id: '298',
    name: '凝神归元',
    desc: '我方单人HP+220',
    cost: { mp: 18 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 220 }],
    animation: { effectSprite: 29 },
  },
  {
    id: '299',
    name: '元灵归心术',
    desc: '我方单人HP+500',
    cost: { mp: 40 },
    usableOutsideBattle: true,
    target: 'oneAlly',
    effects: [{ kind: 'healHp', amount: 500 }],
    animation: { effectSprite: 29 },
  },
]

// ── 装备效果翻译(M1b:scriptOnEquip → EquipSpec)────────────
// 语义移植自一阶段 packages/game/src/core/equip-effect.ts(已对 sdlpal script.c 三遍核过的运行时解释器);
// 本处是它的"静态表亲":链入 → EquipSpec 出,不碰运行态。
// 2026-07-02 全量扫 106 条链:opcode 封闭集 {0x17×212, 0x18×106, 0x1A×18, 0x2D×5, 0x29×2},零 goto 零意外。

/** 0x17/0x1A 的 row → 属性(PLAYERROLES_ROW,equip-effect.ts:122 真值)。 */
const STAT_BY_ROW: Record<number, 'attack' | 'magicAttack' | 'defense' | 'speed' | 'luck'> = {
  17: 'attack',
  18: 'magicAttack',
  19: 'defense',
  20: 'speed',
  21: 'luck',
}
const ELEMENT_BY_ROW: Record<number, 'poison' | 'wind' | 'thunder' | 'water' | 'fire' | 'earth'> = {
  22: 'poison',
  23: 'wind',
  24: 'thunder',
  25: 'water',
  26: 'fire',
  27: 'earth',
}
const MAXPOOL_BY_ROW: Record<number, 'hp' | 'mp'> = { 7: 'hp', 8: 'mp' }
/** 原版状态 id → StatusId(按需扩;8=连击 实测唯一出现,仙女剑系 ×5)。 */
const STATUS_BY_ID: Record<number, 'dualAttack'> = { 8: 'dualAttack' }

/** WORD → 有符号 16 位(0x17 的 delta 可负,如铁锁衣防御-10)。 */
export function signExtendI16(v: number): number {
  return v >= 0x8000 ? v - 0x10000 : v
}

export interface EquipTranslation {
  slot?: string
  effects: NonNullable<ItemData['equip']>['effects']
  /** 翻不动的 op(战斗精灵切换 0x1A[1] / 毒疗 0x29 等系统未落地)→ 报告。 */
  pending: { opcode: number; operands: number[]; reason: string }[]
}

/** 静态翻译一条 scriptOnEquip 链。slot 来自 0x18 的 operand0-0x0B(= EQUIP_INDEX_TO_SLOT 同源行序)。 */
export function translateEquipScript(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
): EquipTranslation {
  const out: EquipTranslation = { effects: [], pending: [] }
  const start = labelIndex.get(`L_${ip}`)
  if (ip === 0 || start === undefined) return out
  for (let i = start; i < commands.length; i++) {
    const c = commands[i]!
    if (c.op === 'end') return out
    if (c.op !== 'raw') {
      if (c.label !== undefined && c.op === undefined) continue // 纯标签行
      out.pending.push({ opcode: -1, operands: [], reason: `非 raw op "${c.op}"` })
      return out
    }
    const [a = 0, b = 0, cc = 0] = c.operands ?? []
    switch (c.opcode) {
      case 0x18: // 装到哪个部位(每链恰一次;槽位真值来源)
        out.slot = EQUIP_INDEX_TO_SLOT[a - 0x0b]
        break
      case 0x17: {
        // 装备效果层写入:row=b, value=SHORT(cc)
        const stat = STAT_BY_ROW[b]
        const elem = ELEMENT_BY_ROW[b]
        const pool = MAXPOOL_BY_ROW[b]
        if (stat) out.effects.push({ kind: 'statBonus', stat, delta: signExtendI16(cc) })
        else if (elem) out.effects.push({ kind: 'resistance', element: elem, percent: signExtendI16(cc) })
        else if (pool) out.effects.push({ kind: 'maxPool', pool, delta: signExtendI16(cc) })
        else out.pending.push({ opcode: 0x17, operands: [a, b, cc], reason: `未知 row ${b}` })
        break
      }
      case 0x1a: {
        // set player stat:row=a, value=SHORT(b)
        if (a === 65) out.effects.push({ kind: 'grantSkill', skillId: String(b) }) // COOPERATIVE_MAGIC → 授合击/召唤(土灵珠 336)
        else if (a === 4) out.effects.push({ kind: 'attackAll' }) // ATTACK_ALL(长鞭系)
        else if (a === 1) out.pending.push({ opcode: 0x1a, operands: [a, b, cc], reason: '战斗精灵切换(battleSpriteNum 覆盖)—— 战斗系统期' })
        else out.pending.push({ opcode: 0x1a, operands: [a, b, cc], reason: `未知 row ${a}` })
        break
      }
      case 0x2d: {
        // 永久授状态(仙女剑系连击;rounds=32760 佩戴期恒在)
        const status = STATUS_BY_ID[a]
        if (status) out.effects.push({ kind: 'grantStatus', status })
        else out.pending.push({ opcode: 0x2d, operands: [a, b, cc], reason: `未知状态 id ${a}` })
        break
      }
      case 0x29: // 寿葫芦毒疗(正面"毒" 563/564)—— 毒系统未落地
        out.pending.push({ opcode: 0x29, operands: [a, b, cc], reason: '装备授毒(毒系统未落地)' })
        break
      case 167: // 块头标记(同 desc)
        break
      default:
        out.pending.push({ opcode: c.opcode ?? -1, operands: [a, b, cc], reason: '封闭集外 opcode' })
    }
  }
  return out
}

/** flags.equipableBy[6] → 角色 slug 列表。 */
export function mapEquipableBy(flags: readonly boolean[]): string[] {
  return ROLE_SLUGS.filter((_, i) => flags[i])
}

// ── 物品(M1a:表字段;M1b:equip;use/throw 留 M1d)──────────
export function mapItemsTable(items: readonly SourceItem[], descOf: (ip: number) => string[]): ItemData[] {
  return items.map((it) => ({
    id: String(it.id),
    name: it._name,
    desc: descOf(it.scriptDesc),
    icon: it.bitmap,
    buyPrice: it.price,
    sellPrice: Math.floor(it.price / 2), // 原版卖价 = 买价/2(sdlpal 商店惯例;demo 木剑 50/25 一致)
    sellable: it.flags.sellable,
  }))
}

// ── 汇总 ──────────────────────────────────────────────────
export interface MigrateSources {
  roles: SourceRole[]
  levelUpExp: number[]
  levelUpMagic: LevelUpMagicCell[][]
  spells: SourceSpell[]
  magic: SourceMagic[]
  items: SourceItem[]
  commands: SourceCmd[]
}
export interface MigrateOutput {
  actors: ActorDef[]
  sprites: SpriteDef[]
  skills: { skills: SkillData[]; levelUp: Record<string, LevelUpSkill[]> }
  items: ItemData[]
  /** name.<slug> → 显示名(并入工程 locale)。 */
  localeNames: Record<string, string>
  report: {
    pendingSkills: SkillMigrationResult['pending']
    blockedDescs: { kind: string; id: number; at: DescResult['blockedAt'] }[]
    /** M1b:装备链里翻不动的 op(战斗精灵切换/毒疗等)。 */
    pendingEquip: { itemId: number; name: string; ops: EquipTranslation['pending'] }[]
  }
}

export function migrateAll(src: MigrateSources): MigrateOutput {
  const labelIndex = buildLabelIndex(src.commands)
  const blockedDescs: MigrateOutput['report']['blockedDescs'] = []
  /** 按域包一层护栏记录(id = scriptDesc 的 ip,足以定位手修)。 */
  const descOf = (kind: string) => (ip: number): string[] => {
    const r = walkDesc(src.commands, labelIndex, ip)
    if (r.blockedAt) blockedDescs.push({ kind, id: ip, at: r.blockedAt })
    return r.lines
  }
  const magicById = new Map(src.magic.map((m) => [m.id, m]))
  const actors = src.roles.map((r) => mapActor(r, src.levelUpExp))
  const sprites = mapSprites(src.roles)
  const pure = mapPureSkills(src.spells, magicById, descOf('spell'))
  // curated 优先(已核真值);纯表批与 curated 无 id 交集(curated 三个都 scriptOnSuccess≠0),set 覆盖只是保险。
  const skillById = new Map<string, SkillData>()
  for (const s of pure.skills) skillById.set(s.id, s)
  for (const s of CURATED_SKILLS) skillById.set(s.id, s)
  // 物品:表字段(M1a)+ 装备效果(M1b:flags.equipable → translateEquipScript)
  const pendingEquip: MigrateOutput['report']['pendingEquip'] = []
  const itemsTable = mapItemsTable(src.items, descOf('item'))
  const items = itemsTable.map((base, i) => {
    const srcItem = src.items[i]!
    if (!srcItem.flags.equipable) return base
    const t = translateEquipScript(src.commands, labelIndex, srcItem.scriptOnEquip)
    if (t.pending.length) pendingEquip.push({ itemId: srcItem.id, name: srcItem._name, ops: t.pending })
    if (!t.slot) return base // 无 0x18 槽位(理论不会;进 pending 已记)
    return {
      ...base,
      equip: {
        slot: t.slot as NonNullable<ItemData['equip']>['slot'],
        equipableBy: mapEquipableBy(srcItem.flags.equipableBy),
        effects: t.effects,
      },
    }
  })
  const localeNames: Record<string, string> = {}
  src.roles.forEach((r) => {
    const slug = ROLE_SLUGS[r.id]
    if (slug) localeNames[`name.${slug}`] = r._name
  })
  return {
    actors,
    sprites,
    skills: { skills: [...skillById.values()], levelUp: mapLevelUp(src.levelUpMagic) },
    items,
    localeNames,
    report: { pendingSkills: pure.pending, blockedDescs, pendingEquip },
  }
}

/** 与 demo 手作条目合并:migrated 为主,demo 独有的(youhun/ghost 等)追加(id 去重)。 */
export function mergeExtras<T extends { id: string }>(migrated: T[], extras: T[]): T[] {
  const ids = new Set(migrated.map((x) => x.id))
  return [...migrated, ...extras.filter((x) => !ids.has(x.id))]
}
