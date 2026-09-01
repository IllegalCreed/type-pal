// @vitest-environment jsdom

import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { LayerStackControls, type LayerStackControlItem } from './LayerStackControls.js'

let host: HTMLDivElement
let root: Root

const items: readonly LayerStackControlItem[] = [
  { id: 'objects', name: '上层', detail: '12 格' },
  { id: 'floor', name: '地板', hidden: true, locked: true },
]

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

function renderControls(
  overrides: Partial<Parameters<typeof LayerStackControls>[0]> = {},
): Promise<void> {
  return act(async () => {
    root.render(
      <LayerStackControls
        items={items}
        activeId="objects"
        onSelect={() => undefined}
        onAdd={() => undefined}
        onDelete={() => undefined}
        onToggleVisible={() => undefined}
        onToggleLocked={() => undefined}
        reorderScopeKey="fixture:layers"
        reorderRevision={items}
        stackOrder="top-first"
        onReorder={() => false}
        {...overrides}
      />,
    )
  })
}

function tooltipFor(button: HTMLButtonElement): HTMLElement | undefined {
  return button
    .getAttribute('aria-describedby')
    ?.split(/\s+/)
    .map((id) => document.getElementById(id))
    .find((element): element is HTMLElement => element?.getAttribute('role') === 'tooltip')
}

function StatefulLayerStack() {
  const [layers, setLayers] = useState(items)
  const [activeId, setActiveId] = useState('objects')
  return (
    <LayerStackControls
      items={layers}
      activeId={activeId}
      onSelect={setActiveId}
      onAdd={() => undefined}
      onDelete={() => undefined}
      onToggleVisible={(id) =>
        setLayers((current) =>
          current.map((layer) => (layer.id === id ? { ...layer, hidden: !layer.hidden } : layer)),
        )
      }
      onToggleLocked={(id) =>
        setLayers((current) =>
          current.map((layer) => (layer.id === id ? { ...layer, locked: !layer.locked } : layer)),
        )
      }
      reorderScopeKey="fixture:stateful-layers"
      reorderRevision={layers}
      stackOrder="top-first"
      onReorder={() => false}
    />
  )
}

