// 物品 / 装备数据 ① 层。见 docs/phase2/foundation/item-data-design.md。
// 阶段隔离(D18):纯 content 数据 + 类型,无 reforge/引擎依赖。

import type { ActorDef } from './actor.js'
import type { AssetId } from './asset.js'
import type { ElementVec } from './battle-formulas.js'
import type { CharacterInstance, WorldState } from './character.js'
import { applyPoisonSelf, poisonCurableBy } from './poison.js'
import type { ScriptRef } from './script-library.js'
import type { StatusId } from './skill.js'

/** 战斗属性(对齐 CharacterInstance 的 5 项)。 */
export type CombatStat = 'attack' | 'magicAttack' | 'defense' | 'speed' | 'luck'

/** 6 装备槽(对齐原版 body part;名按"装什么"取,见 design §4)。 */
export const EQUIP_SLOT_IDS = ['weapon', 'head', 'body', 'cloak', 'feet', 'accessory'] as const
export type EquipSlot = (typeof EQUIP_SLOT_IDS)[number]

/** 装备效果 = clean-rewrite scriptOnEquip 的 opcode(0x17/0x1A/0x2D);复用技能地基 StatusId/skillId。 */
export type EquipEffect =
  | { kind: 'statBonus'; stat: CombatStat; delta: number } // 0x17(可负,如铁锁衣防御-10)
  | {
      kind: 'resistance'
      element: 'poison' | 'wind' | 'thunder' | 'water' | 'fire' | 'earth'
      percent: number
    } // 0x17[22-27]
  | { kind: 'maxPool'; pool: 'hp' | 'mp'; delta: number } // 0x1A
  | { kind: 'grantStatus'; status: StatusId } // 0x2D 永久(仙女剑→连击)
  | { kind: 'grantSkill'; skillId: string } // 0x1A row65 授合击/召唤(土灵珠→山神 336)
  | { kind: 'battleSprite'; sprite: string } // 0x1A row1 战斗形象覆写；按装备槽顺序 live 派生
  | { kind: 'attackAll' } // 0x1A(长鞭)
  // 战斗内每回合回血/回蓝(寿葫芦等;原版借 level99「伪毒」实现,clean 版正名为独立词条 ——
  // 不复用毒系统这个省空间拖鞋)。
  | { kind: 'regenHp'; amount: number }
  | { kind: 'regenMp'; amount: number }

export interface EquipSpec {
  slot: EquipSlot
  equipableBy: string[] // 角色模板 id(原 equipableBy[6] bitfield → 稳定 id);demo 仅 li-xiaoyao
  effects: EquipEffect[]
}

/** 装备效果 → 人读效果文案(唯一出处)。**说明 desc 只写风味,数值一律派生自此**——
 *  编辑器只读预览 + 运行时详情框/装备菜单都调它,彻底杜绝「说明写 +14、实际 delta 不一定」的脱节。 */
export interface EquipDescribeCtx {
  skillName?: (skillId: string) => string | undefined // grantSkill 授技能:id→名,缺省回退 id
  battleSpriteName?: (spriteId: string) => string | undefined
}
const STAT_LABEL: Record<CombatStat, string> = {
  attack: '武术',
  magicAttack: '灵力',
  defense: '防御',
  speed: '身法',
  luck: '吉运',
}
const EQUIP_ELEM_LABEL: Record<'poison' | 'wind' | 'thunder' | 'water' | 'fire' | 'earth', string> =
  { poison: '毒', wind: '风', thunder: '雷', water: '水', fire: '火', earth: '土' }
const EQUIP_STATUS_LABEL: Record<StatusId, string> = {
  confused: '混乱',
  paralyzed: '定身',
  sleep: '睡眠',
  silence: '沉默',
  puppet: '傀儡',
  bravery: '神勇',
  protect: '护体',
  haste: '加速',
  dualAttack: '连击',
}
const signed = (n: number): string => (n >= 0 ? `+${n}` : `${n}`)

/** 派生装备效果行(风味 desc 之外的机制文案)。数值(属性+上限+抗性)并成一行、全角空格分隔
 *  (照原版 desc 密度,省详情框空间);攻击全体/常驻状态/授技能/回合回复各占一行。空数组→ []。 */
export function describeEquipEffects(
  effects: readonly EquipEffect[],
  ctx?: EquipDescribeCtx,
): string[] {
  const numericPieces: string[] = [] // 武术+20 身法+20 体力上限+50 避火率+30%(全并一行)
  const extraLines: string[] = [] // 攻击全体 / 常驻·连击 / 习得·山神 / 每回合回体力+20
  for (const e of effects) {
    switch (e.kind) {
      case 'statBonus':
        numericPieces.push(`${STAT_LABEL[e.stat]}${signed(e.delta)}`)
        break
      case 'maxPool':
        numericPieces.push(`${e.pool === 'hp' ? '体力' : '真气'}上限${signed(e.delta)}`)
        break
      case 'resistance':
        numericPieces.push(`避${EQUIP_ELEM_LABEL[e.element]}率${signed(e.percent)}%`) // 照原版灵珠措辞「避X率」
        break
      case 'attackAll':
        extraLines.push('攻击全体')
        break
      case 'grantStatus':
        extraLines.push(`常驻·${EQUIP_STATUS_LABEL[e.status]}`)
        break
      case 'grantSkill':
        extraLines.push(`习得·${ctx?.skillName?.(e.skillId) ?? e.skillId}`)
        break
      case 'battleSprite':
        extraLines.push(`战斗形象·${ctx?.battleSpriteName?.(e.sprite) ?? e.sprite}`)
        break
      case 'regenHp':
        extraLines.push(`每回合回体力${signed(e.amount)}`)
        break
      case 'regenMp':
        extraLines.push(`每回合回真气${signed(e.amount)}`)
        break
    }
  }
  const out: string[] = []
  if (numericPieces.length) out.push(numericPieces.join('　'))
  out.push(...extraLines)
  return out
}

