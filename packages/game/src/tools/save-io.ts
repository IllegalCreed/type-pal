// src/tools/save-io.ts —— 存档导入导出(纯序列化/校验;DOM 下载/读文件在 tools-panel 调)。
import type { GameState } from '../core/game-state.js'

const FORMAT = 'type-pal-save'
const VERSION = 1

export function serializeSave(gs: GameState): string {
  return JSON.stringify({ format: FORMAT, version: VERSION, savedAt: 0, gs })
}

/** 解析 V1 envelope；写槽时间由 Save API 生成，文件的 savedAt 不参与恢复。 */
export function parseImportedSave(text: string): GameState {
  let obj: { format?: string; version?: number; gs?: unknown }
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('存档文件不是合法 JSON')
  }
  if (obj?.format !== FORMAT) throw new Error('存档格式不符(format 头缺失/错误)')
  if (obj.version !== VERSION) throw new Error(`存档版本不符(version 只接受 ${VERSION})`)
  const gs = obj.gs as Partial<GameState> | undefined
  if (!gs || !Array.isArray(gs.partyMembers) || typeof gs.wNumScene !== 'number') {
    throw new Error('存档缺必要字段(partyMembers / wNumScene)')
  }
  if (typeof gs.dwCash !== 'number' || !Number.isFinite(gs.dwCash)) {
    throw new Error('存档金钱字段非法(dwCash 必须为有限数值)')
  }
  return gs as GameState
}
