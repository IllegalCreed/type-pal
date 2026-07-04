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
  HostileBehavior,
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
  flags: {
    usableOutsideBattle: boolean
    usableInBattle: boolean
    usableToEnemy: boolean
    applyToAll: boolean
  }
}
export interface SourceMagic {
  id: number
  type: string // normal / attackAll / attackField / attackWhole / applyToPlayer / applyToParty / summon / trance
  costMP: number
  baseDamage: number
  elemental: number
  effect: number
  // M4d-2b:动画播放参数(老 fixture 兼容全可选,缺省 0)
  xOffset?: number
  yOffset?: number
  speed?: number
  fireDelay?: number
  effectTimes?: number
  shake?: number
  sound?: number
}

/** MAGIC 表 → SkillAnimation(播放参数全带;attack 系落点同名,其余落目标处;M4d-2b)。 */
function mapAnimation(m: SourceMagic): SkillData['animation'] {
  const placement =
    m.type === 'attackAll' || m.type === 'attackWhole' || m.type === 'attackField'
      ? m.type
      : ('normal' as const)
  // 提取器部分 SHORT 字段存原始 WORD(如 xOffset 65530 = −6)→ 统一符号归一
  const i16 = (v: number | undefined): number => {
    const n = v ?? 0
    return n > 0x7fff ? n - 0x10000 : n
  }
  return {
    effectSprite: m.effect,
    placement,
    xOffset: i16(m.xOffset),
    yOffset: i16(m.yOffset),
    speed: i16(m.speed),
    fireDelay: m.fireDelay ?? 0,
    effectTimes: m.effectTimes ?? 0,
    shake: m.shake ?? 0,
    sound: m.sound ?? 0,
  }
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
  flags: {
    usable: boolean
    equipable: boolean
    throwable: boolean
    consuming: boolean
    applyToAll: boolean
    sellable: boolean
    equipableBy: boolean[]
  }
}
export type { SourceCmd } from './source-facts.js'
/** all.json 命令(disasm 只具名 end/goto/showDialog/giveItem,其余 raw)。 */
export {
  FACING_BY_DIR,
  partyPosToGrid,
  ROLE_SLUGS,
  sceneSlug,
  signExtendI16,
} from './source-facts.js'

import type {
  EnemyMigrationResult,
  SourceEnemy,
  SourceEnemyObject,
  SourceEnemyTeam,
} from './migrate-enemies.js'
import { mapEnemies, mapEnemyTeams } from './migrate-enemies.js'
import type { SourceCmd } from './source-facts.js'
import {
  FACING_BY_DIR,
  partyPosToGrid,
  ROLE_SLUGS,
  sceneSlug,
  signExtendI16,
} from './source-facts.js'
import type { TranslateReport } from './translate-events.js'
import { emptyTranslateReport, foldStages, translateStages } from './translate-events.js'
export interface LevelUpMagicCell {
  level: number
  magic: number
}

// ── 身份/槽位真值 ──────────────────────────────────────────
/** roleId → 语义 slug(原版 6 角色固定;roleId 3=巫后 4=阿奴,勿按 words 顺序重取——parser 已修对调)。 */

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
    // 头像组(C1):迁移填主头像(role.avatar);命名表情由编辑器人工加(原版无表情组数据)
    ...(role.avatar ? { portraits: { default: role.avatar } } : {}),
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
export function mapLevelUp(
  rows: readonly (readonly LevelUpMagicCell[])[],
): Record<string, LevelUpSkill[]> {
  const out: Record<string, LevelUpSkill[]> = {}
  const cols = rows[0]?.length ?? 0
  for (let col = 0; col < cols; col++) {
    const slug = ROLE_SLUGS[col]
    if (!slug) continue
    const list: LevelUpSkill[] = []
    for (const row of rows) {
      const cell = row[col]
      if (cell && cell.level > 0 && cell.magic > 0)
        list.push({ level: cell.level, skillId: String(cell.magic) })
    }
    if (list.length) out[slug] = list
  }
  return out
}

// ── 技能(M1a 纯表伤害 + M1c 线性脚本翻译)────────────────────
const TYPE_TARGET: Record<string, SkillData['target']> = {
  normal: 'oneEnemy',
  attackAll: 'allEnemies',
  attackField: 'allEnemies',
  attackWhole: 'allEnemies',
  applyToPlayer: 'oneAlly',
  applyToParty: 'allAllies',
}

/**
 * 原版状态数字 id → StatusId。四路交叉验证(2026-07-02):装备 0x2D[8]=仙女剑连击、
 * 金刚咒/真元护体 0x2D[6]=护体、天罡战气 0x2D[5]=狂勇、回梦 0x2E[2]=催眠 ——
 * 恰为 content StatusId 联合的声明顺序(skill.ts:16-25)。
 */
const STATUS_BY_NUM = [
  'confused',
  'paralyzed',
  'sleep',
  'silence',
  'puppet',
  'bravery',
  'protect',
  'haste',
  'dualAttack',
] as const

/** 0x30 buffStat 的 row → stat(PLAYERROLES_ROW 17/18/19/20)。 */
const BUFF_STAT_BY_ROW: Record<number, 'attack' | 'magic' | 'defense' | 'dexterity'> = {
  17: 'attack',
  18: 'magic',
  19: 'defense',
  20: 'dexterity',
}

export interface SkillScriptTranslation {
  effects: SkillData['effects']
  /** 有损点(如 0x68 敌方施法分支未表达)——按仓规:注释 + 报告钉住。 */
  lossyNotes: string[]
  /** 整技翻不动的原因(命中未支持 op → 保守整技 pending,不出半吊子)。 */
  pendingReason?: string
}

