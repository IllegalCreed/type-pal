import { describe, expect, test } from 'vitest'
import {
  browserConfirm,
  browserConfirmOverwriteNo,
  browserConfirmOverwriteYes,
  browserMoveCursor,
  closeSaveBrowser,
  openSaveBrowser,
} from './browser-state.js'
import { ALL_SLOT_IDS, type SaveMeta } from './types.js'

const m01: SaveMeta = { slotId: 'm01', kind: 'manual', party: [], mapName: 'x', savedAt: 1 }
const autoMeta: SaveMeta = { slotId: 'auto', kind: 'auto', party: [], mapName: 'x', savedAt: 1 }

describe('save 浏览状态机', () => {
  test('open：30 槽元数据对齐 ALL_SLOT_IDS；cursor clamp', () => {
    const s = openSaveBrowser('load', [m01], 0)
    expect(s.active).toBe(true)
    expect(s.metas).toHaveLength(ALL_SLOT_IDS.length)
    expect(s.metas[ALL_SLOT_IDS.indexOf('m01')]?.slotId).toBe('m01')
    expect(s.metas[0]).toBe(null) // auto 空
    expect(openSaveBrowser('load', [], 999).cursor).toBe(ALL_SLOT_IDS.length - 1) // clamp
  })
  test('move：↑↓ ±1、←→ ±3，clamp 不 wrap', () => {
    const s = openSaveBrowser('save', [])
    expect(browserMoveCursor(s, 'down').cursor).toBe(1)
    expect(browserMoveCursor(s, 'right').cursor).toBe(3) // ±整页
    expect(browserMoveCursor(s, 'up').cursor).toBe(0) // 顶 clamp
    expect(browserMoveCursor({ ...s, cursor: ALL_SLOT_IDS.length - 1 }, 'down').cursor).toBe(
      ALL_SLOT_IDS.length - 1,
    )
  })
  test('confirm·save：空手动槽→write；已存手动槽→覆盖确认；auto/quick→no-op', () => {
    const empty = openSaveBrowser('save', []) // cursor0=auto
    expect(browserConfirm(empty).action).toBeUndefined() // auto 不可手动写
    const onM01 = { ...empty, cursor: ALL_SLOT_IDS.indexOf('m01') }
    expect(browserConfirm(onM01).action).toEqual({ kind: 'write', slotId: 'm01' }) // 空→写
    const filled = openSaveBrowser('save', [m01])
    const onFilled = { ...filled, cursor: ALL_SLOT_IDS.indexOf('m01') }
    const r = browserConfirm(onFilled)
    expect(r.action).toBeUndefined()
    expect(r.state.confirmOverwrite).toBe(true) // 已存→覆盖确认
  })
  test('confirm·load：已存槽→load(含 auto/quick)；空槽→no-op', () => {
    const s = openSaveBrowser('load', [m01, autoMeta])
    expect(browserConfirm({ ...s, cursor: ALL_SLOT_IDS.indexOf('m01') }).action).toEqual({
      kind: 'load',
      slotId: 'm01',
    })
    expect(browserConfirm({ ...s, cursor: 0 }).action).toEqual({ kind: 'load', slotId: 'auto' }) // auto 可读
    const noAuto = openSaveBrowser('load', [m01])
    expect(browserConfirm({ ...noAuto, cursor: 0 }).action).toBeUndefined() // 空槽不可读
  })
  test('覆盖确认：是→write；否→退确认', () => {
    const s = {
      ...openSaveBrowser('save', [m01]),
      cursor: ALL_SLOT_IDS.indexOf('m01'),
      confirmOverwrite: true,
    }
    expect(browserConfirmOverwriteYes(s).action).toEqual({ kind: 'write', slotId: 'm01' })
    expect(browserConfirmOverwriteNo(s).confirmOverwrite).toBe(false)
    expect(browserMoveCursor(s, 'down').cursor).toBe(s.cursor) // 覆盖确认期不移动
  })
  test('close：active false', () => {
    expect(closeSaveBrowser().active).toBe(false)
  })
})
