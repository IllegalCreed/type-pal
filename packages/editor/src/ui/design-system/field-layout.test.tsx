// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import * as controls from './controls.js'
import { DsControlGroup, DsField, DsFieldGroup } from './field-layout.js'
import * as root from './index.js'

describe('U05 field layout', () => {
  test('keeps field-group, field, and control-group identity with inline layout and required asterisk', () => {
    expect(controls.DsFieldGroup).toBe(DsFieldGroup)
    expect(controls.DsField).toBe(DsField)
    expect(controls.DsControlGroup).toBe(DsControlGroup)
    expect(root.DsField).toBe(DsField)

    const fieldHtml = renderToStaticMarkup(
      <DsField id="name" label="名称" layout="inline" required>
        <input id="name" />
      </DsField>,
    )
    const fieldHost = document.createElement('div')
    fieldHost.innerHTML = fieldHtml
    expect(fieldHost.querySelector('.ds-field')?.className).toBe('ds-field ds-field--inline')
    expect(fieldHost.querySelector('.ds-field__required')?.textContent).toBe('*')
    expect(fieldHost.querySelector('label')?.getAttribute('for')).toBe('name')

    expect(
      renderToStaticMarkup(
        <DsControlGroup
          control={<input />}
          leading={<span>L</span>}
          actions={<button type="button">Go</button>}
        />,
      ),
    ).toContain('ds-control-group__control')
  })
})
