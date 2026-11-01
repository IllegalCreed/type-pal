import { expect, it } from 'vitest'
import { parseDialogText } from '../present/dialog-text.js'
import { wrapEnglishDialogLine } from './messages.js'

it('wraps words without exposing escapes, control suffixes or losing persistent color/speed', () => {
  const lines = wrapEnglishDialogLine('@Alpha beta\\- gamma@ $01omega~02hidden suffix', 64)
  expect(lines).toEqual(['@Alpha', 'beta\\-', 'gamma@', '$01omega~02hidden suffix'])
  let color = 0x4f
  let delay = 3
  const visible: string[] = []
  for (const line of lines) {
    const parsed = parseDialogText(line, color, false, delay)
    expect([...parsed.text].length * 8).toBeLessThanOrEqual(64)
    visible.push(parsed.text)
    color = parsed.endColor
    delay = parsed.endIDelay
  }
  expect(visible).toEqual(['Alpha', 'beta-', 'gamma', 'omega'])
  expect(color).toBe(0x4f)
  expect(delay).toBe(1)
  expect(wrapEnglishDialogLine('Supercalifragilistic', 40)).toEqual([
    'Super',
    'calif',
    'ragil',
    'istic',
  ])
})
