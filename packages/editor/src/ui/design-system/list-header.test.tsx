// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { DsListHeader } from './list-header.js'
import * as controls from './controls.js'

describe('U11 list header', () => {
  test('keeps list header identity with title and count chrome', () => {
    expect(controls.DsListHeader).toBe(DsListHeader)
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(
      <DsListHeader title="组合库" count={12} unit="项" />,
    )
    expect(host.querySelector('.ds-list-header__title')?.textContent).toBe('组合库')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('12 项')
  })
})
