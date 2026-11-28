// @vitest-environment jsdom
import { act, createRef } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import { unmountHost } from '../../__tests__/react-host-cleanup.js'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsActionLink, DsButton, DsPressable } from './index.js'

test('frame actions use native buttons without submitting the enclosing author form', async () => {
  const restoreAct = installReactActEnvironment()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const frame = createRef<HTMLButtonElement>()
  const actions: string[] = []

  try {
    await act(async () =>
      root.render(
        <form
          onSubmit={(event) => {
            event.preventDefault()
            actions.push('submit')
          }}
        >
          <DsPressable ref={frame} className="tile" onClick={() => actions.push('select-frame')}>
            选中源帧
          </DsPressable>
          <DsButton onClick={() => actions.push('open')}>打开预览</DsButton>
          <DsButton type="submit" variant="primary">
            确认
          </DsButton>
        </form>,
      ),
    )
    const [selected, preview, submit] = [...host.querySelectorAll('button')]
    expect(frame.current).toBe(selected)
    expect(selected?.type).toBe('button')
    expect(selected?.className).toBe('ds-pressable tile')
    expect(preview?.className).toBe('ds-button ds-button--secondary')
    await act(async () => {
      selected?.click()
      preview?.click()
      submit?.click()
    })
    expect(actions).toEqual(['select-frame', 'open', 'submit'])
  } finally {
    await unmountHost({ host, root, restoreResourceObservers: restoreAct })
  }
})

test('the shared action style keeps links navigable and exposes pending buttons as disabled', () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(
    <>
      <DsButton busy>保存</DsButton>
      <DsActionLink href="/preview" size="compact" variant="secondary">
        试放
      </DsActionLink>
    </>,
  )
  const button = host.querySelector('button')!
  expect(button.className).toBe('ds-button ds-button--secondary')
  expect(button.disabled).toBe(true)
  expect(button.getAttribute('aria-busy')).toBe('true')
  expect(button.textContent).toBe('处理中')
  const link = host.querySelector('a')!
  expect(link.getAttribute('href')).toBe('/preview')
  expect(link.className).toBe('ds-button ds-button--secondary ds-button--compact')
  expect(link.textContent).toBe('试放')
})

test('buttons and action links share geometry while preserving native semantics', async () => {
  const restoreAct = installReactActEnvironment()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    const buttonRef = createRef<HTMLButtonElement>()
    await act(async () =>
      root.render(
        <>
          <DsActionLink
            variant="secondary"
            size="compact"
            icon="open"
            href="/preview"
            target="_blank"
            rel="noopener noreferrer"
          >
            试放
          </DsActionLink>
          <DsButton ref={buttonRef} variant="danger" size="compact" icon="delete">
            删除
          </DsButton>
        </>,
      ),
    )

    const link = host.querySelector<HTMLAnchorElement>('a')!
    const button = host.querySelector<HTMLButtonElement>('button')!
    expect([...link.classList]).toEqual(
      expect.arrayContaining(['ds-button', 'ds-button--secondary', 'ds-button--compact']),
    )
    expect([...button.classList]).toEqual(
      expect.arrayContaining(['ds-button', 'ds-button--danger', 'ds-button--compact']),
    )
    expect(link.getAttribute('href')).toBe('/preview')
    expect(link.target).toBe('_blank')
    expect(link.rel.split(/\s+/).sort()).toEqual(['noopener', 'noreferrer'])
    expect(buttonRef.current).toBe(button)
    buttonRef.current?.focus()
    expect(document.activeElement).toBe(button)
    expect(host.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2)
  } finally {
    await unmountHost({ host, root, restoreResourceObservers: restoreAct })
  }
})