/**
 * M1c:静态翻译一条 scriptOnSuccess 链(线性数据 op → SkillEffect[])。
 * 语义源:magic-script.ts(0x1B/0x1C/0x22 场外实测)+ battle-opcodes.ts + skill-data-design。
 * 支持:0x1B healHp / 0x1C healMp / 0x22 revive(maxHP×op1/10)/ 0x2D·0x2E applyStatus /
 *      0x2F removeStatus / 0x2B·0x2C curePoison / 0x28·0x29 applyPoison / 0x6A steal /
 *      0x31 trance / 0x30 buffStat / 0x47 音效(表现层,忽略+注)/ 0x68 敌方分支头(跳过+有损注)/
 *      M1c-2 门:0x6 概率门 / 0x64 HP 阈值门 / 0x2E(turns=0)抗性掷门 / 0x60 即死 / 0x33 收宝 /
 *      goto 尾调用(共享子程序如 L_39349 清状态)跟进(访问集防环)。
 * 命中其它 op(0x35·0x6b·0x88 战斗公式等)→ 整技 pending。
 */
export function translateSkillScript(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
): SkillScriptTranslation {
  const out: SkillScriptTranslation = { effects: [], lossyNotes: [] }
  const start = ip === 0 ? undefined : labelIndex.get(`L_${ip}`)
  if (start === undefined) return { ...out, pendingReason: `L_${ip} 不存在` }
  const visited = new Set<number>()
  for (let i = start; i < commands.length; i++) {
    const c = commands[i]!
    if (c.op === 'end') return out
    if (c.op === 'goto') {
      // 尾调用跟进(灵血咒 → L_39349 共享清状态子程序);回访 = 真循环 → pending
      const to = c as unknown as { to?: string }
      const target = to.to ? labelIndex.get(to.to) : undefined
      if (target === undefined || visited.has(target))
        return { ...out, pendingReason: `goto ${to.to ?? '?'} 不可跟进(缺标签/回环)` }
      visited.add(target)
      i = target - 1
      continue
    }
    if (c.op !== 'raw') {
      if (c.label !== undefined && c.op === undefined) continue
      return { ...out, pendingReason: `非线性(${c.op})` }
    }
    const [a = 0, b = 0] = c.operands ?? []
    switch (c.opcode) {
      case 0x1b:
        out.effects.push({ kind: 'healHp', amount: signExtendI16(b) })
        break
      case 0x1c:
        out.effects.push({ kind: 'healMp', amount: signExtendI16(b) })
        break
      case 0x22:
        out.effects.push({ kind: 'revive', hpPercent: b * 10 }) // sdlpal script.c:1052 maxHP*op1/10
        break
      case 0x2d: {
        const status = STATUS_BY_NUM[a]
        if (!status) return { ...out, pendingReason: `0x2D 未知状态 id ${a}` }
        out.effects.push({ kind: 'applyStatus', status, turns: b })
        break
      }
      case 0x2f: {
        const status = STATUS_BY_NUM[a]
        if (!status) return { ...out, pendingReason: `0x2F 未知状态 id ${a}` }
        const prev = out.effects.find((e) => e.kind === 'removeStatus')
        if (prev && prev.kind === 'removeStatus') {
          if (!prev.statuses.includes(status)) prev.statuses.push(status)
        } else out.effects.push({ kind: 'removeStatus', statuses: [status] })
        break
      }
      case 0x2b:
        out.effects.push({ kind: 'curePoison', poisonId: String(b) })
        break
      case 0x2c:
        out.effects.push({ kind: 'curePoison', maxLevel: b }) // 灵血咒(解 ≤level 毒)
        break
      case 0x2e: {
        // 敌方上状态(自带抗性掷);turns=0 = 纯抗性掷门(夺魂 0x2E[0,0])
        if (b === 0) {
          out.effects.push({ kind: 'gate', magicResist: true })
          break
        }
        const status = STATUS_BY_NUM[a]
        if (!status) return { ...out, pendingReason: `0x2E 未知状态 id ${a}` }
        out.effects.push({ kind: 'applyStatus', status, turns: b })
        break
      }
      case 0x06:
        out.effects.push({ kind: 'gate', chance: a }) // 概率门(fail → 原版跳「无任何效果」)
        break
      case 0x64:
        out.effects.push({ kind: 'gate', hpAtMostPercent: a }) // HP%>a → 终止(灵葫咒处决条件)
        break
      case 0x60:
        out.effects.push({ kind: 'instantKill' })
        break
      case 0x33:
        out.effects.push({ kind: 'collectTreasure' })
        break
      case 0x28:
      case 0x29:
        out.effects.push({ kind: 'applyPoison', poisonId: String(b) })
        break
      case 0x6a:
        out.effects.push({ kind: 'steal', rate: a })
        break
      case 0x31:
        out.effects.push({ kind: 'trance', sprite: a })
        break
      case 0x30: {
        const stat = BUFF_STAT_BY_ROW[a]
        if (!stat) return { ...out, pendingReason: `0x30 未知 row ${a}` }
        out.effects.push({ kind: 'buffStat', stat, percent: b, duration: 'battle' })
        break
      }
      case 0x47: // 播放音效:表现层,SkillAnimation 暂无 sound 槽 → 忽略(将来加字段再回填)
        out.lossyNotes.push(`0x47 音效 ${a} 未表达(animation 无 sound 槽)`)
        break
      case 0x68: // 敌方施法分派头:敌用同技走 alt 脚本 —— 玩家侧效果照译,敌方变体待战斗期
        out.lossyNotes.push(`0x68 敌方施法分支(alt L_${a})未表达 —— 战斗期`)
        break
      case 167:
        break // 块头标记
      default:
        return {
          ...out,
          pendingReason: `op 0x${(c.opcode ?? 0).toString(16)} 超出线性集(概率门/阈值门/战斗公式 → M1c-2/战斗期)`,
        }
    }
  }
  return out
}

export interface SkillMigrationResult {
  skills: SkillData[]
  /** 未自动迁移的技能(概率/阈值门 → M1c-2;战斗公式/summon → 战斗期)。 */
  pending: { id: number; name: string; reason: string }[]
  /** 有损点(0x68 敌方分支/音效未表达)——skillId → notes。 */
  lossy: { id: number; name: string; notes: string[] }[]
}

/**
 * 技能全量迁移:纯表伤害(M1a)+ 线性脚本翻译(M1c)。
 * 原 demo curated 三技能(296/298/299)已被解析器取代 —— golden 测钉 diff 一致(75/220/500)。
 */
