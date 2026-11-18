import { expect } from 'vitest'
import { deepSnapshot } from './value-snapshot.js'

export function expectExactError(run: () => unknown, message: string): void {
  expect(run).toThrow(new Error(message))
}

export function expectAcceptsUnchanged<T>(run: (input: T) => void, input: T): void {
  const before = deepSnapshot(input)
  expect(() => run(input)).not.toThrow()
  expect(input).toEqual(before)
}

export function expectRejectUnchanged<T>(run: (input: T) => void, input: T, message: string): void {
  const before = deepSnapshot(input)
  expectExactError(() => run(input), message)
  expect(input).toEqual(before)
}
