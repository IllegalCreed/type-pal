// 历史对话环形缓冲(生产工具面板「历史对话」用)。纯追加,不影响对话流程。
// 2026-06-15 修订:带场景维度,渲染时按 scene 边界天然分组(无需额外「切场景」事件)。

export const DIALOG_HISTORY_CAP = 200

/** 一条历史对话:进入时所属场景号(wNumScene)+ 去空白后的文本。 */
export interface DialogHistoryEntry {
  scene: number
  text: string
}

/**
 * 追加一行对话到历史。
 * - 空/纯空白跳过;
 * - 与**末条** `text` 相同**且** `scene` 相同 → 跳过(连续去重,防同一行多 tick re-commit 重复入);
 * - 否则 push `{ scene, text: trimmed }`;
 * - 超 `DIALOG_HISTORY_CAP` → 丢最旧。
 */
export function pushDialogHistory(history: DialogHistoryEntry[], scene: number, text: string): void {
  const t = text.trim()
  if (!t) return
  const last = history[history.length - 1]
  if (last && last.scene === scene && last.text === t) return
  history.push({ scene, text: t })
  if (history.length > DIALOG_HISTORY_CAP) history.splice(0, history.length - DIALOG_HISTORY_CAP)
}