/** 使用效果 = 独立联合(≠ SkillEffect):回复类概念重叠 + 脚本/剧情/场景类。本期起步几个 kind,做使用菜单时扩充。 */
export interface ItemAmount {
  itemId: string
  count: number
}

export interface ItemRecipe {
  /** 满足多条配方时按数组顺序采用第一条；材料与产物均使用稳定 ItemData.id。 */
  ingredients: ItemAmount[]
  products: ItemAmount[]
}

export type ItemUseEffect =
  | { kind: 'healHp'; amount: number }
  | { kind: 'healMp'; amount: number }
  | { kind: 'revive'; hpPercent: number } // 0x22(还魂香/赎魂灯;同技能 revive)
  | { kind: 'applyStatus'; status: StatusId; turns: number }
  | { kind: 'removeStatus'; statuses: StatusId[] } // 0x2F(灵心符/银针)
  | { kind: 'applyPoison'; poisonId: string } // 0x29(尸腐肉/毒蛇卵——下毒食物)
  | { kind: 'curePoison'; curesTier?: import('./poison.js').PoisonCurability; poisonId?: string } // 0x2B/0x2C(糯米/雄黄/九节菖蒲)
  | { kind: 'permanentStatBoost'; stat: CombatStat | 'maxHP' | 'maxMP'; delta: number } // 0x19(舍利子/雪蛤蟆——永久成长)
  | { kind: 'gate'; chance?: number } // 0x6 概率门(盐巴 50% 解毒);失败截断其后
  | { kind: 'dieIfNotPoisoned' } // 0x61(毒龙胆/九阴散):没中毒则秒杀自己,否则续跑后效(解毒/回血)
  /** 长剧情仍是一等共享脚本；引用必须完整、可校验、可反跳。 */
  | { kind: 'runScript'; script: ScriptRef }
  /** 调用当前场景的命名钩子；目的地与前置清理由场景数据决定，物品不写死场景。 */
  | { kind: 'runSceneHook'; hook: 'onTeleport'; unavailableMessage?: string }
  /** 按顺序选择第一条材料充足的配方，原子扣材料并给产物。 */
  | { kind: 'craftRecipe'; recipes: ItemRecipe[]; unavailableMessage?: string }
  /** 从世界资源池抽取 1..value，封顶后扣值，并按档位给奖励。 */
  | {
      kind: 'drawFromResourcePool'
      resource: string
      maxRoll: number
      rewards: ItemAmount[]
      unavailableMessage?: string
    }
  | { kind: 'extraPoisonRes'; amount: number } // 0x17(大蒜):临时毒抗 Extra,带入战斗、三件套清
  // 0x5C(隐蛊):全队隐身 turns 回合 —— 敌整轮跳过(连 turnStart choreo 都不跑)、队员画面消失。
  // CLASSIC 语义(一阶段 iHidingTime 三函数):存负值待激活 → 行动步前取反激活 → 轮末 −1
  | { kind: 'hideParty'; turns: number }
// 待扩充(B2 剧情脚本落地后):giveItems / giveMoney / learnSkill / scenePlace / transform …

/** 所有用途效果 kind 的编译期完整表；validator 与编辑器不得各维护一份漂移名单。 */
export const ITEM_USE_EFFECT_KINDS = {
  healHp: true,
  healMp: true,
  revive: true,
  applyStatus: true,
  removeStatus: true,
  applyPoison: true,
  curePoison: true,
  permanentStatBoost: true,
  gate: true,
  dieIfNotPoisoned: true,
  runScript: true,
  runSceneHook: true,
  craftRecipe: true,
  drawFromResourcePool: true,
  extraPoisonRes: true,
  hideParty: true,
} satisfies Record<ItemUseEffect['kind'], true>

export interface UseSpec {
  /** 显式目标；禁止缺省，避免大世界与战斗把同一用途分别解释成队长/施用者。 */
  target: 'oneAlly' | 'allAllies' | 'self' | 'scene'
  consuming: boolean
  effects: ItemUseEffect[]
  /** 本物品使用链自带的表现音；缺席时由战斗物品提示音 role 决定。 */
  sound?: AssetId
  /** 战斗专用(原版 wFlags 只带 UsableInBattle,如隐蛊):大世界使用菜单不列。缺省 = 两边可用。 */
  battleOnly?: boolean
  /** 成功后菜单去向；缺省保留当前菜单，场景切换类通常为 close。 */
  menuAfterUse?: 'keep' | 'close'
}

