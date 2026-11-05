// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import { DsCard } from './card.js'
import * as controls from './controls.js'
import { DsEmptyState, DsStatus } from './feedback.js'
import { DsTabs } from './tabs.js'

describe('U12 tabs card feedback', () => {
  test('keeps tabs, card, and status identity with tablist and alert roles', () => {
    expect(controls.DsTabs).toBe(DsTabs)
    expect(controls.DsCard).toBe(DsCard)
    expect(controls.DsStatus).toBe(DsStatus)
    expect(controls.DsEmptyState).toBe(DsEmptyState)

    const tabsHost = document.createElement('div')
    tabsHost.innerHTML = renderToStaticMarkup(
      <DsTabs
        label="视图"
        activeId="a"
        onChange={() => {}}
        items={[
          { id: 'a', label: '列表' },
          { id: 'b', label: '网格' },
        ]}
      />,
    )
    expect(tabsHost.querySelector('[role="tablist"]')).not.toBeNull()

    expect(renderToStaticMarkup(<DsCard title="面板">内容</DsCard>)).toContain('ds-card__title')
    expect(renderToStaticMarkup(<DsStatus tone="error">失败</DsStatus>)).toContain('role="alert"')
    expect(renderToStaticMarkup(<DsEmptyState title="空" description="暂无" />)).toContain(
      'ds-empty-state',
    )
  })
})

test('optional tab removal is a sibling action, preserves selection, and restores focus to the surviving active tab', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onChange = vi.fn()
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  function Harness() {
    const [ids, setIds] = useState(['a', 'b', 'c'])
    const [activeId, setActiveId] = useState('a')
    return (
      <DsTabs
        label="场景"
        activeId={activeId}
        onChange={(id) => {
          onChange(id)
          setActiveId(id)
        }}
        items={ids.map((id) => ({
          id,
          label: id,
          remove: {
            label: `移除 ${id}`,
            onRemove: () => {
              setIds(ids.filter((candidate) => candidate !== id))
              if (activeId === id) setActiveId(ids.find((candidate) => candidate !== id)!)
            },
          },
        }))}
      />
    )
  }
  try {
    await act(async () => root.render(<Harness />))
    const removeB = host.querySelector<HTMLButtonElement>('[aria-label="移除 b"]')!
    expect(removeB.closest('[role="tab"]')).toBeNull()
    await act(async () => removeB.focus())
    await act(async () => {
      removeB.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      removeB.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      removeB.click()
    })
    expect(onChange).not.toHaveBeenCalled()
    expect([...host.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent)).toEqual([
      'a',
      'c',
    ])
    expect(document.activeElement).toBe(host.querySelector('[role="tab"][aria-selected="true"]'))
    await act(async () =>
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
      ),
    )
    expect(onChange).toHaveBeenLastCalledWith('c')
    expect(document.activeElement?.textContent).toBe('c')
    const removeC = host.querySelector<HTMLButtonElement>('[aria-label="移除 c"]')!
    await act(async () => removeC.focus())
    await act(async () => removeC.click())
    expect(document.activeElement?.textContent).toBe('a')
    expect(onChange).toHaveBeenCalledTimes(1)
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
