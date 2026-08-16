import { describe, expect, test } from 'vitest'
import { parseStoredPanelNumber } from './PanelResizeHandle.js'

describe('stored panel dimensions', () => {
  test('rejects malformed values and clamps finite dimensions to the current contract', () => {
    expect(parseStoredPanelNumber('not-a-number', { min: 120, max: 420 })).toBeUndefined()
    expect(parseStoredPanelNumber('64', { min: 120, max: 420 })).toBe(120)
    expect(parseStoredPanelNumber('640', { min: 120, max: 420 })).toBe(420)
    expect(parseStoredPanelNumber('219.6', { min: 120, max: 420 })).toBe(220)
  })

  test('keeps the parser backwards-compatible when no current layout bounds are supplied', () => {
    expect(parseStoredPanelNumber('194')).toBe(194)
  })
})