export type ItemUseContext = 'world' | 'battle' | 'throw'

function assertNever(value: never, context: string): never {
  throw new Error(`${context}: 未处理的物品效果 ${JSON.stringify(value)}`)
}

/** effect×context 的唯一真源；菜单过滤、校验与运行时都消费它。 */
export function itemUseEffectSupportsContext(
  effect: ItemUseEffect,
  context: ItemUseContext,
): boolean {
  switch (effect.kind) {
    case 'runScript':
    case 'runSceneHook':
    case 'craftRecipe':
    case 'drawFromResourcePool':
      return context === 'world'
    case 'hideParty':
      return context === 'battle'
    case 'permanentStatBoost':
      // 永久成长要写回 CharacterInstance；战斗临时态没有这条持久写回通道。
      return context === 'world'
    case 'applyPoison':
      return true
    case 'healHp':
    case 'healMp':
    case 'revive':
    case 'applyStatus':
    case 'removeStatus':
    case 'curePoison':
    case 'gate':
    case 'dieIfNotPoisoned':
    case 'extraPoisonRes':
      return context !== 'throw'
    default:
      return assertNever(effect, 'itemUseEffectSupportsContext')
  }
}

export function itemUseSupportsContext(use: UseSpec, context: ItemUseContext): boolean {
  if (context === 'world' && use.battleOnly) return false
  return use.effects.every((effect) => itemUseEffectSupportsContext(effect, context))
}

/** 战斗投掷,phase3 细化。 */
export interface ThrowSpec {
  effects: ItemUseEffect[] // 占位:投掷效果届时可能独立联合
  /** 投掷链显式表现音；缺席表示没有物品专属音。 */
  sound?: AssetId
}

/** 物品基类。能力块(equip/use/throw)可叠加;菜单按能力块过滤(灵珠双重身份零特判)。 */
export interface ItemData {
  id: string // demo = 原版 oid 字符串;当不透明 string
  name: string
  desc: string[] // 物品说明(原版 scriptDesc 多行:风味行 + 效果行),逐行渲染
  /** 图标资源；缺席表示刻意无图。 */
  icon?: AssetId
  buyPrice: number
  sellPrice: number
  sellable: boolean
  equip?: EquipSpec
  use?: UseSpec
  throw?: ThrowSpec
}

/** 物品数据表(id → ItemData)。去全局化:操作物品的函数收这个类型(显式注入),不再默认吃 DEMO_ITEMS。 */
export type ItemDataMap = Record<string, ItemData>

/** 有效属性 = 角色 base + Σ 已穿戴装备的 statBonus(该 stat)。纯函数,镜像 phase-1 equip-effect。
 *  resist/grant/maxPool/attackAll 的运行时计算 = phase3 引擎,本函数只算 statBonus。 */
export function effectiveStat(
  char: CharacterInstance,
  stat: CombatStat,
  items: Readonly<Record<string, Pick<ItemData, 'equip'>>>,
): number {
  const base: Record<CombatStat, number> = {
    attack: char.attack,
    magicAttack: char.magicAttack,
    defense: char.defense,
    speed: char.speed,
    luck: char.luck,
  }
  let v = base[stat]
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind === 'statBonus' && eff.stat === stat) v += eff.delta
    }
  }
  return v
}

/**
 * 有效抗性 = Σ 已穿戴装备的 resistance(五灵 + 毒),上限 100(fight.c poisonRes/elemRes 累加封顶)。
 * **live 派生(红线):每次 battle 建态时读装备算,严禁 equip 时烙进可变槽**——卸装即失效,
 * 原版 RemoveEquipmentEffect 语义天然满足。玩家侧喂 calcMagicDamage.elemRes/poisonRes。
 */
export function effectiveResistances(
  char: CharacterInstance,
  items: Record<string, ItemData>,
): { elemRes: ElementVec; poisonRes: number } {
  const elem = { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 }
  let poison = 0
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind !== 'resistance') continue
      if (eff.element === 'poison') poison += eff.percent
      else elem[eff.element] += eff.percent
    }
  }
  return {
    elemRes: {
      wind: Math.min(100, elem.wind),
      thunder: Math.min(100, elem.thunder),
      water: Math.min(100, elem.water),
      fire: Math.min(100, elem.fire),
      earth: Math.min(100, elem.earth),
    },
    poisonRes: Math.min(100, poison),
  }
}

/**
 * 有效技能 = 已学技能 ∪ 装备授予技能(grantSkill;土灵珠授山神、圣灵珠授术)。
 * **live 派生(红线):learnedSkills ∪ 装备授予集,严禁 equip 时烙进 learnedSkills 可变槽**
 * —— 卸装即失效(原版 UpdateEquipments memset 重跑 scriptOnEquip 语义)。去重保序(学的在前)。
 */
export function effectiveSkills(
  learned: readonly string[],
  char: CharacterInstance,
  items: Record<string, ItemData>,
): string[] {
  const out = [...learned]
  const seen = new Set(learned)
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind === 'grantSkill' && !seen.has(eff.skillId)) {
        seen.add(eff.skillId)
        out.push(eff.skillId)
      }
    }
  }
  return out
}

