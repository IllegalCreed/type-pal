import { describe, expect, it } from 'vitest'
import { DIALOG_HISTORY_CAP, type DialogHistoryEntry, pushDialogHistory } from './dialog-history.js'

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
})
