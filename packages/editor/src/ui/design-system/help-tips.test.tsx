// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsHelpTip, DsIconButton, DsTooltip } from './index.js'

let host: HTMLDivElement
let root: Root
let restoreAct: () => void

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    restoreAct()
  }
})

test('static action tooltip keeps both descriptions resolvable before the popover opens', () => {
  host.innerHTML = renderToStaticMarkup(
    <>
      <DsTooltip label="保存项目" shortcut="Ctrl+S">
        <button type="button" aria-describedby="save-destination">
          保存
        </button>
      </DsTooltip>
      <p id="save-destination">写入当前项目。</p>
    </>,
  )
  const button = host.querySelector('button')!
  const parts = button.getAttribute('aria-describedby')?.split(' ') ?? []
  expect(parts.map((id) => document.getElementById(id)?.textContent)).toEqual([
    '写入当前项目。',
    '保存项目 · Ctrl+S',
  ])
  expect(host.querySelector('[role="tooltip"]')?.classList.contains('ds-visually-hidden')).toBe(
    true,
  )
  expect(document.querySelector('.ds-tooltip__bubble')).toBeNull()
})

test('associates conceptual help with its trigger and lets Escape dismiss it', async () => {
  await act(async () =>
    root.render(<DsHelpTip label="分次执行">每次运行只执行当前步骤。</DsHelpTip>),
  )

  const wrapper = host.querySelector<HTMLElement>('.ds-help-tip')!
  const button = host.querySelector<HTMLButtonElement>('button')!
  const tooltip = host.querySelector<HTMLElement>('[role="tooltip"]')!
  expect(button.getAttribute('aria-describedby')).toBe(tooltip.id)
  expect(document.body.querySelector('.ds-help-tooltip')).toBeNull()
  expect(button.hasAttribute('aria-expanded')).toBe(false)
  expect(wrapper.classList.contains('is-open')).toBe(false)

  await act(async () =>
    button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })),
  )
  const visualTooltip = document.body.querySelector<HTMLElement>('.ds-help-tooltip')!
  expect(visualTooltip.textContent).toBe(tooltip.textContent)
  expect(wrapper.contains(visualTooltip)).toBe(false)
  expect(wrapper.classList.contains('is-open')).toBe(true)
  await act(async () => button.focus())
  await act(async () =>
    button.dispatchEvent(
      new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
    ),
  )
  expect(wrapper.classList.contains('is-open')).toBe(true)

  const firstEscape = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  })
  await act(async () => button.dispatchEvent(firstEscape))
  expect(firstEscape.defaultPrevented).toBe(true)
  expect(wrapper.classList.contains('is-open')).toBe(false)
  expect(document.body.querySelector('.ds-help-tooltip')).toBeNull()
  expect(document.activeElement).toBe(button)

  const secondEscape = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  })
  await act(async () => button.dispatchEvent(secondEscape))
  expect(secondEscape.defaultPrevented).toBe(false)
  await act(async () => button.blur())
  await act(async () => button.focus())
  expect(wrapper.classList.contains('is-open')).toBe(true)
  await act(async () => root.render(null))
  const afterUnmount = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  })
  await act(async () => document.dispatchEvent(afterUnmount))
  expect(afterUnmount.defaultPrevented).toBe(false)
})

test('keeps help bubbles in the nearest dialog top layer and SSR descriptions inline', async () => {
  const staticHtml = renderToStaticMarkup(<DsHelpTip label="脚本方案">完整的方案说明。</DsHelpTip>)
  const staticHost = document.createElement('div')
  staticHost.innerHTML = staticHtml
  const staticButton = staticHost.querySelector('button')!
  const staticTooltip = staticHost.querySelector<HTMLElement>('[role="tooltip"]')!
  expect(staticButton.getAttribute('aria-describedby')).toBe(staticTooltip.id)
  expect(staticTooltip.textContent).toBe('完整的方案说明。')

  await act(async () =>
    root.render(
      <dialog open>
        <DsHelpTip label="脚本方案">完整的方案说明。</DsHelpTip>
      </dialog>,
    ),
  )
  const dialog = host.querySelector('dialog')!
  const button = dialog.querySelector<HTMLButtonElement>('button')!
  await act(async () =>
    button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })),
  )
  const visualTooltip = dialog.querySelector<HTMLElement>('.ds-help-tooltip')
  expect(visualTooltip?.parentElement).toBe(dialog)
  expect(document.body.querySelectorAll('.ds-help-tooltip')).toHaveLength(1)
})

test('portals icon-button tooltips outside clipping cards and keeps inline descriptions', async () => {
  await act(async () =>
    root.render(
      <section className="clipping-card" style={{ overflow: 'hidden' }}>
        <DsIconButton label="播放" icon="play" variant="secondary" />
      </section>,
    ),
  )

  const card = host.querySelector<HTMLElement>('.clipping-card')!
  const button = card.querySelector<HTMLButtonElement>('[aria-label="播放"]')!
  const descriptionId = button.getAttribute('aria-describedby')
  expect(descriptionId).not.toBeNull()
  expect(card.querySelector<HTMLElement>(`#${descriptionId}`)?.textContent).toBe('播放')
  expect(document.body.querySelector('.ds-tooltip__bubble')).toBeNull()

  await act(async () =>
    button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })),
  )
  const visualTooltip = document.body.querySelector<HTMLElement>('.ds-tooltip__bubble')!
  expect(visualTooltip.textContent).toBe('播放')
  expect(card.contains(visualTooltip)).toBe(false)
  expect(visualTooltip.parentElement).toBe(document.body)
  expect(visualTooltip.getAttribute('aria-hidden')).toBe('true')

  const escapeEvent = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  })
  await act(async () => button.dispatchEvent(escapeEvent))
  expect(escapeEvent.defaultPrevented).toBe(true)
  expect(document.body.querySelector('.ds-tooltip__bubble')).toBeNull()
})

test('dismisses pointer-triggered tooltips instead of keeping clicked controls sticky', async () => {
  await act(async () =>
    root.render(
      <>
        <DsIconButton label="上一帧" icon="chevron-left" variant="secondary" />
        <DsIconButton label="下一帧" icon="chevron-right" variant="secondary" />
      </>,
    ),
  )

  const previous = host.querySelector<HTMLButtonElement>('[aria-label="上一帧"]')!
  const next = host.querySelector<HTMLButtonElement>('[aria-label="下一帧"]')!

  await act(async () =>
    previous.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })),
  )
  expect(document.body.querySelector('.ds-tooltip__bubble')?.textContent).toBe('上一帧')

  await act(async () => {
    previous.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    previous.focus()
  })
  expect(document.body.querySelector('.ds-tooltip__bubble')).toBeNull()

  await act(async () => {
    previous.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: next }))
    next.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: previous }))
  })
  const bubbles = document.body.querySelectorAll<HTMLElement>('.ds-tooltip__bubble')
  expect(bubbles).toHaveLength(1)
  expect(bubbles[0]?.textContent).toBe('下一帧')

  await act(async () => {
    next.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))
    previous.blur()
    next.focus()
  })
  expect(document.body.querySelector('.ds-tooltip__bubble')?.textContent).toBe('下一帧')
})