export function mapSkills(
  spells: readonly SourceSpell[],
  magicById: ReadonlyMap<number, SourceMagic>,
  descOf: (ip: number) => string[],
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
): SkillMigrationResult {
  const skills: SkillData[] = []
  const pending: SkillMigrationResult['pending'] = []
  const lossy: SkillMigrationResult['lossy'] = []
  for (const s of spells) {
    const m = magicById.get(s.magicNumber)
    if (!m) {
      pending.push({
        id: s.id,
        name: s._name,
        reason: `magicNumber ${s.magicNumber} 不在 magic.json`,
      })
      continue
    }
    if (m.type === 'summon') {
      pending.push({ id: s.id, name: s._name, reason: 'summon(godId 推导+整精灵替换)→ 战斗期' })
      continue
    }
    if (s.scriptOnUse !== 0) {
      pending.push({
        id: s.id,
        name: s._name,
        reason: `scriptOnUse=${s.scriptOnUse}(动态公式 0x35/0x88 系)→ 战斗期`,
      })
      continue
    }
    const target = m.type === 'trance' ? ('self' as const) : TYPE_TARGET[m.type]
    if (!target) {
      pending.push({ id: s.id, name: s._name, reason: `type=${m.type} 无 target 映射` })
      continue
    }
    let effects: SkillData['effects']
    if (s.scriptOnSuccess !== 0) {
      const t = translateSkillScript(commands, labelIndex, s.scriptOnSuccess)
      if (t.pendingReason) {
        pending.push({ id: s.id, name: s._name, reason: t.pendingReason })
        continue
      }
      if (t.effects.length === 0) {
        pending.push({ id: s.id, name: s._name, reason: 'scriptOnSuccess 空链(无效果 op)' })
        continue
      }
      if (t.lossyNotes.length) lossy.push({ id: s.id, name: s._name, notes: t.lossyNotes })
      effects = t.effects
    } else {
      effects = [{ kind: 'damage', power: m.baseDamage, elemental: m.elemental }]
    }
    skills.push({
      id: String(s.id),
      name: s._name,
      desc: descOf(s.scriptDesc).join('\n'),
      cost: { mp: m.costMP },
      usableOutsideBattle: s.flags.usableOutsideBattle,
      target,
      effects,
      animation: mapAnimation(m),
    })
  }
  return { skills, pending, lossy }
}

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
        else if (elem)
          out.effects.push({ kind: 'resistance', element: elem, percent: signExtendI16(cc) })
        else if (pool) out.effects.push({ kind: 'maxPool', pool, delta: signExtendI16(cc) })
        else out.pending.push({ opcode: 0x17, operands: [a, b, cc], reason: `未知 row ${b}` })
        break
      }
      case 0x1a: {
        // set player stat:row=a, value=SHORT(b)
        if (a === 65)
          out.effects.push({ kind: 'grantSkill', skillId: String(b) }) // COOPERATIVE_MAGIC → 授合击/召唤(土灵珠 336)
        else if (a === 4)
          out.effects.push({ kind: 'attackAll' }) // ATTACK_ALL(长鞭系)
        else if (a === 1)
          out.pending.push({
            opcode: 0x1a,
            operands: [a, b, cc],
            reason: '战斗精灵切换(battleSpriteNum 覆盖)—— 战斗系统期',
          })
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
        out.pending.push({
          opcode: c.opcode ?? -1,
          operands: [a, b, cc],
          reason: '封闭集外 opcode',
        })
    }
  }
  return out
}

/** flags.equipableBy[6] → 角色 slug 列表。 */
export function mapEquipableBy(flags: readonly boolean[]): string[] {
  return ROLE_SLUGS.filter((_, i) => flags[i])
}

// ── 使用效果翻译(M1d:scriptOnUse → UseSpec.effects)────────
// 2026-07-02 全量扫 100 条链分桶:~60 件纯数据 op 可自动;灵珠/剧情/蛊毒/遇敌香等系统未落地 → pending。

/** 0x19 永久成长的 row → stat(7/8 池上限 + 17-21 战斗属性)。 */
const PERM_STAT_BY_ROW: Record<
  number,
  'maxHP' | 'maxMP' | 'attack' | 'magicAttack' | 'defense' | 'speed' | 'luck'
> = {
  7: 'maxHP',
  8: 'maxMP',
  17: 'attack',
  18: 'magicAttack',
  19: 'defense',
  20: 'speed',
  21: 'luck',
}

export interface UseScriptTranslation {
  effects: NonNullable<ItemData['use']>['effects']
  lossyNotes: string[]
  pendingReason?: string
}

/**
 * 静态翻译一条 scriptOnUse 链(线性数据 op → ItemUseEffect[])。
 * 支持:0x1B/0x1C 回血蓝、0x1D 双回(茶叶蛋)、0x22 复活、0x2D applyStatus、0x2F removeStatus、
 *      0x2B/0x2C curePoison、0x29 applyPoison(毒食)、0x19 permanentStatBoost(舍利子/雪蛤蟆)、
 *      0x6 概率门(盐巴)、0x61/0x68 战斗分支头(跳过+有损注)、0x5 重绘/0x47 音效(表现层忽略)、
 *      goto 尾调用跟进。
 * 其余(灵珠 0x81/0x25 剧情、0x5D 毒杀、0x62/0x63 遇敌香、蛊系、引路蜂 0x38 等)→ 整件 pending。
 */
