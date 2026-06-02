import { describe, expect, it } from 'vitest'
import { hiddenExpUpNumberX } from '../draw-battle-settlement.js'

// sdlpal battle.c:1270:PAL_DrawNumber(delta, 5, PAL_XY(183+(maxNameWidth+maxPropertyWidth-3)*8, 74), yellow, right)
//   maxNameWidth = PAL_MenuTextMaxWidth(6 角色名)、maxPropertyWidth = PAL_MenuTextMaxWidth(8 状态标签) - 1。
describe('hiddenExpUpNumberX (D11:hidden-exp 涨点数字右对齐 x)', () => {
  it('仙剑常量 maxName=3 / maxProp=1 → 191(此前误用单行公式 ≈206,差 15px)', () => {
    expect(hiddenExpUpNumberX(3, 1)).toBe(191)
  })

  it('公式 = 183 + (maxName + maxProp - 3) * 8', () => {
    expect(hiddenExpUpNumberX(3, 0)).toBe(183) // (3+0-3)*8 = 0
    expect(hiddenExpUpNumberX(4, 1)).toBe(199) // (4+1-3)*8 = 16
    expect(hiddenExpUpNumberX(2, 1)).toBe(183) // (2+1-3)*8 = 0(clamp 不需,公式自然)
  })
})