/**
 * 当前战斗形象的唯一派生口：Actor 基础 → 持久 appearance → 固定装备槽顺序 → 战斗 transient。
 * 装备与 transient 都是 live 计算，绝不烙回 ActorDef/CharacterInstance。
 */
export function effectiveBattleSpriteId(
  char: CharacterInstance,
  actor: ActorDef | undefined,
  items: Record<string, ItemData>,
  transient?: string,
): string | undefined {
  let battleSprite = actor?.battler?.battleSprite
  if (char.appearance?.battleSprite) battleSprite = char.appearance.battleSprite
  for (const slot of EQUIP_SLOT_IDS) {
    const itemId = char.equipment[slot]
    if (!itemId) continue
    for (const effect of items[itemId]?.equip?.effects ?? [])
      if (effect.kind === 'battleSprite') battleSprite = effect.sprite
  }
  return transient ?? battleSprite
}

/**
 * 装备授予的常驻状态(grantStatus;仙女剑→连击 dualAttack)。返回 StatusId 列表。
 * **live 派生(红线):建态时读装备,严禁 equip 时烙进 status 可变槽**——卸装即失效。
 */
export function effectiveGrantedStatuses(
  char: CharacterInstance,
  items: Record<string, ItemData>,
): StatusId[] {
  const out: StatusId[] = []
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind === 'grantStatus' && !out.includes(eff.status)) out.push(eff.status)
    }
  }
  return out
}

/** 该角色装备是否授予「攻击全体」(长鞭 attackAll;live 派生红线同上)。 */
export function equipGrantsAttackAll(
  char: CharacterInstance,
  items: Record<string, ItemData>,
): boolean {
  for (const itemId of Object.values(char.equipment))
    for (const eff of items[itemId]?.equip?.effects ?? []) if (eff.kind === 'attackAll') return true
  return false
}

/**
 * 战斗内每回合回血/回蓝(寿葫芦等 regenHp/regenMp 词条累加)。**live 派生(红线):建态读装备,
 * 卸对应部位即失效**(替代原版 level99「伪毒」的省空间拖鞋 —— clean 版正名为独立词条)。
 */
export function effectiveRegen(
  char: CharacterInstance,
  items: Record<string, ItemData>,
): { hp: number; mp: number } {
  let hp = 0
  let mp = 0
  for (const itemId of Object.values(char.equipment)) {
    for (const eff of items[itemId]?.equip?.effects ?? []) {
      if (eff.kind === 'regenHp') hp += eff.amount
      else if (eff.kind === 'regenMp') mp += eff.amount
    }
  }
  return { hp, mp }
}

/** 背包里该角色可装的物品(equip 能力 + equipableBy 含其模板)。 */
export function equippableItems(
  world: WorldState,
  casterId: string,
  items: ItemDataMap,
): ItemData[] {
  const member = world.party.find((c) => c.id === casterId)
  if (!member) return []
  return world.inventory
    .filter((e) => e.count > 0)
    .map((e) => items[e.itemId])
    .filter((it): it is ItemData => it != null)
    .filter((it) => it.equip?.equipableBy.includes(member.template))
}

function addToInventory(
  inv: { itemId: string; count: number }[],
  itemId: string,
  n: number,
): { itemId: string; count: number }[] {
  if (inv.some((x) => x.itemId === itemId)) {
    return inv.map((x) => (x.itemId === itemId ? { ...x, count: x.count + n } : x))
  }
  return [...inv, { itemId, count: n }]
}

function removeFromInventory(
  inv: { itemId: string; count: number }[],
  itemId: string,
  n: number,
): { itemId: string; count: number }[] {
  return inv
    .map((x) => (x.itemId === itemId ? { ...x, count: x.count - n } : x))
    .filter((x) => x.count > 0)
}

/** 换装:itemId 入其 slot,旧件回包。返回新 WorldState(不可变);非法操作原样返回。 */
export function equipItem(
  world: WorldState,
  casterId: string,
  itemId: string,
  items: ItemDataMap,
): WorldState {
  const item = items[itemId]
  const slot = item?.equip?.slot
  const member = world.party.find((c) => c.id === casterId)
  if (!item?.equip || !slot || !member) return world
  if (!item.equip.equipableBy.includes(member.template)) return world
  if (!world.inventory.some((e) => e.itemId === itemId && e.count > 0)) return world

  const oldItemId = member.equipment[slot]
  const party = world.party.map((c) =>
    c.id === casterId ? { ...c, equipment: { ...c.equipment, [slot]: itemId } } : c,
  )
  let inventory = removeFromInventory(world.inventory, itemId, 1)
  if (oldItemId) inventory = addToInventory(inventory, oldItemId, 1)
  return { ...world, party, inventory }
}

/** 任意队员任意槽位穿戴中的物品 id 集合(渲染层据此把装备中的物品标绿)。 */
export function equippedItemIds(world: WorldState): Set<string> {
  const ids = new Set<string>()
  for (const c of world.party) {
    for (const id of Object.values(c.equipment)) {
      if (id) ids.add(id)
    }
  }
  return ids
}

/** 使用菜单列表:背包里有 use 能力块的 + 穿戴中但本身可用的(灵珠系)。
 *  后者照搬原版 itemmenu.c:136-145 —— 灵珠穿着也能用(如土灵珠脱离洞窟),渲染层标绿。 */
