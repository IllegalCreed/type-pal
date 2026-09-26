// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import * as controls from './controls.js'
import { DsIconButton } from './icon-button.js'
import * as root from './index.js'

describe('U03 icon button', () => {
  test('keeps icon-button identity with compact class and aria-label', () => {
    expect(controls.DsIconButton).toBe(DsIconButton)
    expect(root.DsIconButton).toBe(DsIconButton)

    const staticHost = document.createElement('div')
    staticHost.innerHTML = renderToStaticMarkup(
      <DsIconButton label="播放" icon="play" variant="secondary" size="compact" />,
    )
    const button = staticHost.querySelector('button')!
    const tooltip = staticHost.querySelector<HTMLElement>('[role="tooltip"]')!
    expect(button.className).toBe(
      'ds-icon-button ds-icon-button--secondary ds-icon-button--compact',
    )
    expect(button.getAttribute('aria-label')).toBe('播放')
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id)
    expect(tooltip.className).toBe('ds-visually-hidden')
    expect(tooltip.textContent).toBe('播放')
  })
})