describe('LayerStackControls', () => {
  test('uses three compact action-group owners with stable contextual names and IDs', async () => {
    const onSelect = vi.fn()
    const onToggleVisible = vi.fn()
    const onToggleLocked = vi.fn()
    await renderControls({ onSelect, onToggleVisible, onToggleLocked })

    const header = host.querySelector<HTMLElement>('.map-layer-header-actions')!
    expect(header.dataset.density).toBe('compact')
    expect(header.querySelectorAll(':scope > .ds-tooltip')).toHaveLength(2)
    expect(header.querySelectorAll('.ds-icon-button--compact')).toHaveLength(0)
    expect(
      header.querySelector<HTMLButtonElement>('[aria-label="删除选中图层：上层"]'),
    ).not.toBeNull()
    expect(
      header
        .querySelector<HTMLButtonElement>('[aria-label="删除选中图层：上层"]')
        ?.classList.contains('ds-icon-button--danger'),
    ).toBe(true)

    const stateGroups = host.querySelectorAll<HTMLElement>('.layer-state-actions')
    expect(stateGroups).toHaveLength(2)
    expect([...stateGroups].every((group) => group.dataset.density === 'compact')).toBe(true)
    const floorRow = host
      .querySelector<HTMLButtonElement>('[data-layer-id="floor"]')!
      .closest<HTMLElement>('.map-layer-row')!
    const floorVisible = floorRow.querySelector<HTMLButtonElement>('[aria-label="图层可见：地板"]')!
    const floorLocked = floorRow.querySelector<HTMLButtonElement>('[aria-label="图层锁定：地板"]')!
    expect(floorVisible.getAttribute('aria-pressed')).toBe('false')
    expect(floorLocked.getAttribute('aria-pressed')).toBe('true')
    await act(async () => {
      floorVisible.click()
      floorLocked.click()
    })
    expect(onToggleVisible).toHaveBeenCalledWith('floor')
    expect(onToggleLocked).toHaveBeenCalledWith('floor')

    const selection = host.querySelector<HTMLButtonElement>('[data-layer-id="objects"]')!
    expect(selection.getAttribute('aria-label')).toBe('选择图层：上层（objects）')
    expect(selection.getAttribute('aria-pressed')).toBe('true')
    await act(async () => selection.click())
    expect(onSelect).toHaveBeenCalledWith('objects')

    const order = host.querySelector<HTMLElement>('.layer-order')!
    expect(order.dataset.density).toBe('compact')
    expect(host.querySelectorAll('.layer-order')).toHaveLength(1)
    expect(order.querySelector('[aria-label="上移图层：上层"]')).not.toBeNull()
    expect(order.querySelector('[aria-label="下移图层：上层"]')).not.toBeNull()
    const icons = [...host.querySelectorAll('svg.ds-icon')]
    expect(icons.length).toBeGreaterThan(0)
    expect(
      icons.every(
        (icon) =>
          icon.getAttribute('aria-hidden') === 'true' && icon.getAttribute('focusable') === 'false',
      ),
    ).toBe(true)
    for (const button of host.querySelectorAll<HTMLButtonElement>('.ds-icon-button'))
      expect(tooltipFor(button)?.textContent).toBe(button.getAttribute('aria-label'))
  })

  test('keeps state names stable while pressed state and active identity change', async () => {
    await act(async () => root.render(<StatefulLayerStack />))

    const visible = host.querySelector<HTMLButtonElement>('[aria-label="图层可见：地板"]')!
    const locked = host.querySelector<HTMLButtonElement>('[aria-label="图层锁定：地板"]')!
    expect(visible.getAttribute('aria-pressed')).toBe('false')
    expect(locked.getAttribute('aria-pressed')).toBe('true')
    await act(async () => {
      visible.click()
      locked.click()
    })
    expect(host.querySelector('[aria-label="图层可见：地板"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(host.querySelector('[aria-label="图层锁定：地板"]')?.getAttribute('aria-pressed')).toBe(
      'false',
    )
    expect(host.querySelector('[aria-label="显示图层"]')).toBeNull()
    expect(host.querySelector('[aria-label="解锁图层"]')).toBeNull()

    await act(async () => host.querySelector<HTMLButtonElement>('[data-layer-id="floor"]')!.click())
    expect(host.querySelector('[data-layer-id="floor"]')?.getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector('[aria-label="删除选中图层：地板"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="删除选中图层：上层"]')).toBeNull()
  })

  test.each([
    { stackOrder: 'top-first' as const, up: 0, down: 2 },
    { stackOrder: 'bottom-first' as const, up: 2, down: 0 },
  ])('$stackOrder maps contextual move actions to visual indices', async ({
    stackOrder,
    up,
    down,
  }) => {
    const onReorder = vi.fn(() => true)
    const orderedItems: readonly LayerStackControlItem[] = [
      { id: 'top', name: '顶层' },
      { id: 'middle', name: '中层' },
      { id: 'bottom', name: '底层' },
    ]
    await renderControls({
      items: orderedItems,
      activeId: 'middle',
      stackOrder,
      reorderRevision: orderedItems,
      onReorder,
    })

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="上移图层：中层"]')!.click(),
    )
    expect(onReorder).toHaveBeenLastCalledWith('middle', up)
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="下移图层：中层"]')!.click(),
    )
    expect(onReorder).toHaveBeenLastCalledWith('middle', down)
    expect(onReorder).toHaveBeenCalledTimes(2)
  })

  test('shows one nearby reason for shared disabled rules and binds both header actions', async () => {
    const reason = '先接管迁移组合，才能增删或排序图层。'
    await renderControls({ addDisabledReason: reason, deleteDisabledReason: reason })

    const add = host.querySelector<HTMLButtonElement>('[aria-label="新增图层"]')!
    const remove = host.querySelector<HTMLButtonElement>('[aria-label="删除选中图层：上层"]')!
    expect(add.disabled).toBe(true)
    expect(remove.disabled).toBe(true)
    expect(host.querySelectorAll('.layer-stack-disabled-reason')).toHaveLength(1)
    const reasonElement = host.querySelector<HTMLElement>('.layer-stack-disabled-reason')!
    const addDescriptions = new Set(add.getAttribute('aria-describedby')!.split(/\s+/))
    const removeDescriptions = new Set(remove.getAttribute('aria-describedby')!.split(/\s+/))
    expect(addDescriptions.has(reasonElement.id)).toBe(true)
    expect(removeDescriptions.has(reasonElement.id)).toBe(true)
    expect(reasonElement.textContent).toBe(reason)
    expect(
      [...addDescriptions]
        .map((id) => document.getElementById(id))
        .some((element) => element?.getAttribute('role') === 'tooltip'),
    ).toBe(true)
    expect(
      [...removeDescriptions]
        .map((id) => document.getElementById(id))
        .some((element) => element?.getAttribute('role') === 'tooltip'),
    ).toBe(true)
  })

  test('keeps an unrelated action enabled while explaining the disabled delete action', async () => {
    await renderControls({ deleteDisabledReason: '至少保留一个图层。' })

    const add = host.querySelector<HTMLButtonElement>('[aria-label="新增图层"]')!
    const remove = host.querySelector<HTMLButtonElement>('[aria-label="删除选中图层：上层"]')!
    expect(add.disabled).toBe(false)
    expect(remove.disabled).toBe(true)
    const reasonElement = host.querySelector<HTMLElement>('.layer-stack-disabled-reason')!
    expect(add.getAttribute('aria-describedby')!.split(/\s+/)).not.toContain(reasonElement.id)
    expect(remove.getAttribute('aria-describedby')!.split(/\s+/)).toContain(reasonElement.id)
    expect(reasonElement.textContent).toBe('至少保留一个图层。')
  })
})
