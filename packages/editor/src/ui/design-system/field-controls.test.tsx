// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { DsTextField } from './field-controls.js'
import * as controls from './controls.js'

describe('U08 field controls', () => {
  test('keeps text field shell identity with label association', () => {
    expect(controls.DsTextField).toBe(DsTextField)
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(<DsTextField id="title" label="标题" defaultValue="A" />)
    expect(host.querySelector('label')?.getAttribute('for')).toBe('title')
    expect(host.querySelector('input')?.id).toBe('title')
  })
})
