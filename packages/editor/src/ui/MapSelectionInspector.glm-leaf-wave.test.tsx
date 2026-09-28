// @vitest-environment jsdom
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { MapSelection } from '../core/map-selection.js'
import { DsInspectorHost } from './design-system/index.js'
import { MapSelectionInspector } from './MapSelectionInspector.js'

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

function fixture() {
  let map = buildBlankProjectMap(4, 3, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'objects', row: 0, col: 0, tileId: 2, tilesetId: 'tiles', height: 3 },
    { layerId: 'objects', row: 1, col: 0, tileId: 5, tilesetId: 'tiles', height: 3 },
  ])
  return map
}

function cellsSelection(
  visualSlots: readonly { layerId: string; row: number; col: number }[],
  gridPoints: readonly { row: number; col: number }[],
): Extract<MapSelection, { kind: 'cells' }> {
  return {
    kind: 'cells',
    visualSlots: visualSlots.map((slot) => ({ ...slot })),
    gridPoints: gridPoints.map((point) => ({ ...point })),
    hitScope: 'active-layer',
  }
}

type Props = ComponentProps<typeof MapSelectionInspector>

function renderInspector(overrides: Partial<Props> = {}): void {
  const props: Props = {
    map: fixture(),
    selection: cellsSelection(
      [
        { layerId: 'objects', row: 0, col: 0 },
        { layerId: 'objects', row: 1, col: 0 },
      ],
      [{ row: 0, col: 0 }],
    ),
    activeLayerId: 'objects',
    hiddenLayerIds: new Set(),
    lockedLayerIds: new Set(),
    onPatch: () => undefined,
    onValidationError: () => undefined,
    onMoveToLayer: () => undefined,
    onClearSelection: () => undefined,
    ...overrides,
  }
  act(() =>
    root.render(
      <DsInspectorHost>
        <MapSelectionInspector {...props} />
      </DsInspectorHost>,
    ),
  )
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
  // 组件 Enter 处理器调用 blur()；jsdom 的 blur 不冒泡，React onBlur 依赖 focusout。
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

function inputByLabel(label: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  expect(input).not.toBeNull()
  return input!
}

describe('MapSelectionInspector 剩余合同', () => {
  test('tile commit maps every visual slot to the typed value with a labelled patch', async () => {
    const onPatch = vi.fn()
    renderInspector({ onPatch })
    await commit(inputByLabel('选区 tileId'), '9')
    expect(onPatch).toHaveBeenCalledTimes(1)
    const [patch, requiredLayerIds, label] = onPatch.mock.calls[0] as [
      {
        visual: { channel: string; ref: { row: number; col: number }; value: number }[]
        collision: unknown[]
      },
      readonly string[],
      string,
    ]
    expect(label).toBe('选区瓦片设为 #9')
    expect(requiredLayerIds).toEqual(['objects'])
    expect(patch.collision).toEqual([])
    expect(patch.visual.map((entry) => [entry.ref.row, entry.value])).toEqual([
      [0, 9],
      [1, 9],
    ])
  })

  test('collision commit only writes grid points on the active layer', async () => {
    const onPatch = vi.fn()
    renderInspector({
      onPatch,
      selection: cellsSelection([{ layerId: 'objects', row: 0, col: 0 }], [
        { row: 1, col: 1 },
        { row: 2, col: 2 },
      ]),
    })
    await commit(inputByLabel('选区 collision'), '4')
    expect(onPatch).toHaveBeenCalledTimes(1)
    const [patch, requiredLayerIds, label] = onPatch.mock.calls[0] as [
      {
        visual: unknown[]
        collision: { ref: { row: number; col: number }; value: number }[]
      },
      readonly string[],
      string,
    ]
    expect(label).toBe('选区碰撞设为 4')
    expect(requiredLayerIds).toEqual(['objects'])
    expect(patch.visual).toEqual([])
    expect(patch.collision.map((entry) => [entry.ref.row, entry.ref.col, entry.value])).toEqual([
      [1, 1, 4],
      [2, 2, 4],
    ])
  })

  test('invalid tile and collision inputs report through onValidationError without patching', async () => {
    const onPatch = vi.fn()
    const onValidationError = vi.fn()
    renderInspector({ onPatch, onValidationError })
    await commit(inputByLabel('选区 tileId'), '-2')
    expect(onValidationError).toHaveBeenCalledWith('tileId 必须是非负整数。')
    await commit(inputByLabel('选区 collision'), '1.5')
    expect(onValidationError).toHaveBeenCalledWith('collision 必须是非负整数。')
    expect(onPatch).not.toHaveBeenCalled()
  })

  test('height steppers only touch slots that actually hold tiles and floor negatives', async () => {
    const onPatch = vi.fn()
    renderInspector({
      onPatch,
      selection: cellsSelection(
        [
          { layerId: 'objects', row: 0, col: 0 },
          { layerId: 'objects', row: 2, col: 0 },
        ],
        [],
      ),
    })
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="高度加 1"]')!.click(),
    )
    expect(onPatch).toHaveBeenCalledTimes(1)
    const [patch, , label] = onPatch.mock.calls[0] as [
      { visual: { channel: string; ref: { row: number; col: number }; value: number }[] },
      readonly string[],
      string,
    ]
    expect(label).toBe('选区高度 +1')
    // (2,0) 无瓦片 → 跳过；只写 (0,0)，高度 3+1=4。
    expect(patch.visual).toHaveLength(1)
    expect(patch.visual[0]).toMatchObject({ ref: { row: 0, col: 0 }, value: 4 })
  })

  test('selection swap clears a stale collision error without committing', async () => {
    const onPatch = vi.fn()
    const onValidationError = vi.fn()
    const map = fixture()
    const first = cellsSelection([{ layerId: 'objects', row: 0, col: 0 }], [{ row: 0, col: 0 }])
    const second = cellsSelection([{ layerId: 'objects', row: 1, col: 0 }], [{ row: 1, col: 0 }])
    const base = {
      map,
      activeLayerId: 'objects',
      hiddenLayerIds: new Set<string>(),
      lockedLayerIds: new Set<string>(),
      onPatch,
      onValidationError,
      onMoveToLayer: () => undefined,
      onClearSelection: () => undefined,
    }
    const view = (selection: typeof first) => (
      <DsInspectorHost>
        <MapSelectionInspector {...base} selection={selection} />
      </DsInspectorHost>
    )
    await act(async () => root.render(view(first)))
    // 走 collision 校验路径，与 tileId 校验的负控针保持独立。
    await commit(inputByLabel('选区 collision'), '1.5')
    expect(onValidationError).toHaveBeenCalledTimes(1)
    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'collision 必须是非负整数。',
    )

    await act(async () => root.render(view(second)))
    expect(host.querySelector('[role="alert"]')).toBeNull()
    expect(onPatch).not.toHaveBeenCalled()
  })
})
