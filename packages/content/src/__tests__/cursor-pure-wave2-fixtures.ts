/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 共用合法输入。
 * 只放 typed 数据与薄快照，不复制生产 walker；不进入官方 src/*.ts 统计。
 */
import type { ActorDef } from '../actor.js'
import type { ItemDataMap } from '../item.js'
import { deepSnapshot } from './glm-content-contract-fixtures.js'

export { deepSnapshot }

/** 调用前深快照；调用后必须与同一对象对比。 */
export function inputSnap<T>(value: T): T {
  return deepSnapshot(value)
}

export function wave2Actor(id: string, name: string): ActorDef {
  return {
    id,
    name,
    spriteId: `sprite.${id}`,
    portraits: {
      default: `portrait.${id}.default`,
      expressions: { angry: `portrait.${id}.angry` },
    },
    battler: {
      battleSprite: `${id}-battle-sprite`,
      baseStats: {
        level: 1,
        hp: 120,
        maxHP: 120,
        mp: 40,
        maxMP: 40,
        attack: 20,
        defense: 16,
        magicAttack: 14,
        speed: 18,
        luck: 12,
      },
      initialEquipment: {},
      initialMagic: [`skill.${id}`],
    },
  }
}

export const WAVE2_SHOP_ITEMS: ItemDataMap = {
  'item.sword': {
    id: 'item.sword',
    name: '木剑',
    desc: [],
    buyPrice: 50,
    sellPrice: 25,
    sellable: true,
  },
}

export function tilesetCatalogRecord(id: string) {
  return {
    kind: 'tileset' as const,
    path: `assets/generated/${id}.rle`,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: 8,
    sha256: 'a'.repeat(64),
    origin: { kind: 'generated' as const },
    label: id,
  }
}
