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
  AssetId,
  EntityAddress,
  HostileBehavior,
  ItemData,
  LevelUpSkill,
  MigrationDiagnosticCategory,
  ScriptRef,
  SkillAnimation,
  SkillData,
  SpriteDef,
} from '@type-pal/content'
import {
  DEFAULT_SCRIPT_SHARDS,
  deriveScriptChunk,
  palFaceAssetId,
  palItemIconAssetId,
  palPortraitAssetId,
  palSpriteAssetId,
} from '@type-pal/content'
import {
  palPlayerBattleSpriteDefinitionId,
  palSummonBattleSpriteDefinitionId,
} from './pal-battle-sprites.js'
import {
  assertPalWorldSpriteLayoutOverlaySources,
  PAL_WORLD_SPRITE_LAYOUT_OVERLAYS,
  type PalWorldSpriteLayoutOverlay,
} from './pal-world-sprite-layouts.js'
import { resolveSoundAsset, type SoundAssetForNum } from './sound-migration.js'

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
  /** 合体技 obj-id(player-roles cooperativeMagic;0 = 无)。 */
  cooperativeMagic?: number
  /** 援护关系(player-roles rgwCoveredBy;存角色 index,0 = 李逍遥,合法)。 */
  coveredBy: number
  attackSound: number
  weaponSound: number
  criticalSound: number
  magicSound: number
  coverSound: number
  dyingSound: number
  deathSound: number
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
  /** wSummonEffect:summon 型的神将 F.MKF 精灵序(0-8);其余型无意义。 */
  special?: number
  // M4d-2b:动画播放参数(老 fixture 兼容全可选,缺省 0)
  xOffset?: number
  yOffset?: number
  speed?: number
  fireDelay?: number
  effectTimes?: number
  shake?: number
  wave?: number
  sound?: number
  /** wKeepEffect(0xFFFF = 特效末帧烙进战斗背景)。 */
  keepEffect?: number
}
export interface SourceObjectMagic {
  id: number
  magicNumber: number
  /** OBJECT_MAGIC flags；R13-3 用于交叉校验投掷的单体/全体源权威。 */
  flags?: SourceSpell['flags']
}

/** WORD → SHORT(负值补码;xOffset/召唤染色 wEffectTimes 等)。 */
const signedI16 = (v: number): number => (v > 0x7fff ? v - 0x10000 : v)

/** MAGIC 表 → SkillAnimation(播放参数全带;attack 系落点同名,其余落目标处;M4d-2b)。 */
export function mapSourceMagicAnimation(
  m: SourceMagic,
  soundAssetForNum?: SoundAssetForNum,
): SkillData['animation'] {
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
    wave: m.wave ?? 0,
    ...(resolveSoundAsset(m.sound, soundAssetForNum)
      ? { sound: resolveSoundAsset(m.sound, soundAssetForNum) }
      : {}),
    // 原 wKeepEffect==0xFFFF:特效末帧烙进战斗背景(万剑诀插剑入地等 12 招)
    ...(m.keepEffect === 0xffff ? { keepEffect: true } : {}),
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
  EnemyScriptTranslator,
  SourceEnemy,
  SourceEnemyObject,
  SourceEnemyTeam,
} from './migrate-enemies.js'
import { mapEnemies, mapEnemyTeams } from './migrate-enemies.js'
import { analyzeScriptGraph, type ScriptRoot } from './script-graph.js'
import { applyPalScriptOverlays } from './script-overlays.js'
import type { SourceCmd } from './source-facts.js'
import {
  FACING_BY_DIR,
  partyPosToGrid,
  ROLE_SLUGS,
  sceneSlug,
  signExtendI16,
} from './source-facts.js'
import type { TranslateCtx, TranslateReport } from './translate-events.js'
import {
  asBattleCfg,
  assertNoMigrationGaps,
  bindScriptStageInstructionOutcomeBody,
  copyScriptStageSourceAddressAudit,
  emptyTranslateReport,
  foldStages,
  recordMigrationGap,
  ScriptRegistry,
  scriptStageSourceAddresses,
  translateStages,
} from './translate-events.js'
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
export function mapActor(
  role: SourceRole,
  expTable: readonly number[],
  soundAssetForNum?: SoundAssetForNum,
): ActorDef {
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
    ...(role.avatar ? { portraits: { default: palPortraitAssetId(role.avatar) } } : {}),
    face: palFaceAssetId(slug),
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
      // 合体技 id(原版 player-roles cooperativeMagic obj-id = 合体仙术 skills.json id;0 = 无)
      ...((role.cooperativeMagic ?? 0) > 0
        ? { cooperativeMagicSkillId: String(role.cooperativeMagic) }
        : {}),
      // 援护关系(原版 player-roles rgwCoveredBy;B11-1 阵亡/濒死脚本与 B9 替挡都依赖它)
      coveredBy: ROLE_SLUGS[role.coveredBy],
      leveling: { expTable: [...expTable] },
      battleSprite: palPlayerBattleSpriteDefinitionId(role.spriteNumInBattle),
      // 战斗音效七件套(rgw*Sound 全量;演出层经 session opts 消费)
      sounds: Object.fromEntries(
        [
          ['attack', role.attackSound],
          ['critical', role.criticalSound],
          ['weapon', role.weaponSound],
          ['magic', role.magicSound],
          ['cover', role.coverSound],
          ['dying', role.dyingSound],
          ['death', role.deathSound],
        ].flatMap(([field, value]) => {
          const asset = resolveSoundAsset(value as number, soundAssetForNum)
          return asset ? [[field, asset]] : []
        }),
      ),
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
      asset: palSpriteAssetId(r.spriteNum),
      label: `${r._name}(大世界)`,
      layout: { kind: 'directional' as const, framesPerDir: r.walkFrames || 3 },
    }
  })
}

/**
 * 旧角色表中的 spriteNum 只允许在迁移边界解析一次。映射由 source role 与语义
 * SpriteDef.id 显式建立，不能从 AssetId/path 反推；同一旧编号若落到多个语义定义则
 * 无法替脚本猜测意图，必须 fail-loud。
 */