export function usableItems(world: WorldState, items: ItemDataMap): ItemData[] {
  const invUsable = world.inventory
    .filter((e) => e.count > 0)
    .map((e) => items[e.itemId])
    .filter((it): it is ItemData => it?.use != null && itemUseSupportsContext(it.use, 'world'))
  const invIds = new Set(invUsable.map((it) => it.id))
  const equippedUsable: ItemData[] = []
  for (const id of equippedItemIds(world)) {
    const it = items[id]
    if (it?.use != null && itemUseSupportsContext(it.use, 'world') && !invIds.has(id))
      equippedUsable.push(it)
  }
  return [...invUsable, ...equippedUsable]
}

export type ExternalItemUseEffect = Extract<ItemUseEffect, { kind: 'runScript' | 'runSceneHook' }>

/** 单个用途效果的结构化执行记录；数组顺序与 UseSpec.effects 完全一致。 */
export interface WorldItemUseEffectResult {
  index: number
  kind: ItemUseEffect['kind']
  changed: boolean
  targetCharIds?: string[]
  gate?: { chance: number; roll: number; passed: boolean }
  recipe?: {
    recipeIndex: number
    ingredients: ItemAmount[]
    products: ItemAmount[]
  }
  resourceDraw?: {
    resource: string
    valueBefore: number
    rolled: number
    tier: number
    spent: number
    valueAfter: number
    reward: ItemAmount
  }
}

/** 交给 Reforge 表现层的数据；内容层不决定框的位置、停留时间或输入方式。 */
export interface WorldItemUsePresentation {
  kind: 'item-result'
  source: 'craftRecipe' | 'drawFromResourcePool'
  items: ItemAmount[]
}

export interface WorldItemUseOutcome {
  status: 'success' | 'failure' | 'external'
  world: WorldState
  consumed: boolean
  changed: boolean
  /** 已执行/尝试的效果结果；成功时完整且严格保序。 */
  effectResults: WorldItemUseEffectResult[]
  /** 需要独立结果框呈现的产物；不靠具体 PAL itemId 判断。 */
  presentations: WorldItemUsePresentation[]
  /** 只有 status=external 时存在；reforge 必须逐项执行并据真实结果决定是否消耗。 */
  externalEffects?: ExternalItemUseEffect[]
  reason?:
    | 'unknown-item'
    | 'missing-target'
    | 'not-owned'
    | 'wrong-context'
    | 'invalid-effect-chain'
    | 'gate-failed'
    | 'missing-materials'
    | 'empty-resource-pool'
    | 'external-unavailable'
  message?: string
  menu: 'keep' | 'close'
}

function cloneWorldForItemUse(world: WorldState): WorldState {
  return {
    ...world,
    party: world.party.map((character) => ({
      ...character,
      equipment: { ...character.equipment },
      poisons: character.poisons?.map((poison) => ({ ...poison })),
      extraStatuses: character.extraStatuses?.map((status) => ({ ...status })),
    })),
    inventory: world.inventory.map((entry) => ({ ...entry })),
    ...(world.resources ? { resources: { ...world.resources } } : {}),
  }
}

function inventoryCount(world: WorldState, itemId: string): number {
  return world.inventory.find((entry) => entry.itemId === itemId)?.count ?? 0
}

/**
 * 世界物品持有数：背包 + 当前队伍装备。脚本条件、配方与实际扣除必须共用这一口径，
 * 否则会出现“条件判断有材料，真正结算却扣不到”的双真相。
 */
export function ownedItemCount(world: WorldState, itemId: string): number {
  return (
    inventoryCount(world, itemId) +
    world.party.reduce(
      (count, character) =>
        count + Object.values(character.equipment).filter((equipped) => equipped === itemId).length,
      0,
    )
  )
}

/**
 * 背包优先、装备兜底地扣除物品。装备槽使用显式稳定顺序，不能依赖对象键插入顺序；
 * 该顺序也固定了迁移 PAL 内容时的兼容结果。
 */
const EQUIPMENT_REMOVAL_ORDER = ['head', 'body', 'cloak', 'weapon', 'feet', 'accessory'] as const

export function removeOwnedItems(world: WorldState, itemId: string, count: number): number {
  let remaining = Math.max(0, Math.floor(count))
  const entry = world.inventory.find((candidate) => candidate.itemId === itemId)
  if (entry && remaining > 0) {
    const removed = Math.min(entry.count, remaining)
    entry.count -= removed
    remaining -= removed
    if (entry.count <= 0) world.inventory.splice(world.inventory.indexOf(entry), 1)
  }
  for (const character of world.party) {
    if (remaining <= 0) break
    for (const slot of EQUIPMENT_REMOVAL_ORDER) {
      if (character.equipment[slot] !== itemId) continue
      const equipment = { ...character.equipment }
      delete equipment[slot]
      character.equipment = equipment
      remaining--
      if (remaining <= 0) break
    }
  }
  return Math.max(0, Math.floor(count)) - remaining
}

