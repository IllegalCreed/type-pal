import { expect, it } from 'vitest'
import { decodeRle } from './rle.js'

// 普通实心/透明混合已由shared及真实图片专测承接；这里只核extractor绑定PAL来源。
it('extractor RLE入口绑定PAL来源，高位literal不当skip', () => {
  // C: T有高位但T > 0x80+width时仍是literal。width1×height130允许130B整段跨行。
  const pixels = Uint8Array.from({ length: 130 }, (_, index) => index)
  const bytes = new Uint8Array([1, 0, 130, 0, 0x82, ...pixels])
  const expected = { width: 1, height: 130, pixels, opaque: new Uint8Array(130).fill(1) }
  expect(() => decodeRle(bytes)).not.toThrow()
  expect(decodeRle(bytes)).toEqual(expected)
})
