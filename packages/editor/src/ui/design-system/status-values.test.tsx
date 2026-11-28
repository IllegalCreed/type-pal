// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { DsReadonlyValue, DsTag } from './index.js'

test('resource badges preserve their text, tone and caller metadata on the displayed element', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(
    <>
      <DsTag>使用</DsTag>
      <DsTag tone="neutral" aria-label="引用数">
        引用 8
      </DsTag>
      <DsTag tone="warning" monospace>
        sprite-direct
      </DsTag>
      <DsTag tone="danger" data-error-code="missing-frame">
        缺帧
      </DsTag>
    </>,
  )
  const badges = [...host.querySelectorAll('span.ds-tag')]
  expect(badges.map((badge) => [badge.textContent, badge.className])).toEqual([
    ['使用', 'ds-tag ds-tag--accent'],
    ['引用 8', 'ds-tag ds-tag--neutral'],
    ['sprite-direct', 'ds-tag ds-tag--warning ds-tag--monospace'],
    ['缺帧', 'ds-tag ds-tag--danger'],
  ])
  expect(badges[1]?.getAttribute('aria-label')).toBe('引用数')
  expect(badges[3]?.getAttribute('data-error-code')).toBe('missing-frame')
})

test('readonly properties remain ordinary selector-friendly text in inline and block contexts', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(
    <>
      <DsReadonlyValue data-value="format">RGBA</DsReadonlyValue>
      <DsReadonlyValue as="div" monospace className="path" translate="no">
        sprites/pc/drink.png
      </DsReadonlyValue>
    </>,
  )
  expect(host.querySelector('span[data-value="format"]')?.textContent).toBe('RGBA')
  const path = host.querySelector('div.path')!
  expect(path.classList.contains('ds-readonly-value--monospace')).toBe(true)
  expect(path.getAttribute('translate')).toBe('no')
  expect(path.textContent).toBe('sprites/pc/drink.png')
  expect(host.querySelector('input, textarea, button')).toBeNull()
})
