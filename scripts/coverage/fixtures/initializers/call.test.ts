import { expect, test } from 'vitest'
import { calls, Example } from './subject'

test('real node call retains its execution', () => {
  expect(new Example().run(1)).toBe('accepted')
  expect(calls.value).toBe(1)
})
