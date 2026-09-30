// @vitest-environment jsdom
import type { ProjectMap } from '@type-pal/content'
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

function fixture(): ProjectMap {
  let map = buildBlankProjectMap(4, 3, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'objects', row: 0, col: 0, tileId: 2, tilesetId: 'tiles', height: 3 },
    { layerId: 'objects', row: 1, col: 0, tileId: 5, tilesetId: 'tiles', height: 0 },
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
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

function inputByLabel(label: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  expect(input).not.toBeNull()
  return input!
}

describe('TEST-GLM-WAVE-L-1 L01 selection inspector gaps', () => {
  test('清空视觉实例提交 tileId/tilesetId/height 三通道完整 patch', async () => {
    const onPatch = vi.fn()
    renderInspector({ onPatch })
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="清空所选视觉实例"]')!.click(),
    )
    expect(onPatch).toHaveBeenCalledTimes(1)
    const [patch, requiredLayerIds, label] = onPatch.mock.calls[0] as [
      {
        visual: { channel: string; ref: { row: number; col: number }; value: number | null }[]
        collision: unknown[]
      },
      readonly string[],
      string,
    ]
    expect(label).toBe('清空选区视觉实例')
    expect(requiredLayerIds).toEqual(['objects'])
    expect(patch.collision).toEqual([])
    expect(patch.visual.map((entry) => [entry.channel, entry.ref.row, entry.value])).toEqual([
      ['tileId', 0, null],
      ['tilesetId', 0, null],
      ['height', 0, 0],
      ['tileId', 1, null],
      ['tilesetId', 1, null],
      ['height', 1, 0],
    ])
  })

  test('高度字段的非整数输入走 alert 校验，空输入只清错误不提交', async () => {
    const onPatch = vi.fn()
    const onValidationError = vi.fn()
    renderInspector({ onPatch, onValidationError })
    await commit(inputByLabel('选区实例高度'), '1.5')
    expect(onValidationError).toHaveBeenCalledWith('高度必须是非负整数。')
    expect(onPatch).not.toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('高度必须是非负整数。')

    await commit(inputByLabel('选区实例高度'), '')
    expect(onPatch).not.toHaveBeenCalled()
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  test('tileId 与 collision 的空输入提交都是零 patch 的静默早退', async () => {
    const onPatch = vi.fn()
    const onValidationError = vi.fn()
    renderInspector({ onPatch, onValidationError })
    await commit(inputByLabel('选区 tileId'), ' ')
    await commit(inputByLabel('选区 collision'), ' ')
    expect(onPatch).not.toHaveBeenCalled()
    expect(onValidationError).not.toHaveBeenCalled()
  })

  test('零高度实例点“高度减 1”被夹到 0 而不是负数', async () => {
    const onPatch = vi.fn()
    renderInspector({
      onPatch,
      selection: cellsSelection([{ layerId: 'objects', row: 1, col: 0 }], []),
    })
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="高度减 1"]')!.click())
    expect(onPatch).toHaveBeenCalledTimes(1)
    const [patch, , label] = onPatch.mock.calls[0] as [
      { visual: { channel: string; ref: { row: number; col: number }; value: number }[] },
      readonly string[],
      string,
    ]
    expect(label).toBe('选区高度 -1')
    expect(patch.visual).toEqual([
      { channel: 'height', ref: { layerId: 'objects', row: 1, col: 0 }, value: 0 },
    ])
  })

  test('目标图层在新地图中已不存在时回退活动层并禁用移动按钮', () => {
    const onPatch = vi.fn()
    renderInspector({ onPatch })
    const enabled = host.querySelector<HTMLButtonElement>('button[aria-label^="移动到图层："]')
    expect(enabled?.getAttribute('aria-label')).toBe('移动到图层：物件')
    expect(enabled?.disabled).toBe(false)

    // 换到不含 objects 层的地图且活动层 id 不变：targetLayerId 悬空 → 回退活动层并禁用。
    const shrunk = insertProjectMapLayer(
      buildBlankProjectMap(4, 3, 'tiles'),
      buildProjectMapLayer(buildBlankProjectMap(4, 3, 'tiles'), 'only', '唯一'),
    )
    act(() =>
      root.render(
        <DsInspectorHost>
          <MapSelectionInspector
            map={shrunk}
            selection={cellsSelection([{ layerId: 'only', row: 0, col: 0 }], [])}
            activeLayerId="objects"
            hiddenLayerIds={new Set()}
            lockedLayerIds={new Set()}
            onPatch={onPatch}
            onValidationError={() => undefined}
            onMoveToLayer={() => undefined}
            onClearSelection={() => undefined}
          />
        </DsInspectorHost>,
      ),
    )
    const stale = host.querySelector<HTMLButtonElement>('button[aria-label^="移动到图层："]')
    expect(stale?.getAttribute('aria-label')).toBe('移动到图层：objects')
    expect(stale?.disabled).toBe(true)
  })
})
