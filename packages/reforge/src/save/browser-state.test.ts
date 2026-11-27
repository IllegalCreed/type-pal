import { describe, expect, test } from 'vitest'
import {
  browserConfirm,
  browserConfirmOverwriteNo,
  browserConfirmOverwriteYes,
  browserMoveCursor,
  closeSaveBrowser,
  openSaveBrowser,
} from './browser-state.js'
import type { SaveMeta } from './types.js'

const m01: SaveMeta = { slotId: 'm01', kind: 'manual', party: [], mapName: 'x', savedAt: 1 }
const autoMeta: SaveMeta = { slotId: 'auto', kind: 'auto', party: [], mapName: 'x', savedAt: 1 }
const quickMeta: SaveMeta = { ...autoMeta, slotId: 'quick', kind: 'quick' }

describe('save 浏览状态机', () => {
  test('open：自动、快速、手动槽按 30 格顺序显示，游标限制在末格', () => {
    const s = openSaveBrowser('load', [m01], 0)
    expect(s.active).toBe(true)
    expect(s.metas).toHaveLength(30)
    expect(s.metas.slice(0, 4).map((meta) => meta?.slotId ?? null)).toEqual([
      null,
      null,
      'm01',
      null,
    ])
    expect(openSaveBrowser('load', [], 999).cursor).toBe(29)
  })
  test('move：↑↓ ±1、←→ ±3，clamp 不 wrap', () => {
    const s = openSaveBrowser('save', [])
    expect(browserMoveCursor(s, 'down').cursor).toBe(1)
    expect(browserMoveCursor(s, 'right').cursor).toBe(3) // ±整页
    expect(browserMoveCursor(s, 'up').cursor).toBe(0) // 顶 clamp
    expect(browserMoveCursor({ ...s, cursor: 29 }, 'down').cursor).toBe(29)
  })
  test('confirm·save：空手动槽→write；已存手动槽→覆盖确认；auto/quick→no-op', () => {
    const empty = openSaveBrowser('save', [])
    expect(browserConfirm(openSaveBrowser('save', [autoMeta, quickMeta])).action).toBeUndefined()
    expect(browserConfirm(openSaveBrowser('save', [autoMeta, quickMeta], 1)).action).toBeUndefined()
    const onM01 = { ...empty, cursor: 2 }
    expect(browserConfirm(onM01).action).toEqual({ kind: 'write', slotId: 'm01' }) // 空→写
    const filled = openSaveBrowser('save', [m01])
    const onFilled = { ...filled, cursor: 2 }
    const r = browserConfirm(onFilled)
    expect(r.action).toBeUndefined()
    expect(r.state.confirmOverwrite).toBe(true) // 已存→覆盖确认
  })
  test('confirm·load：已存槽→load(含 auto/quick)；空槽→no-op', () => {
    const s = openSaveBrowser('load', [m01, autoMeta, quickMeta])
    expect(browserConfirm({ ...s, cursor: 2 }).action).toEqual({
      kind: 'load',
      slotId: 'm01',
    })
    expect(browserConfirm({ ...s, cursor: 0 }).action).toEqual({ kind: 'load', slotId: 'auto' }) // auto 可读
    expect(browserConfirm({ ...s, cursor: 1 }).action).toEqual({ kind: 'load', slotId: 'quick' })
    const noAuto = openSaveBrowser('load', [m01])
    expect(browserConfirm({ ...noAuto, cursor: 0 }).action).toBeUndefined() // 空槽不可读
  })
  test('覆盖确认：是→write；否→退确认', () => {
    const { state: s } = browserConfirm(openSaveBrowser('save', [m01], 2))
    expect(s.confirmOverwrite).toBe(true)
    expect(browserConfirmOverwriteYes(s)).toEqual({
      state: { ...s, confirmOverwrite: false },
      action: { kind: 'write', slotId: 'm01' },
    })
    expect(browserConfirmOverwriteNo(s).confirmOverwrite).toBe(false)
    expect(browserMoveCursor(s, 'down').cursor).toBe(s.cursor) // 覆盖确认期不移动
  })
  test('close：active false', () => {
    expect(closeSaveBrowser().active).toBe(false)
  })
})
