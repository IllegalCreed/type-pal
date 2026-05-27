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
  /**
   * M5.6 T14 hotfix(2026-05-27)— audit doc 第 5 漏洞:之前只 dump 5 category(510 条),
   * 丢了 [0..35] 系统/UI 36 条 + [42..60] 战斗/UI 19 条 = 55 条 sdlpal `#define LABEL_X = N`
   * 引用的 word(eg. `MAINMENU_LABEL_NEWGAME=7` / `LOADGAME=8` / `LOADMENU_LABEL_SLOT_FIRST=43-47`
   * / `CASH_LABEL=10` 等)。
   *
   * 真值 flat:`flat[i]` 直接对应 sdlpal `PAL_GetWord(i)`,index = sdlpal word id。
   * 565 条全 dump,运行时按需取。
   */
  flat: string[]
  /** 系统 / UI 文字 [0..35],36 条(含 MAINMENU / LOADMENU / SystemMenu / Cash 等 label)。 */
  system: string[]
  /** 战斗 / UI 文字 [42..60],19 条(含 BATTLEUI_LABEL_* 等)。 */
  battleUi: string[]
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

// M5.6 hotfix(2026-05-27)— 系统/UI/战斗段(sdlpal source 真值)
const SYSTEM_OFFSET = 0    // [0..35] 系统 / UI 文字 36 条
const SYSTEM_COUNT  = 36
// [36..41] 已在 PERSONS
const BATTLE_UI_OFFSET = 42 // [42..60] 战斗 / UI 文字 19 条
const BATTLE_UI_COUNT  = 19
const TOTAL_WORD_COUNT = 565 // sdlpal Win9x 版实测

export function parseWordDat(buf: Uint8Array): Words {
  // M5.6 hotfix:之前只 5 category dump 漏 55 条 sys/UI/battle label,user 怼 5 次。
  // 现 flat[i] 直对 sdlpal `PAL_GetWord(i)`,运行时按 id lookup;同时保留 category
  // 切片便于 game runtime 按用途取(eg. items / spells / enemies)。
  const flat: string[] = []
  for (let i = 0; i < TOTAL_WORD_COUNT; i++) {
    const start = i * WORD_LENGTH
    if (start + WORD_LENGTH > buf.byteLength) break
    let end = start + WORD_LENGTH
    while (end > start && buf[end - 1] === 0x20) end--
    flat.push(decodeGbk(buf.subarray(start, end)))
  }
  return {
    persons: readBlock(buf, PERSONS_OFFSET, PERSONS_COUNT),
    items:   readBlock(buf, ITEMS_OFFSET,   ITEMS_COUNT),
    spells:  readBlock(buf, SPELLS_OFFSET,  SPELLS_COUNT),
    enemies: readBlock(buf, ENEMIES_OFFSET, ENEMIES_COUNT),
    scenes:  readBlock(buf, SCENES_OFFSET,  SCENES_COUNT),
    flat,
    system:   readBlock(buf, SYSTEM_OFFSET,    SYSTEM_COUNT),
    battleUi: readBlock(buf, BATTLE_UI_OFFSET, BATTLE_UI_COUNT),
  }
}
