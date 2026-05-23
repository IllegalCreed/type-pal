import { describe, expect, it } from 'vitest'
import { describeEngine } from './main.js'

describe('pal-extract smoke', () => {
  it('能从 @type-pal/shared 拿到帧率信息', () => {
    expect(describeEngine()).toBe('pal-extract @ 10fps explore')
  })
})
