import { expect, test } from 'vitest'
import { calls, Example } from './subject'

test('second import does not run a method', () => {
  expect(Example.ceiling).toBe(128)
  expect(calls.value).toBe(0)
})
