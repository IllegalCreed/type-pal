/**
 * 战场表(DATA.MKF chunk 5 BATTLEFIELD 数组)解析。
 *
 * 对照 sdlpal `global.h::tagBATTLEFIELD`(WORD + SHORT × 5 = 12 字节 / 条),
 * 由 `global.c:297 LOAD_DATA(... fpDATA 5)` 加载。
 */
import type { BattleField } from '@type-pal/shared'
import { s16, u16 } from './_utils.js'

// ── DATA.MKF chunk 5: BATTLEFIELD 数组 (global.h tagBATTLEFIELD) ────────
// 每条 = WORD + SHORT × NUM_MAGIC_ELEMENTAL = (1 + 5) × 2 = 12 字节
// (palcommon.h:57 NUM_MAGIC_ELEMENTAL=5)。
//
// 字段顺序(global.h:378-381):
//   wScreenWave(0,WORD)
//   rgsMagicEffect[5](2..10,SHORT × 5):wind(2), thunder(4), water(6), fire(8), earth(10)
//
// rgsMagicEffect 是 SHORT(signed)— 元素 buff 可正可负。
const FIELD_RECORD_SIZE = (1 + 5) * 2 // = 12

const FIELD_OFF = {
  screenWave: 0,
  wind: 2,
  thunder: 4,
  water: 6,
  fire: 8,
  earth: 10,
} as const

/**
 * 从 DATA.MKF chunk 5 解析战场列表(BATTLEFIELD 数组)。
 *
 * 对照 sdlpal `global.h::tagBATTLEFIELD`(WORD + SHORT × 5 = 12 字节 / 条),
 * 由 sdlpal `global.c:297 LOAD_DATA(... fpDATA 5)` 加载。
 *
 * **id 是什么**:`id` = 该 field 在 battle-fields.json 数组里的索引,
 * = sdlpal `lprgBattleField[wBattleField]` 的下标。M3 dev panel 选战斗 fixture 时用。
 *
 * **signed 字段**:`magicEffect` 五维 是 SHORT(sdlpal `rgsMagicEffect[NUM_MAGIC_ELEMENTAL]`),
 * 元素 buff 可正可负。
 *
 * @param fieldBuf DATA.MKF chunk 5 原始字节(未压缩)
 */
export function parseBattleFields(fieldBuf: Uint8Array): BattleField[] {
  if (fieldBuf.byteLength % FIELD_RECORD_SIZE !== 0) {
    throw new Error(
      `parseBattleFields: DATA.MKF chunk 5 size ${fieldBuf.byteLength} 不能被 FIELD_RECORD_SIZE=${FIELD_RECORD_SIZE} 整除`,
    )
  }
  const view = new DataView(fieldBuf.buffer, fieldBuf.byteOffset, fieldBuf.byteLength)
  const count = fieldBuf.byteLength / FIELD_RECORD_SIZE
  const out: BattleField[] = []
  for (let i = 0; i < count; i++) {
    const base = i * FIELD_RECORD_SIZE
    out.push({
      id: i,
      screenWave: u16(view, base, FIELD_OFF.screenWave),
      magicEffect: {
        wind: s16(view, base, FIELD_OFF.wind),
        thunder: s16(view, base, FIELD_OFF.thunder),
        water: s16(view, base, FIELD_OFF.water),
        fire: s16(view, base, FIELD_OFF.fire),
        earth: s16(view, base, FIELD_OFF.earth),
      },
    })
  }
  return out
}
