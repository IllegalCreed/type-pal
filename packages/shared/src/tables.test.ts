import { describe, it, expectTypeOf } from 'vitest'
import type { Item } from './tables.js'

describe('tables types', () => {
  it('Item 有 id + name + bitmap + price', () => {
    expectTypeOf<Item>().toMatchTypeOf<{ id: number; name: string; bitmap: number; price: number }>()
  })
})
