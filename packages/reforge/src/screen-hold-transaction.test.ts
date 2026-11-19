import { expect, test } from 'vitest'
import { runWithPresentationFinalizer, ScreenHoldTransaction } from './screen-hold-transaction.js'

test('a matching reveal consumes the handle, while mismatches leave it available', () => {
  const hold = new ScreenHoldTransaction()
  const current = hold.begin('night')
  expect(() => hold.takeForReveal('morning')).toThrow('黑屏恢复 token 不匹配: morning')
  expect(hold.takeForReveal('night')).toBe(current)
  expect(() => hold.takeForReveal('night')).toThrow('黑屏恢复 token 不匹配: night')
})

test('a stale owner cannot cancel a new hold with the same token', () => {
  const hold = new ScreenHoldTransaction()
  const first = hold.begin('night')
  const current = hold.begin('night')
  hold.cancelOwned(first)
  expect(hold.active).toBe(current)
  hold.cancelOwned(current)
  expect(() => hold.takeForReveal('night')).toThrow('黑屏恢复 token 不匹配: night')
})

test('rejecting an empty token leaves the running hold intact', () => {
  const hold = new ScreenHoldTransaction()
  const current = hold.begin('night')
  expect(() => hold.begin('')).toThrow('黑屏保持 token 不能为空')
  expect(hold.takeForReveal('night')).toBe(current)
})

test('host cancellation clears the hold even without its handle', () => {
  const hold = new ScreenHoldTransaction()
  hold.begin('night')
  hold.cancel()
  hold.cancel()
  expect(() => hold.takeForReveal('night')).toThrow('黑屏恢复 token 不匹配: night')
})

test('normal rendering returns its value and leaves the current hold untouched', () => {
  const hold = new ScreenHoldTransaction()
  const current = hold.begin('night')
  const image = ['rendered map']
  expect(
    runWithPresentationFinalizer(
      () => image,
      () => hold.cancel(),
    ),
  ).toBe(image)
  expect(hold.takeForReveal('night')).toBe(current)
})

test('a rendering error reaches the host only after it canceled the presentation', () => {
  const hold = new ScreenHoldTransaction()
  hold.begin('night')
  const error = new Error('renderer failed')
  try {
    runWithPresentationFinalizer(
      () => {
        throw error
      },
      () => hold.cancel(),
    )
    throw new Error('render failure was swallowed')
  } catch (caught) {
    expect(caught).toBe(error)
    expect(() => hold.takeForReveal('night')).toThrow('黑屏恢复 token 不匹配: night')
  }
})
