/**
 * 物品表(SSS.MKF chunk 2 OBJECT_ITEM 段)解析。
 *
 * 对照 sdlpal `global.h::tagOBJECT_ITEM`(Win9x 7 WORD = 14 字节):
 *   wBitmap / wPrice / wScriptOnUse / wScriptOnEquip /
 *   wScriptOnThrow / wScriptDesc / wFlags
 *
 * 对象索引段:[61..295] = 235 条物品(`ITEM_OBJ_START` / `ITEM_COUNT`)。
 */
import type { Item, ItemFlags } from '@type-pal/shared'
import type { Words } from '../../io/word.js'
import {
  ITEM_COUNT,
  ITEM_OBJ_START,
  OBJ_SIZE,
  PLAYER_ROLES_NUM,
  u16,
} from './_utils.js'

// ── OBJECT_ITEM 字段偏移 (global.h tagOBJECT_ITEM) ────────────────────────
// wBitmap(0), wPrice(2), wScriptOnUse(4), wScriptOnEquip(6),
// wScriptOnThrow(8), wScriptDesc(10), wFlags(12)
const ITEM_OFF = {
  bitmap: 0,
  price: 2,
  scriptOnUse: 4,
  scriptOnEquip: 6,
  scriptOnThrow: 8,
  scriptDesc: 10,
  flags: 12,
} as const

// ── ITEMFLAG bitmask 拆位 (global.h tagITEMFLAG) ──────────────────────────
// bit 0..5 = Usable / Equipable / Throwable / Consuming / ApplyToAll / Sellable
// bit 6.. = EquipableByPlayerRole_First + N(MAX_PLAYER_ROLES=6,sdlpal palcommon.h:45)
const ITEM_FLAG_EQUIPABLE_BY_PLAYER_ROLE_FIRST_BIT = 6

function parseItemFlags(raw: number): ItemFlags {
  const equipableBy: boolean[] = []
  for (let i = 0; i < PLAYER_ROLES_NUM; i++) {
    equipableBy.push(!!(raw & (1 << (ITEM_FLAG_EQUIPABLE_BY_PLAYER_ROLE_FIRST_BIT + i))))
  }
  return {
    usable: !!(raw & (1 << 0)),
    equipable: !!(raw & (1 << 1)),
    throwable: !!(raw & (1 << 2)),
    consuming: !!(raw & (1 << 3)),
    applyToAll: !!(raw & (1 << 4)),
    sellable: !!(raw & (1 << 5)),
    equipableBy: equipableBy as ItemFlags['equipableBy'],
  }
}

/**
 * 从 SSS.MKF chunk 2 的原始字节解析物品列表。
 *
 * M3 T5 重构:flags 从 u16 raw 拆为 `ItemFlags` 具名 bool;`scriptDesc` 字段补齐;
 * 名字改 `_name?`(可选,注释用,引擎不读)与 parseEnemies pattern 一致。
 *
 * **id 是什么**:`id` = 该 item 在 items.json 数组里的索引(0..234),
 * 不是 OBJECT 数组里的绝对 index(那是 61..295)。M3 战斗 / dev panel
 * 选物品时直接 `items[id]`。
 *
 * @param objBuf SSS.MKF chunk 2 的原始字节(openMkf + readChunk 取出,不需要解压)
 * @param words  可选;parseWordDat 解出的名称表,用于反向填 `_name`
 */
export function parseItems(objBuf: Uint8Array, words?: Words): Item[] {
  // T5 review #1:与 parseEnemies / parseMagicTable 统一,截断时显式 throw 而不是软退出。
  const expectedMinBytes = (ITEM_OBJ_START + ITEM_COUNT) * OBJ_SIZE
  if (objBuf.byteLength < expectedMinBytes) {
    throw new Error(
      `parseItems: SSS.MKF chunk 2 truncated (got ${objBuf.byteLength}B, need ≥ ${expectedMinBytes}B for items 0..${ITEM_COUNT - 1})`,
    )
  }
  const view = new DataView(objBuf.buffer, objBuf.byteOffset, objBuf.byteLength)
  const out: Item[] = []
  for (let i = 0; i < ITEM_COUNT; i++) {
    const base = (ITEM_OBJ_START + i) * OBJ_SIZE
    const item: Item = {
      id: i,
      bitmap: u16(view, base, ITEM_OFF.bitmap),
      price: u16(view, base, ITEM_OFF.price),
      scriptOnUse: u16(view, base, ITEM_OFF.scriptOnUse),
      scriptOnEquip: u16(view, base, ITEM_OFF.scriptOnEquip),
      scriptOnThrow: u16(view, base, ITEM_OFF.scriptOnThrow),
      scriptDesc: u16(view, base, ITEM_OFF.scriptDesc),
      flags: parseItemFlags(u16(view, base, ITEM_OFF.flags)),
    }
    const nm = words?.items[i]
    if (nm) item._name = nm
    out.push(item)
  }
  return out
}
