// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { DsIconButton } from './index.js'

test('a compact playback icon keeps the native button label and tooltip without extra focus stops', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(
    <DsIconButton label="播放" icon="play" variant="secondary" size="compact" />,
  )
  const button = host.querySelector('button')!
  const tooltip = host.querySelector<HTMLElement>('[role="tooltip"]')!
  expect(button.className).toBe('ds-icon-button ds-icon-button--secondary ds-icon-button--compact')
  expect(button.type).toBe('button')
  expect(button.getAttribute('aria-label')).toBe('播放')
  expect(button.getAttribute('aria-describedby')).toBe(tooltip.id)
  expect(tooltip.className).toBe('ds-visually-hidden')
  expect(tooltip.textContent).toBe('播放')
  const icon = button.querySelector('svg')!
  expect(icon.getAttribute('viewBox')).toBe('0 0 16 16')
  expect(icon.getAttribute('aria-hidden')).toBe('true')
  expect(icon.getAttribute('focusable')).toBe('false')
  expect(icon.querySelector('path')?.getAttribute('d')).toBe('m5 3 8 5-8 5V3Z')
})
