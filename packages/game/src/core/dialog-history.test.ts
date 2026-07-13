import { describe, expect, it } from 'vitest'
import {
  DIALOG_HISTORY_CAP,
  type DialogHistoryEntry,
  pushDialogHistory,
  restoreDialogHistory,
} from './dialog-history.js'

describe('dialog-history', () => {
  it('push 追加;空/纯空白跳过', () => {
    const h: DialogHistoryEntry[] = []
    pushDialogHistory(h, 1, '你好')
    pushDialogHistory(h, 1, '   ')
    pushDialogHistory(h, 1, '')
    expect(h).toEqual([{ map: 1, text: '你好' }])
  })

  it('环形缓冲:超过 CAP 丢最旧(长度=CAP、首条是第 5 条)', () => {
    const h: DialogHistoryEntry[] = []
    for (let i = 0; i < DIALOG_HISTORY_CAP + 5; i++) pushDialogHistory(h, 1, `line${i}`)
    expect(h.length).toBe(DIALOG_HISTORY_CAP)
    expect(h[0]).toEqual({ map: 1, text: 'line5' }) // 最旧 5 条被丢
    expect(h[h.length - 1]).toEqual({ map: 1, text: `line${DIALOG_HISTORY_CAP + 4}` })
  })

  it('连续同 map 同 text 去重(同一行被多 tick re-commit 不重复入)', () => {
    const h: DialogHistoryEntry[] = []
    pushDialogHistory(h, 1, '重复')
    pushDialogHistory(h, 1, '重复')
    expect(h).toEqual([{ map: 1, text: '重复' }])
  })

  it('不同 map 的相同 text 不去重(map 维度)', () => {
    const h: DialogHistoryEntry[] = []
    pushDialogHistory(h, 1, '欢迎')
    pushDialogHistory(h, 2, '欢迎')
    expect(h).toEqual([
      { map: 1, text: '欢迎' },
      { map: 2, text: '欢迎' },
    ])
  })

  it('restoreDialogHistory:老档无此字段(undefined)→ 兜底空(不残留当前 session 历史)', () => {
    expect(restoreDialogHistory(undefined)).toEqual([])
  })

  it('restoreDialogHistory:新档快照未超上限 → 原样恢复(跟着存档走)', () => {
    const snap: DialogHistoryEntry[] = [
      { map: 1, text: 'a' },
      { map: 2, text: 'b' },
    ]
    expect(restoreDialogHistory(snap)).toEqual(snap)
  })

  it('restoreDialogHistory:超 CAP 的存档 → 截断到最后 CAP 条(丢最旧)', () => {
    const long: DialogHistoryEntry[] = Array.from({ length: DIALOG_HISTORY_CAP + 5 }, (_, i) => ({
      map: 1,
      text: `l${i}`,
    }))
    const r = restoreDialogHistory(long)
    expect(r.length).toBe(DIALOG_HISTORY_CAP)
    expect(r[0]).toEqual({ map: 1, text: 'l5' })
    expect(r[r.length - 1]).toEqual({ map: 1, text: `l${DIALOG_HISTORY_CAP + 4}` })
  })
})
