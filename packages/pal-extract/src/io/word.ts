import { decodeGbk } from '../utils/gbk.js'

/**
 * WORD.DAT —— 目标游戏(1998 Win9x 版)(WIN95)内嵌名称表。
 *
 * 文件为扁平字节流，每条记录固定 10 字节 GBK，按对象 ID 顺序排列：
 *
 *   [0 ..35]  系统/UI 文字       (36 条)
 *   [36..41]  人物名             (6 条 = MAX_PLAYER_ROLES)
 *   [42..60]  战斗/UI 文字       (19 条)
 *   [61..295] 物品名             (235 条)
 *   [296..397]仙术/技能名        (102 条)
 *   [398..550]敌人名             (153 条)
 *   [551..564]毒素/特殊文字      (14 条)   ← 对应接口中的 scenes 字段
 *
 * 偏移与数量由实测数据确认（Win9x 版 WORD.DAT 共 565 条 × 10 字节 = 5650 字节）。
 * 参考 sdlpal text.c / palcommon.h / global.h。
 */

export interface Words {
  items: string[]
  spells: string[]
  persons: string[]
  enemies: string[]
  scenes: string[]
}

// 每条名称固定 10 字节 GBK，来自 sdlpal text.c 注释 "Each word has 10 bytes"
const WORD_LENGTH = 10

// 各类别在 WORD.DAT 中的起始索引与数量（实测 1998 Win9x 版）
const PERSONS_OFFSET = 36  // MAX_PLAYER_ROLES = 6 个角色名从此处开始
const PERSONS_COUNT  = 6

const ITEMS_OFFSET = 61   // 物品名紧跟战斗 UI 标签后
const ITEMS_COUNT  = 235

const SPELLS_OFFSET = 296  // 仙术/技能名
const SPELLS_COUNT  = 102

const ENEMIES_OFFSET = 398  // 敌人名
const ENEMIES_COUNT  = 153

const SCENES_OFFSET = 551   // 毒素/特殊条目（测试只要非空即可）
const SCENES_COUNT  = 14

function readBlock(buf: Uint8Array, offset: number, count: number): string[] {
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const start = (offset + i) * WORD_LENGTH
    // 参考 sdlpal text.c: 先去掉尾部空格再做 GBK 解码
    let end = start + WORD_LENGTH
    while (end > start && buf[end - 1] === 0x20) end--
    out.push(decodeGbk(buf.subarray(start, end)))
  }
  return out
}

export function parseWordDat(buf: Uint8Array): Words {
  return {
    persons: readBlock(buf, PERSONS_OFFSET, PERSONS_COUNT),
    items:   readBlock(buf, ITEMS_OFFSET,   ITEMS_COUNT),
    spells:  readBlock(buf, SPELLS_OFFSET,  SPELLS_COUNT),
    enemies: readBlock(buf, ENEMIES_OFFSET, ENEMIES_COUNT),
    scenes:  readBlock(buf, SCENES_OFFSET,  SCENES_COUNT),
  }
}
