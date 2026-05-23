import { describe, expect, it } from 'vitest'
import { renderBootMessage } from './main.js'

describe('game smoke', () => {
  it('启动信息含 shared 里的帧率', () => {
    const msg = renderBootMessage()
    expect(msg).toContain('100ms')
    expect(msg).toContain('M0')
  })
})
