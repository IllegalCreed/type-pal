// @vitest-environment jsdom
import { expect, test } from 'vitest'
import { calls, Example } from './subject'

test('real client call retains its execution', () => {
  expect(new Example().run(1)).toBe('accepted')
  expect(calls.value).toBe(1)
})
