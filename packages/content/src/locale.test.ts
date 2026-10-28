import { describe, expect, test } from 'vitest'
import { type Locale, lookupText } from './locale.js'

const L: Locale = { 'name.youhun': '游魂', 'dlg.x.0': '活人气味', silent: '' }

describe('lookupText', () => {
  test('命中 → 返回译文', () => {
    expect(lookupText('name.youhun', L)).toBe('游魂')
    expect(lookupText('silent', L)).toBe('') // An authored empty translation is present, not missing.
  })

  test('未命中 → 回退返回 id 本身(开发期可见)', () => {
    expect(lookupText('dlg.missing', L)).toBe('dlg.missing')
  })
})
