/**
 * TEST-CONTENT-RESIDUAL-1 A6-A10：author-dialogue 守卫轴残项（author-dialogue.ts）。
 * author-dialogue.test.ts 已覆盖身份联合/cue 形态；本文件逐轴钉
 * rows 长度/元素、speed、autoAdvance、slot、cursorFrame 的单轴反例 + 合法正控。
 * speed/autoAdvance 允许 0 及非整数非负有限数（r2 收口确认）。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-residual-fixtures.js'
import { type AuthorDialogueCue, checkAuthorDialogueCue } from './author-dialogue.js'

const base = (): AuthorDialogueCue => ({
  identity: { kind: 'narration' },
  rows: [{ text: '第一行' }],
})

describe('A6 rows 守卫轴（现行合同：非空数组，无长度上限——不发明 >4 拒绝）', () => {
  test('空数组拒绝；元素缺 text/非对象拒绝；多行合法', () => {
    expect(() => checkAuthorDialogueCue({ ...base(), rows: [] }, 'c')).toThrow(/rows/)
    expect(() => checkAuthorDialogueCue({ ...base(), rows: [{ speed: 1 } as never] }, 'c')).toThrow(
      /text/,
    )
    expect(() => checkAuthorDialogueCue({ ...base(), rows: ['plain'] as never }, 'c')).toThrow(
      /rows\[0\]/,
    )
    const many = Array.from({ length: 6 }, (_, i) => ({ text: `行${i}` }))
    expect(() => checkAuthorDialogueCue({ ...base(), rows: many }, 'c')).not.toThrow()
  })
})

describe('A7 row speed 守卫轴', () => {
  test('speed 非法值拒绝（负/NaN/非有限）；0 与非整数正数合法', () => {
    const withSpeed = (speed: number): AuthorDialogueCue => ({
      ...base(),
      rows: [{ text: 'x', speed }],
    })
    expect(() => checkAuthorDialogueCue(withSpeed(0), 'c')).not.toThrow()
    expect(() => checkAuthorDialogueCue(withSpeed(1.5), 'c')).not.toThrow()
    expect(() => checkAuthorDialogueCue(withSpeed(-1), 'c')).toThrow(/speed/)
    expect(() => checkAuthorDialogueCue(withSpeed(Number.NaN), 'c')).toThrow(/speed/)
    expect(() => checkAuthorDialogueCue(withSpeed(Number.POSITIVE_INFINITY), 'c')).toThrow(/speed/)
  })
})

describe('A8 autoAdvance 守卫轴', () => {
  test('autoAdvance 非法值拒绝；0 与非整数非负有限数合法；输入不变', () => {
    const withAdvance = (autoAdvance: number): AuthorDialogueCue => ({
      ...base(),
      autoAdvance,
    })
    const cue = withAdvance(0)
    const snapshot = deepSnapshot(cue)
    expect(() => checkAuthorDialogueCue(cue, 'c')).not.toThrow()
    expect(() => checkAuthorDialogueCue(withAdvance(250.5), 'c')).not.toThrow()
    expect(() => checkAuthorDialogueCue(withAdvance(-1), 'c')).toThrow(/autoAdvance/)
    expect(() => checkAuthorDialogueCue(withAdvance(Number.NaN), 'c')).toThrow(/autoAdvance/)
    expect(() => checkAuthorDialogueCue({ ...base(), autoAdvance: 'fast' as never }, 'c')).toThrow(
      /autoAdvance/,
    )
    expect(cue).toEqual(snapshot)
  })
})

describe('A9 slot 守卫轴', () => {
  test('非法 slot 拒绝；四个合法值逐一通过', () => {
    const withSlot = (slot: string): AuthorDialogueCue => ({ ...base(), slot: slot as never })
    for (const slot of ['bottom', 'top', 'narration', 'center'])
      expect(() => checkAuthorDialogueCue(withSlot(slot), 'c')).not.toThrow()
    expect(() => checkAuthorDialogueCue(withSlot('left'), 'c')).toThrow(/slot/)
    expect(() => checkAuthorDialogueCue(withSlot(''), 'c')).toThrow(/slot/)
  })
})

describe('A10 cursorFrame 守卫轴', () => {
  test('非法 cursorFrame 拒绝（超 0..2/非整数）；0/1/2 合法', () => {
    const withCursor = (cursorFrame: number): AuthorDialogueCue => ({
      ...base(),
      cursorFrame: cursorFrame as never,
    })
    for (const frame of [0, 1, 2])
      expect(() => checkAuthorDialogueCue(withCursor(frame), 'c')).not.toThrow()
    expect(() => checkAuthorDialogueCue(withCursor(3), 'c')).toThrow(/cursorFrame/)
    expect(() => checkAuthorDialogueCue(withCursor(-1), 'c')).toThrow(/cursorFrame/)
    expect(() => checkAuthorDialogueCue(withCursor(1.5), 'c')).toThrow(/cursorFrame/)
  })
})
