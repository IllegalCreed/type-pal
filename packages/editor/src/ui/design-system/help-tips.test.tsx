// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import * as controls from './controls.js'
import { DsHelpTip, DsTooltip } from './help-tips.js'
import * as root from './index.js'

describe('U02 help tips', () => {
  test('keeps tooltip and help-tip identity with visually-hidden descriptions and Escape dismiss', async () => {
    expect(controls.DsTooltip).toBe(DsTooltip)
    expect(controls.DsHelpTip).toBe(DsHelpTip)
    expect(root.DsHelpTip).toBe(DsHelpTip)

    const staticHtml = renderToStaticMarkup(
      <DsTooltip label="保存">
        <button type="button">保存</button>
      </DsTooltip>,
    )
    const staticHost = document.createElement('div')
    staticHost.innerHTML = staticHtml
    const staticButton = staticHost.querySelector('button')!
    const staticTooltip = staticHost.querySelector<HTMLElement>('[role="tooltip"]')!
    expect(staticTooltip.className).toBe('ds-visually-hidden')
    expect(staticTooltip.textContent).toBe('保存')
    expect(staticButton.getAttribute('aria-describedby')).toBe(staticTooltip.id)

    const host = document.createElement('div')
    document.body.appendChild(host)
    const reactRoot = createRoot(host)
    await act(async () =>
      reactRoot.render(<DsHelpTip label="分次执行">每次运行只执行当前步骤。</DsHelpTip>),
    )

    const wrapper = host.querySelector<HTMLElement>('.ds-help-tip')!
    const button = host.querySelector<HTMLButtonElement>('button')!
    const tooltip = host.querySelector<HTMLElement>('[role="tooltip"]')!
    expect(button.getAttribute('aria-label')).toBe('分次执行说明')
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id)
    expect(tooltip.className).toBe('ds-visually-hidden')
    expect(tooltip.textContent).toBe('每次运行只执行当前步骤。')

    await act(async () =>
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })),
    )
    expect(wrapper.classList.contains('is-open')).toBe(true)

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => document.dispatchEvent(escapeEvent))
    expect(escapeEvent.defaultPrevented).toBe(true)
    expect(wrapper.classList.contains('is-open')).toBe(false)

    reactRoot.unmount()
    host.remove()
  })
})
