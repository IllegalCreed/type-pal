/**
 * TEST-FOUNDATION-COVERAGE-1 B组 test-only fixture：各验证器的最小合法样本与薄构造器。
 * 只放数据/构造器，不含产品算法，不被生产导入；字段形状以各验证器 requireKeys/类型门为准。
 */

/** 最小合法 StartWorld（party+money+inventory 三必填）。 */
export function minimalStartWorld() {
  return {
    party: ['actor-a', 'actor-b'],
    money: 0,
    inventory: [
      { itemId: 'item-1', count: 0 },
      { itemId: 'item-2', count: 3 },
    ],
  }
}

/** 最小合法 ActorDef（仅三必填字符串，无 battler）。 */
export function minimalActor(id = 'actor-a') {
  return { id, name: `演员${id}`, spriteId: 'sprite.x' }
}

/** 最小合法技能（animation 最小形状 = { effectSprite: 1 }）。 */
export function minimalSkill(id = '370') {
  return {
    id,
    name: `技能${id}`,
    cost: {},
    target: 'oneEnemy',
    effects: [],
    animation: { effectSprite: 1 },
  }
}

/** 最小合法毒定义。 */
export function minimalPoison(id = 551) {
  return { id, name: `毒${id}`, curability: 'common', color: 16 }
}

/** 最小合法作者物品（无 use/throw，仅装备可选域缺席）。 */
export function minimalAuthorItem(id = 'item-1') {
  return { id, name: `物品${id}`, desc: [] }
}