function aggregateItemAmounts(entries: readonly ItemAmount[]): Map<string, number> {
  const totals = new Map<string, number>()
  for (const entry of entries)
    totals.set(entry.itemId, (totals.get(entry.itemId) ?? 0) + entry.count)
  return totals
}

function normalizedItemAmounts(entries: readonly ItemAmount[]): ItemAmount[] {
  return [...aggregateItemAmounts(entries)].map(([itemId, count]) => ({ itemId, count }))
}

/** 世界资源访问唯一入口；历史 `collectValue` 在这里兼容，不复制进 resources。 */
export function worldResourceValue(world: WorldState, key: string): number {
  if (key.trim().length === 0) throw new Error('worldResourceValue: 资源键不能为空')
  const value = key === 'collectValue' ? (world.collectValue ?? 0) : (world.resources?.[key] ?? 0)
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`worldResourceValue: 资源 "${key}" 必须是非负安全整数`)
  return value
}

function setWorldResourceValue(world: WorldState, key: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`setWorldResourceValue: 资源 "${key}" 必须是非负安全整数`)
  const next = value
  if (key === 'collectValue') world.collectValue = next
  else world.resources = { ...(world.resources ?? {}), [key]: next }
}

function changeInventory(world: WorldState, itemId: string, delta: number): void {
  world.inventory =
    delta >= 0
      ? addToInventory(world.inventory, itemId, delta)
      : removeFromInventory(world.inventory, itemId, -delta)
}

function consumeItem(world: WorldState, itemId: string, shouldConsume: boolean): boolean {
  if (!shouldConsume) return false
  return removeOwnedItems(world, itemId, 1) === 1
}

/**
 * 大世界用途纯执行器。所有纯效果按数组顺序执行并返回结构化 outcome；脚本/场景钩子
 * 不在 content 层假执行，而以 `external` 交给 reforge host。外部效果为保证事务边界，
 * 当前必须独占效果链（校验器也执行同一规则）。
 */
