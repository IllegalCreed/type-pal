/**
 * TEST-GLM-ITEM-LOGIC-1 test-only fixture：六份物品逻辑测试共用的合法基线。
 * 物品经 validateItems 验证后返回（合法性由构造保证）；人物/世界为当前类型的最小合法形状。
 * 不复制 item.ts 算法；原地/纯函数语义由各测试按合同分别断言。
 */
import type { ActorDef } from '../actor.js'
import type { CharacterInstance, WorldState } from '../character.js'
import type { ItemData } from '../item.js'
import type { PoisonDef } from '../poison.js'
import { validateActors, validateItems } from '../validate.js'

const baseItem: ItemData = {
  id: 'base',
  name: '基础物品',
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
}

/** 合法物品：先过 validateItems 再返回（非法直接在构造处失败）。 */
export function item(over: Partial<ItemData> & { id: string }): ItemData {
  const candidate: ItemData = { ...baseItem, ...over }
  validateItems([candidate])
  return candidate
}

/** 刻意非法载体（仅在测 resolve 自身防御合同且明确标注时使用；不得冒充合法正控）。 */
export function rawItem(over: Partial<ItemData> & { id: string }): ItemData {
  return { ...baseItem, ...over }
}

/** 合法人物（ItemLogic 组共用最小形状；equipment 可按需覆盖）。 */
export function hero(hp = 100, mp = 50, id = 'hero'): CharacterInstance {
  return {
    id,
    template: 'hero',
    level: 1,
    exp: 0,
    hp,
    maxHP: 150,
    mp,
    maxMP: 100,
    attack: 10,
    defense: 10,
    magicAttack: 10,
    speed: 10,
    luck: 10,
    equipment: { accessory: 'oldRing' },
    tags: [],
  }
}

/** 合法世界（party/inventory 按需覆盖）。 */
export function world(
  inv: { itemId: string; count: number }[] = [],
  partyHp = 100,
  partyMp = 50,
): WorldState {
  return { party: [hero(partyHp, partyMp)], money: 0, learnedSkills: {}, inventory: inv }
}

/** 经 validateActors 验证的合法 ActorDef（战斗形象派生用）。 */
export function heroActor(): ActorDef {
  const actors = validateActors([
    {
      id: 'hero',
      name: '李逍遥',
      spriteId: 'sprite.hero',
      battler: {
        battleSprite: 'battle.hero.base',
        baseStats: {
          health: 100,
          level: 1,
          exp: 0,
          cash: 0,
          attackStrength: 10,
          magicStrength: 4,
          defense: 8,
          dexterity: 6,
          fleeRate: 0,
          physicalResistance: 0,
          poisonResistance: 0,
          elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
          dualMove: false,
          collectValue: 0,
        },
        initialEquipment: {},
        initialMagic: [],
      },
    },
  ])
  const actor = actors[0]
  if (!actor) throw new Error('fixture actor missing')
  return actor
}

/** 毒定义表（curePoison/applyPoison 用；必填仅 id/name/curability/color）。 */
export function poisonDefs(): Record<number, PoisonDef> {
  return {
    551: { id: 551, name: '赤毒', curability: 'common', color: 16 },
    555: { id: 555, name: '无影毒', curability: 'severe', color: 16 },
  }
}
