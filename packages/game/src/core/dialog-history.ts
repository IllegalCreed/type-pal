// 工具面板的有界对话历史；由事件提交追加，超限后移除最旧记录。
// 按 mapNum 而非 wNumScene 分组，同一地图的多个场景共享地名。

export const DIALOG_HISTORY_CAP = 100

/** 一条历史对话:进入时所属地图号(SCENE.mapNum)+ 去空白后的文本。 */
export interface DialogHistoryEntry {
  map: number
  text: string
}

/**
 * 追加一行对话到历史。
 * - 空/纯空白跳过;
 * - 与**末条** `text` 相同**且** `map` 相同 → 跳过(连续去重,防同一行多 tick re-commit 重复入);
 * - 否则 push `{ map, text: trimmed }`;
 * - 超 `DIALOG_HISTORY_CAP` → 丢最旧。
 */
export function pushDialogHistory(history: DialogHistoryEntry[], map: number, text: string): void {
  const t = text.trim()
  if (!t) return
  const last = history[history.length - 1]
  if (last && last.map === map && last.text === t) return
  history.push({ map, text: t })
  if (history.length > DIALOG_HISTORY_CAP) history.splice(0, history.length - DIALOG_HISTORY_CAP)
}

/**
 * 读档时归一化历史对话(「跟着存档走」)。dialogHistory 随 deepClone(gs) 进存档,
 * 但读档走 `Object.assign(gs, loadedGs)` —— **对 loadedGs 缺失的 key 不覆盖**。
 * 故老档(功能上线前存的,无 dialogHistory 字段)会残留当前 session 历史 → 时间线倒错。
 * 此函数显式归一:
 *  - undefined/空(老档)→ `[]`(清残留,从读档点重记);
 *  - 非空快照未超限时借用数组，超限时另取最后 CAP 条，不修改传入快照。
 * Save.loadSlot 已在存储边界深拷贝；这里不再复制，返回值交给当前 gs 持有和追加。
 */
export function restoreDialogHistory(
  loaded: DialogHistoryEntry[] | undefined,
): DialogHistoryEntry[] {
  if (!loaded?.length) return []
  return loaded.length > DIALOG_HISTORY_CAP
    ? loaded.slice(loaded.length - DIALOG_HISTORY_CAP)
    : loaded
}
