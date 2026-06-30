import type { TextId } from './index.js'

/** L1 世界态(跟存档走;现 demo 内存构造)。 */
export interface WorldState {
  party: CharacterInstance[]
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

/** manifest.json 的形状(loader 解析、main.ts 消费)。工程清单 = 一整套游戏的入口描述。 */
export interface LoadedManifest {
  id: string // 工程 id(= 文件夹名;稳定身份)
  name: string // 显示名(选单/标题)
  contentVersion: number // 工程内容数据版本(与存档 SAVE_VERSION 是两个轴)
  entryScene: string // 入口场景 id(= scenes.json 里的 scene.id)
  content: Record<string, string> // content 文件清单(kind → 相对路径)
  assets: { root: string; maps: string; tilesets: string; sprites: string; palettes: string }
  startWorld: StartWorld
}

/** 角色实例(稳定 id;运行态)。绝对值属性,非原版 modifier。 */
export interface CharacterInstance {
  id: string
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
}

/** 角色模板(L2 内容层;初始数据)。 */
export interface CharacterTemplate {
  id: string
  name: TextId
  baseStats: {
    level: number
    hp: number
    maxHP: number
    mp: number
    maxMP: number
    attack: number
    defense: number
    magicAttack: number
    speed: number
    luck: number
  }
  initialEquipment: Record<string, string>
  initialMagic: string[]
}

/** 模板 → 实例(深拷贝初始值,exp=0,tags 空)。 */
export function instantiate(t: CharacterTemplate): CharacterInstance {
  return {
    id: t.id,
    template: t.id,
    ...t.baseStats,
    exp: 0,
    equipment: { ...t.initialEquipment },
    tags: [],
  }
}

/**
 * 从 manifest.startWorld 组装初始世界态(loader 的 content-op)。
 *  = initialWorld() 的数据化版:对每个 party 模板 id instantiate → 应用 seedStats 覆盖 hp/mp → 组装。
 *  learnedSkills/inventory 直接取 startWorld(key = 实例 id,demo 单人 = 模板 id)。
 */
export function buildWorld(
  startWorld: StartWorld,
  templatesById: Record<string, CharacterTemplate>,
): WorldState {
  const party = startWorld.party.map((id) => {
    const t = templatesById[id]
    if (!t) throw new Error(`buildWorld: 角色模板 "${id}" 不在 characters 表`)
    const inst = instantiate(t)
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
