import { expect, test } from 'vitest'
import { mainApi } from './world-async-fixture.js'

test('compiled AST fixture reuse still creates independent closures and mutable environments', () => {
  const source = 'function read() { return value }; function step() { return ++value }'
  const a = { value: 1 },
    b = { value: 40 }
  const first = mainApi<{ read(): number; step(): number }>(['read', 'step'], [], a, source)
  const second = mainApi<{ read(): number; step(): number }>(['read', 'step'], [], b, source)
  expect(first.read).not.toBe(second.read)
  expect(first.step()).toBe(2)
  expect(second.read()).toBe(40)
  b.value = 70
  expect(second.step()).toBe(71)
  expect(a).toEqual({ value: 2 })
  expect(b).toEqual({ value: 71 })
})

test('same-named negative-control source and different binding selections never share compiled bodies', () => {
  const original = 'function read() { return value }; function other() { return value + 1 }'
  const mutated = original.replace('return value }', 'return value * 2 }')
  expect(mainApi<{ read(): number }>(['read'], [], { value: 3 }, original).read()).toBe(3)
  expect(mainApi<{ read(): number }>(['read'], [], { value: 3 }, mutated).read()).toBe(6)
  expect(mainApi<{ other(): number }>(['other'], [], { value: 3 }, original).other()).toBe(4)
  const props = 'const host = { left: () => value, right: () => value + 2 }'
  expect(mainApi<{ left(): number }>([], ['left'], { value: 7 }, props).left()).toBe(7)
  expect(mainApi<{ right(): number }>([], ['right'], { value: 7 }, props).right()).toBe(9)
})

test('valid cached requests never mask later missing or ambiguous AST bindings', () => {
  const valid = 'function read() { return value }'
  expect(mainApi<{ read(): number }>(['read'], [], { value: 1 }, valid).read()).toBe(1)
  expect(() => mainApi(['missing'], [], {}, valid)).toThrow('missing main binding missing')
  expect(() => mainApi(['read'], [], {}, `${valid}; const host = { read() {} }; ${valid}`)).toThrow(
    'ambiguous main binding read',
  )
  expect(mainApi<{ read(): number }>(['read'], [], { value: 9 }, valid).read()).toBe(9)
})
