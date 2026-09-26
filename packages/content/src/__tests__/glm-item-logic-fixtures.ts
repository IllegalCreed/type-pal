/**
 * TEST-GLM-ITEM-LOGIC-1 test-only fixture：六份物品逻辑测试共用的合法基线。
 * R1：heroActor 用 `satisfies ActorDef` 约束的**当前 player 侧字段**构造
 * （battler.baseStats 为 hp/maxHP/mp/maxMP/attack/defense/magicAttack/speed/luck/level，
 * 见 actor.ts BattlerSpec），经 validateActors 验证；hero/world 用生产
 * instantiate/buildWorld 生成可消费基线；物品经 validateItems 验证后返回。
 * 不复制 item.ts 算法；原地/纯函数语义由各测试按合同分别断言。
 */

import { expect } from 'vitest'
import type { ActorDef } from '../actor.js'
import { buildWorld, type CharacterInstance, instantiate, type WorldState } from '../character.js'
import type { ItemData, ItemUseEffect } from '../item.js'
import type { PoisonDef } from '../poison.js'
import { validateActors, validateItems } from '../validate.js'
import { deepSnapshot } from './glm-content-contract-fixtures.js'

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

const heroActorLiteral = {
  id: 'hero',
  name: '李逍遥',
  spriteId: 'sprite.hero',
  battler: {
    baseStats: {
      level: 1,
      hp: 100,
      maxHP: 100,
      mp: 50,
      maxMP: 50,
      attack: 10,
      defense: 10,
      magicAttack: 10,
      speed: 10,
      luck: 10,
    },
    initialEquipment: { accessory: 'oldRing' },
    initialMagic: [],
    battleSprite: 'battle.hero.base',
  },
} satisfies ActorDef

/** 真实 ActorDef（satisfies 约束 + validateActors 验证）。 */
export function heroActor(): ActorDef {
  const actors = validateActors([heroActorLiteral])
  const actor = actors[0]
  if (!actor) throw new Error('fixture actor missing')
  return actor
}

/** 生产 instantiate 生成的可消费角色（equipment 继承 initialEquipment）。 */
export function hero(hp = 100, mp = 50, id = 'hero'): CharacterInstance {
  const instance = instantiate({ ...heroActor(), id })
  if (hp !== 100) instance.hp = hp
  if (mp !== 50) instance.mp = mp
  return instance
}

/** 生产 buildWorld 生成的可消费世界（party 经 instantiate、learnedSkills 播种）。 */
export function world(
  inv: { itemId: string; count: number }[] = [],
  partyHp = 100,
  partyMp = 50,
): WorldState {
  const w = buildWorld({ party: ['hero'], money: 0, inventory: inv }, { hero: heroActor() })
  const leader = w.party[0]
  if (!leader) throw new Error('fixture world leader missing')
  if (partyHp !== 100) leader.hp = partyHp
  if (partyMp !== 50) leader.mp = partyMp
  return w
}

/** 毒定义表（curePoison/applyPoison 用；必填仅 id/name/curability/color）。 */
export function poisonDefs(): Record<number, PoisonDef> {
  return {
    551: { id: 551, name: '赤毒', curability: 'common', color: 16 },
    555: { id: 555, name: '无影毒', curability: 'severe', color: 16 },
  }
}

/** I6 外部物品的合法脚本引用效果。 */
export function runScriptEffect(): ItemUseEffect {
  return { kind: 'runScript', script: { chunk: 'shared', id: 'user/outer' } }
}

/**
 * R3：多入参纯函数的输入保真——每个对象实参调用前独立快照，执行后立即逐一比较同一实参。
 * 原始不可变标量不传入；原地 API（removeOwnedItems）不使用本助手。
 */
export function expectInputsUnchanged(run: () => void, inputs: readonly object[]): void {
  const snapshots = inputs.map((input) => deepSnapshot(input))
  run()
  inputs.forEach((input, index) => {
    expect(input).toEqual(snapshots[index])
  })
}
