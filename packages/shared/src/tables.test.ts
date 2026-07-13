import { describe, expectTypeOf, it } from 'vitest'
import type { Item } from './tables.js'

describe('tables types', () => {
  it('Item 有 id + bitmap + price + scriptOnUse + flags', () => {
    expectTypeOf<Item>().toMatchTypeOf<{
      id: number
      bitmap: number
      price: number
      scriptOnUse: number
    }>()
  })
})