export function mapRoleSpriteIdsByNumber(
  roles: readonly SourceRole[],
  sprites: readonly SpriteDef[],
): ReadonlyMap<number, string> {
  const spritesById = new Map(sprites.map((sprite) => [sprite.id, sprite]))
  const result = new Map<number, string>()
  for (const role of roles) {
    const id = ROLE_SLUGS[role.id]
    if (!id) throw new Error(`mapRoleSpriteIdsByNumber: 未知 roleId ${role.id}`)
    const sprite = spritesById.get(id)
    if (!sprite) throw new Error(`mapRoleSpriteIdsByNumber: 角色 ${id} 缺少语义 SpriteDef`)
    const expectedAsset = palSpriteAssetId(role.spriteNum)
    if (sprite.asset !== expectedAsset)
      throw new Error(
        `mapRoleSpriteIdsByNumber: 角色 ${id} 的资源应为 ${expectedAsset}，实际 ${sprite.asset}`,
      )
    const existing = result.get(role.spriteNum)
    if (existing !== undefined && existing !== id)
      throw new Error(
        `mapRoleSpriteIdsByNumber: 旧精灵号 ${role.spriteNum} 同时对应 ${existing} 与 ${id}`,
      )
    result.set(role.spriteNum, id)
  }
  return result
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
  /** scriptOnSuccess 自带的表现音，覆盖 MAGIC 表动画音。 */
  sound?: AssetId
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
  soundAssetForNum?: SoundAssetForNum,
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
        out.effects.push({ kind: 'curePoison', curesTier: b >= 3 ? 'severe' : 'common' }) // 灵血咒:level→可解度语义(2→common/3→severe)
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
        out.effects.push({ kind: 'trance', battleSprite: palPlayerBattleSpriteDefinitionId(a) })
        break
      case 0x30: {
        const stat = BUFF_STAT_BY_ROW[a]
        if (!stat) return { ...out, pendingReason: `0x30 未知 row ${a}` }
        out.effects.push({ kind: 'buffStat', stat, percent: b, duration: 'battle' })
        break
      }
      case 0x47: {
        const sound = resolveSoundAsset(a, soundAssetForNum)
        if (!sound) break
        if (out.sound && out.sound !== sound)
          return { ...out, pendingReason: `多个不同 0x47 音效(${out.sound},${sound})` }
        out.sound = sound
        break
      }
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
 * 把玩家施法前的纯物品门迁成 SkillCost.items。
 *
 * PAL 的三条蛊术是同一形状：
 *   0x68[0]（敌方施法跳过玩家门）→ 0x20[item, amount, fail] → end
 * 这里按源形状识别而不是硬编码技能 id；任何多余副作用或控制流都会继续留在 pending。
 */
function translateSkillItemCostScript(
  commands: readonly SourceCmd[],
  labelIndex: ReadonlyMap<string, number>,
  entry: number,
): SkillData['cost']['items'] | undefined {
  let cursor = labelIndex.get(`L_${entry}`)
  if (cursor === undefined) return undefined
  const first = commands[cursor]
  if (first?.op === 'raw' && first.opcode === 0x68 && (first.operands?.[0] ?? 0) === 0) {
    cursor++
  }
  const remove = commands[cursor]
  const end = commands[cursor + 1]
  if (
    remove?.op !== 'raw' ||
    remove.opcode !== 0x20 ||
    end?.op !== 'end' ||
    (remove.operands?.[2] ?? 0) <= 0
  )
    return undefined
  const itemId = remove.operands?.[0] ?? 0
  const amount = remove.operands?.[1] || 1
  if (itemId <= 0 || amount <= 0) return undefined
  return [{ itemId: String(itemId), amount }]
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
  soundAssetForNum?: SoundAssetForNum,
  enableItemCosts = true,
  /**
   * R13-CANARY 父面冻结(R13-5 父源账 pin 86bbb33f 时代)酒神 lossy 备注文本。
   * JS1(19ce1ca7)把该文本改为"按剩余真气×8";该文本无条件进入 compacted
   * current migration 的 report.content.lossySkills → 父源账 digest 漂移。
   * 修复:只有 current-r13-6b(successor 面)用新文案,6A/历史面保留冻结旧文案
   * (Kimi K1 方案 2 face-gate / K4 冻结 artifact 不回填)。
   */
  palSemanticProfile?: 'historical-r13-4' | 'current-r13-6a' | 'current-r13-6b',
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
      // 战斗期已到(2026-07-05 召唤全链):summon = 神将演出(godId = wSummonEffect,F.MKF 神将
      // 精灵序 0-8:武神/天剑/雪妖/山神/风神/酒神/雷神/剑神/火神)+ 正常伤害结算(打全体)。
      // 酒神 baseDamage=3 是动态公式(原版 0x57:按剩余真气×8 并清空真气;R13-6B overlay
      // 已结构化落地)占位 → 历史源账 lossy 记账,待 R13-Z 证据绑定 successor target。
      if (s._name === '酒神')
        lossy.push({
          id: s.id,
          name: s._name,
          notes:
            palSemanticProfile === 'current-r13-6b'
              ? ['summon 伤害=按剩余真气×8 动态(原版 0x57 清空真气);暂按 baseDamage=3 直译']
              : ['summon 伤害=按饮酒动态(原版公式);暂按 baseDamage=3 直译'],
        })
      if (m.special === undefined)
        throw new Error(`召唤技能 ${s.id}(${s._name}) 缺 magic.special(godId)`)
      const summonBattleSprite = palSummonBattleSpriteDefinitionId(m.special)
      skills.push({
        id: String(s.id),
        name: s._name,
        desc: '', // 原版 desc = scriptDesc 脚本;召唤描述待手工(编辑器可编)
        cost: { mp: m.costMP },
        usableOutsideBattle: false,
        target: 'allEnemies',
        effects: [
          // speed = 神将现身段帧速(召唤自己的 wSpeed;fight.c:3170);
          // tint = 背景染色量(召唤**自己的** wEffectTimes SHORT,fight.c:3145;负=暗/正=亮)
          {
            kind: 'summon',
            battleSprite: summonBattleSprite,
            speed: m.speed,
            ...(signedI16(m.effectTimes ?? 0) !== 0 ? { tint: signedI16(m.effectTimes ?? 0) } : {}),
            // 召唤自身音(m.sound;变亮首帧播,fight.c:3112;animation.sound 是二级的)
            ...(resolveSoundAsset(m.sound, soundAssetForNum)
              ? { sound: resolveSoundAsset(m.sound, soundAssetForNum) }
              : {}),
          },
          { kind: 'damage', power: m.baseDamage, elemental: m.elemental },
        ],
        // ⚠ 召唤的 wEffect ≠ FIRE chunk:是**二次法术的 magic 表号**(fight.c:3098-3101 查
        // OBJECT.magic.wMagicNumber === wEffect → 播那条法术完整动画)。animation 整段取二次法术。
        animation: mapSourceMagicAnimation(magicById.get(m.effect) ?? m, soundAssetForNum),
      })
      continue
    }
    const itemCosts =
      enableItemCosts && s.scriptOnUse !== 0
        ? translateSkillItemCostScript(commands, labelIndex, s.scriptOnUse)
        : undefined
    if (s.scriptOnUse !== 0) {
      if (!itemCosts) {
        pending.push({
          id: s.id,
          name: s._name,
          reason: enableItemCosts
            ? `scriptOnUse=${s.scriptOnUse}(非纯物品门)→ 战斗期`
            : `scriptOnUse=${s.scriptOnUse}(动态公式 0x35/0x88 系)→ 战斗期`,
        })
        continue
      }
    }
    const target = m.type === 'trance' ? ('self' as const) : TYPE_TARGET[m.type]
    if (!target) {
      pending.push({ id: s.id, name: s._name, reason: `type=${m.type} 无 target 映射` })
      continue
    }
    let effects: SkillData['effects']
    let scriptSound: AssetId | undefined
    if (s.scriptOnSuccess !== 0) {
      const t = translateSkillScript(commands, labelIndex, s.scriptOnSuccess, soundAssetForNum)
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
      scriptSound = t.sound
    } else {
      effects = [{ kind: 'damage', power: m.baseDamage, elemental: m.elemental }]
    }
    skills.push({
      id: String(s.id),
      name: s._name,
      desc: descOf(s.scriptDesc).join('\n'),
      cost: { mp: m.costMP, ...(itemCosts ? { items: itemCosts } : {}) },
      usableOutsideBattle: s.flags.usableOutsideBattle,
      target,
      effects,
      animation: {
        ...mapSourceMagicAnimation(m, soundAssetForNum),
        ...(scriptSound ? { sound: scriptSound } : {}),
      },
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

/**
 * 装备"回补伪毒"→ clean regen 词条映射(原版借 level99 毒 563/564 省空间,正名为独立词条)。
 * 值 = 原版毒 DoT 脚本 0x1B/0x1C 的 operand(SSS chunk3 IP 40860/40858 = [_,20])。
 */
const EQUIP_PSEUDO_POISON_REGEN: Record<number, NonNullable<ItemData['equip']>['effects'][number]> =
  {
    563: { kind: 'regenHp', amount: 20 }, // 毒563 HP回补:0x1B[_,20]
    564: { kind: 'regenMp', amount: 20 }, // 毒564 MP回补:0x1C[_,20]
  }

/** 静态翻译一条 scriptOnEquip 链。slot 来自 0x18 的 operand0-0x0B(= EQUIP_INDEX_TO_SLOT 同源行序)。 */
export function translateEquipScript(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
  equipableBy: readonly string[],
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
        else if (a === 1) {
          if (b < 0 || b > 9)
            out.pending.push({
              opcode: 0x1a,
              operands: [a, b, cc],
              reason: `装备战斗精灵号 ${b} 不在 player fighter 0..9`,
            })
          else if (equipableBy.length === 0)
            out.pending.push({
              opcode: 0x1a,
              operands: [a, b, cc],
              reason: '装备战斗形象没有可装备角色，无法建立按角色覆写',
            })
          else {
            // 源数据只有单值，但它作用于物品 bitfield 允许的全部角色。重复写入时保留
            // 源脚本最后一次赋值，与原运行时逐条覆盖一致。
            out.effects = out.effects.filter((effect) => effect.kind !== 'battleSprite')
            out.effects.push({
              kind: 'battleSprite',
              byActor: Object.fromEntries(
                equipableBy.map((actorId) => [actorId, palPlayerBattleSpriteDefinitionId(b)]),
              ),
            })
          }
        } else out.pending.push({ opcode: 0x1a, operands: [a, b, cc], reason: `未知 row ${a}` })
        break
      }
      case 0x2d: {
        // 永久授状态(仙女剑系连击;rounds=32760 佩戴期恒在)
        const status = STATUS_BY_ID[a]
        if (status) out.effects.push({ kind: 'grantStatus', status })
        else out.pending.push({ opcode: 0x2d, operands: [a, b, cc], reason: `未知状态 id ${a}` })
        break
      }
      case 0x29: {
        // 装备授"毒"—— 原版把 寿葫芦每回合回血/回蓝借 level99 伪毒(563 HP/564 MP)实现,
        // 这是省空间拖鞋;clean 版正名为独立 regen 词条(值取原版毒脚本 0x1B/0x1C[_,20])。
        // 其它毒 id(真伤害毒的装备附毒)当前无实例 → 留 pending。
        const regen = EQUIP_PSEUDO_POISON_REGEN[b]
        if (regen) out.effects.push(regen)
        else
          out.pending.push({
            opcode: 0x29,
            operands: [a, b, cc],
            reason: `装备授毒 id ${b}(非回补伪毒)`,
          })
        break
      }
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
  sound?: AssetId
  lossyNotes: string[]
  pendingReason?: string
}

function unsupportedItemUseReason(opcode: number): string {
  switch (opcode) {
    case 0x20:
      return 'op 0x20（按材料数量分支）尚未转换为结构化物品用途'
    case 0x34:
      return 'op 0x34（灵葫资源炼丹）尚未转换为结构化物品用途'
    case 0x5c:
      return 'op 0x5c（队伍隐身回合）尚未转换为结构化物品用途'
    case 0x81:
      return 'op 0x81（面向场景对象触发剧情）需迁移为稳定共享脚本'
    case 0x84:
      return 'op 0x84（把使用物放置为场景对象）需迁移为稳定场景脚本'
    default:
      return `op 0x${opcode.toString(16)} 尚未转换为结构化物品用途`
  }
}

/** 迁移生成的物品用途脚本拥有稳定别名；底层 legacy target/SCC 如何重分片不外泄给物品。 */
export function migratedItemUseScriptRef(itemId: number | string): ScriptRef {
  // 迁移完成后这是作者可继续维护的一等共享脚本，而不是只能由运行时读取的内部别名。
  // 放进 shared/user 命名空间后，脚本库才能登记元数据，物品工作台也能可靠反跳并编辑。
  const id = `shared/user/pal-item-use/${itemId}`
  const chunk = deriveScriptChunk(id, DEFAULT_SCRIPT_SHARDS)
  if (!chunk) throw new Error(`物品用途脚本无法推导 chunk: ${id}`)
  return { chunk, id }
}

/**
 * 识别 0x20 “有任一材料就扣除并跳到同一产物段”的有序配方形状。
 * PAL 炼蛊皿只是该形状的一条源数据；产物、材料和优先级全部从命令流提取。
 */
export function translateCraftRecipeScript(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
): NonNullable<ItemData['use']>['effects'][number] | undefined {
  let cursor = labelIndex.get(`L_${ip}`)
  if (cursor === undefined) return undefined
  const seen = new Set<number>()
  const ingredients: Array<{ itemId: string; count: number }> = []
  let productStart: number | undefined

  while (cursor !== undefined && !seen.has(cursor)) {
    seen.add(cursor)
    const command = commands[cursor]
    if (command?.op !== 'raw' || command.opcode !== 0x20) break
    const [itemId = 0, rawCount = 0, failureAddress = 0] = command.operands ?? []
    if (itemId <= 0 || failureAddress <= 0) return undefined
    const next = commands[cursor + 1] as (SourceCmd & { to?: string }) | undefined
    const successStart = next?.op === 'goto' && next.to ? labelIndex.get(next.to) : cursor + 1
    if (successStart === undefined) return undefined
    if (productStart === undefined) productStart = successStart
    else if (productStart !== successStart) return undefined
    ingredients.push({ itemId: String(itemId), count: Math.max(1, rawCount) })

    const failure = labelIndex.get(`L_${failureAddress}`)
    const failureCommand = failure === undefined ? undefined : commands[failure]
    if (failureCommand?.op === 'raw' && failureCommand.opcode === 0x20) cursor = failure
    else break
  }

  if (!ingredients.length || productStart === undefined) return undefined
  const products: Array<{ itemId: string; count: number }> = []
  for (let index = productStart; index < commands.length; index++) {
    const command = commands[index] as (SourceCmd & { itemId?: number; count?: number }) | undefined
    if (command?.op !== 'giveItem') break
    if ((command.itemId ?? 0) <= 0) return undefined
    products.push({
      itemId: String(command.itemId),
      count: command.count === 0 ? 1 : (command.count ?? 1),
    })
  }
  if (!products.length) return undefined
  return {
    kind: 'craftRecipe',
    recipes: ingredients.map((ingredient) => ({ ingredients: [ingredient], products })),
  }
}

/**
 * 识别原版 0x84“把指定场景对象放到队伍前方”的完整事务形状。
 * 成功直接结束；失败臂只负责旁白提示和 0x41 终止，不能把失败对白并进成功效果。
 */
export function translatePlaceEntityInFrontUseScript(
  commands: readonly SourceCmd[],
  labelIndex: ReadonlyMap<string, number>,
  ip: number,
  legacyEntityAddresses?: ReadonlyMap<number, EntityAddress>,
): NonNullable<ItemData['use']>['effects'][number] | undefined {
  const start = labelIndex.get(`L_${ip}`)
  if (start === undefined) return undefined
  const command = commands[start]
  if (command?.op !== 'raw' || command.opcode !== 0x84) return undefined
  const [legacyTarget = 0, rawState = 0, failureAddress = 0] = command.operands ?? []
  const target = legacyEntityAddresses?.get(legacyTarget)
  if (!target || failureAddress <= 0) return undefined
  if (commands[start + 1]?.op !== 'end') return undefined
  const failure = labelIndex.get(`L_${failureAddress}`)
  if (failure === undefined) return undefined
  const style = commands[failure]
  const message = commands[failure + 1] as (SourceCmd & { text?: string }) | undefined
  const stop = commands[failure + 2]
  const end = commands[failure + 3]
  if (
    style?.op !== 'setDialogStyleNarration' ||
    message?.op !== 'showDialog' ||
    typeof message.text !== 'string' ||
    message.text.trim().length === 0 ||
    stop?.op !== 'raw' ||
    stop.opcode !== 0x41 ||
    end?.op !== 'end'
  )
    return undefined
  return {
    kind: 'placeEntityInFront',
    target: structuredClone(target),
    state: signExtendI16(rawState),
    unavailableMessage: message.text.trim(),
  }
}

/** 当前完整脚本翻译器可安全承接的物品长用途根；其余继续显式诊断，不生成半截脚本。 */
export function shouldMigrateUseAsSharedScript(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
): boolean {
  let index = labelIndex.get(`L_${ip}`)
  if (index === undefined) return false
  while (index < commands.length) {
    const command = commands[index]!
    if (command.op === 'raw' && (command.opcode === 0x05 || command.opcode === 167)) {
      index++
      continue
    }
    if (command.op === 'raw' && command.opcode === 0x81) {
      // 场景祭坛式用途：面向实体门后还会检查多个实体状态并切场景。普通“拿道具对
      // NPC 使用”的 0x81 链可能换装到未登记资源，仍保留诊断，不能生成半截脚本。
      const window = commands.slice(index + 1, index + 32)
      return (
        window.some((next) => next.op === 'raw' && next.opcode === 0x94) &&
        window.some((next) => next.op === 'loadScene')
      )
    }
    return command.op === 'showDialog' || command.op?.startsWith('setDialogStyle') === true
  }
  return false
}

/**
 * 静态翻译一条 scriptOnUse 链(线性数据 op → ItemUseEffect[])。
 * 支持:0x1B/0x1C 回血蓝、0x1D 双回(茶叶蛋)、0x22 复活、0x2D applyStatus、0x2F removeStatus、
 *      0x2B/0x2C curePoison、0x29 applyPoison(毒食)、0x19 permanentStatBoost(舍利子/雪蛤蟆)、
 *      0x6 概率门(盐巴)、0x61/0x68 战斗分支头(跳过+有损注)、0x38 传送出口(引路蜂/土灵珠)、
 *      0x5 重绘/0x47 音效/0xA1 trail 收拢(表现层忽略)、goto 尾调用跟进。
 * 其余(灵珠 0x81/0x25 剧情、0x5D 毒杀、0x62/0x63 遇敌香、蛊系等)→ 整件 pending。
 */
export function translateUseScript(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
  soundAssetForNum?: SoundAssetForNum,
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
        out.effects.push({ kind: 'curePoison', curesTier: b >= 3 ? 'severe' : 'common' })
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
      case 0x61: // 毒龙胆/九阴散:没中毒则秒杀自己(gate 效果;后接解毒/回血续跑)
        out.effects.push({ kind: 'dieIfNotPoisoned' })
        break
      case 0x5a:
        out.effects.push({ kind: 'scaleCurrentHp', numerator: 1, denominator: 2 })
        break
      case 0x62:
      case 0x63:
        out.effects.push({
          kind: 'modifyHostileAwareness',
          rangeMultiplier: c.opcode === 0x62 ? 0 : 3,
          durationMs: a * 100,
        })
        break
      case 0x8d:
        out.effects.push({ kind: 'levelUp', levels: Math.max(1, a) })
        break
      case 0x38: // 引路蜂:调用当前场景具名出口；目的地/前置判断属于 SceneDef.onTeleport。
        out.effects.push({
          kind: 'runSceneHook',
          hook: 'onTeleport',
          unavailableMessage: '无任何效果',
        })
        break
      case 0x17: {
        // SetPlayerExtraAttribute(仅大蒜用):operand[0]=17→Extra 层 6,operand[1]=22=毒抗行
        //(PLAYERROLES rgwPoisonResistance),operand[2]=值。临时毒抗 Extra(三件套 RemoveEquipExtra 清)。
        // 其余属性行未落地 → pending(不建通用 Extra 系统,仅靶向毒抗一件)。
        const val = signExtendI16(c.operands?.[2] ?? 0)
        if (a === 17 && b === 22) out.effects.push({ kind: 'extraPoisonRes', amount: val })
        else return { ...out, pendingReason: `0x17 未支持的 Extra 属性(层${a - 0xb} 行${b})` }
        break
      }
      case 0x68:
        out.lossyNotes.push(`0x${(c.opcode ?? 0).toString(16)} 战斗分支(L_${a})未表达 —— 战斗期`)
        break
      case 0x05: // 重绘画面(表现层)
      case 0xa1: // 跟随者 trail 收拢到队首(传送后表现;demo 单队列无操作)
        break
      case 0x47: {
        const sound = resolveSoundAsset(a, soundAssetForNum)
        if (!sound) break
        if (out.sound && out.sound !== sound)
          return { ...out, pendingReason: `多个不同 0x47 音效(${out.sound},${sound})` }
        out.sound = sound
        break
      }
      case 167:
        break
      default:
        return {
          ...out,
          pendingReason: unsupportedItemUseReason(c.opcode ?? 0),
        }
    }
  }
  return out
}

