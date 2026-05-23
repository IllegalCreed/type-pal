/**
 * 数据表条目类型 —— 物品 / 法术 / 怪物。
 * 字段以 sdlpal global.h::OBJECT_* / ENEMY 为准;M1 只覆盖切片需要的最小字段集。
 */

export interface Item {
  id: number
  name: string
  bitmap: number  // 图标精灵号
  price: number
  scriptOnUse: number
  scriptOnEquip: number
  scriptOnThrow: number
  flags: number
}

export interface Spell {
  id: number
  name: string
  mp: number
  base: number
  effect: number
  flags: number
}

export interface Enemy {
  id: number
  name: string
  level: number
  hp: number
  mp: number
  attack: number
  defense: number
}