export function translateUseScript(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
): UseScriptTranslation {
  const out: UseScriptTranslation = { effects: [], lossyNotes: [] }
  const start = ip === 0 ? undefined : labelIndex.get(`L_${ip}`)
  if (start === undefined) return { ...out, pendingReason: `L_${ip} 不存在` }
  const visited = new Set<number>()
  for (let i = start; i < commands.length; i++) {
    const c = commands[i]!
    if (c.op === 'end') return out
    if (c.op === 'goto') {
      const to = c as unknown as { to?: string }
      const target = to.to ? labelIndex.get(to.to) : undefined
      if (target === undefined || visited.has(target))
        return { ...out, pendingReason: `goto ${to.to ?? '?'} 不可跟进` }
      visited.add(target)
      i = target - 1
      continue
    }
    if (c.op !== 'raw') {
      if (c.label !== undefined && c.op === undefined) continue
      return { ...out, pendingReason: `剧情类(${c.op})→ B2 脚本` }
    }
    const [a = 0, b = 0] = c.operands ?? []
    switch (c.opcode) {
      case 0x1b:
        out.effects.push({ kind: 'healHp', amount: signExtendI16(b) })
        break
      case 0x1c:
        out.effects.push({ kind: 'healMp', amount: signExtendI16(b) })
        break
      case 0x1d: // 同额双回(茶叶蛋 15/15)
        out.effects.push({ kind: 'healHp', amount: signExtendI16(b) })
        out.effects.push({ kind: 'healMp', amount: signExtendI16(b) })
        break
      case 0x22:
        out.effects.push({ kind: 'revive', hpPercent: b * 10 })
        break
      case 0x2d: {
        const status = STATUS_BY_NUM[a]
        if (!status) return { ...out, pendingReason: `0x2D 未知状态 id ${a}` }
        out.effects.push({ kind: 'applyStatus', status, turns: b })
        break
      }
      case 0x2f: {
        const status = STATUS_BY_NUM[a]
        if (!status) return { ...out, pendingReason: `0x2F 未知状态 id ${a}` }
        const prev = out.effects.find((e) => e.kind === 'removeStatus')
        if (prev && prev.kind === 'removeStatus') {
          if (!prev.statuses.includes(status)) prev.statuses.push(status)
        } else out.effects.push({ kind: 'removeStatus', statuses: [status] })
        break
      }
      case 0x2b:
        out.effects.push({ kind: 'curePoison', poisonId: String(b) })
        break
      case 0x2c:
        out.effects.push({ kind: 'curePoison', maxLevel: b })
        break
      case 0x29:
        out.effects.push({ kind: 'applyPoison', poisonId: String(b) })
        break
      case 0x19: {
        const stat = PERM_STAT_BY_ROW[a]
        if (!stat) return { ...out, pendingReason: `0x19 未知 row ${a}` }
        out.effects.push({ kind: 'permanentStatBoost', stat, delta: signExtendI16(b) })
        break
      }
      case 0x06:
        out.effects.push({ kind: 'gate', chance: a })
        break
      case 0x61: // 战斗内分支头(九阴散/毒龙胆):场外效果照译,战斗变体待战斗期
      case 0x68:
        out.lossyNotes.push(`0x${(c.opcode ?? 0).toString(16)} 战斗分支(L_${a})未表达 —— 战斗期`)
        break
      case 0x05: // 重绘画面(表现层)
      case 0x47: // 音效(表现层)
        break
      case 167:
        break
      default:
        return {
          ...out,
          pendingReason: `op 0x${(c.opcode ?? 0).toString(16)}(灵珠剧情/毒杀/遇敌香/蛊系等)→ 对应系统落地后`,
        }
    }
  }
  return out
}

// ── 物品(M1a:表字段;M1b:equip;use/throw 留 M1d)──────────
export function mapItemsTable(
  items: readonly SourceItem[],
  descOf: (ip: number) => string[],
): ItemData[] {
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
  enemies?: SourceEnemy[]
  enemyObjects?: SourceEnemyObject[]
  enemyTeams?: SourceEnemyTeam[]
}
export interface MigrateOutput {
  actors: ActorDef[]
  sprites: SpriteDef[]
  skills: { skills: SkillData[]; levelUp: Record<string, LevelUpSkill[]> }
  items: ItemData[]
  /** name.<slug> → 显示名(并入工程 locale)。 */
  localeNames: Record<string, string>
  /** M4a:敌人定义(enemies+enemy-objects 合并;无源时空数组)。 */
  enemies: EnemyDef[]
  /** M4b:敌队表(startBattle team 号查);无源时空数组。 */
  enemyTeams: EnemyTeamDef[]
  enemyReport?: EnemyMigrationResult['report']
  enemyTeamReport?: { total: number; danglingMember: string[] }
  report: {
    pendingSkills: SkillMigrationResult['pending']
    lossySkills: SkillMigrationResult['lossy']
    blockedDescs: { kind: string; id: number; at: DescResult['blockedAt'] }[]
    /** M1b:装备链里翻不动的 op(战斗精灵切换/毒疗等)。 */
    pendingEquip: { itemId: number; name: string; ops: EquipTranslation['pending'] }[]
    /** M1d:使用链整件翻不动的(灵珠剧情/毒杀/遇敌香/蛊系等)。 */
    pendingUse: { itemId: number; name: string; reason: string }[]
    /** M1d:使用链有损点(战斗分支头)。 */
    lossyUse: { itemId: number; name: string; notes: string[] }[]
  }
}

