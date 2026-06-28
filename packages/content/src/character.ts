import type { TextId } from './index.js'

/** L1 世界态(跟存档走;现 demo 内存构造)。 */
export interface WorldState {
  party: CharacterInstance[]
  money: number // 金钱(跟存档走;demo 内存构造 = 0)
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
  equipment: Record<string, string> // slotId → itemId(可扩展槽)
  magic: string[] // 仙术 id
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
  },
  initialEquipment: {},
  initialMagic: [],
}

/** 模板 → 实例(深拷贝初始值,exp=0,tags 空)。 */
export function instantiate(t: CharacterTemplate): CharacterInstance {
  return {
    id: t.id,
    template: t.id,
    ...t.baseStats,
    exp: 0,
    equipment: { ...t.initialEquipment },
    magic: [...t.initialMagic],
    tags: [],
  }
}

/** demo 世界态:单人李逍遥。 */
export function initialWorld(): WorldState {
  return { party: [instantiate(LI_XIAOYAO)], money: 0 }
}