/** 六大毒药(item id → 本毒 id):对己 use = 相克三段链,整链 = applyPoison(本毒);相克/致死走 PoisonDef 数据。 */
const POISON_ITEM_SELF: Record<number, number> = {
  122: 556, // 鹤顶红
  123: 557, // 孔雀胆
  124: 558, // 血海棠
  125: 559, // 断肠草
  138: 555, // 三尸蛊
  139: 560, // 金蚕蛊
}

/**
 * 静态翻译一条 scriptOnThrow 链(投掷对敌:0x28 下毒 → applyPoison)。
 * 基础层只接下毒/下蛊(食妖虫/毒药);相生相克/致死(0x5D/5E 查毒 + 0x2B 解 + 0x5F/60 秒杀)
 * = 数据层(counters/lethalPairs)后续接,此处遇到留 pending。
 */
export function translateThrowScript(
  commands: readonly SourceCmd[],
  labelIndex: Map<string, number>,
  ip: number,
  soundAssetForNum?: SoundAssetForNum,
  magicPresentationForObject?: (
    objectId: number,
  ) => NonNullable<NonNullable<ItemData['throw']>['presentation']> | undefined,
): {
  effects: NonNullable<ItemData['throw']>['effects']
  sound?: AssetId
  presentation?: NonNullable<ItemData['throw']>['presentation']
  pendingReason?: string
} {
  const effects: NonNullable<ItemData['throw']>['effects'] = []
  let sound: AssetId | undefined
  let presentation: NonNullable<ItemData['throw']>['presentation'] | undefined
  const complete = () => ({
    effects,
    ...(sound ? { sound } : {}),
    ...(presentation ? { presentation } : {}),
  })
  const start = ip === 0 ? undefined : labelIndex.get(`L_${ip}`)
  if (start === undefined) return { effects, pendingReason: `L_${ip} 不存在` }
  for (let i = start; i < commands.length; i++) {
    const c = commands[i]!
    if (c.op === 'end') return complete()
    if (c.op !== 'raw') {
      if (c.label !== undefined && c.op === undefined) continue
      return { effects, pendingReason: `剧情类(${c.op})→ B2 脚本` }
    }
    const [a = 0, b = 0, d = 0] = c.operands ?? []
    switch (c.opcode) {
      case 0x28: // 对敌下毒/下蛊
        effects.push({ kind: 'applyPoison', poisonId: String(b) })
        break
      case 0x5e: // 查敌是否中配对毒 —— 致死关系已数据化进 PoisonDef.lethalWith,运行时判,此处跳
      case 0x60: // 秒杀敌(致死达成)—— 同上
        break
      case 0x42: {
        // PAL_BattleSimulateMagic：它是与 gameplay effects 解耦的命中特效。
        // 仅零强度/零附加参数能安全归为纯演出；其余必须留诊断，不能吞掉潜在伤害。
        if (b !== 0 || d !== 0)
          return {
            ...complete(),
            pendingReason: `0x42[${a},${b},${d}] 含非零玩法参数，拒绝降级为纯演出`,
          }
        const next = magicPresentationForObject?.(a)
        // C8 只 materialize 能由 MAGIC sentinel 证明为零伤害的 OffMagic 表现。
        // 其他 0x42 沿用既有 gameplay 翻译边界，不能因本次增加 presentation 而删掉
        // 后续已迁移的施毒/固定伤害链；它们的通用模拟法术伤害另开能力卡处理。
        if (magicPresentationForObject && !next) break
        if (next) {
          if (presentation && JSON.stringify(presentation) !== JSON.stringify(next))
            return { ...complete(), pendingReason: '投掷链含多个不同魔法演出' }
          presentation = next
        }
        break
      }
      case 0x05:
      case 167:
        break
      case 0x5b:
        effects.push({
          kind: 'currentHpDamage',
          numerator: 1,
          denominator: 2,
          bonus: 1,
          cap: c.operands?.[0] ?? 0,
        })
        break
      case 0x47: {
        const next = resolveSoundAsset(c.operands?.[0], soundAssetForNum)
        if (!next) break
        if (sound && sound !== next)
          return { effects, sound, pendingReason: `多个不同 0x47 音效(${sound},${next})` }
        sound = next
        break
      }
      default:
        // 相克(0x5D/0x2B use-on-self 以毒攻毒)+ 其它 → 相克 use 层后续
        return {
          effects,
          pendingReason: `op 0x${(c.opcode ?? 0).toString(16)}(相克 use 链)→ 相克 use 层`,
        }
    }
  }
  return complete()
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
    ...(it.bitmap > 0 ? { icon: palItemIconAssetId(it.bitmap) } : {}),
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
  /** PAL OBJECT 表里的魔法对象号 → MAGIC 表号；0x42 投掷演出使用。 */
  objectMagics?: SourceObjectMagic[]
  items: SourceItem[]
  commands: SourceCmd[]
  enemies?: SourceEnemy[]
  enemyObjects?: SourceEnemyObject[]
  enemyTeams?: SourceEnemyTeam[]
  /** 资源池用途的奖励表来源；PAL 生产迁移注入 stores.json，窄 fixture 可缺省。 */
  stores?: Array<{ id: number; items: number[] }>
  /** 生产迁移由 sound catalog 注入；fixture 缺省按正整数确定性映射。 */
  soundAssetForNum?: SoundAssetForNum
  /** 原版 1-based EventObject 号到稳定场景实体地址；仅场景放置用途需要。 */
  legacyEntityAddresses?: ReadonlyMap<number, EntityAddress>
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
    pendingUse: {
      itemId: number
      name: string
      reason: string
      category: MigrationDiagnosticCategory
      sourceLabel: string
      sourceAddress: number
    }[]
    /** M1d 投掷链翻不动的(相生相克/致死 → 相克数据层)。 */
    pendingThrow: { itemId: number; name: string; reason: string }[]
    /** M1d:使用链有损点(战斗分支头)。 */
    lossyUse: { itemId: number; name: string; notes: string[] }[]
  }
}

export interface EnemyMigrationAuthority {
  /** 缺省 current-v10；历史 parent 必须显式传冻结 translator。 */
  translateScripts: EnemyScriptTranslator
  /** R13-confirm parent 只收集 ai.rules；current-v10 还收 fallback 与 hook setFallback。 */
  castSkillClosure: 'rules-only' | 'v10'
  /** 历史 v9 report 不含 R13-5 hookSources 证据字段。 */
  reportHookSources: boolean
}

export interface MigrateAllOptions {
  /** R13-6A 之前这三条玩家物品门仍是 pending；历史 R13-5 重放必须固定旧口径。 */
  skillItemCosts?: boolean
  /** 与场景翻译共用的 PAL 历史/current 语义隔离。 */
  palSemanticProfile?: 'historical-r13-4' | 'current-r13-6a' | 'current-r13-6b'
  /** 冻结历史 authority 的 PAL 引用形状；当前产品保持 stable-id。 */
  palReferenceSchema?: 'legacy' | 'stable-id'
}