export function migrateAll(src: MigrateSources): MigrateOutput {
  const labelIndex = buildLabelIndex(src.commands)
  const blockedDescs: MigrateOutput['report']['blockedDescs'] = []
  /** 按域包一层护栏记录(id = scriptDesc 的 ip,足以定位手修)。 */
  const descOf =
    (kind: string) =>
    (ip: number): string[] => {
      const r = walkDesc(src.commands, labelIndex, ip)
      if (r.blockedAt) blockedDescs.push({ kind, id: ip, at: r.blockedAt })
      return r.lines
    }
  const magicById = new Map(src.magic.map((m) => [m.id, m]))
  const actors = src.roles.map((r) => mapActor(r, src.levelUpExp))
  const sprites = mapSprites(src.roles)
  const skillsRes = mapSkills(src.spells, magicById, descOf('spell'), src.commands, labelIndex)
  // 物品:表字段(M1a)+ 装备效果(M1b)+ 使用效果(M1d)
  const pendingEquip: MigrateOutput['report']['pendingEquip'] = []
  const pendingUse: MigrateOutput['report']['pendingUse'] = []
  const lossyUse: MigrateOutput['report']['lossyUse'] = []
  const itemsTable = mapItemsTable(src.items, descOf('item'))
  const items = itemsTable.map((base, i) => {
    const srcItem = src.items[i]!
    let out: ItemData = base
    if (srcItem.flags.equipable) {
      const t = translateEquipScript(src.commands, labelIndex, srcItem.scriptOnEquip)
      if (t.pending.length)
        pendingEquip.push({ itemId: srcItem.id, name: srcItem._name, ops: t.pending })
      if (t.slot) {
        out = {
          ...out,
          equip: {
            slot: t.slot as NonNullable<ItemData['equip']>['slot'],
            equipableBy: mapEquipableBy(srcItem.flags.equipableBy),
            effects: t.effects,
          },
        }
      }
    }
    if (srcItem.flags.usable) {
      const u = translateUseScript(src.commands, labelIndex, srcItem.scriptOnUse)
      if (u.pendingReason) {
        pendingUse.push({ itemId: srcItem.id, name: srcItem._name, reason: u.pendingReason })
      } else if (u.effects.length) {
        if (u.lossyNotes.length)
          lossyUse.push({ itemId: srcItem.id, name: srcItem._name, notes: u.lossyNotes })
        out = {
          ...out,
          use: {
            target: srcItem.flags.applyToAll ? ('allAllies' as const) : ('oneAlly' as const),
            consuming: srcItem.flags.consuming,
            effects: u.effects,
          },
        }
      } else {
        pendingUse.push({ itemId: srcItem.id, name: srcItem._name, reason: 'scriptOnUse 空链' })
      }
    }
    return out
  })
  const localeNames: Record<string, string> = {}
  src.roles.forEach((r) => {
    const slug = ROLE_SLUGS[r.id]
    if (slug) localeNames[`name.${slug}`] = r._name
  })
  // M4a/M4c:敌人(有源才迁;name.<enemy> + 战斗对白并入 locale;脚本翻译走 all.json labelAt)
  const enemyTctx = {
    labelAt: new Map([...labelIndex].map(([l, i]) => [l, { cmds: src.commands, idx: i }] as const)),
    locale: {} as Record<string, string>,
    report: emptyTranslateReport(),
  }
  const enemyRes =
    src.enemies && src.enemyObjects
      ? mapEnemies(src.enemies, src.enemyObjects, enemyTctx)
      : undefined
  if (enemyRes) {
    Object.assign(localeNames, enemyRes.localeNames)
    Object.assign(localeNames, enemyTctx.locale) // 战斗脚本对白(dlg.<idx>)
  }
  // M4c:敌用法术兜底补翻 —— 收集**翻译后规则里全部 cast id**(fallback magic + 0x67
  // 时间线设置的,如僵尸王 352;曾只收 fallback 漏 0x67 → 编辑器校验器抓出 23 处悬空)。
  // 这些对象在 mapSkills 被 scriptOnUse≠0(玩家使用门/动态公式)延后;敌施法无使用门,
  // 伤害走战斗期 calcMagicDamage:scriptOnSuccess 可翻则翻,否则 damage fallback。
  if (enemyRes) {
    const have = new Set(skillsRes.skills.map((s) => s.id))
    const used = [
      ...new Set(
        enemyRes.enemies.flatMap((e) =>
          (e.ai.rules ?? []).flatMap((r) => (r.do.kind === 'cast' ? [Number(r.do.skillId)] : [])),
        ),
      ),
    ]
    // (占位:敌用法术补翻移至 mapEnemies 之后 —— 见下方,须覆盖 0x67 时间线设置的法术)
    const spellById = new Map(src.spells.map((s) => [s.id, s]))
    for (const oid of used.sort((a, b) => a - b)) {
      if (have.has(String(oid))) continue
      const s = spellById.get(oid)
      const m = s ? magicById.get(s.magicNumber) : undefined
      if (!s || !m) {
        skillsRes.pending.push({
          id: oid,
          name: s?._name ?? `敌法术 ${oid}`,
          reason: '敌用法术不在 spells/magic 提取',
        })
        continue
      }
      let effects: SkillData['effects'] = [
        { kind: 'damage', power: m.baseDamage, elemental: m.elemental },
      ]
      if (s.scriptOnSuccess !== 0) {
        const t = translateSkillScript(src.commands, labelIndex, s.scriptOnSuccess)
        if (!t.pendingReason && t.effects.length) effects = t.effects
        else
          skillsRes.lossy.push({
            id: s.id,
            name: s._name,
            notes: [`敌用:scriptOnSuccess 不可翻(${t.pendingReason ?? '空链'}),落 damage fallback`],
          })
      }
      skillsRes.skills.push({
        id: String(s.id),
        name: s._name,
        desc: descOf('spell')(s.scriptDesc).join('\n'),
        cost: { mp: m.costMP },
        usableOutsideBattle: false,
        target: (m.type === 'trance' ? 'self' : TYPE_TARGET[m.type]) ?? 'oneEnemy',
        effects,
        animation: mapAnimation(m),
      })
    }
  }
  const teamRes =
    enemyRes && src.enemyTeams
      ? mapEnemyTeams(src.enemyTeams, new Set(enemyRes.enemies.map((e) => e.id)))
      : undefined
  return {
    actors,
    sprites,
    skills: { skills: skillsRes.skills, levelUp: mapLevelUp(src.levelUpMagic) },
    items,
    localeNames,
    enemies: enemyRes?.enemies ?? [],
    enemyTeams: teamRes?.teams ?? [],
    enemyReport: enemyRes?.report,
    enemyTeamReport: teamRes?.report,
    report: {
      pendingSkills: skillsRes.pending,
      lossySkills: skillsRes.lossy,
      blockedDescs,
      pendingEquip,
      pendingUse,
      lossyUse,
    },
  }
}

/** 与 demo 手作条目合并:migrated 为主,demo 独有的(youhun/ghost 等)追加(id 去重)。 */
export function mergeExtras<T extends { id: string }>(migrated: T[], extras: T[]): T[] {
  const ids = new Set(migrated.map((x) => x.id))
  return [...migrated, ...extras.filter((x) => !ids.has(x.id))]
}

