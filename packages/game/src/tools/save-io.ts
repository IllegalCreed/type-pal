// src/tools/save-io.ts —— 存档导入导出(纯序列化/校验;DOM 下载/读文件在 tools-panel 调)。
import type { GameState } from '../core/game-state.js'

const FORMAT = 'type-pal-save'
const VERSION = 1

export function serializeSave(gs: GameState): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, savedAt: 0, gs })
}

/** 解析导入文件文本 → GameState;格式/字段不合法抛错(带中文原因)。savedAt 由 caller 用导入时刻覆盖。 */
export function parseImportedSave(text: string): GameState {
  let obj: { format?: string; version?: number; gs?: unknown }
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('存档文件不是合法 JSON')
  }
  if (obj?.format !== FORMAT) throw new Error('存档格式不符(format 头缺失/错误)')
  const gs = obj.gs as Partial<GameState> | undefined
  if (!gs || !Array.isArray(gs.partyMembers) || typeof gs.wNumScene !== 'number') {
    throw new Error('存档缺必要字段(partyMembers / wNumScene)')
  }
  return gs as GameState
}