export function migrateAll(
  src: MigrateSources,
  enemyAuthority?: EnemyMigrationAuthority,
  options: MigrateAllOptions = {},
): MigrateOutput {
  const labelIndex = buildLabelIndex(src.commands)
  const explicitLabels = new Set(labelIndex.keys())
  src.commands.forEach((command, address) => {
    const expected = `L_${address}`
    if (command.label !== undefined && command.label !== expected)
      throw new Error(
        `all.json 显式 label 与数组地址不一致: index=${address}, label=${command.label}`,
      )
    if (!labelIndex.has(expected)) labelIndex.set(expected, address)
  })
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
  const objectMagicById = new Map((src.objectMagics ?? []).map((magic) => [magic.id, magic]))
  const throwMagicPresentation = (
    objectId: number,
  ): NonNullable<NonNullable<ItemData['throw']>['presentation']> | undefined => {
    const object = objectMagicById.get(objectId)
    const magic = object ? magicById.get(object.magicNumber) : undefined
    if (
      !magic ||
      signedI16(magic.baseDamage) >= 0 ||
      magic.elemental !== 0 ||
      magic.type === 'summon'
    )
      return undefined
    const animation: SkillAnimation = {
      ...mapSourceMagicAnimation(magic, src.soundAssetForNum),
      ...(signedI16(magic.special ?? 0) !== 0
        ? { layerOffset: signedI16(magic.special ?? 0) }
        : {}),
    }
    return { kind: 'magic', animation }
  }
  const actors = src.roles.map((r) => mapActor(r, src.levelUpExp, src.soundAssetForNum))
  const sprites = mapSprites(src.roles)
  const skillsRes = mapSkills(
    src.spells,
    magicById,
    descOf('spell'),
    src.commands,
    labelIndex,
    src.soundAssetForNum,
    options.skillItemCosts ?? true,
    options.palSemanticProfile,
  )
  // 物品:表字段(M1a)+ 装备效果(M1b)+ 使用效果(M1d)
  const pendingEquip: MigrateOutput['report']['pendingEquip'] = []
  const pendingUse: MigrateOutput['report']['pendingUse'] = []
  const recordPendingUse = (item: SourceItem, reason: string): void => {
    const opcode = /^op 0x([0-9a-f]+)/i.exec(reason)?.[1]
    const isStoryOpcode = opcode === '81' || opcode === '84'
    const category: MigrationDiagnosticCategory = reason.includes('Store')
      ? 'missing-source-data'
      : isStoryOpcode || reason.includes('剧情') || reason.includes('B2')
        ? 'story-script'
        : reason.includes('空链')
          ? 'empty-script'
          : /(?:opcode|op\s*0x|0x[0-9a-f]+)/i.test(reason)
            ? 'unsupported-command'
            : 'manual-review'
    pendingUse.push({
      itemId: item.id,
      name: item._name,
      reason,
      category,
      sourceLabel: `L_${item.scriptOnUse}`,
      sourceAddress: item.scriptOnUse,
    })
  }
  const pendingThrow: MigrateOutput['report']['pendingThrow'] = []
  const lossyUse: MigrateOutput['report']['lossyUse'] = []
  const itemsTable = mapItemsTable(src.items, descOf('item'))
  const items = itemsTable.map((base, i) => {
    const srcItem = src.items[i]!
    let out: ItemData = base
    if (srcItem.flags.equipable) {
      const equipableBy = mapEquipableBy(srcItem.flags.equipableBy)
      const t = translateEquipScript(src.commands, labelIndex, srcItem.scriptOnEquip, equipableBy)
      if (t.pending.length)
        pendingEquip.push({ itemId: srcItem.id, name: srcItem._name, ops: t.pending })
      if (t.slot) {
        out = {
          ...out,
          equip: {
            slot: t.slot as NonNullable<ItemData['equip']>['slot'],
            equipableBy,
            effects: t.effects,
          },
        }
      }
    }
    if (srcItem.flags.usable) {
      const placementEffect = translatePlaceEntityInFrontUseScript(
        src.commands,
        labelIndex,
        srcItem.scriptOnUse,
        src.legacyEntityAddresses,
      )
      const recipeEffect = translateCraftRecipeScript(src.commands, labelIndex, srcItem.scriptOnUse)
      const useStart = labelIndex.get(`L_${srcItem.scriptOnUse}`)
      const useHead = useStart === undefined ? undefined : src.commands[useStart]
      const poolRewards = src.stores?.find((store) => store.id === 0)?.items ?? []
      const isResourcePool = useHead?.op === 'raw' && useHead.opcode === 0x34
      const useSharedScript = shouldMigrateUseAsSharedScript(
        src.commands,
        labelIndex,
        srcItem.scriptOnUse,
      )
      const u = translateUseScript(
        src.commands,
        labelIndex,
        srcItem.scriptOnUse,
        src.soundAssetForNum,
      )
      // 六大毒药对己 use = 相克三段链(0x5D 查我毒 + 0x2B 解 / 0x5F 秒 / 0x29 下本毒),整链 =
      // applyPoison(本毒)——相克/致死靠 PoisonDef.counters/lethalWith 数据(不硬码)。own = 投掷毒。
      const selfPoison = POISON_ITEM_SELF[srcItem.id]
      if (placementEffect) {
        out = {
          ...out,
          use: {
            target: 'scene',
            consuming: srcItem.flags.consuming,
            effects: [placementEffect],
            menuAfterUse: 'close',
          },
        }
      } else if (selfPoison !== undefined) {
        out = {
          ...out,
          use: {
            target: 'oneAlly' as const,
            consuming: srcItem.flags.consuming,
            effects: [{ kind: 'applyPoison', poisonId: String(selfPoison) }],
          },
        }
      } else if (recipeEffect) {
        out = {
          ...out,
          use: {
            target: 'scene',
            consuming: srcItem.flags.consuming,
            effects: [recipeEffect],
          },
        }
      } else if (isResourcePool && poolRewards.length > 0) {
        out = {
          ...out,
          use: {
            target: 'scene',
            consuming: srcItem.flags.consuming,
            effects: [
              {
                kind: 'drawFromResourcePool',
                resource: 'collectValue',
                maxRoll: poolRewards.length,
                rewards: poolRewards.map((itemId) => ({ itemId: String(itemId), count: 1 })),
              },
            ],
          },
        }
      } else if (useSharedScript) {
        out = {
          ...out,
          use: {
            target: 'scene',
            consuming: srcItem.flags.consuming,
            effects: [{ kind: 'runScript', script: migratedItemUseScriptRef(srcItem.id) }],
          },
        }
      } else if (u.pendingReason) {
        recordPendingUse(
          srcItem,
          isResourcePool && poolRewards.length === 0
            ? '资源池用途缺 Store[0] 奖励表'
            : u.pendingReason,
        )
      } else if (u.effects.length) {
        if (u.lossyNotes.length)
          lossyUse.push({ itemId: srcItem.id, name: srcItem._name, notes: u.lossyNotes })
        // 场景钩子作用于当前场景而非队友；菜单不进入选目标。
        const target = u.effects.some(
          (e) => e.kind === 'runSceneHook' || e.kind === 'modifyHostileAwareness',
        )
          ? ('scene' as const)
          : srcItem.flags.applyToAll
            ? ('allAllies' as const)
            : ('oneAlly' as const)
        out = {
          ...out,
          use: {
            target,
            consuming: srcItem.flags.consuming,
            effects: u.effects,
            ...(target === 'scene' ? { menuAfterUse: 'close' as const } : {}),
            ...(u.sound ? { sound: u.sound } : {}),
          },
        }
      } else {
        recordPendingUse(srcItem, 'scriptOnUse 空链')
      }
    }
    if (srcItem.flags.throwable && srcItem.scriptOnThrow !== 0) {
      const t = translateThrowScript(
        src.commands,
        labelIndex,
        srcItem.scriptOnThrow,
        src.soundAssetForNum,
        src.objectMagics ? throwMagicPresentation : undefined,
      )
      if (t.pendingReason) {
        pendingThrow.push({ itemId: srcItem.id, name: srcItem._name, reason: t.pendingReason })
      } else if (t.effects.length || t.sound || t.presentation) {
        out = {
          ...out,
          throw: {
            effects: t.effects,
            ...(t.sound ? { sound: t.sound } : {}),
            ...(t.presentation ? { presentation: t.presentation } : {}),
            // Historical raw/P7 parent shape (content v7) intentionally has no target.
            // R13-3 adds it only in the append-only successor snapshot.
          } as ItemData['throw'],
        }
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
    sourceAddressAt: (_cmds: readonly SourceCmd[], idx: number) => idx,
    explicitLabels,
    palSemanticProfile: options.palSemanticProfile ?? 'current-r13-6a',
    palReferenceSchema: options.palReferenceSchema,
    locale: {} as Record<string, string>,
    report: emptyTranslateReport(),
    soundAssetForNum: src.soundAssetForNum,
  }
  const enemyRes =
    src.enemies && src.enemyObjects
      ? mapEnemies(
          src.enemies,
          src.enemyObjects,
          enemyTctx,
          enemyAuthority?.translateScripts,
          enemyAuthority?.reportHookSources,
        )
      : undefined
  if (enemyRes) {
    Object.assign(localeNames, enemyRes.localeNames)
    Object.assign(localeNames, enemyTctx.locale) // 战斗脚本对白(dlg.<idx>)
    assertNoMigrationGaps(enemyTctx.report)
  }
  // R13-5:敌用法术兜底补翻 —— 同时收集无状态 rules、初始 fallback 与 hook setFallback。
  // 旧实现只扫 rules；敌钩迁为 persistent flow 后会静默漏掉绝大多数 0x67 技能。
  // 这些对象在 mapSkills 被 scriptOnUse≠0(玩家使用门/动态公式)延后;敌施法无使用门,
  // 伤害走战斗期 calcMagicDamage:scriptOnSuccess 可翻则翻,否则 damage fallback。
  if (enemyRes) {
    const have = new Set(skillsRes.skills.map((s) => s.id))
    const castIds = new Set<number>()
    const addCast = (skillId: string, path: string): void => {
      const id = Number(skillId)
      if (!Number.isSafeInteger(id) || id <= 0)
        throw new Error(`${path}: PAL 敌用技能 id 不是正整数 ${skillId}`)
      castIds.add(id)
    }
    for (const enemy of enemyRes.enemies) {
      for (const [ruleIndex, rule] of (enemy.ai.rules ?? []).entries())
        if (rule.do.kind === 'cast')
          addCast(rule.do.skillId, `${enemy.id}.ai.rules[${ruleIndex}].do.skillId`)
      if (enemyAuthority?.castSkillClosure !== 'rules-only') {
        if (enemy.ai.fallback?.action.kind === 'cast')
          addCast(enemy.ai.fallback.action.skillId, `${enemy.id}.ai.fallback.action.skillId`)
        for (const [channel, flow] of Object.entries(enemy.ai.hooks ?? {}))
          for (const [stateId, state] of Object.entries(flow.states))
            for (const [commandIndex, command] of state.body.entries())
              if (command.kind === 'setFallback' && command.fallback?.action.kind === 'cast')
                addCast(
                  command.fallback.action.skillId,
                  `${enemy.id}.ai.hooks.${channel}.states.${stateId}.body[${commandIndex}]`,
                )
      }
    }
    const used = [...castIds]
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
      let scriptSound: AssetId | undefined
      if (s.scriptOnSuccess !== 0) {
        const t = translateSkillScript(
          src.commands,
          labelIndex,
          s.scriptOnSuccess,
          src.soundAssetForNum,
        )
        if (!t.pendingReason && t.effects.length) {
          effects = t.effects
          scriptSound = t.sound
        } else
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
        animation: {
          ...mapSourceMagicAnimation(m, src.soundAssetForNum),
          ...(scriptSound ? { sound: scriptSound } : {}),
        },
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
      pendingThrow,
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
import type {
  Command,
  EnemyDef,
  EnemyTeamDef,
  SceneDef,
  ScriptChunkV1,
  ScriptIndexV1,
  ScriptStage,
} from '@type-pal/content'
import { palMusicAssetId, pixelToGrid } from '@type-pal/content'
import { mapIdFromSourceNumber } from './project-map-converter.js'
import { liftEarlyDitherSceneEntry } from './scene-entry.js'
import {
  normalizeSceneEntryReferences,
  type SceneEntryNormalizationReport,
} from './scene-entry-normalize.js'
import type { ScriptRegistryAuditRecord } from './translate-events.js'

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

/** PAL 迁移器保留的中性 SpriteDef id；玩法职责不得编码进资源身份。 */
export function migratedSpriteId(spriteNum: number, layoutVariantFrames?: number): string {
  return `sprite-${spriteNum}${layoutVariantFrames === undefined ? '' : `-f${layoutVariantFrames}`}`
}

export interface SceneMigrationResult {
  scenes: SceneDef[]
  scriptIndex: ScriptIndexV1
  scriptChunks: Record<string, ScriptChunkV1>
  /** 实体引用到的原版精灵批量登记(sprite-<num>;布局按 nSpriteFrames)。 */
  sprites: SpriteDef[]
  /** M3a 脚本翻译产出的文本(dlg./spk.;IO 壳并入工程 locale)。 */
  scriptLocale: Record<string, string>
  /** M3a 脚本翻译统计(覆盖缺口 → M3b/c 收敛清单)。 */
  scriptReport: TranslateReport
  scriptGraphReport: {
    commands: number
    roots: number
    globalRoots: number
    edges: Record<'execution' | 'binding' | 'recovery', number>
    components: number
    cyclicComponents: number
    ownership: { scene: number; shared: number; global: number; unreachable: number }
    topPredecessors: Array<{ entry: number; count: number }>
  }
  /** P0 只读溯源：注册体的源 label/owner/对话入口态；不写入工程 canonical content。 */
  scriptRegistryAudit: ScriptRegistryAuditRecord[]
  /** P0 只读折叠证据：HostileBehavior 接管前被移除的脚本入口。 */
  foldedHostileRoots: Array<{
    sceneId: string
    entityId: string
    roots: Array<{ id: string; body: Command[] }>
  }>
  report: {
    scenes: number
    entities: number
    /** 历史字段：不再删除无入口的 spriteNum=0 事件对象，生产迁移应恒为 0。 */
    triggerZonesSkipped: number
    hidden: number
    entriesFound: number
    scenesWithStart: number
    scenesWithMusic: number
    /** entry 落图中心兜底的场景(无 start 无扫描入口)。 */
    entryFallback: string[]
    /** 同 spriteNum 不同 nSpriteFrames 的布局冲突(拆成 sprite-<num>-f<n>)。 */
    layoutConflicts: string[]
    /** 已消费的 PAL 逐项布局证据；用于审计 0x65/0x1A 不再靠默认值猜布局。 */
    layoutEvidence: Array<{
      spriteNum: number
      definitionId: string
      source: 'scene' | 'pal-overlay'
      evidence: string
    }>
    /** nSpriteFramesAuto>0 的环境自循环候选(布局先保守,C1 标注工具人工修)。 */
    autoLoopCandidates: number
    /** 朝向被 autoScript 链首覆盖(≠数据字段)的实体数。 */
    facingFromAuto: number
    /** spriteNum=0 且有触发脚本 → 迁成 zone 实体的数量(M3a)。 */
    zonesMigrated: number
    /** spriteNum=0 且无脚本入口，但仍承载状态/碰撞/稳定地址的 zone 实体。 */
    stateAnchorsMigrated: number
    hostilesFolded?: number
    /** 战场/战斗乐 enter 链 hoist 成 SceneDef 默认的场景数。 */
    battleDefaultsHoisted?: number
    /** 战场默认经 loadScene 图传播静态化的场景(原版靠全局变量残留继承)。 */
    battleFieldsPropagated?: string[]
    /** 有战斗但战场默认解不出的场景(运行时吃项目默认;待人工定值)。 */
    battleFieldUnresolved?: string[]
    /** onEnter 的安全前缀 + 0x73 已提升为显式 entry 的稳定 stage id。 */
    sceneEntriesLifted: string[]
    /** W4-1:最终脚本树中的静态坐标归一化统计。 */
    entryNormalization?: SceneEntryNormalizationReport
  }
}

/**
 * R13-2 只在同一次生产迁移进程内使用的翻译会话。
 *
 * 它刻意不进入 SceneMigrationResult 的可序列化字段：控制流投影必须复用与生产迁移
 * 完全相同的 label/地址/资源解析器，但不能把函数或临时图状态写进 canonical 工程。
 */
export interface R13TranslationSession {
  ctx: TranslateCtx
  /**
   * 生产场景声明中的静态行为入口。R13-2 新恢复的控制流可能首次暴露一个旧 P4
   * command census 未见过的 0x24/0x25；这张迁移期只读表让它仍能绑定到既有
   * canonical `default` owner，而不是按 PAL 地址临时造第二份行为。
   */
  staticEntityBehaviorRoots: readonly R13StaticEntityBehaviorRoot[]
  finish(): {
    locale: Record<string, string>
    spriteDefinitions: SpriteDef[]
    report: TranslateReport
    scriptRegistryAudit: ScriptRegistryAuditRecord[]
    /** 仅用于证明 deferred binding 的 registry 闭包已被稳定 owner 完整消费。 */
    scriptRegistryBodies: Record<string, Command[]>
  }
}

export interface R13StaticEntityBehaviorRoot {
  sceneId: string
  entityId: string
  channel: 'trigger' | 'auto'
  behaviorId: 'default'
  rootAddress: number
}

type R13TranslationSessionFactory = () => R13TranslationSession

const r13TranslationSessionFactories = new WeakMap<
  SceneMigrationResult,
  R13TranslationSessionFactory
>()

/** 取得绑定在原始 mapScenesStatic 结果上的生产翻译会话；克隆/反序列化结果必须失败。 */
export function createSceneR13TranslationSession(
  result: SceneMigrationResult,
): R13TranslationSession {
  const factory = r13TranslationSessionFactories.get(result)
  if (!factory)
    throw new Error(
      'R13 translation context 不存在：必须使用本进程 mapScenesStatic 返回的原始结果，不能使用克隆或反序列化对象',
    )
  return factory()
}

export interface SceneMigrationOptions {
  /** PAL 物理源帧数；只验证明示 overlay，不参与布局推断。 */
  worldSpriteFrameCounts?: readonly number[]
  /** 非场景内容持有的 legacy 执行根；翻译成稳定别名后进入同一脚本库。 */
  globalScriptAliases?: ReadonlyArray<{
    id: string
    entry: number
    owner?: string
  }>
  /** 已发布历史层、current R13-6A 与 6B 专用证据提取必须显式隔离，禁止重签 P0。 */
  palSemanticProfile?: 'historical-r13-4' | 'current-r13-6a' | 'current-r13-6b'
  /** 冻结历史 authority 的 PAL 引用形状；当前产品保持 stable-id。 */
  palReferenceSchema?: 'legacy' | 'stable-id'
}

/**
 * 产品同步只改脚本绑定：场景/实体/页面的手工静态字段全部以盘上版本为准。
 * fresh 缺某个 trigger/auto 表示迁移器确认该脚本口应移除；额外旧页只保留非脚本元数据。
 */
export function mergeSceneScriptBindings(disk: SceneDef, fresh: SceneDef): SceneDef {
  const freshEntities = new Map(fresh.entities.map((entity) => [entity.id, entity]))
  const mergePages = (
    diskPages: SceneDef['entities'][number]['pages'],
    freshPages: SceneDef['entities'][number]['pages'],
  ): SceneDef['entities'][number]['pages'] => {
    if (!diskPages) return freshPages
    const length = Math.max(diskPages.length, freshPages?.length ?? 0)
    const pages = []
    for (let index = 0; index < length; index++) {
      const oldPage = diskPages[index]
      const newPage = freshPages?.[index]
      if (!oldPage && newPage) {
        pages.push(newPage)
        continue
      }
      if (!oldPage) continue
      const page = { ...oldPage }
      if (newPage?.trigger) {
        page.trigger = {
          ...(oldPage.trigger ?? newPage.trigger),
          stages: newPage.trigger.stages,
        }
      } else delete page.trigger
      if (newPage?.auto) {
        page.auto = { stages: newPage.auto.stages }
      } else delete page.auto
      if (Object.keys(page).length) pages.push(page)
    }
    return pages.length ? pages : undefined
  }

  return {
    ...disk,
    onEnter: fresh.onEnter,
    onTeleport: fresh.onTeleport,
    entities: disk.entities.map((entity) => {
      const source = freshEntities.get(entity.id)
      if (!source) return entity
      const pages = mergePages(entity.pages, source.pages)
      const next = { ...entity, ...(pages ? { pages } : {}) }
      if (!pages) delete next.pages
      return next
    }),
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
  /** 迁移边界显式建立的旧 spriteNum → 角色语义 SpriteDef.id 映射。 */
  roleSpriteIdsByNum: ReadonlyMap<number, string> = new Map(),
  /** 物品/法术/敌 AI/角色钩子等不属于场景的执行根。 */
  globalRoots: readonly ScriptRoot[] = [],
  /** 生产迁移按 catalog 过滤空 sound chunk。 */
  soundAssetForNum?: SoundAssetForNum,
  options: SceneMigrationOptions = {},
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
    layoutEvidence: [],
    autoLoopCandidates: 0,
    facingFromAuto: 0,
    zonesMigrated: 0,
    stateAnchorsMigrated: 0,
    hostilesFolded: 0,
    sceneEntriesLifted: [],
  }
  const foldedHostileRoots: SceneMigrationResult['foldedHostileRoots'] = []

  if (options.worldSpriteFrameCounts)
    assertPalWorldSpriteLayoutOverlaySources(options.worldSpriteFrameCounts)

  // 所有会影响“首见”语义的输入先规范化。PAL 生产输入本来就是该顺序；显式排序让
  // 测试切片、调用方 Map 插入顺序与未来读盘实现都不能再左右布局 id 或 label 归属。
  const orderedScenes = [...srcScenes].sort((left, right) => left.sceneId - right.sceneId)
  const eventSourceRank = (sceneId: number): number =>
    sceneId >= 0 ? 0 : sceneId === -1 ? 1 : sceneId === -2 ? 2 : 3
  const orderedEventSources = [...eventsByScene].sort(([left], [right]) => {
    const rank = eventSourceRank(left) - eventSourceRank(right)
    return rank || (left >= 0 && right >= 0 ? left - right : right - left)
  })

  // ── 入口扫描:setPartyPos(raw70)在 loadScene 前 ≤4 步内。
  // ⚠ 实测(2026-07-02 gap 分布:806 个 loadScene,gap≤4 共 488):主流模式是
  // `setPartyPos → end → 0x50渐隐 → loadScene`——设位在前一链**末尾**,'end' 不隔断
  // 真实控制流,勿以 end 重置(初版此误杀 414 对)。gap>4(10 个)与无前置(231,
  // 沿用当前坐标的传送)不配对 → 归 M3。──
  const arrivals = new Map<number, { src: number; pos: ReturnType<typeof partyPosToGrid> }[]>()
  // all.json(-2) 只作为全局控制流索引，为“无 start、无具体来源”的场景提供默认落点兜底；
  // 它不进入 arrivals、来源计数或任何命名落点定义。
  const indexedArrivals = new Map<number, ReturnType<typeof partyPosToGrid>[]>()
  for (const [srcId, cmds] of orderedEventSources) {
    let last: { pos: ReturnType<typeof partyPosToGrid>; at: number } | null = null
    cmds.forEach((c, i) => {
      if (c.op === 'raw' && c.opcode === 70) {
        const [a = 0, b = 0, h = 0] = c.operands ?? []
        last = { pos: partyPosToGrid(a, b, h), at: i }
        return
      }
      const rawTarget =
        (c as { op?: string; sceneId?: number }).op === 'loadScene'
          ? (c as { sceneId?: number }).sceneId
          : undefined
      // loadScene operand 1-based → 0-based scene index(与 loadScene body / sc.sceneId 命名一致)
      const target = typeof rawTarget === 'number' ? Math.max(0, rawTarget - 1) : undefined
      if (typeof target === 'number') {
        if (last && i - last.at <= 4) {
          if (srcId === -2) {
            const list = indexedArrivals.get(target) ?? []
            list.push(last.pos)
            indexedArrivals.set(target, list)
          } else {
            const list = arrivals.get(target) ?? []
            list.push({ src: srcId, pos: last.pos })
            arrivals.set(target, list)
            report.entriesFound++
          }
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
  const allCommands = eventsByScene.get(-2)
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  const labelScene = new Map<string, string | undefined>()
  const explicitLabels = new Set<string>()
  const addressesByCommands = new Map<readonly SourceCmd[], Array<number | undefined>>()
  for (const [sourceScene, cmds] of orderedEventSources)
    cmds.forEach((c, i) => {
      if (c.label && !labelAt.has(c.label)) {
        labelAt.set(c.label, { cmds, idx: i })
        labelScene.set(c.label, sourceScene >= 0 ? sceneSlug(sourceScene) : undefined)
      }
    })
  for (const [, cmds] of orderedEventSources) {
    const addresses: Array<number | undefined> = []
    let address: number | undefined
    cmds.forEach((command, index) => {
      const match = command.label ? /^L_(\d+)$/.exec(command.label) : null
      if (match?.[1] !== undefined) address = Number(match[1])
      else if (address !== undefined) address++
      addresses[index] = address
    })
    addressesByCommands.set(cmds, addresses)
  }
  if (allCommands) {
    allCommands.forEach((command, address) => {
      const expected = `L_${address}`
      if (command.label !== undefined && command.label !== expected)
        throw new Error(
          `all.json 显式 label 与数组地址不一致: index=${address}, label=${command.label}`,
        )
      if (command.label) explicitLabels.add(command.label)
      if (!labelAt.has(expected)) labelAt.set(expected, { cmds: allCommands, idx: address })
    })
    addressesByCommands.set(
      allCommands,
      Array.from({ length: allCommands.length }, (_, address) => address),
    )
  }
  const ownerScene = new Map<string, string>()
  for (const sourceScene of orderedScenes)
    for (const entity of sourceScene.eventObjects)
      ownerScene.set(`e${entity.id}`, sceneSlug(sourceScene.sceneId))
  const addressOf = (label: string | undefined): number | undefined => {
    const match = label ? /L_(\d+)$/.exec(label) : null
    return match?.[1] === undefined ? undefined : Number(match[1])
  }
  const graphRoots: ScriptRoot[] = []
  for (const sourceScene of orderedScenes) {
    const owner = sceneSlug(sourceScene.sceneId)
    for (const label of [sourceScene.onEnterLabel, sourceScene.onTeleportLabel]) {
      const entry = addressOf(label)
      if (entry !== undefined) graphRoots.push({ entry, owner, kind: 'scene' })
    }
    for (const entity of sourceScene.eventObjects) {
      for (const label of [entity.triggerLabel, entity.autoLabel]) {
        const entry = addressOf(label)
        if (entry !== undefined) graphRoots.push({ entry, owner, kind: 'scene' })
      }
    }
  }
  const roots = [...graphRoots, ...globalRoots]
  const graph = allCommands ? analyzeScriptGraph(allCommands, roots) : undefined
  const graphSceneFor = (label: string): string | undefined => {
    const address = addressOf(label)
    const owners = address === undefined ? undefined : graph?.owners[address]
    if (owners?.size !== 1) return undefined
    const owner = [...owners][0]
    return owner?.startsWith('global/') ? undefined : owner
  }
  const sccFor = (label: string): string => {
    const address = addressOf(label)
    const componentId = address === undefined ? undefined : graph?.componentOf[address]
    const component = componentId === undefined ? undefined : graph?.components[componentId]
    return `scc-L-${component?.[0] ?? address ?? label.replace(/^L_/, '')}`
  }
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

  // ── 精灵布局注册表(预扫描 + 只读解析)──
  // 0x65/0x1A 只携带资源号，没有布局信息。先扫描全部 scene 声明，再叠加逐项 PAL
  // 证据；翻译脚本时只查表，绝不在引用路径上创建 directional/3 默认值。
  type LayoutRegistration = {
    spriteNum: number
    nSpriteFrames?: number
    id: string
    layout: SpriteDef['layout']
    source: 'scene' | 'pal-overlay'
    evidence: string
    label: string
  }
  const layoutKey = (layout: SpriteDef['layout']): string =>
    layout.kind === 'directional'
      ? `directional:${layout.framesPerDir}`
      : layout.kind === 'loop'
        ? `loop:${layout.frameCount}:${layout.ticksPerFrame ?? ''}`
        : 'static'
  const sceneLayout = (nSpriteFrames: number): SpriteDef['layout'] =>
    nSpriteFrames > 0 ? { kind: 'directional', framesPerDir: nSpriteFrames } : { kind: 'static' }
  type SceneLayoutEvidence = {
    nSpriteFrames: number
    sceneId: number
    entityId: number
  }
  const sceneEvidenceBySprite = new Map<number, Map<number, SceneLayoutEvidence>>()
  for (const sourceScene of orderedScenes) {
    for (const entity of [...sourceScene.eventObjects].sort((left, right) => left.id - right.id)) {
      if (entity.spriteNum <= 0) continue
      const nSpriteFrames = entity.nSpriteFrames ?? 0
      const layouts = sceneEvidenceBySprite.get(entity.spriteNum) ?? new Map()
      const existing = layouts.get(nSpriteFrames)
      if (
        !existing ||
        sourceScene.sceneId < existing.sceneId ||
        (sourceScene.sceneId === existing.sceneId && entity.id < existing.entityId)
      )
        layouts.set(nSpriteFrames, {
          nSpriteFrames,
          sceneId: sourceScene.sceneId,
          entityId: entity.id,
        })
      sceneEvidenceBySprite.set(entity.spriteNum, layouts)
    }
  }

  const overlaysBySprite = new Map<number, PalWorldSpriteLayoutOverlay>(
    PAL_WORLD_SPRITE_LAYOUT_OVERLAYS.map((overlay) => [overlay.spriteNum, overlay] as const),
  )
  if (overlaysBySprite.size !== PAL_WORLD_SPRITE_LAYOUT_OVERLAYS.length)
    throw new Error('PAL 大世界精灵布局 overlay 含重复 spriteNum')

  const registrationsBySprite = new Map<number, Map<string, LayoutRegistration>>()
  const sceneRegistrationByKey = new Map<string, LayoutRegistration>()
  const allSpriteNums = new Set([...sceneEvidenceBySprite.keys(), ...overlaysBySprite.keys()])
  for (const spriteNum of [...allSpriteNums].sort((left, right) => left - right)) {
    const sceneEvidence = [...(sceneEvidenceBySprite.get(spriteNum)?.values() ?? [])].sort(
      (left, right) =>
        left.sceneId - right.sceneId ||
        left.entityId - right.entityId ||
        left.nSpriteFrames - right.nSpriteFrames,
    )
    const overlay = overlaysBySprite.get(spriteNum)
    const primaryLayout = overlay?.layout ?? sceneLayout(sceneEvidence[0]?.nSpriteFrames ?? 0)
    const primaryKey = layoutKey(primaryLayout)
    const layouts = new Map<string, LayoutRegistration>()
    if (overlay) {
      layouts.set(primaryKey, {
        spriteNum,
        id: migratedSpriteId(spriteNum),
        layout: overlay.layout,
        source: 'pal-overlay',
        evidence: overlay.evidence,
        label: `原精灵 ${spriteNum}(0x65 换装)`,
      })
    }
    for (const evidence of sceneEvidence) {
      const layout = sceneLayout(evidence.nSpriteFrames)
      const key = layoutKey(layout)
      const matchesPrimary = key === primaryKey
      // overlay 与场景证据相同 = 同一个 stable base；保留历史人读 label，避免纯布局修复
      // 与作者改名形成无意义 MG2 冲突。不同布局才建立 scene -f<n> 变体。
      const registration: LayoutRegistration =
        matchesPrimary && layouts.has(key)
          ? layouts.get(key)!
          : {
              spriteNum,
              nSpriteFrames: evidence.nSpriteFrames,
              id: matchesPrimary
                ? migratedSpriteId(spriteNum)
                : migratedSpriteId(spriteNum, evidence.nSpriteFrames),
              layout,
              source: 'scene',
              evidence: `scene ${sceneSlug(evidence.sceneId)}/e${evidence.entityId} nSpriteFrames=${evidence.nSpriteFrames}`,
              label: `原精灵 ${spriteNum}`,
            }
      layouts.set(key, registration)
      sceneRegistrationByKey.set(`${spriteNum}:${evidence.nSpriteFrames}`, registration)
    }
    registrationsBySprite.set(spriteNum, layouts)
    for (const registration of layouts.values())
      if (registration.id !== migratedSpriteId(spriteNum))
        report.layoutConflicts.push(registration.id)
  }
  report.layoutConflicts.sort()

  const spriteDefs = new Map<string, SpriteDef>()
  const recordedLayoutEvidence = new Set<string>()
  const ensureSpriteDefinitionIn = (
    definitions: Map<string, SpriteDef>,
    registration: LayoutRegistration,
    recordEvidence: boolean,
  ): string => {
    if (!definitions.has(registration.id))
      definitions.set(registration.id, {
        id: registration.id,
        asset: palSpriteAssetId(registration.spriteNum),
        label: registration.label,
        layout: registration.layout,
      })
    if (recordEvidence) {
      const evidenceKey = `${registration.spriteNum}:${registration.id}:${registration.source}`
      if (!recordedLayoutEvidence.has(evidenceKey)) {
        recordedLayoutEvidence.add(evidenceKey)
        report.layoutEvidence.push({
          spriteNum: registration.spriteNum,
          definitionId: registration.id,
          source: registration.source,
          evidence: registration.evidence,
        })
      }
    }
    return registration.id
  }
  const ensureSpriteDefinition = (registration: LayoutRegistration): string =>
    ensureSpriteDefinitionIn(spriteDefs, registration, true)
  const spriteRef = (entity: SourceEventObject): string => {
    const nSpriteFrames = entity.nSpriteFrames ?? 0
    const registration = sceneRegistrationByKey.get(`${entity.spriteNum}:${nSpriteFrames}`)
    if (!registration)
      throw new Error(`sprite ${entity.spriteNum} 缺场景布局注册: nSpriteFrames=${nSpriteFrames}`)
    return ensureSpriteDefinition(registration)
  }

  /** 0x65 / 0x1A field=2 / 0x98 共用的只读旧号解析器。 */
  const resolveSpriteIdForNum = (
    num: number,
    ensure: (registration: LayoutRegistration) => string,
  ): string => {
    const roleSpriteId = roleSpriteIdsByNum.get(num)
    if (roleSpriteId) return roleSpriteId
    const layouts = registrationsBySprite.get(num)
    if (!layouts?.size) throw new Error(`sprite ${num} 缺布局证据；禁止从脚本资源号猜布局`)
    const overlay = overlaysBySprite.get(num)
    if (overlay) {
      const registration = layouts.get(layoutKey(overlay.layout))
      if (!registration) throw new Error(`sprite ${num} 的 PAL overlay 未进入布局注册表`)
      return ensure(registration)
    }
    if (layouts.size !== 1)
      throw new Error(
        `sprite ${num} 有 ${layouts.size} 种场景布局，脚本资源号无法消歧；需要逐项 PAL overlay`,
      )
    return ensure([...layouts.values()][0]!)
  }
  // ── M3a 脚本翻译上下文(触发链/onEnter → 结构化 stages;文本进 locale)──
  const createTranslateContext = (
    definitions: Map<string, SpriteDef>,
    recordLayoutEvidence: boolean,
  ): { ctx: TranslateCtx; registry: ScriptRegistry } => {
    const registry = new ScriptRegistry(
      (label, owner) =>
        (owner ? ownerScene.get(owner) : undefined) ??
        graphSceneFor(label) ??
        labelScene.get(label),
      undefined,
      sccFor,
    )
    const ctx: TranslateCtx = {
      labelAt,
      sourceAddressAt: (cmds, idx) => addressesByCommands.get(cmds)?.[idx],
      palSemanticProfile: options.palSemanticProfile ?? 'current-r13-6a',
      palReferenceSchema: options.palReferenceSchema,
      explicitLabels,
      locale: {} as Record<string, string>,
      report: emptyTranslateReport(),
      spriteIdForNum: (num) =>
        resolveSpriteIdForNum(num, (registration) =>
          ensureSpriteDefinitionIn(definitions, registration, recordLayoutEvidence),
        ),
      mapIdForNum: mapIdFromSourceNumber,
      soundAssetForNum,
      registry,
    }
    return { ctx, registry }
  }
  const primaryTranslation = createTranslateContext(spriteDefs, true)
  const { ctx: tctx, registry } = primaryTranslation
  for (const alias of [...(options.globalScriptAliases ?? [])].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    if (!Number.isInteger(alias.entry) || alias.entry <= 0)
      throw new Error(`全局脚本别名 ${alias.id} 的入口无效: ${alias.entry}`)
    registry.registerLegacyAlias(alias.id, `L_${alias.entry}`, alias.owner, tctx)
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
    // M3 把 goto/call 目标提成 ScriptRef 后，遇敌尾部的 vanish/fade 可能藏在 jumpScript 中。
    // 模板识别只读展开引用，不改执行结构；否则重迁会让所有标准野怪退化回重复脚本页。
    const unfold = (commands: readonly Command[], seen = new Set<string>()): Command[] => {
      const out: Command[] = []
      for (const command of commands) {
        if (command.kind !== 'callScript' && command.kind !== 'jumpScript') {
          out.push(command)
          continue
        }
        if (seen.has(command.ref.id)) {
          out.push(command)
          continue
        }
        const body = registry.bodyFor(command.ref.id)
        if (!body) {
          out.push(command)
          continue
        }
        const nextSeen = new Set(seen)
        nextSeen.add(command.ref.id)
        out.push(...unfold(body, nextSeen))
      }
      return out
    }
    // trigger 全体必须只有遇敌套路命令(startBattle / vanishEntity / fade),含别的 = 特殊编排
    const encounterKinds = new Set(['startBattle', 'vanishEntity', 'fade'])
    const flat = unfold((tstages ?? []).flatMap((s) => s.body))
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
    const isGameOver = unfold(onLose ?? []).some((c) => c.kind === 'loadLastSave')
    const historicalTeam = (first as unknown as { team?: number }).team
    return {
      hostile: {
        ...(tctx.palReferenceSchema === 'legacy' ||
        (tctx.palReferenceSchema === undefined &&
          tctx.palSemanticProfile === 'historical-r13-4')
          ? { team: historicalTeam }
          : { enemyTeamId: first.enemyTeamId }),
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
      } as unknown as HostileBehavior,
    }
  }

  const migratableScenes = orderedScenes.filter((scene) => {
    if (scene.mapNum !== 0) return true
    const exactStub =
      scene.sceneId === 294 &&
      scene.eventObjects.length === 0 &&
      scene.onEnterLabel === undefined &&
      scene.onTeleportLabel === undefined
    if (!exactStub)
      throw new Error(
        `场景 ${scene.sceneId} 的 mapNum=0 但不是精确 s294 空 stub；停止迁移并重新审计`,
      )
    return false
  })

  let scenes: SceneDef[] = migratableScenes.map((sc) => {
    const slug = sceneSlug(sc.sceneId)
    const entities = []
    // 新补回的无入口状态锚点统一追加，避免仅因恢复缺失对象就改变既有实体数组索引；
    // 作者身份始终用 id，但 v4 审计证据中的 JSON pointer 仍需在 P7 前保持稳定。
    const stateAnchors: SceneDef['entities'] = []
    for (const eo of sc.eventObjects) {
      if (eo.spriteNum <= 0) {
        // spriteNum=0 不等于“无语义”：这批对象既可能是脚本触发区，也可能只承载
        // sState/collision，或被其他脚本按稳定对象号读写。旧逻辑只保留有入口脚本者，
        // 会删除 0x49/0x9A/entityInScene 的合法目标（PAL 全量曾丢 132 个对象）。
        const trigger = triggerOf(eo)
        const auto = autoOf(eo)
        const state = eo.sState ?? 1
        const zone = {
          id: `e${eo.id}`,
          pos: { ...pixelToGrid(eo.x, eo.y), height: 0 },
          zone: true as const,
          ...(state === 0 ? { hidden: true } : {}),
          ...(state >= 2 ? { collide: true } : {}),
          ...(eo.sLayer ? { zBias: eo.sLayer } : {}),
          ...(trigger || auto
            ? { pages: [{ ...(trigger ? { trigger } : {}), ...(auto ? { auto } : {}) }] }
            : {}),
        }
        if (trigger || auto) {
          entities.push(zone)
          report.zonesMigrated++
        } else {
          stateAnchors.push(zone)
          report.stateAnchorsMigrated++
        }
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
      if (folded) {
        report.hostilesFolded = (report.hostilesFolded ?? 0) + 1
        foldedHostileRoots.push({
          sceneId: slug,
          entityId: `e${eo.id}`,
          roots: [
            ...(trigger?.stages ?? []).map((stage, index) => ({
              id: bindFoldedInstructionOutcomes(
                stage,
                `folded/hostile/${slug}/e${eo.id}/trigger/stage-${index}`,
              ),
              body: stage.body,
            })),
            ...(auto?.stages ?? []).map((stage, index) => ({
              id: bindFoldedInstructionOutcomes(
                stage,
                `folded/hostile/${slug}/e${eo.id}/auto/stage-${index}`,
              ),
              body: stage.body,
            })),
          ],
        })
      }
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
    entities.push(...stateAnchors)
    const { start, musicId } = headScan(sc.sceneId, sc.onEnterLabel)
    if (start) {
      report.scenesWithStart++
    }
    if (musicId !== undefined) report.scenesWithMusic++
    // 默认落点只存 scene.entry；额外命名落点稍后从最终 loadScene.pos 统一反建。
    const sceneArrivals = arrivals.get(sc.sceneId) ?? []
    const firstEntry =
      start ??
      sceneArrivals.find((arrival) => arrival.src >= 0)?.pos ??
      indexedArrivals.get(sc.sceneId)?.[0] ??
      sceneArrivals.find((arrival) => arrival.src === -1)?.pos
    if (!firstEntry) report.entryFallback.push(slug)
    report.scenes++
    // onEnter 脚本(进场剧情/音乐/战场配置;music/entries 窄扫描保留 —— loader/编辑器元数据)
    const onEnter = sc.onEnterLabel ? translateStages(sc.onEnterLabel, undefined, tctx) : undefined
    // 传送出口脚本(原版 wScriptOnTeleport;引路蜂/土灵珠读它)—— 同 onEnter 走 foldStages
    // (setPartyPos+loadScene+fade 门模式折叠成单 loadScene)
    const onTeleportRaw = sc.onTeleportLabel
      ? translateStages(sc.onTeleportLabel, undefined, tctx)
      : undefined
    const onTeleport = onTeleportRaw?.length ? foldStages(onTeleportRaw) : undefined
    // 战斗配置:enter/实体触发段里的 BattleCfgMarker(0x4A/0x45)→ bake 成 SceneDef 默认 + strip
    // (无持久态、无 override 命令;赤鬼王/水魔兽类打完 boss 自然回落场景默认)。见 finalizeBattleConfig。
    const onEnterFolded = onEnter?.length ? foldStages(onEnter) : undefined
    return finalizeBattleConfig({
      id: slug,
      mapId: mapIdFromSourceNumber(sc.mapNum),
      ...(musicId !== undefined ? { music: musicId <= 0 ? null : palMusicAssetId(musicId) } : {}),
      entry: { pos: firstEntry ?? { ...pixelToGrid(1024, 1024), height: 0 }, facing: 'down' },
      entities,
      ...(onEnterFolded ? { onEnter: onEnterFolded } : {}),
      ...(onTeleport ? { onTeleport } : {}),
    })
  })
  resolveSceneScriptPatches(scenes, tctx, report.sceneEntriesLifted)
  scenes = applyPalScriptOverlays(scenes)
  // 0x6D 追加的新段也要参与 battle marker bake 与默认传播。
  for (let i = 0; i < scenes.length; i++) scenes[i] = finalizeBattleConfig(scenes[i]!)
  propagateBattleFieldDefaults(scenes, report, registry)

  // 窄切片测试/工具可能只提供部分场景与局部脚本,其缺引用留在报告；正式迁移必带
  // all.json(-2),此时任何可达 gap/flow cut 都在写盘前硬失败。
  if (allCommands) assertNoMigrationGaps(tctx.report)

  for (let i = 0; i < scenes.length; i++)
    scenes[i] = externalizeSceneScripts(
      scenes[i]!,
      registry,
      report.sceneEntriesLifted,
      options.palSemanticProfile ?? 'current-r13-6a',
    )
  assertNoBattleCfgMarkers(registry.commandBodies())
  report.sceneEntriesLifted.sort()
  report.entryNormalization = normalizeSceneEntryReferences(scenes, registry.commandBodies(), {
    strictMissingScene: Boolean(allCommands),
  })
  const library = registry.build()

  const predecessorCount = new Map<number, number>()
  for (const edge of graph?.edges ?? [])
    predecessorCount.set(edge.to, (predecessorCount.get(edge.to) ?? 0) + 1)
  const ownership = { scene: 0, shared: 0, global: 0, unreachable: 0 }
  for (const owners of graph?.owners ?? []) {
    if (owners.size === 0) ownership.unreachable++
    else if (owners.size > 1) ownership.shared++
    else if ([...owners][0]?.startsWith('global/')) ownership.global++
    else ownership.scene++
  }
  const selfLoops = new Set(
    (graph?.edges ?? [])
      .filter((edge) => edge.kind !== 'binding' && edge.from === edge.to)
      .map((edge) => edge.from),
  )
  const scriptGraphReport: SceneMigrationResult['scriptGraphReport'] = {
    commands: allCommands?.length ?? 0,
    roots: roots.length,
    globalRoots: globalRoots.length,
    edges: {
      execution: graph?.edges.filter((edge) => edge.kind === 'execution').length ?? 0,
      binding: graph?.edges.filter((edge) => edge.kind === 'binding').length ?? 0,
      recovery: graph?.edges.filter((edge) => edge.kind === 'recovery').length ?? 0,
    },
    components: graph?.components.length ?? 0,
    cyclicComponents:
      graph?.components.filter((component) => component.length > 1 || selfLoops.has(component[0]!))
        .length ?? 0,
    ownership,
    topPredecessors: [...predecessorCount]
      .map(([entry, count]) => ({ entry, count }))
      .sort((a, b) => b.count - a.count || a.entry - b.entry)
      .slice(0, 20),
  }

  const result: SceneMigrationResult = {
    scenes,
    scriptIndex: library.index,
    scriptChunks: library.chunks,
    sprites: [...spriteDefs.values()],
    scriptLocale: tctx.locale,
    scriptReport: tctx.report,
    scriptGraphReport,
    scriptRegistryAudit: registry.auditRecords(),
    foldedHostileRoots,
    report,
  }
  const staticEntityBehaviorRoots = orderedScenes
    .flatMap((sourceScene) =>
      sourceScene.eventObjects.flatMap((entity) =>
        (
          [
            ['trigger', entity.triggerLabel],
            ['auto', entity.autoLabel],
          ] as const
        ).flatMap(([channel, label]) => {
          const rootAddress = addressOf(label)
          return rootAddress === undefined
            ? []
            : [
                {
                  sceneId: sceneSlug(sourceScene.sceneId),
                  entityId: `e${entity.id}`,
                  channel,
                  behaviorId: 'default',
                  rootAddress,
                } satisfies R13StaticEntityBehaviorRoot,
              ]
        }),
      ),
    )
    .sort(
      (left, right) =>
        left.sceneId.localeCompare(right.sceneId) ||
        left.entityId.localeCompare(right.entityId) ||
        left.channel.localeCompare(right.channel) ||
        left.rootAddress - right.rootAddress,
    )
  r13TranslationSessionFactories.set(result, () => {
    const baseSpriteIds = new Set(spriteDefs.keys())
    const sessionSpriteDefinitions = new Map(
      [...spriteDefs].map(([id, definition]) => [id, structuredClone(definition)] as const),
    )
    const session = createTranslateContext(sessionSpriteDefinitions, false)
    return {
      ctx: session.ctx,
      staticEntityBehaviorRoots: structuredClone(staticEntityBehaviorRoots),
      finish: () => ({
        locale: structuredClone(session.ctx.locale),
        spriteDefinitions: [...sessionSpriteDefinitions.values()]
          .filter((definition) => !baseSpriteIds.has(definition.id))
          .map((definition) => structuredClone(definition))
          .sort((left, right) => left.id.localeCompare(right.id)),
        report: structuredClone(session.ctx.report),
        scriptRegistryAudit: session.registry.auditRecords(),
        scriptRegistryBodies: Object.fromEntries(
          session.registry
            .auditRecords()
            .map((record) => [
              record.id,
              structuredClone(session.registry.bodyFor(record.id) ?? []),
            ]),
        ),
      }),
    }
  })
  return result
}

function bindFoldedInstructionOutcomes(stage: ScriptStage, bodyId: string): string {
  bindScriptStageInstructionOutcomeBody(stage, bodyId)
  return bodyId
}

/** scene 只保留持久 stage 壳；每个根体进入 scene chunk，避免场景 JSON 重复脚本树。 */
function externalizeSceneScripts(
  scene: SceneDef,
  registry: ScriptRegistry,
  sceneEntriesLifted: string[],
  palSemanticProfile: NonNullable<SceneMigrationOptions['palSemanticProfile']>,
): SceneDef {
  const bindStages = (
    stages: ScriptStage[] | undefined,
    source: string,
    liftEntry = false,
  ): ScriptStage[] | undefined =>
    stages?.map((stage, index) => {
      const id = `scene/${scene.id}/root/${source}/stage-${index}`
      bindScriptStageInstructionOutcomeBody(stage, id)
      const lifted = liftEntry
        ? liftEarlyDitherSceneEntry(stage, {
            allowWaitInPrepare: palSemanticProfile !== 'historical-r13-4',
          })
        : undefined
      const output = lifted?.stage ?? stage
      if (lifted?.kind === 'lifted') sceneEntriesLifted.push(id)
      const sourceAddresses = scriptStageSourceAddresses(stage)
      const ref = registry.registerRoot(id, output.body, {
        kind: 'content-entry',
        sources: [`scene/${scene.id}/${source}/stage-${index}`],
        ...(sourceAddresses.length ? { sourceAddresses } : {}),
      })
      return { ...output, body: [{ kind: 'callScript', ref }] }
    })

  return {
    ...scene,
    onEnter: bindStages(scene.onEnter, 'on-enter', true),
    onTeleport: bindStages(scene.onTeleport, 'on-teleport'),
    entities: scene.entities.map((entity) => ({
      ...entity,
      pages: entity.pages?.map((page, pageIndex) => ({
        ...page,
        trigger: page.trigger
          ? {
              ...page.trigger,
              stages: bindStages(
                page.trigger.stages,
                `entity-${entity.id}/page-${pageIndex}/trigger`,
              )!,
            }
          : undefined,
        auto: page.auto
          ? { stages: bindStages(page.auto.stages, `entity-${entity.id}/page-${pageIndex}/auto`)! }
          : undefined,
      })),
    })),
  }
}

/**
 * 0x6D post-pass:把 setSceneOnEnter/setSceneOnTeleport 的迁移期 `_addr` 占位解析为
 * clean ScriptStage[] 绑定。每段体注册进分片,命令只保留小型 callScript 根,避免多站点
 * 内联导致体积膨胀。嵌套 0x6D 逐轮解析;任何目标缺失都记 MigrationGap 并在写盘前失败。
 */
export function resolveSceneScriptPatches(
  scenes: SceneDef[],
  tctx: TranslateCtx,
  sceneEntriesLifted: string[] = [],
  additionalRoots: readonly unknown[] = [],
): void {
  const byId = new Map(scenes.map((s) => [s.id, s]))
  type Pending = {
    kind: 'setSceneOnEnter' | 'setSceneOnTeleport'
    scene: string
    stages: ScriptStage[]
    _addr?: number
    _sourceAddress?: number
    _owner?: string
    _path?: string
  }
  const collect = (o: unknown, out: Pending[]): void => {
    if (Array.isArray(o)) {
      for (const x of o) collect(x, out)
    } else if (o && typeof o === 'object') {
      const c = o as Pending
      if (
        (c.kind === 'setSceneOnEnter' || c.kind === 'setSceneOnTeleport') &&
        c._addr !== undefined
      )
        out.push(c)
      for (const v of Object.values(o)) collect(v, out)
    }
  }
  const bindingsByKey = new Map<string, ScriptStage[]>()
  const finishPlaceholder = (cmd: Pending): void => {
    delete cmd._addr
    delete cmd._sourceAddress
    delete cmd._owner
    delete cmd._path
  }
  for (let round = 0; round < 12; round++) {
    const pend: Pending[] = []
    for (const s of scenes) collect(s, pend)
    for (const body of tctx.registry?.commandBodies() ?? []) collect(body, pend)
    for (const root of additionalRoots) collect(root, pend)
    if (!pend.length) return
    for (const cmd of pend) {
      const slot = cmd.kind === 'setSceneOnEnter' ? 'on-enter' : 'on-teleport'
      const targetAddress = cmd._addr!
      const installerSourceAddress = cmd._sourceAddress
      const installerOwner = cmd._owner
      const installerPath = cmd._path
      const key = `${cmd.scene}|${slot}|${targetAddress}`
      let binding = bindingsByKey.get(key)
      if (!binding) {
        if (!byId.has(cmd.scene)) {
          recordMigrationGap(tctx, {
            sourceAddress: cmd._sourceAddress ?? -1,
            opcode: 0x6d,
            operands: [Number(cmd.scene.slice(1)) + 1, cmd._addr ?? 0, 0],
            owner: cmd._owner ?? 'scene',
            path: cmd._path,
            reason: `0x6D 目标场景不存在 ${cmd.scene}`,
          })
          finishPlaceholder(cmd)
          continue
        }
        const stages = translateStages(`L_${targetAddress}`, undefined, tctx)
        const folded = stages?.length ? foldStages(stages) : undefined
        if (!folded?.length) {
          recordMigrationGap(tctx, {
            sourceAddress: cmd._sourceAddress ?? -1,
            opcode: 0x6d,
            operands: [Number(cmd.scene.slice(1)) + 1, cmd._addr ?? 0, 0],
            owner: cmd._owner ?? 'scene',
            path: cmd._path,
            reason: `0x6D 目标脚本不可译 ${cmd.scene}:L_${targetAddress}`,
          })
          finishPlaceholder(cmd)
          continue
        }
        const battleDefaults: { battleFieldId?: number; battleMusic?: AssetId | null } = {}
        const cleanFolded = deepStripBattleCfg(folded, battleDefaults)
        const targetScene = byId.get(cmd.scene)!
        if (battleDefaults.battleFieldId !== undefined)
          targetScene.battleFieldId = battleDefaults.battleFieldId
        if (battleDefaults.battleMusic !== undefined)
          targetScene.battleMusic = battleDefaults.battleMusic
        binding = cleanFolded.map((stage, index) => {
          const id = `scene/${cmd.scene}/override/${slot}/L-${targetAddress}/stage-${index}`
          bindScriptStageInstructionOutcomeBody(stage, id)
          const lifted =
            slot === 'on-enter'
              ? liftEarlyDitherSceneEntry(stage, {
                  allowWaitInPrepare: tctx.palSemanticProfile !== 'historical-r13-4',
                })
              : undefined
          const output = lifted?.stage ?? stage
          if (lifted?.kind === 'lifted') sceneEntriesLifted.push(id)
          const sourceAddresses = scriptStageSourceAddresses(stage)
          const ref = tctx.registry?.registerRoot(id, output.body, {
            kind: 'scene-hook-override',
            sources: [
              `scene/${cmd.scene}/${slot}/L-${targetAddress}/stage-${index}`,
              ...(installerPath ? [`installer:${installerPath}`] : []),
            ],
            ...(sourceAddresses.length ? { sourceAddresses } : {}),
            sceneHook: {
              targetScene: cmd.scene,
              slot,
              targetAddress,
              ...(installerSourceAddress === undefined ? {} : { installerSourceAddress }),
              ...(installerOwner ? { installerOwner } : {}),
              ...(installerPath ? { installerPath } : {}),
            },
          })
          if (!ref) return output
          return { ...output, body: [{ kind: 'callScript', ref }] }
        })
        bindingsByKey.set(key, binding)
      }
      cmd.stages = binding
      finishPlaceholder(cmd)
    }
  }
  // 12 轮仍有剩(病理嵌套):阻断生成。
  const left: Pending[] = []
  for (const s of scenes) collect(s, left)
  for (const body of tctx.registry?.commandBodies() ?? []) collect(body, left)
  for (const root of additionalRoots) collect(root, left)
  for (const cmd of left)
    recordMigrationGap(tctx, {
      sourceAddress: cmd._sourceAddress ?? -1,
      opcode: 0x6d,
      operands: [Number(cmd.scene.slice(1)) + 1, cmd._addr ?? 0, 0],
      owner: cmd._owner ?? 'scene',
      path: cmd._path,
      reason: '0x6D 嵌套解析超过 12 轮',
    })
}

/** 深走任意结构,bake 出 BattleCfgMarker(0x4A/0x45)→ acc(last-wins)+ strip;返回同构清洁副本。 */
export function deepStripBattleCfg<T>(
  o: T,
  acc: { battleFieldId?: number; battleMusic?: AssetId | null },
): T {
  if (Array.isArray(o)) {
    const kept: unknown[] = []
    for (const x of o) {
      const m = x && typeof x === 'object' ? asBattleCfg(x as Command) : undefined
      if (m) {
        if (m.fieldId !== undefined) acc.battleFieldId = m.fieldId
        if (m.musicId !== undefined)
          acc.battleMusic = m.musicId <= 0 ? null : palMusicAssetId(m.musicId)
        continue // strip
      }
      kept.push(deepStripBattleCfg(x, acc))
    }
    return kept as unknown as T
  }
  if (o && typeof o === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) out[k] = deepStripBattleCfg(v, acc)
    copyScriptStageSourceAddressAudit(o, out)
    return out as T
  }
  return o
}

function assertNoBattleCfgMarkers(bodies: readonly Command[][]): void {
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((child, index) => {
        visit(child, `${path}[${index}]`)
      })
      return
    }
    if (!node || typeof node !== 'object') return
    if (asBattleCfg(node as Command))
      throw new Error(`迁移内部 BattleCfgMarker 泄漏到最终脚本: ${path}`)
    for (const [key, child] of Object.entries(node)) visit(child, `${path}.${key}`)
  }
  bodies.forEach((body, index) => {
    visit(body, `registry[${index}]`)
  })
}

/**
 * 战斗配置定案(替代旧 hoistBattleDefaults):把场景脚本里的 BattleCfgMarker(原版 0x4A/0x45)
 * bake 成 SceneDef.battleFieldId/battleMusic + 从脚本 strip 干净。**无持久态、无 override 命令**。
 * 顺序 onEnter→onTeleport→实体触发/巡逻,last-wins —— 赤鬼王/水魔兽类「打完 boss 设回区域曲」在
 * 触发段、晚于 enter,故区域常态值胜;特殊一次性战场早 fold 进 startBattle,打完自然回落此默认。
 */
export function finalizeBattleConfig(scene: SceneDef): SceneDef {
  const acc: { battleFieldId?: number; battleMusic?: AssetId | null } = {}
  const onEnter = scene.onEnter ? deepStripBattleCfg(scene.onEnter, acc) : undefined
  const onTeleport = scene.onTeleport ? deepStripBattleCfg(scene.onTeleport, acc) : undefined
  const entities = deepStripBattleCfg(scene.entities, acc)
  return {
    ...scene,
    ...(acc.battleFieldId !== undefined ? { battleFieldId: acc.battleFieldId } : {}),
    ...(acc.battleMusic !== undefined ? { battleMusic: acc.battleMusic } : {}),
    ...(onEnter ? { onEnter } : {}),
    ...(onTeleport ? { onTeleport } : {}),
    entities,
  }
}

/**
 * 战场/战斗乐默认传播(铁律4收尾):有战斗(startBattle 命令或 hostile 实体)但无默认的场景,
 * 原版靠全局变量残留继承上游值——沿 loadScene 图 fixpoint 取**唯一**上游值静态化;
 * 多值歧义/无上游的留空(运行时项目默认)记 report 待人工定值。
 */
export function propagateBattleFieldDefaults(
  scenes: SceneDef[],
  report: SceneMigrationResult['report'],
  registry?: ScriptRegistry,
): void {
  const hasBattle = new Set<string>()
  const loads = new Map<string, Set<string>>()
  const visitedRefs = new Set<string>()
  const walk = (node: unknown, sid: string): void => {
    if (Array.isArray(node)) {
      for (const v of node) walk(v, sid)
      return
    }
    if (!node || typeof node !== 'object') return
    const o = node as Record<string, unknown>
    if (o.kind === 'startBattle') hasBattle.add(sid)
    if (o.kind === 'loadScene' && typeof o.scene === 'string') {
      let set = loads.get(sid)
      if (!set) {
        set = new Set()
        loads.set(sid, set)
      }
      set.add(o.scene)
    }
    if ((o.kind === 'callScript' || o.kind === 'jumpScript') && o.ref && registry) {
      const ref = o.ref as { id?: unknown }
      if (typeof ref.id === 'string' && !visitedRefs.has(`${sid}:${ref.id}`)) {
        visitedRefs.add(`${sid}:${ref.id}`)
        const body = registry.bodyFor(ref.id)
        if (body) walk(body, sid)
      }
    }
    for (const v of Object.values(o)) walk(v, sid)
  }
  for (const s of scenes) {
    walk(s.onEnter ?? [], s.id)
    walk(s.entities, s.id)
    if (s.entities.some((e) => e.hostile)) hasBattle.add(s.id)
  }
  const preds = new Map<string, Set<string>>()
  for (const [src, tgts] of loads)
    for (const t of tgts) {
      let set = preds.get(t)
      if (!set) {
        set = new Set()
        preds.set(t, set)
      }
      set.add(src)
    }
  const fill = <T>(
    read: (scene: SceneDef) => T | undefined,
    write: (scene: SceneDef, value: T) => void,
    unresolved: boolean,
  ): string[] => {
    const known = new Map<string, T>()
    for (const s of scenes) {
      const value = read(s)
      if (value !== undefined) known.set(s.id, value)
    }
    for (let round = 0; round < 40; round++) {
      let changed = false
      for (const s of scenes) {
        if (known.has(s.id)) continue
        const vals = new Set<T>()
        for (const p of preds.get(s.id) ?? []) {
          const v = known.get(p)
          if (v !== undefined && p !== s.id) vals.add(v)
        }
        if (vals.size === 1) {
          known.set(s.id, [...vals][0]!)
          changed = true
        }
      }
      if (!changed) break
    }
    const filled: string[] = []
    for (const s of scenes) {
      if (!hasBattle.has(s.id) || read(s) !== undefined) continue
      const v = known.get(s.id)
      if (v !== undefined) {
        write(s, v)
        filled.push(`${s.id}←${String(v)}`)
      } else if (unresolved) {
        report.battleFieldUnresolved ??= []
        report.battleFieldUnresolved.push(s.id)
      }
    }
    return filled
  }
  const f = fill(
    (scene) => scene.battleFieldId,
    (scene, value) => {
      scene.battleFieldId = value
    },
    true,
  )
  fill(
    (scene) => scene.battleMusic,
    (scene, value) => {
      scene.battleMusic = value
    },
    false,
  )
  if (f.length) report.battleFieldsPropagated = f
}
