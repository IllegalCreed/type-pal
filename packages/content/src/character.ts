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

/** 李逍遥(原版 player-roles.json roleId 0 初始值;attack 等用绝对值)。 */
export const LI_XIAOYAO: CharacterTemplate = {
  id: 'li-xiaoyao',
  name: 'name.li-xiaoyao',
  baseStats: {
    level: 1,
    hp: 150,
    maxHP: 150,
    mp: 100,
    maxMP: 100,
    attack: 33,
    defense: 32,
    magicAttack: 20,
    speed: 28,
    luck: 32,
  },
  initialEquipment: {
    weapon: '166',
    head: '196',
    body: '208',
    cloak: '225',
    feet: '235',
    accessory: '249',
  },
  initialMagic: ['296', '298', '299'],
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

/** demo 世界态:单人李逍遥 + 习得仙术关系表(从模板 initialMagic 播种)。 */
export function initialWorld(): WorldState {
  const li = instantiate(LI_XIAOYAO)
  return {
    party: [li],
    money: 0,
    learnedSkills: { [li.id]: [...LI_XIAOYAO.initialMagic] },
    inventory: [{ itemId: '267', count: 1 }], // 土灵珠(demo:验装备菜单可换装 + 双重身份)
  }
}
