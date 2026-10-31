/** 合成资源记录：字段标记独立于产品parser，每次构造返回fresh字节。 */
import { concatBytes, u16Bytes } from './binary-fixtures.js'

/** 全量 OBJECT 物品段输入：(61+235)×14B，七 WORD 每条各异（串位/别名即检出）。 */
export function itemsObjectBytes(): Uint8Array {
  const total = (61 + 235) * 14
  const out = new Uint8Array(total)
  const view = new DataView(out.buffer)
  for (let id = 0; id < 61 + 235; id++) {
    const base = id * 14
    // 七 WORD 互异且随 id 变化；flags 轴轮流点亮六基础位与六角色装备许可位之一。
    view.setUint16(base + 0, (id * 7 + 1) & 0xffff, true) // bitmap
    view.setUint16(base + 2, (id * 11 + 2) & 0xffff, true) // price
    view.setUint16(base + 4, (id * 13 + 3) & 0xffff, true) // scriptOnUse
    view.setUint16(base + 6, (id * 17 + 4) & 0xffff, true) // scriptOnEquip
    view.setUint16(base + 8, (id * 19 + 5) & 0xffff, true) // scriptOnThrow
    view.setUint16(base + 10, (id * 23 + 6) & 0xffff, true) // scriptDesc
    const local = id - 61
    let flags = 0
    if (local >= 0 && local < 234) {
      flags = 1 << (local % 6) // 六基础 flag 一热
      flags |= 1 << (6 + (local % 6)) // 六角色装备许可位一热（同一 role 号）
    } else {
      flags = 0x2a // 295（梦蛇）非物品段位形，不参与断言
    }
    view.setUint16(base + 12, flags, true)
  }
  return out
}

export function expectedItemWords(id: number): [number, number, number, number, number, number] {
  return [
    (id * 7 + 1) & 0xffff,
    (id * 11 + 2) & 0xffff,
    (id * 13 + 3) & 0xffff,
    (id * 17 + 4) & 0xffff,
    (id * 19 + 5) & 0xffff,
    (id * 23 + 6) & 0xffff,
  ]
}

/** 商店 3×18B：空首槽 / 首 0 截断 / 满 9 并存。 */
export function storesBytes(): Uint8Array {
  const record = (items: number[]): Uint8Array => {
    const out = new Uint8Array(18)
    const view = new DataView(out.buffer)
    items.forEach((item, index) => {
      view.setUint16(index * 2, item, true)
    })
    return out
  }
  return concatBytes([
    record([0, 90, 91, 92, 93, 94, 95, 96, 97]), // 首槽空 → items []
    record([201, 202, 0, 203, 204, 205, 206, 207, 208]), // 首 0 截断 → [201,202]
    record([301, 302, 303, 304, 305, 306, 307, 308, 309]), // 满 9 无 0
  ])
}

/** 战场 2×12B：unsigned 高位 screenWave + 五维 signed 正负极值。 */
export function battleFieldsBytes(): Uint8Array {
  return concatBytes([
    u16Bytes(0xffff, 0x0001, 0xfffe, 0x7fff, 0x8000, 0x0000),
    u16Bytes(0x0100, 0x8001, 0x0002, 0xfffd, 0x0064, 0xff9c),
  ])
}

/** 敌队 2×10B：两 OBJECT 映同 enemyId、0/0xFFFF 槽、缺映射槽。 */
export function enemyTeamsBytes(): Uint8Array {
  return concatBytes([u16Bytes(400, 401, 0, 0xffff, 402), u16Bytes(0xffff, 402, 403, 0, 0)])
}

/** DATA.MKF chunk 6 学习表 20 条 × 5 角色 × 4B（level/magic 随 entry、role 双向异）。 */
export function levelUpMagicBytes(): Uint8Array {
  const out = new Uint8Array(20 * 5 * 4)
  const view = new DataView(out.buffer)
  for (let e = 0; e < 20; e++) {
    for (let r = 0; r < 5; r++) {
      const off = (e * 5 + r) * 4
      view.setUint16(off, e * 5 + r + 1, true) // level
      view.setUint16(off + 2, e * 7 + r + 2, true) // magic
    }
  }
  return out
}

/** chunk 14 经验表 100 WORD（值 = i*3+1）。 */
export function levelUpExpBytes(): Uint8Array {
  const out = new Uint8Array(200)
  const view = new DataView(out.buffer)
  for (let i = 0; i < 100; i++) view.setUint16(i * 2, i * 3 + 1, true)
  return out
}

/** chunk 11 战斗效果索引 20 WORD（值 = i*5+3）。 */
export function battleEffectBytes(): Uint8Array {
  const out = new Uint8Array(40)
  const view = new DataView(out.buffer)
  for (let i = 0; i < 20; i++) view.setUint16(i * 2, i * 5 + 3, true)
  return out
}

/** chunk 13 敌位 100B：坐标 k=(enemyIdx*5+maxIdx) → x=k*2+1, y=k*2+2（非对称，转置即检出）。 */
export function enemyPosBytes(): Uint8Array {
  const out = new Uint8Array(100)
  const view = new DataView(out.buffer)
  for (let k = 0; k < 25; k++) {
    view.setUint16(k * 4, k * 2 + 1, true)
    view.setUint16(k * 4 + 2, k * 2 + 2, true)
  }
  return out
}

export function expectedEnemyPos(enemyIdx: number, maxIdx: number): { x: number; y: number } {
  const k = enemyIdx * 5 + maxIdx
  return { x: k * 2 + 1, y: k * 2 + 2 }
}