export function resolveWorldItemUse(
  world: WorldState,
  targetCharId: string,
  itemId: string,
  items: ItemDataMap,
  poisonDefs?: Record<number, import('./poison.js').PoisonDef>,
  rng: () => number = Math.random,
): WorldItemUseOutcome {
  const item = items[itemId]
  const menu = item?.use?.menuAfterUse ?? 'keep'
  if (!item?.use)
    return {
      status: 'failure',
      world,
      consumed: false,
      changed: false,
      effectResults: [],
      presentations: [],
      reason: 'unknown-item',
      menu,
    }
  const useSpec = item.use
  if (!itemUseSupportsContext(useSpec, 'world'))
    return {
      status: 'failure',
      world,
      consumed: false,
      changed: false,
      effectResults: [],
      presentations: [],
      reason: 'wrong-context',
      menu,
    }
  const inInventory = world.inventory.some((e) => e.itemId === itemId && e.count > 0)
  const equipped = equippedItemIds(world).has(itemId)
  if (!inInventory && !equipped)
    return {
      status: 'failure',
      world,
      consumed: false,
      changed: false,
      effectResults: [],
      presentations: [],
      reason: 'not-owned',
      menu,
    }

  const external = useSpec.effects.filter(
    (effect): effect is ExternalItemUseEffect =>
      effect.kind === 'runScript' || effect.kind === 'runSceneHook',
  )
  if (external.length > 0) {
    if (external.length !== 1 || useSpec.effects.length !== 1)
      return {
        status: 'failure',
        world,
        consumed: false,
        changed: false,
        effectResults: [],
        presentations: [],
        reason: 'invalid-effect-chain',
        menu,
      }
    return {
      status: 'external',
      world,
      consumed: false,
      changed: false,
      effectResults: external.map((effect, index) => ({
        index,
        kind: effect.kind,
        changed: false,
      })),
      presentations: [],
      externalEffects: external,
      menu,
    }
  }

  const needsTarget = useSpec.effects.some((effect) =>
    [
      'healHp',
      'healMp',
      'revive',
      'applyStatus',
      'removeStatus',
      'applyPoison',
      'curePoison',
      'permanentStatBoost',
      'dieIfNotPoisoned',
      'extraPoisonRes',
    ].includes(effect.kind),
  )
  const selectedTarget = world.party.find((character) => character.id === targetCharId)
  if (needsTarget && useSpec.target !== 'allAllies' && !selectedTarget)
    return {
      status: 'failure',
      world,
      consumed: false,
      changed: false,
      effectResults: [],
      presentations: [],
      reason: 'missing-target',
      menu,
    }

  const nextWorld = cloneWorldForItemUse(world)
  const targetIds =
    useSpec.target === 'allAllies'
      ? new Set(nextWorld.party.map((character) => character.id))
      : new Set(selectedTarget ? [selectedTarget.id] : [])
  let changed = false
  const stoppedTargets = new Set<string>()
  const effectResults: WorldItemUseEffectResult[] = []
  const presentations: WorldItemUsePresentation[] = []

  for (const [effectIndex, eff] of useSpec.effects.entries()) {
    if (eff.kind === 'gate') {
      const chance = Math.max(0, Math.min(100, eff.chance ?? 100))
      const roll = 1 + Math.floor(Math.max(0, Math.min(0.999999999, rng())) * 100)
      const passed = roll < chance
      effectResults.push({
        index: effectIndex,
        kind: eff.kind,
        changed: false,
        gate: { chance, roll, passed },
      })
      // 原版 0x06: RandomLong(1,100) < threshold 才通过，因此阈值 N 的成功率是 N-1%。
      if (!passed)
        return {
          status: 'failure',
          world,
          consumed: false,
          changed: false,
          effectResults,
          presentations: [],
          reason: 'gate-failed',
          menu,
        }
      continue
    }
    if (eff.kind === 'craftRecipe') {
      const recipeIndex = eff.recipes.findIndex((candidate) =>
        [...aggregateItemAmounts(candidate.ingredients)].every(
          ([itemId, count]) => ownedItemCount(nextWorld, itemId) >= count,
        ),
      )
      const recipe = eff.recipes[recipeIndex]
      if (!recipe)
        return {
          status: 'failure',
          world,
          consumed: false,
          changed: false,
          effectResults: [...effectResults, { index: effectIndex, kind: eff.kind, changed: false }],
          presentations: [],
          reason: 'missing-materials',
          message: eff.unavailableMessage,
          menu,
        }
      const ingredients = normalizedItemAmounts(recipe.ingredients)
      const products = normalizedItemAmounts(recipe.products)
      for (const ingredient of ingredients)
        removeOwnedItems(nextWorld, ingredient.itemId, ingredient.count)
      for (const product of products) changeInventory(nextWorld, product.itemId, product.count)
      changed = true
      effectResults.push({
        index: effectIndex,
        kind: eff.kind,
        changed: true,
        recipe: { recipeIndex, ingredients, products },
      })
      presentations.push({ kind: 'item-result', source: eff.kind, items: products })
      continue
    }
    if (eff.kind === 'drawFromResourcePool') {
      const value = worldResourceValue(nextWorld, eff.resource)
      if (value <= 0 || eff.rewards.length === 0 || eff.maxRoll <= 0)
        return {
          status: 'failure',
          world,
          consumed: false,
          changed: false,
          effectResults: [...effectResults, { index: effectIndex, kind: eff.kind, changed: false }],
          presentations: [],
          reason: 'empty-resource-pool',
          message: eff.unavailableMessage,
          menu,
        }
      const rolled = Math.min(
        value,
        1 + Math.floor(Math.max(0, Math.min(0.999999999, rng())) * value),
      )
      const tier = Math.min(rolled, eff.maxRoll)
      const reward = eff.rewards[tier - 1]
      if (!reward)
        return {
          status: 'failure',
          world,
          consumed: false,
          changed: false,
          effectResults: [...effectResults, { index: effectIndex, kind: eff.kind, changed: false }],
          presentations: [],
          reason: 'empty-resource-pool',
          message: eff.unavailableMessage,
          menu,
        }
      setWorldResourceValue(nextWorld, eff.resource, value - tier)
      changeInventory(nextWorld, reward.itemId, reward.count)
      changed = true
      const rewardResult = { ...reward }
      effectResults.push({
        index: effectIndex,
        kind: eff.kind,
        changed: true,
        resourceDraw: {
          resource: eff.resource,
          valueBefore: value,
          rolled,
          tier,
          spent: tier,
          valueAfter: value - tier,
          reward: rewardResult,
        },
      })
      presentations.push({
        kind: 'item-result',
        source: eff.kind,
        items: [rewardResult],
      })
      continue
    }

    let effectChanged = false
    const targetCharIds: string[] = []
    for (const next of nextWorld.party) {
      if (!targetIds.has(next.id)) continue
      if (stoppedTargets.has(next.id)) continue
      targetCharIds.push(next.id)
      switch (eff.kind) {
        case 'healHp':
          {
            if (next.hp <= 0) break
            const before = next.hp
            next.hp = Math.max(0, Math.min(next.maxHP, next.hp + eff.amount))
            effectChanged ||= next.hp !== before
          }
          break
        case 'healMp':
          {
            if (next.hp <= 0) break
            const before = next.mp
            next.mp = Math.max(0, Math.min(next.maxMP, next.mp + eff.amount))
            effectChanged ||= next.mp !== before
          }
          break
        case 'revive':
          if (next.hp <= 0) {
            next.hp = Math.max(1, Math.floor((next.maxHP * eff.hpPercent) / 100))
            next.extraStatuses = []
            effectChanged = true
          }
          break
        case 'applyPoison': {
          // 大世界自毒(毒蛇卵/尸腐肉)或对己 use 毒药(相克/致死)—— 毒态随存档、带入战斗
          const beforeHp = next.hp
          const beforePoisons = (next.poisons ?? []).map((poison) => ({ ...poison }))
          applyPoisonSelf(next, Number(eff.poisonId), poisonDefs)
          const afterPoisons = next.poisons ?? []
          effectChanged ||=
            next.hp !== beforeHp ||
            beforePoisons.length !== afterPoisons.length ||
            beforePoisons.some(
              (poison, index) =>
                poison.poisonId !== afterPoisons[index]?.poisonId ||
                poison.tickIndex !== afterPoisons[index]?.tickIndex,
            )
          break
        }
        case 'curePoison': {
          const before = next.poisons?.length ?? 0
          if (eff.poisonId !== undefined)
            next.poisons = (next.poisons ?? []).filter((ap) => ap.poisonId !== Number(eff.poisonId))
          else if (poisonDefs)
            next.poisons = (next.poisons ?? []).filter((ap) => {
              const d = poisonDefs[ap.poisonId]
              return !d || !poisonCurableBy(d, eff.curesTier ?? 'common')
            })
          effectChanged ||= (next.poisons?.length ?? 0) !== before
          break
        }
        case 'removeStatus': {
          const remove = new Set(eff.statuses)
          const before = next.extraStatuses?.length ?? 0
          next.extraStatuses = (next.extraStatuses ?? []).filter(
            (status) => !remove.has(status.status),
          )
          effectChanged ||= next.extraStatuses.length !== before
          break
        }
        case 'permanentStatBoost': {
          const before =
            eff.stat === 'maxHP' ? next.maxHP : eff.stat === 'maxMP' ? next.maxMP : next[eff.stat]
          if (eff.stat === 'maxHP') next.maxHP = Math.max(1, next.maxHP + eff.delta)
          else if (eff.stat === 'maxMP') next.maxMP = Math.max(0, next.maxMP + eff.delta)
          else next[eff.stat] = Math.max(0, next[eff.stat] + eff.delta)
          const after =
            eff.stat === 'maxHP' ? next.maxHP : eff.stat === 'maxMP' ? next.maxMP : next[eff.stat]
          effectChanged ||= after !== before
          break
        }
        case 'dieIfNotPoisoned':
          if ((next.poisons?.length ?? 0) === 0) {
            const before = next.hp
            next.hp = 0
            effectChanged ||= next.hp !== before
            stoppedTargets.add(next.id)
          }
          break
        case 'extraPoisonRes':
          // 大蒜:临时毒抗 Extra,随存档,建态并入战斗 poisonRes(缩敌附毒门)、战后三件套清。刷新取高。
          {
            const before = next.extraPoisonRes ?? 0
            next.extraPoisonRes = Math.max(before, eff.amount)
            effectChanged ||= next.extraPoisonRes !== before
          }
          break
        case 'applyStatus': {
          // 大世界护体符/金刚符(护体等):写入 extraStatuses,随存档,建态注入下一场战斗、战后三件套清。
          // 纯更新(新数组 + 新条目):同状态刷新回合数,否则追加。
          const prev = next.extraStatuses ?? []
          const beforeTurns = prev.find((status) => status.status === eff.status)?.turns
          next.extraStatuses = prev.some((s) => s.status === eff.status)
            ? prev.map((s) =>
                s.status === eff.status ? { status: s.status, turns: eff.turns } : s,
              )
            : [...prev, { status: eff.status, turns: eff.turns }]
          effectChanged ||= beforeTurns !== eff.turns
          break
        }
        case 'hideParty':
        case 'runScript':
        case 'runSceneHook':
          throw new Error(`resolveWorldItemUse: effect ${eff.kind} 通过了错误的上下文分支`)
        default:
          assertNever(eff, 'resolveWorldItemUse')
      }
    }
    changed ||= effectChanged
    effectResults.push({
      index: effectIndex,
      kind: eff.kind,
      changed: effectChanged,
      ...(targetCharIds.length > 0 ? { targetCharIds } : {}),
    })
  }
  const consumed = consumeItem(nextWorld, itemId, useSpec.consuming)
  const committedChanged = changed || consumed
  return {
    status: 'success',
    world: committedChanged ? nextWorld : world,
    consumed,
    changed: committedChanged,
    effectResults,
    presentations,
    menu,
  }
}

