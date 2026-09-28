// @vitest-environment jsdom
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
  withProjectMapStampPlacements,
} from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsInspectorHost } from './design-system/index.js'
import { StampPlacementSelectionInspector } from './StampPlacementSelectionInspector.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

function fixtureMap() {
  let map = buildBlankProjectMap(6, 6, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'objects', row: 0, col: 0, tileId: 2, tilesetId: 'tiles', height: 3 },
    { layerId: 'objects', row: 0, col: 1, tileId: 2, tilesetId: 'tiles', height: 3 },
    { layerId: 'objects', row: 1, col: 0, tileId: 7, tilesetId: 'tiles', height: 1 },
    { layerId: 'objects', row: 4, col: 4, tileId: 2, tilesetId: 'tiles', height: 2 },
  ])
  map = withProjectMapStampPlacements(map, [
    {
      id: 'place.lab.001',
      sourceStampId: 'stamp.lab',
      sourceStampName: '实验室图章',
      anchor: { row: 0, col: 0 },
      visualSlots: [
        { layerId: 'objects', row: 0, col: 0 },
        { layerId: 'objects', row: 0, col: 1 },
        { layerId: 'objects', row: 1, col: 0 },
      ],
      gridPoints: [
        { row: 0, col: 0 },
        { row: 1, col: 0 },
      ],
    },
    {
      id: 'place.lab.002',
      anchor: { row: 4, col: 4 },
      visualSlots: [{ layerId: 'objects', row: 4, col: 4 }],
      gridPoints: [{ row: 4, col: 4 }],
    },
  ])
  return map
}

type Props = Parameters<typeof StampPlacementSelectionInspector>[0]

function baseProps(map: ReturnType<typeof fixtureMap>): Props {
  return {
    map,
    placementIds: ['place.lab.001'],
    activeLayerId: 'objects',
    hiddenLayerIds: new Set<string>(),
    lockedLayerIds: new Set<string>(),
    onEnterEdit: () => undefined,
    onExitEdit: () => undefined,
    onUngroup: () => undefined,
    onEdit: () => undefined,
    onValidationError: () => undefined,
  }
}

function render(overrides: Partial<Props> = {}): void {
  const props = { ...baseProps(fixtureMap()), ...overrides }
  act(() =>
    root.render(
      <DsInspectorHost>
        <StampPlacementSelectionInspector {...props} />
      </DsInspectorHost>,
    ),
  )
}

function buttonByText(text: string): HTMLButtonElement {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(button).not.toBeNull()
  return button!
}

async function commit(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
  })
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

describe('StampPlacementSelectionInspector 组级只读视图', () => {
  test('summarizes a single placement and forwards enter-edit with the real id', async () => {
    const onEnterEdit = vi.fn()
    render({ onEnterEdit })
    expect(host.textContent).toContain('1 组 · 3 个视觉成员 · 2 个碰撞成员')
    expect(host.textContent).toContain('实验室图章')
    expect(host.textContent).toContain('r0:c0')
    expect(host.textContent).toContain('stamp.lab')

    await act(async () => buttonByText('进入组内编辑').click())
    expect(onEnterEdit).toHaveBeenCalledTimes(1)
    expect(onEnterEdit).toHaveBeenCalledWith('place.lab.001')
  })

  test('multi-selection blocks group entry and forwards ungroup with every id', async () => {
    const onUngroup = vi.fn()
    render({
      placementIds: ['place.lab.001', 'place.lab.002'],
      onUngroup,
    })
    expect(host.textContent).toContain('2 组 · 4 个视觉成员 · 3 个碰撞成员')
    expect(buttonByText('进入组内编辑').disabled).toBe(true)

    await act(async () => buttonByText('解组（保留地图内容）').click())
    expect(onUngroup).toHaveBeenCalledTimes(1)
    expect(onUngroup).toHaveBeenCalledWith(['place.lab.001', 'place.lab.002'])
  })

  test('locked member layers mark the group read-only and disable both actions', () => {
    render({ lockedLayerIds: new Set(['objects']) })
    expect(host.textContent).toContain('整组操作涉及 1 个隐藏或锁定图层，当前只读')
    // 锁定只阻止解组等整组写操作；进入组内查看仍被允许。
    expect(buttonByText('解组（保留地图内容）').disabled).toBe(true)
    expect(buttonByText('进入组内编辑').disabled).toBe(false)
  })
})