// ════════════════════════════════════════════════════════════════════
// M2b · 场景静态迁移 + 窄扫描(见 scene-model-m2-design §4)
// 源:data/extracted/data/scene/<n>.json(295)+ events/scene-<nnn>.json(入口/音乐扫描)。
// 事实锚(2026-07-02 实测):实体 id 全局唯一;direction 0-3 = 下/左/上/右;
// loadScene 是具名 op 且 sceneId 已解析为 0-based;setPartyPos=raw 70;playMusic=raw 67。
// ════════════════════════════════════════════════════════════════════
import type { EnemyDef, EnemyTeamDef, SceneDef } from '@type-pal/content'
import { pixelToGrid } from '@type-pal/content'

export interface SourceEventObject {
  id: number
  x: number
  y: number
  spriteNum: number
  triggerMode?: number
  sState?: number
  sLayer?: number
  nSpriteFrames?: number
  nSpriteFramesAuto?: number
  direction?: number
  autoLabel?: string
  triggerLabel?: string
}
export interface SourceScene {
  sceneId: number
  mapNum: number
  onEnterLabel?: string
  onTeleportLabel?: string
  eventObjects: SourceEventObject[]
}

export interface SceneMigrationResult {
  scenes: SceneDef[]
  /** 实体引用到的原版精灵批量登记(npc-<num>;布局按 nSpriteFrames)。 */
  sprites: SpriteDef[]
  /** M3a 脚本翻译产出的文本(dlg./spk.;IO 壳并入工程 locale)。 */
  scriptLocale: Record<string, string>
  /** M3a 脚本翻译统计(覆盖缺口 → M3b/c 收敛清单)。 */
  scriptReport: TranslateReport
  report: {
    scenes: number
    entities: number
    /** spriteNum=0 纯触发区(脚本锚,M3 随脚本迁)。 */
    triggerZonesSkipped: number
    hidden: number
    entriesFound: number
    scenesWithStart: number
    scenesWithMusic: number
    /** entry 落图中心兜底的场景(无 start 无扫描入口)。 */
    entryFallback: string[]
    /** 同 spriteNum 不同 nSpriteFrames 的布局冲突(拆成 npc-<num>-f<n>)。 */
    layoutConflicts: string[]
    /** nSpriteFramesAuto>0 的环境自循环候选(布局先保守,C1 标注工具人工修)。 */
    autoLoopCandidates: number
    /** 朝向被 autoScript 链首覆盖(≠数据字段)的实体数。 */
    facingFromAuto: number
    /** spriteNum=0 且有触发脚本 → 迁成 zone 实体的数量(M3a)。 */
    zonesMigrated: number
    hostilesFolded?: number
  }
}

/**
 * 静态层 + 窄扫层一体:
 * - 实体:spriteNum>0 → EntityDef(pixelToGrid 坐标/朝向/hidden/collide/zBias/prop 精灵引用)。
 * - 入口:各源场景 events 里 setPartyPos(raw70)紧邻 loadScene(具名)→ 目标场景 entries[from-sNNN];
 *         自身 onEnter 链头 setPartyPos → entries.start。
 * - 音乐:onEnter 链头首个 playMusic(raw67)→ musicId。
 */
