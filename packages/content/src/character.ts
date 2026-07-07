import type { ActorDef } from './actor.js'
import type { WorldScriptState } from './script.js'
import type { StatusId } from './skill.js'

/** 大世界带入战斗的临时状态(护体符/金刚符 = protect;加速符等)。原版全局 rgPlayerStatus 的一格:
 *  战斗外 use 施加、随存档,建态时注入战斗 status[key]=turns,战后三件套 ClearAllStatus 清。 */
export interface CarriedStatus {
  status: StatusId
  turns: number
}

/** L1 世界态(跟存档走;现 demo 内存构造)。 */
export interface WorldState {
  /** 剧情脚本世界状态(M3a:flags/vars/entityState/entityStage;跟存档)。旧档缺省 → 空态。 */
  script?: WorldScriptState
  party: CharacterInstance[]
  /** C7 离队暂存区(D22 拍板):setParty 在 party ↔ reserve 间搬实例,等级/装备/HP 不丢
   *  (对齐原版 PlayerRoles 全局存活,离队不清数据)。旧档缺省 → 空。 */
  reserve?: CharacterInstance[]
  money: number // 金钱(跟存档走;demo 内存构造 = 0)
  /** 习得仙术关系表:charInstanceId → skillId[]。独立表(非内嵌 CharacterInstance),解耦 + MMO 玩家私有留口。 */
  learnedSkills: Record<string, string[]>
  /** 持有物品(跟存档):itemId → 数量。穿戴中的不在此(在 CharacterInstance.equipment)。 */
  inventory: { itemId: string; count: number }[]
}

/** manifest.startWorld —— initialWorld() 的数据化(loader 从工程 JSON 读,buildWorld 组装)。 */
export interface StartWorld {
  party: string[] // 角色模板 id 列表(顺序 = 入队顺序)
  money: number
  /** ⚠ key = 实例 id(character.ts:99 现状:实例 id === 模板 id,demo 单人 1:1)。
   *    多人工程实例 id 会带实例化区分,届时 key 约定需调整;A 期单人 demo 不受影响。 */
  learnedSkills: Record<string, string[]>
  inventory: { itemId: string; count: number }[]
  /** demo 低 HP/MP 播种(覆盖模板 baseStats.hp/mp);可选,缺省则用模板值。 */
  seedStats?: Record<string, { hp?: number; mp?: number }>
}

/**
 * 入口点(开局档)—— 主菜单一个按钮 = 一个开局。「开始游戏」是一条,DLC 入口各是一条。
 * 分工(2026-07-06 定):**存档状态走数据(startWorld),叙事走脚本(该场景 onEnter)**。
 * 判据「读档也能得到它吗」—— 是(队伍/道具/技能/属性/金钱)= 数据;否(视频/梦境/对白)= 场景脚本。
 * 加 DLC = 加一条 entryPoint(自己的 startWorld + 指向自己的场景,开场叙事写该场景 onEnter),零引擎改动。
 */
export interface EntryPoint {
  id: string // 稳定 id(new-game / dlc1 …;主菜单/存档引用)
  label: string // 主菜单按钮文案(如「开始游戏」)
  scene: string // 起始场景 id
  /** 该开局的初始存档状态(队伍/道具/技能/属性/金钱);缺省 = manifest.startWorld(兼容单入口老工程)。 */
  startWorld?: StartWorld
}

/** manifest.json 的形状(loader 解析、main.ts 消费)。工程清单 = 一整套游戏的入口描述。 */
export interface LoadedManifest {
  id: string // 工程 id(= 文件夹名;稳定身份)
  name: string // 显示名(选单/标题)
  contentVersion: number // 工程内容数据版本(与存档 SAVE_VERSION 是两个轴)
  entryScene: string // 入口场景 id(= scenes.json 里的 scene.id)。多入口时 = 默认(无菜单/无 ?entry)开局的场景。
  /** 入口点列表(主菜单开局/DLC 入口)。缺省 = 从 entryScene+startWorld 合成一条 'new-game'(兼容)。 */
  entryPoints?: EntryPoint[]
  content: Record<string, string> // content 文件清单(kind → 相对路径)
  assets: {
    root: string
    maps: string
    tilesets: string
    sprites: string
    palettes: string
    /** 音效目录(wav);'/' 开头 = 应用绝对路径,否则相对工程根。缺省 = root/sounds。 */
    sounds?: string
    /** BGM 目录(<NNN>.mid,3 位零填充);同路径规则。缺省 = root/music。 */
    music?: string
    /** 对话/状态立绘目录(<chunk>.png);同路径规则。缺省 = root/portraits。 */
    portraits?: string
    /** 战斗小头像目录(<actorId>.png)。缺省 = root/faces。 */
    faces?: string
    /** 物品图标目录(<icon>.png)。缺省 = root/item-icons。 */
    itemIcons?: string
    /** UI chrome 覆盖目录(工程自带皮肤;缺省用引擎默认皮)。 */
    ui?: string
  }
  startWorld: StartWorld
}