describe('StampPlacementSelectionInspector 组内编辑', () => {
  test('tile and height commits stay on the active-layer subset with labelled patches', async () => {
    const onEdit = vi.fn()
    render({
      editingPlacementId: 'place.lab.001',
      editingSelection: {
        kind: 'cells',
        visualSlots: [
          { layerId: 'objects', row: 0, col: 0 },
          { layerId: 'objects', row: 1, col: 0 },
        ],
        gridPoints: [{ row: 0, col: 0 }],
        hitScope: 'active-layer',
      },
      onEdit,
    })
    expect(host.textContent).toContain('当前层选中 2 个（整组 3 个）')

    const tile = host.querySelector<HTMLInputElement>('input[aria-label="组内当前层 tileId"]')!
    // 选中槽位 tileId 为 2 与 7 → 混合，输入框显示占位而非默认值。
    expect(tile.value).toBe('')
    expect(tile.placeholder).toBe('混合')
    await commit(tile, '9')
    expect(onEdit).toHaveBeenCalledTimes(1)
    const first = onEdit.mock.calls[0]![0] as {
      placementId: string
      patch: { visual: { ref: { row: number; col: number }; value: number }[] }
      label: string
    }
    expect(first.placementId).toBe('place.lab.001')
    expect(first.label).toBe('组内当前层瓦片设为 #9')
    expect(first.patch.visual.map((entry) => [entry.ref.row, entry.value])).toEqual([
      [0, 9],
      [1, 9],
    ])

    const height = host.querySelector<HTMLInputElement>(
      'input[aria-label="组内当前层实例高度"]',
    )!
    // 高度 3 与 1 → 混合占位。
    expect(height.value).toBe('')
    expect(height.placeholder).toBe('混合')
    await commit(height, '6')
    const second = onEdit.mock.calls[1]![0] as {
      patch: { visual: { channel: string; value: number }[] }
      label: string
    }
    expect(second.label).toBe('组内当前层高度设为 6')
    expect(second.patch.visual.every((entry) => entry.channel === 'height')).toBe(true)
  })

  test('collision commit writes selected grid points and removal keeps the value', async () => {
    const onEdit = vi.fn()
    render({
      editingPlacementId: 'place.lab.001',
      editingSelection: {
        kind: 'cells',
        visualSlots: [],
        gridPoints: [
          { row: 0, col: 0 },
          { row: 1, col: 0 },
        ],
        hitScope: 'active-layer',
      },
      onEdit,
    })
    expect(host.textContent).toContain('选中 2/2')

    const collision = host.querySelector<HTMLInputElement>('input[aria-label="组内碰撞值"]')!
    await commit(collision, '3')
    const commit1 = onEdit.mock.calls[0]![0] as {
      patch: { collision: { ref: { row: number; col: number }; value: number }[] }
      label: string
    }
    expect(commit1.label).toBe('组内碰撞设为 3')
    expect(commit1.patch.collision.map((entry) => [entry.ref.row, entry.value])).toEqual([
      [0, 3],
      [1, 3],
    ])

    await act(async () => buttonByText('移出碰撞成员（保留值）').click())
    const commit2 = onEdit.mock.calls[1]![0] as {
      patch: { collision: unknown[]; visual: unknown[] }
      removeGridPoints: readonly { row: number }[]
      label: string
    }
    expect(commit2.label).toBe('移出组内碰撞成员')
    expect(commit2.patch.collision).toEqual([])
    expect(commit2.removeGridPoints.map((point) => point.row)).toEqual([0, 1])
  })

  test('erasing the whole active layer is blocked while a subset is allowed', async () => {
    const onEdit = vi.fn()
    render({
      editingPlacementId: 'place.lab.001',
      editingSelection: {
        kind: 'cells',
        visualSlots: [
          { layerId: 'objects', row: 0, col: 0 },
          { layerId: 'objects', row: 0, col: 1 },
          { layerId: 'objects', row: 1, col: 0 },
        ],
        gridPoints: [],
        hitScope: 'active-layer',
      },
      onEdit,
    })
    const erase = buttonByText('擦除当前层选中成员')
    expect(erase.disabled).toBe(true)
    expect(erase.getAttribute('title')).toContain('不能擦除整组最后的视觉成员')

    render({
      editingPlacementId: 'place.lab.001',
      editingSelection: {
        kind: 'cells',
        visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
        gridPoints: [],
        hitScope: 'active-layer',
      },
      onEdit,
    })
    const eraseSubset = buttonByText('擦除当前层选中成员')
    expect(eraseSubset.disabled).toBe(false)
    await act(async () => eraseSubset.click())
    expect(onEdit).toHaveBeenCalledTimes(1)
    const call = onEdit.mock.calls[0]![0] as {
      removeVisualSlots: readonly { row: number; col: number }[]
      label: string
    }
    expect(call.label).toBe('擦除组内当前层视觉成员')
    expect(call.removeVisualSlots.map((slot) => [slot.row, slot.col])).toEqual([[0, 0]])
  })

  test('invalid numbers report validation errors and commit nothing', async () => {
    const onEdit = vi.fn()
    const onValidationError = vi.fn()
    render({
      editingPlacementId: 'place.lab.001',
      editingSelection: {
        kind: 'cells',
        visualSlots: [{ layerId: 'objects', row: 0, col: 0 }],
        gridPoints: [],
        hitScope: 'active-layer',
      },
      onEdit,
      onValidationError,
    })
    const tile = host.querySelector<HTMLInputElement>('input[aria-label="组内当前层 tileId"]')!
    await commit(tile, '-4')
    expect(onValidationError).toHaveBeenCalledWith('tileId 必须是非负整数。')
    expect(onEdit).not.toHaveBeenCalled()
  })

  test('exit edit is forwarded without any patch', async () => {
    const onExitEdit = vi.fn()
    render({ editingPlacementId: 'place.lab.001', onExitEdit })
    await act(async () => buttonByText('退出组内').click())
    expect(onExitEdit).toHaveBeenCalledTimes(1)
  })
})
