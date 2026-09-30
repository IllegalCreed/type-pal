// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-P-1 P02（MapSelectionInspector.glm-p）：选区检查器残余合同。
 * 去重：MapSelectionInspector.glm-l 已证 清空三通道 patch、高度 alert/空输入、
 * tileId/collision 空输入静默、零高度下钳、悬空图层回退。本文件只补：
 * 活动层隐藏/锁定警告、选区含隐藏/锁定成员警告、跨层选区副标题与范围、
 * 空槽选区「无视觉层」、Enter 直提高度（不手动 blur）、tileId 负数校验。
 */
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
    { layerId: 'floor', row: 2, col: 2, tileId: 7, tilesetId: 'tiles', height: 1 },
    { layerId: 'floor', row: 2, col: 1, tileId: 6, tilesetId: 'tiles', height: 0 },
  ])
  return map
}

function cellsSelection(
  visualSlots: readonly { layerId: string; row: number; col: number }[],
  gridPoints: readonly { row: number; col: number }[] = [],
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
    selection: cellsSelection([{ layerId: 'objects', row: 0, col: 0 }]),
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

function warningText(): string | null {
  return host.querySelector('.map-selection-warning')?.textContent ?? null
}

describe('P02-G01 选区检查器警告与摘要残余', () => {
  test('活动层隐藏 → 整笔修改禁用警告指向显式显示', () => {
    renderInspector({ hiddenLayerIds: new Set(['objects']) })
    expect(warningText()).toBe('⚠ 当前活动层已隐藏；请显式显示或切换图层后再修改。')
  })

  test('活动层锁定 → 整笔修改禁用警告指向显式解锁', () => {
    renderInspector({ lockedLayerIds: new Set(['objects']) })
    expect(warningText()).toBe('⚠ 当前活动层已锁定；请显式解锁或切换图层后再修改。')
  })

  test('选区命中隐藏层成员（活动层可见）→ 按成员数警告', () => {
    renderInspector({
      selection: cellsSelection([
        { layerId: 'objects', row: 0, col: 0 },
        { layerId: 'floor', row: 2, col: 2 },
      ]),
      hiddenLayerIds: new Set(['floor']),
    })
    expect(warningText()).toBe('⚠ 选区含 1 个隐藏层成员，整笔修改已禁用。')
  })

  test('选区命中锁定层成员按层计（同层两槽仍报 1）→ 按成员层警告', () => {
    renderInspector({
      selection: cellsSelection([
        { layerId: 'objects', row: 0, col: 0 },
        { layerId: 'floor', row: 2, col: 2 },
        { layerId: 'floor', row: 2, col: 1 },
      ]),
      lockedLayerIds: new Set(['floor']),
    })
    // 同一锁定层命中两个槽位：警告按层成员计数，不按槽位翻倍。
    expect(warningText()).toBe('⚠ 选区含 1 个锁定层成员，整笔修改已禁用。')
  })

  test('跨层选区摘要：图层名以「、」连接，范围行给出 min→max', () => {
    renderInspector({
      selection: cellsSelection([
        { layerId: 'objects', row: 0, col: 0 },
        { layerId: 'floor', row: 2, col: 2 },
      ]),
    })
    const summary = host.querySelector('.map-selection-summary')
    expect(summary?.textContent).toContain('物件、地板')
    expect(summary?.textContent).toContain('r0:c0 → r2:c2')
  })

  test('纯格点选区无视觉实例 → 图层行显示「无视觉层」', () => {
    renderInspector({
      selection: cellsSelection([], [
        { row: 1, col: 1 },
        { row: 0, col: 0 },
      ]),
    })
    expect(host.querySelector('.map-selection-summary')?.textContent).toContain('无视觉层')
    expect(host.querySelector('.map-selection-summary')?.textContent).toContain('r0:c0 → r1:c1')
  })

  test('高度输入框内按 Enter 直接触发 blur 提交，无需手动焦点移出', async () => {
    const onPatch = vi.fn()
    renderInspector({ onPatch })
    const input = host.querySelector<HTMLInputElement>('input[aria-label="选区实例高度"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      input.focus()
      setter.call(input, '5')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    })
    expect(onPatch).toHaveBeenCalledTimes(1)
    const [patch, , label] = onPatch.mock.calls[0] as [
      { visual: { channel: string; value: number }[] },
      readonly string[],
      string,
    ]
    expect(label).toBe('选区高度设为 5')
    expect(patch.visual.every((entry) => entry.value === 5)).toBe(true)
  })

  test('tileId 负数 → 校验错误「必须是非负整数」且零 patch', async () => {
    const onPatch = vi.fn()
    const onValidationError = vi.fn()
    renderInspector({ onPatch, onValidationError })
    const input = host.querySelector<HTMLInputElement>('input[aria-label="选区 tileId"]')!
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(input, '-2')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(onPatch).not.toHaveBeenCalled()
    expect(onValidationError).toHaveBeenCalledWith('tileId 必须是非负整数。')
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('tileId 必须是非负整数。')
  })
})
