import { describe, it, expect } from 'vitest'
import type { DialogBoxStyle } from '@type-pal/shared'
import { createFramebuffer } from './framebuffer.js'
import { drawDialogBox } from './draw-dialog-box.js'

describe('drawDialogBox', () => {
  it.each<DialogBoxStyle>(['top', 'center', 'bottom', 'narration'])(
    'style=%s 画背景 + 文字,不抛错',
    (style) => {
      const fb = createFramebuffer()
      const ok = () => drawDialogBox(fb, '你好世界', style)
      expect(ok).not.toThrow()
    },
  )
})
