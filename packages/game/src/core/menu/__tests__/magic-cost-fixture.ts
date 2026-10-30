import type { Magic } from '@type-pal/shared'

/** 菜单建表只读取id与MP消耗；其余字段保留完整typed数据，不模拟施法效果。 */
export function magicWithCost(id: number, costMP: number): Magic {
  return {
    id,
    effect: 0,
    type: 'normal',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP,
    baseDamage: 0,
    elemental: 0,
    sound: 0,
  }
}
