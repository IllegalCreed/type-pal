import { ALL_SLOT_IDS, type SaveMeta, SLOTS_PER_PAGE, type SlotId, slotKind } from './types.js'

export type SaveBrowserMode = 'save' | 'load'

export interface SaveBrowserState {
  active: boolean
  mode: SaveBrowserMode
  cursor: number // 绝对索引 0..ALL_SLOT_IDS.length-1（page = floor(cursor/SLOTS_PER_PAGE)）
  metas: (SaveMeta | null)[] // 与 ALL_SLOT_IDS 同序同长；null=空槽
  confirmOverwrite: boolean // save 模式选了已存手动槽 → 覆盖确认
}

/** caller 执行：write=截图+putSlot；load=getPayload+应用。 */
export type SaveBrowserAction = { kind: 'write'; slotId: SlotId } | { kind: 'load'; slotId: SlotId }

export function metasToList(metas: SaveMeta[]): (SaveMeta | null)[] {
  const byId = new Map(metas.map((m) => [m.slotId, m]))
  return ALL_SLOT_IDS.map((id) => byId.get(id) ?? null)
}

export function openSaveBrowser(
  mode: SaveBrowserMode,
  metas: SaveMeta[],
  initialCursor = 0,
): SaveBrowserState {
  const n = ALL_SLOT_IDS.length
  return {
    active: true,
    mode,
    cursor: Math.min(Math.max(0, initialCursor), n - 1),
    metas: metasToList(metas),
    confirmOverwrite: false,
  }
}

export function closeSaveBrowser(): SaveBrowserState {
  return { active: false, mode: 'save', cursor: 0, metas: [], confirmOverwrite: false }
}

export function pageOf(cursor: number): number {
  return Math.floor(cursor / SLOTS_PER_PAGE)
}

/** 导航：↑↓ ±1（全列表线性）、←→ ±整页（同行跨页）；clamp 不 wrap。覆盖确认期不动。 */
export function browserMoveCursor(
  s: SaveBrowserState,
  dir: 'up' | 'down' | 'left' | 'right',
): SaveBrowserState {
  if (!s.active || s.confirmOverwrite) return s
  const n = ALL_SLOT_IDS.length
  const delta =
    dir === 'up' ? -1 : dir === 'down' ? 1 : dir === 'left' ? -SLOTS_PER_PAGE : SLOTS_PER_PAGE
  return { ...s, cursor: Math.min(Math.max(0, s.cursor + delta), n - 1) }
}

/** 确认：save —— 空手动槽→write；已存手动槽→覆盖确认；auto/quick→no-op。
 *  load —— 已存槽(含 auto/quick)→load；空槽→no-op。 */
export function browserConfirm(s: SaveBrowserState): {
  state: SaveBrowserState
  action?: SaveBrowserAction
} {
  if (!s.active || s.confirmOverwrite) return { state: s }
  const slotId = ALL_SLOT_IDS[s.cursor]
  if (!slotId) return { state: s }
  const meta = s.metas[s.cursor] ?? null
  if (s.mode === 'save') {
    if (slotKind(slotId) !== 'manual') return { state: s } // auto/quick 不可手动写
    if (meta) return { state: { ...s, confirmOverwrite: true } } // 已存 → 覆盖确认
    return { state: s, action: { kind: 'write', slotId } } // 空 → 写
  }
  if (!meta) return { state: s } // load 空槽不可读
  return { state: s, action: { kind: 'load', slotId } }
}

export function browserConfirmOverwriteYes(s: SaveBrowserState): {
  state: SaveBrowserState
  action?: SaveBrowserAction
} {
  if (!s.confirmOverwrite) return { state: s }
  const slotId = ALL_SLOT_IDS[s.cursor]
  return {
    state: { ...s, confirmOverwrite: false },
    action: slotId ? { kind: 'write', slotId } : undefined,
  }
}

export function browserConfirmOverwriteNo(s: SaveBrowserState): SaveBrowserState {
  return s.confirmOverwrite ? { ...s, confirmOverwrite: false } : s
}
