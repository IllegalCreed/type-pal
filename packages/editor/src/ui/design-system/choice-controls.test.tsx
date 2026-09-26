// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { DsCheckbox, DsSwitch } from './choice-controls.js'
import * as controls from './controls.js'

describe('U10 choice controls', () => {
  test('keeps checkbox and switch identity with aria semantics', () => {
    expect(controls.DsCheckbox).toBe(DsCheckbox)
    expect(controls.DsSwitch).toBe(DsSwitch)
    const checkboxHost = document.createElement('div')
    checkboxHost.innerHTML = renderToStaticMarkup(
      <DsCheckbox label="启用" checked readOnly indeterminate />,
    )
    expect(checkboxHost.querySelector('input')?.getAttribute('aria-checked')).toBe('mixed')

    const switchHost = document.createElement('div')
    switchHost.innerHTML = renderToStaticMarkup(<DsSwitch label="自动保存" checked readOnly />)
    expect(switchHost.querySelector('input')?.getAttribute('role')).toBe('switch')
  })
})