/** 角色实例(稳定 id;运行态)。绝对值属性,非原版 modifier。 */
export interface CharacterInstance {
  id: string
  /** = ActorDef.id(角色定义引用)。⚠ 字段名保留 "template" 勿改:存档兼容 + 菜单 `name.${template}` 4 处。 */
  template: string
  level: number
  exp: number
  hp: number
  maxHP: number
  mp: number
  maxMP: number
  attack: number
  defense: number
  magicAttack: number
  speed: number
  luck: number // 吉运(原版 fleeRate)
  equipment: Record<string, string> // slotId → itemId(可扩展槽)
  tags: string[] // 留口:种族/门派(phase3),现空
  /**
   * 隐藏经验池(B7c;原版 CHECK_HIDDEN_EXP):战斗行为按属性积累,胜利后过阈值单项 +N。
   * 键 = 属性名(maxHP/maxMP/attack/magicAttack/defense/speed/luck);exp/level 跨战斗持久
   * (随存档),战斗内行为计数(count)在 BattleState 里、不落此处。缺省 = 全 0。
   */
  hiddenExp?: Partial<Record<HiddenStatKey, { exp: number; level: number }>>
  /**
   * 中毒态(跨大世界↔战斗共享;原版全局 rgPoisonStatus):大世界自毒(毒蛇卵/尸腐肉)带入战斗,
   * 战斗结束「三件套」清 ≤severe(curePoisons severe;无影毒/寄生 incurable 留)。缺省 = 无毒。
   * ⚠ 战斗内是副本(createBattleState 拷入,DoT 不回写此处);清理走战后 curePoisons。
   */
  poisons?: import('./poison.js').ActivePoison[]
  /**
   * 大世界带入的临时状态(护体符/金刚符 protect 7 回合等;原版全局 rgPlayerStatus)。战斗外 use 施加、
   * 随存档,建态时注入战斗 status[key]=turns。战后三件套 ClearAllStatus 清(只保一场)。缺省 = 无。
   * ⚠ 与装备常驻 grantedStatuses(连击,红线 live 派生、置 9999 永久)不同:此为定时、随存档持久。
   */
  extraStatuses?: CarriedStatus[]
  /**
   * 大世界带入的临时毒抗(大蒜;原版 rgEquipmentEffect Extra 层的 rgwPoisonResistance)。战斗外 use 施加、
   * 随存档,建态并入战斗 poisonRes(缩「敌普攻附毒门」)。战后三件套 RemoveEquipExtra 清。缺省 = 无。
   */
  extraPoisonRes?: number
}

/** 隐藏经验池键(= 可被隐藏成长的属性;顺序 = 原版 CHECK_HIDDEN_EXP 分配序)。 */
export const HIDDEN_STAT_KEYS = [
  'maxHP',
  'maxMP',
  'attack',
  'magicAttack',
  'defense',
  'speed',
  'luck',
] as const
export type HiddenStatKey = (typeof HIDDEN_STAT_KEYS)[number]

// (C0)CharacterTemplate 已被统一 ActorDef 取代(actor.ts;battler 块包住 baseStats/装备/技能)。

/** 角色定义 → 实例(读 battler;深拷贝初始值,exp=0,tags 空)。无 battler 的 actor 不可入队/参战。 */
export function instantiate(actor: ActorDef): CharacterInstance {
  const b = actor.battler
  if (!b) throw new Error(`instantiate: 角色 "${actor.id}" 无 battler(不可入队/参战)`)
  return {
    id: actor.id,
    template: actor.id,
    ...b.baseStats,
    exp: 0,
    equipment: { ...b.initialEquipment },
    tags: [],
  }
}

/**
 * C7 队伍变更(D22 reserve 暂存区):把 world.party 变成 members 指定的阵容(顺序即站位)。
 *  - 已在队 → 原实例保留(等级/装备/HP 不丢);
 *  - 在 reserve → 搬回队伍(离队期间状态原样);
 *  - 都没有 → 从模板 instantiate(首次入队);
 *  - 被移出的 → 进 reserve(不清数据,对齐原版 PlayerRoles 全局存活)。
 * 身份用**角色模板 id**(铁律:杜绝下标式身份)。原地改 world(引擎处处持有 world 引用)。
 */
export function applySetParty(
  world: WorldState,
  members: readonly string[],
  actorsById: Record<string, ActorDef>,
): void {
  const pool = new Map<string, CharacterInstance>()
  for (const c of world.party) pool.set(c.template, c)
  for (const c of world.reserve ?? []) pool.set(c.template, c)
  const nextParty: CharacterInstance[] = []
  for (const id of members) {
    const kept = pool.get(id)
    if (kept) {
      nextParty.push(kept)
      pool.delete(id)
      continue
    }
    const a = actorsById[id]
    if (!a) throw new Error(`setParty: 角色 "${id}" 不在 actors 表`)
    nextParty.push(instantiate(a))
  }
  world.party = nextParty
  world.reserve = [...pool.values()] // 落选的全体(含原 reserve 未点名者)留暂存
}

/**
 * 从 manifest.startWorld 组装初始世界态(loader 的 content-op)。
 *  = initialWorld() 的数据化版:对每个 party 角色 id instantiate → 应用 seedStats 覆盖 hp/mp → 组装。
 *  learnedSkills/inventory 直接取 startWorld(key = 实例 id,demo 单人 = 角色 id)。
 */
export function buildWorld(
  startWorld: StartWorld,
  actorsById: Record<string, ActorDef>,
): WorldState {
  const party = startWorld.party.map((id) => {
    const a = actorsById[id]
    if (!a) throw new Error(`buildWorld: 角色 "${id}" 不在 actors 表`)
    const inst = instantiate(a)
    const seed = startWorld.seedStats?.[id]
    if (seed?.hp !== undefined) inst.hp = seed.hp
    if (seed?.mp !== undefined) inst.mp = seed.mp
    return inst
  })
  return {
    party,
    money: startWorld.money,
    // 拷贝(非引用):还原 initialWorld() 的 fresh-array 语义,防运行期改动回写污染 startWorld 源
    learnedSkills: Object.fromEntries(
      Object.entries(startWorld.learnedSkills).map(([id, ids]) => [id, [...ids]]),
    ),
    inventory: startWorld.inventory.map((e) => ({ ...e })),
  }
}
