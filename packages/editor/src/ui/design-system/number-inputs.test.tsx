// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { DsNumberInput } from './number-inputs.js'
import * as controls from './controls.js'

describe('U07 number inputs', () => {
  test('keeps number input identity with stepped parse validation string', () => {
    expect(controls.DsNumberInput).toBe(DsNumberInput)
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(
      <DsNumberInput aria-label="数量" integer min={0} max={10} step={1} defaultValue={2} />,
    )
    const input = host.querySelector('input')!
    expect(input.getAttribute('type')).toBe('number')
    expect(input.getAttribute('inputmode')).toBe('numeric')
    expect(input.getAttribute('step')).toBe('1')
  })
})
