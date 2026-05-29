/**
 * 商店表(DATA.MKF chunk 0 STORE 数组)解析。
 *
 * 对照 sdlpal `global.h:252 tagSTORE { WORD rgwItems[MAX_STORE_ITEM=9] }`(18 字节 / 条),
 * 由 `global.c:292 LOAD_DATA(p->lprgStore, p->nStore * sizeof(STORE), 0, fpDATA)` 加载。
 * nStore = chunk0Size / 18。
 *
 * 买菜单 opcode 0x0026(`script.c:1163 PAL_BuyMenu(operand[0])`)按 operand[0] 取
 * `lprgStore[storeNum]`,列出非 0 的 rgwItems(绝对 OBJECT id = items.json id)。
 */
import type { Store } from '@type-pal/shared'
import { u16 } from './_utils.js'

const MAX_STORE_ITEM = 9 // palcommon.h:54
const STORE_RECORD_SIZE = MAX_STORE_ITEM * 2 // 9 WORD = 18 字节

/**
 * 从 DATA.MKF chunk 0 解析商店列表(STORE 数组)。
 *
 * **id 是什么**:`id` = 该 store 在 stores.json 数组里的下标 = opcode 0x0026 operand[0]。
 * sdlpal `lprgStore[0]` 是脚本专用(script.c:1477 给全物品 debug),0x0026 实际用 1..N。
 *
 * **items**:`rgwItems[9]` 截断到首个 0 之前(sdlpal `PAL_BuyMenu` 循环遇 0 即 break)。
 * 元素是绝对 OBJECT id,直接对应 items.json `id`(61..295)。
 *
 * @param storeBuf DATA.MKF chunk 0 原始字节(未压缩)
 */
export function parseStores(storeBuf: Uint8Array): Store[] {
  if (storeBuf.byteLength % STORE_RECORD_SIZE !== 0) {
    throw new Error(
      `parseStores: DATA.MKF chunk 0 size ${storeBuf.byteLength} 不能被 STORE_RECORD_SIZE=${STORE_RECORD_SIZE} 整除`,
    )
  }
  const view = new DataView(storeBuf.buffer, storeBuf.byteOffset, storeBuf.byteLength)
  const count = storeBuf.byteLength / STORE_RECORD_SIZE
  const out: Store[] = []
  for (let i = 0; i < count; i++) {
    const base = i * STORE_RECORD_SIZE
    const items: number[] = []
    for (let j = 0; j < MAX_STORE_ITEM; j++) {
      const obj = u16(view, base, j * 2)
      if (obj === 0) break // 首个 0 截断列表
      items.push(obj)
    }
    out.push({ id: i, items })
  }
  return out
}