export function mapScenesStatic(
  srcScenes: readonly SourceScene[],
  eventsByScene: ReadonlyMap<number, readonly SourceCmd[]>,
  /** 角色本体精灵表(mapSprites 产物)。0x65 换精灵翻译:角色精灵优先复用其 id。 */
  roleSprites: readonly SpriteDef[] = [],
): SceneMigrationResult {
  const report: SceneMigrationResult['report'] = {
    scenes: 0,
    entities: 0,
    triggerZonesSkipped: 0,
    hidden: 0,
    entriesFound: 0,
    scenesWithStart: 0,
    scenesWithMusic: 0,
    entryFallback: [],
    layoutConflicts: [],
    autoLoopCandidates: 0,
    facingFromAuto: 0,
    zonesMigrated: 0,
    hostilesFolded: 0,
  }

  // ── 入口扫描:setPartyPos(raw70)在 loadScene 前 ≤4 步内。
  // ⚠ 实测(2026-07-02 gap 分布:806 个 loadScene,gap≤4 共 488):主流模式是
  // `setPartyPos → end → 0x50渐隐 → loadScene`——设位在前一链**末尾**,'end' 不隔断
  // 真实控制流,勿以 end 重置(初版此误杀 414 对)。gap>4(10 个)与无前置(231,
  // 沿用当前坐标的传送)不配对 → 归 M3。──
  const arrivals = new Map<number, { src: number; pos: ReturnType<typeof partyPosToGrid> }[]>()
  for (const [srcId, cmds] of eventsByScene) {
    let last: { pos: ReturnType<typeof partyPosToGrid>; at: number } | null = null
    cmds.forEach((c, i) => {
      if (c.op === 'raw' && c.opcode === 70) {
        const [a = 0, b = 0, h = 0] = c.operands ?? []
        last = { pos: partyPosToGrid(a, b, h), at: i }
        return
      }
      const target =
        (c as { op?: string; sceneId?: number }).op === 'loadScene'
          ? (c as { sceneId?: number }).sceneId
          : undefined
      if (typeof target === 'number') {
        if (last && i - last.at <= 4) {
          const list = arrivals.get(target) ?? []
          list.push({ src: srcId, pos: last.pos })
          arrivals.set(target, list)
          report.entriesFound++
        }
        last = null
      }
    })
  }

  // ── 每场景:onEnter 链头(自 events 文件的 label 索引)→ start 入口 + musicId ──
  const headScan = (sceneId: number, label: string | undefined) => {
    const out: { start?: ReturnType<typeof partyPosToGrid>; musicId?: number } = {}
    if (!label) return out
    const cmds = eventsByScene.get(sceneId)
    if (!cmds) return out
    const startIdx = cmds.findIndex((c) => c.label === label)
    if (startIdx < 0) return out
    for (let i = startIdx, steps = 0; i < cmds.length && steps < 8; i++, steps++) {
      const c = cmds[i]!
      if (c.op === 'end') break
      if (c.op === 'raw' && c.opcode === 167) continue
      if (c.op === 'raw' && c.opcode === 67) {
        out.musicId ??= c.operands?.[0]
        continue
      }
      if (c.op === 'raw' && c.opcode === 70) {
        const [a = 0, b = 0, h = 0] = c.operands ?? []
        out.start ??= partyPosToGrid(a, b, h)
        continue
      }
      break // 链头遇到其它 op(对话/演出)→ 停止窄扫,不猜控制流
    }
    return out
  }

  // ── autoScript 链首朝向折叠 ──
  // 原版 NPC 的**可见**朝向常由 autoScript 第一拍改写,数据字段 direction 不是真相
  // (2026-07-02 用户实测"全员朝向错";全库 527 对象链首改朝向,67 个与数据字段不同)。
  // sdlpal script.c 语义:0x0F[d,f] d≠0xFFFF→dir=d;0x14[f] 设帧且强制 dir=South(0)。
  // 中性略过 0x09 waitFrames / 0x87 animateObject(不动朝向);其余 op(走位/分支/goto)
  // = 动态行为,静态层不猜 → 停。上限 16 步防长链空转。
  // label → 指令数组+下标的全局索引:autoLabel 可指向共享段(events/shared.json,IO 壳以
  // key -1 挂入)或他场景段,勿只查本场景;地址型 label 全局唯一,重复出现内容相同,首见即用。
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  for (const cmds of eventsByScene.values())
    cmds.forEach((c, i) => {
      if (c.label && !labelAt.has(c.label)) labelAt.set(c.label, { cmds, idx: i })
    })
  const autoHeadFacing = (label: string | undefined): number | undefined => {
    if (!label) return undefined
    const at = labelAt.get(label)
    if (!at) return undefined
    const { cmds, idx: startIdx } = at
    let dir: number | undefined
    for (let i = startIdx, steps = 0; i < cmds.length && steps < 16; i++, steps++) {
      const c = cmds[i]!
      if (c.op !== 'raw') break // end 各变体/对话等具名 op → 停
      const [a = 0] = c.operands ?? []
      if (c.opcode === 0x09 || c.opcode === 0x87) continue
      if (c.opcode === 0x0f) {
        if (a !== 0xffff) dir = a
        continue
      }
      if (c.opcode === 0x14) {
        dir = 0
        continue
      }
      break
    }
    return dir
  }

  // ── 精灵登记(去重 + 布局冲突拆分)──
  const spriteDefs = new Map<string, SpriteDef>() // key = defId
  const primaryLayout = new Map<number, number>() // spriteNum → 首见 nSpriteFrames
  const spriteRef = (eo: SourceEventObject): string => {
    const n = eo.nSpriteFrames ?? 0
    const first = primaryLayout.get(eo.spriteNum)
    let defId = `npc-${eo.spriteNum}`
    if (first === undefined) {
      primaryLayout.set(eo.spriteNum, n)
    } else if (first !== n) {
      defId = `npc-${eo.spriteNum}-f${n}` // 同图不同布局:逃生口(设计 §2)
      if (!spriteDefs.has(defId)) report.layoutConflicts.push(defId)
    }
    if (!spriteDefs.has(defId)) {
      spriteDefs.set(defId, {
        id: defId,
        spriteNum: eo.spriteNum,
        label: `原精灵 ${eo.spriteNum}`,
        layout: n > 0 ? { kind: 'directional', framesPerDir: n } : { kind: 'static' },
      })
    }
    return defId
  }

  /**
   * 0x65(换角色精灵)的 spriteNum → 精灵 id:角色本体精灵优先(切回本体 = 角色 id),
   * 其余复用/补登记 npc-<num>。补登记按玩家精灵定式 directional 3 帧/向
   * (原版 rgwSpriteNum 全是 3 帧/向大世界精灵;0x15 的 wFrame=dir*3+gesture 同源)。
   */
  const spriteIdForNum = (num: number): string => {
    const role = roleSprites.find((s) => s.spriteNum === num)
    if (role) return role.id
    const defId = `npc-${num}`
    if (!spriteDefs.has(defId)) {
      primaryLayout.set(num, 3)
      spriteDefs.set(defId, {
        id: defId,
        spriteNum: num,
        label: `原精灵 ${num}(0x65 换装)`,
        layout: { kind: 'directional', framesPerDir: 3 },
      })
    }
    return defId
  }

  // ── M3a 脚本翻译上下文(触发链/onEnter → 结构化 stages;文本进 locale)──
  const tctx = {
    labelAt,
    locale: {} as Record<string, string>,
    report: emptyTranslateReport(),
    spriteIdForNum,
  }
  /** 原版 triggerMode → 触发口:1-3 = 按键交互(range=mode),4-8 = 走近自动(range=mode-4)。 */
  const triggerOf = (eo: SourceEventObject) => {
    const mode = eo.triggerMode ?? 0
    if (!eo.triggerLabel || mode <= 0 || mode > 8) return undefined
    const stages = translateStages(eo.triggerLabel, `e${eo.id}`, tctx)
    if (!stages?.length) return undefined
    return mode <= 3
      ? { on: 'interact' as const, range: mode, stages: foldStages(stages) }
      : { on: 'touch' as const, range: mode - 4, stages: foldStages(stages) }
  }
  /** M3b:autoScript 链 → auto 页(巡逻/环境动画;引擎循环跑,主脚本期间暂停)。 */
  const autoOf = (eo: SourceEventObject) => {
    if (!eo.autoLabel) return undefined
    const stages = translateStages(eo.autoLabel, `e${eo.id}`, tctx)
    return stages?.length ? { stages: foldStages(stages) } : undefined
  }

  /**
   * B9:识别「标准野怪遇敌模板」→ 折叠成 hostile 数据(引擎内置遇敌,不留脚本)。
   * 模板 = auto 首命令是 chasePlayer(或无 auto = 原地怪)+ trigger 首命令是 startBattle。
   * 命中 → 提取 team/chase/respawn/onLose 为数据,auto/trigger 页整体删除(消膨胀:
   * 数百份重复遇敌脚本 → 一个数据字段)。非标准(剧情怪)不折叠,保留脚本。
   */
  const hostileFold = (
    trigger: ReturnType<typeof triggerOf>,
    auto: ReturnType<typeof autoOf>,
  ): { hostile: HostileBehavior } | undefined => {
    const tstages = trigger?.stages
    const first = tstages?.[0]?.body?.[0]
    if (!first || first.kind !== 'startBattle') return undefined // trigger 非「开战起手」→ 剧情战,不折叠
    // trigger 全体必须只有遇敌套路命令(startBattle / vanishEntity / fade),含别的 = 特殊编排
    const encounterKinds = new Set(['startBattle', 'vanishEntity', 'fade'])
    const flat = (tstages ?? []).flatMap((s) => s.body)
    if (!flat.every((c) => encounterKinds.has(c.kind))) return undefined
    // auto:允许「纯 chasePlayer」或空;含别的巡逻演出 = 不折叠
    const achase = auto?.stages?.flatMap((s) => s.body) ?? []
    if (achase.length && !achase.every((c) => c.kind === 'chasePlayer')) return undefined
    const chaseCmd = achase.find((c) => c.kind === 'chasePlayer') as
      | { range?: number; speed?: number; floating?: boolean }
      | undefined
    const vanish = flat.find((c) => c.kind === 'vanishEntity') as { seconds?: number } | undefined
    const onLose = first.onLose // startBattle.onLose(GameOver 链 or 剧情)
    // onLose 是 gameOver 序列(渐红+读档)→ 归 'gameOver' 语义;否则保留命令
    const isGameOver = onLose?.some((c) => c.kind === 'loadLastSave')
    return {
      hostile: {
        team: first.team,
        ...(chaseCmd
          ? {
              chase: {
                range: chaseCmd.range ?? 8,
                speed: chaseCmd.speed ?? 4,
                ...(chaseCmd.floating ? { floating: true } : {}),
              },
            }
          : {}),
        ...(vanish?.seconds ? { respawnSeconds: vanish.seconds } : {}),
        ...(onLose && !isGameOver ? { onLose } : {}),
      },
    }
  }

  const scenes: SceneDef[] = srcScenes.map((sc) => {
    const slug = sceneSlug(sc.sceneId)
    const entities = []
    for (const eo of sc.eventObjects) {
      if (eo.spriteNum <= 0) {
        // 隐形触发区(门/脚本锚):有触发/自动脚本的迁成 zone 实体;纯占位跳过
        const trigger = triggerOf(eo)
        const auto = autoOf(eo)
        if (trigger || auto) {
          entities.push({
            id: `e${eo.id}`,
            pos: { ...pixelToGrid(eo.x, eo.y), height: 0 },
            zone: true as const,
            ...((eo.sState ?? 1) === 0 ? { hidden: true } : {}),
            pages: [{ ...(trigger ? { trigger } : {}), ...(auto ? { auto } : {}) }],
          })
          report.zonesMigrated++
        } else report.triggerZonesSkipped++
        continue
      }
      if ((eo.nSpriteFramesAuto ?? 0) > 0) report.autoLoopCandidates++
      const hidden = (eo.sState ?? 1) === 0
      if (hidden) report.hidden++
      report.entities++
      // 朝向:autoScript 链首覆盖 > 数据字段(?? 保 0:0x14 强制朝南须能盖掉数据 dir)
      const autoDir = autoHeadFacing(eo.autoLabel)
      if (autoDir !== undefined && autoDir !== (eo.direction ?? 0)) report.facingFromAuto++
      const dir = autoDir ?? eo.direction ?? 0
      const trigger = triggerOf(eo)
      const auto = autoOf(eo)
      // B9:标准遇敌模板折叠成 hostile 数据(命中则删 auto/trigger 页,消重复脚本膨胀)
      const folded = hostileFold(trigger, auto)
      if (folded) report.hostilesFolded = (report.hostilesFolded ?? 0) + 1
      entities.push({
        id: `e${eo.id}`,
        pos: { ...pixelToGrid(eo.x, eo.y), height: 0 },
        sprite: spriteRef(eo),
        ...(dir ? { facing: FACING_BY_DIR[dir] ?? 'down' } : {}),
        ...(hidden ? { hidden: true } : {}),
        ...((eo.sState ?? 0) >= 2 ? { collide: true } : {}),
        ...(eo.sLayer ? { zBias: eo.sLayer } : {}),
        ...(folded ??
          (trigger || auto
            ? { pages: [{ ...(trigger ? { trigger } : {}), ...(auto ? { auto } : {}) }] }
            : {})),
      })
    }
    const { start, musicId } = headScan(sc.sceneId, sc.onEnterLabel)
    if (start) report.scenesWithStart++
    if (musicId !== undefined) report.scenesWithMusic++
    const entries: NonNullable<SceneDef['entries']> = {}
    if (start) entries.start = { pos: start }
    const seen = new Map<number, number>()
    for (const a of arrivals.get(sc.sceneId) ?? []) {
      const k = (seen.get(a.src) ?? 0) + 1
      seen.set(a.src, k)
      // src<0 = 共享段(events/shared.json,key -1)里的传送 —— 真实入口但无来源场景
      const srcName = a.src >= 0 ? sceneSlug(a.src) : 'shared'
      entries[`from-${srcName}${k > 1 ? `-${k}` : ''}`] = { pos: a.pos }
    }
    const firstEntry = start ?? Object.values(entries)[0]?.pos
    if (!firstEntry) report.entryFallback.push(slug)
    report.scenes++
    // onEnter 脚本(进场剧情/音乐/战场配置;musicId/entries 窄扫描保留 —— loader/编辑器元数据)
    const onEnter = sc.onEnterLabel ? translateStages(sc.onEnterLabel, undefined, tctx) : undefined
    return {
      id: slug,
      map: { reuseOriginalMap: sc.mapNum },
      ...(musicId !== undefined ? { musicId } : {}),
      ...(Object.keys(entries).length ? { entries } : {}),
      entry: { pos: firstEntry ?? { ...pixelToGrid(1024, 1024), height: 0 }, facing: 'down' },
      entities,
      dialogues: [],
      ...(onEnter?.length ? { onEnter: foldStages(onEnter) } : {}),
    }
  })

  return {
    scenes,
    sprites: [...spriteDefs.values()],
    scriptLocale: tctx.locale,
    scriptReport: tctx.report,
    report,
  }
}
