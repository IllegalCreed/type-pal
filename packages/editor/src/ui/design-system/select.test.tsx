// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import * as controls from './controls.js'
import { DsSelect } from './select.js'

describe('U09 select', () => {
  test('keeps select identity with combobox listbox semantics', () => {
    expect(controls.DsSelect).toBe(DsSelect)
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(
      <DsSelect
        aria-label="目标"
        value="a"
        options={[
          { value: 'a', label: '选项 A' },
          { value: 'b', label: '选项 B' },
        ]}
        onValueChange={() => {}}
      />,
    )
    const trigger = host.querySelector('button')!
    expect(trigger.getAttribute('role')).toBe('combobox')
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox')
  })
})
