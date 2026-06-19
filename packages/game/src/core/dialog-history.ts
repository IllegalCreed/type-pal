// 历史对话环形缓冲(生产工具面板「历史对话」用)。纯追加,不影响对话流程。
// 2026-06-15 修订:带地图维度,渲染时按 map 边界天然分组(无需额外「切场景」事件)。
//   仙剑场景名按 mapNum(地图号)而非 wNumScene 命名:同 map 多场景共享地名更稳。

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
 *  - 新档快照原样恢复,超 CAP 截断到最后 CAP 条(防旧 CAP 期存档超限)。
 */
export function restoreDialogHistory(loaded: DialogHistoryEntry[] | undefined): DialogHistoryEntry[] {
  if (!loaded?.length) return []
  return loaded.length > DIALOG_HISTORY_CAP ? loaded.slice(loaded.length - DIALOG_HISTORY_CAP) : loaded
}
