// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'
import { unmountHost } from '../../__tests__/react-host-cleanup.js'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsTabs } from './index.js'

async function press(target: HTMLElement, key: string): Promise<void> {
  await act(async () =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })),
  )
}

test('inspector tabs use enabled roving focus with a named panel and separate count', async () => {
  const restoreAct = installReactActEnvironment()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  function Inspector() {
    const [activeId, setActiveId] = useState('source')
    return (
      <>
        <DsTabs
          idPrefix="sprite"
          variant="inspector"
          label="精灵属性"
          activeId={activeId}
          onChange={setActiveId}
          items={[
            { id: 'source', label: '源帧' },
            { id: 'usage', label: '用途', disabled: true },
            { id: 'references', label: '引用', count: 8 },
            { id: 'actions', label: '动作', disabled: true },
          ]}
        />
        <section
          role="tabpanel"
          id={`sprite-panel-${activeId}`}
          aria-labelledby={`sprite-tab-${activeId}`}
        >
          当前活动面板
        </section>
      </>
    )
  }
  try {
    await act(async () => root.render(<Inspector />))
    const list = host.querySelector('[role="tablist"][aria-label="精灵属性"]')!
    expect(list.classList.contains('ds-tabs--inspector')).toBe(true)
    const tabs = [...list.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    const source = tabs[0]!
    const references = tabs[2]!
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1])
    expect(source.classList.contains('ds-tab--inspector')).toBe(true)
    expect(references.querySelector('.ds-tab__label')?.textContent).toBe('引用')
    expect(references.querySelector('.ds-tab__count')?.textContent).toBe('8')

    source.focus()
    await press(source, 'ArrowRight')
    expect(document.activeElement).toBe(references)
    expect(references.getAttribute('aria-selected')).toBe('true')
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([-1, -1, 0, -1])
    const panel = document.getElementById(references.getAttribute('aria-controls') ?? '')
    expect(panel?.getAttribute('aria-labelledby')).toBe(references.id)

    await press(references, 'Home')
    expect(document.activeElement).toBe(source)
    await press(source, 'End')
    expect(document.activeElement).toBe(references)
  } finally {
    await unmountHost({ host, root, restoreResourceObservers: restoreAct })
  }
})

test('the library domain bar keeps its compact navigation sizing', async () => {
  const restoreAct = installReactActEnvironment()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () =>
      root.render(
        <DsTabs
          size="compact"
          label="精灵资源域"
          items={[
            { id: 'world', label: '大世界' },
            { id: 'battle', label: '战斗' },
          ]}
          activeId="world"
          onChange={() => undefined}
        />,
      ),
    )
    const active = host.querySelector('[role="tab"][aria-selected="true"]')!
    expect(active.textContent).toBe('大世界')
    expect(active.classList.contains('ds-tab--compact')).toBe(true)
  } finally {
    await unmountHost({ host, root, restoreResourceObservers: restoreAct })
  }
})

test('optional tab removal is a sibling action, preserves selection, and restores focus to the surviving active tab', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const onChange = vi.fn()
  const restoreAct = installReactActEnvironment()
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
    await unmountHost({ host, root, restoreResourceObservers: restoreAct })
  }
})
