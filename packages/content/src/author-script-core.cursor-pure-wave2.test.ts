/**
 * TEST-CURSOR-CONTENT-PURE-WAVE-2 C1：直接调用 checkAuthorCondition。
 * wave2 只经 checkAuthorCommands 嵌套测 itemEquipped 缺 atLeast / 空 id。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap } from './__tests__/cursor-pure-wave2-fixtures.js'
import { expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { checkAuthorCondition } from './author-script-core.js'

describe('C1 author-script-core 剩余合同', () => {
  test('checkAuthorCondition 接受 itemEquipped.atLeast=2，0 按路径拒绝', () => {
    const ok = { kind: 'itemEquipped' as const, itemId: 'item.bead', atLeast: 2 }
    const okSnap = inputSnap(ok)
    checkAuthorCondition(ok, 'cond')
    expect(ok).toEqual(okSnap)

    const bad = { kind: 'itemEquipped' as const, itemId: 'item.bead', atLeast: 0 }
    const badSnap = inputSnap(bad)
    expectExactError(() => checkAuthorCondition(bad, 'cond'), 'cond.atLeast: 期望正整数')
    expect(bad).toEqual(badSnap)
  })
})