/** external host 成功后唯一提交口；脚本已产生的世界变化会先被保留，再按 use.consuming 扣物品。 */
export function completeExternalWorldItemUse(
  world: WorldState,
  itemId: string,
  items: ItemDataMap,
): WorldItemUseOutcome {
  const item = items[itemId]
  const menu = item?.use?.menuAfterUse ?? 'keep'
  if (!item?.use)
    return {
      status: 'failure',
      world,
      consumed: false,
      changed: false,
      effectResults: [],
      presentations: [],
      reason: 'unknown-item',
      menu,
    }
  const nextWorld = cloneWorldForItemUse(world)
  const consumed = consumeItem(nextWorld, itemId, item.use.consuming)
  return {
    status: 'success',
    world: consumed ? nextWorld : world,
    consumed,
    // 外部脚本/场景钩子已经成功执行；即使 host 原地修改对象，也属于已提交变化。
    changed: true,
    effectResults: item.use.effects.map((effect, index) => ({
      index,
      kind: effect.kind,
      changed: true,
    })),
    presentations: [],
    menu,
  }
}

/** 兼容纯逻辑调用方：外部效果不会在 content 层伪执行，返回原世界。 */
export function useItem(
  world: WorldState,
  targetCharId: string,
  itemId: string,
  items: ItemDataMap,
  poisonDefs?: Record<number, import('./poison.js').PoisonDef>,
  rng?: () => number,
): WorldState {
  const outcome = resolveWorldItemUse(world, targetCharId, itemId, items, poisonDefs, rng)
  return outcome.status === 'success' ? outcome.world : world
}
