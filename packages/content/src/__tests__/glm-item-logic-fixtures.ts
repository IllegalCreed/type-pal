/**
 * TEST-GLM-ITEM-LOGIC-1 test-only fixture：六份物品逻辑测试共用的合法基线。
 * heroActor 用 `satisfies ActorDef` 约束的当前 player 侧 baseStats 构造，
 * 经 validateActors 验证；hero/world 用生产 instantiate/buildWorld 生成可消费基线；
 * 物品经 validateItems 验证后返回。不复制 item.ts 算法。
 */
import type { ActorDef } from '../actor.js'
import { buildWorld, instantiate, type CharacterInstance, type WorldState } from '../character.js'
import type { ItemData, ItemUseEffect } from '../item.js'
import type { PoisonDef } from '../poison.js'
import { validateActors, validateItems } from '../validate.js'
import { expect } from 'vitest'
import { deepSnapshot } from './glm-content-contract-fixtures.js'

const baseItem: ItemData = {
  id: 'base',
  name: '基础物品',
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
}

export function item(over: Partial<ItemData> & { id: string }): ItemData {
  const candidate: ItemData = { ...baseItem, ...over }
  validateItems([candidate])
  return candidate
}

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

export function heroActor(): ActorDef {
  const actors = validateActors([heroActorLiteral])
  const actor = actors[0]
  if (!actor) throw new Error('fixture actor missing')
  return actor
}

export function hero(hp = 100, mp = 50, id = 'hero'): CharacterInstance {
  const instance = instantiate({ ...heroActor(), id })
  if (hp !== 100) instance.hp = hp
  if (mp !== 50) instance.mp = mp
  return instance
}

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

export function poisonDefs(): Record<number, PoisonDef> {
  return {
    551: { id: 551, name: '赤毒', curability: 'common', color: 16 },
    555: { id: 555, name: '无影毒', curability: 'severe', color: 16 },
  }
}

export function runScriptEffect(): ItemUseEffect {
  return { kind: 'runScript', script: { chunk: 'shared', id: 'user/outer' } }
}

/** 多入参纯函数的输入保真——每个对象实参调用前独立快照，执行后立即逐一比较同一实参。 */
export function expectInputsUnchanged(run: () => void, inputs: readonly object[]): void {
  const snapshots = inputs.map((input) => deepSnapshot(input))
  run()
  inputs.forEach((input, index) => expect(input).toEqual(snapshots[index]))
}
