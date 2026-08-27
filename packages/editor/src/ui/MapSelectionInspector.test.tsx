// @vitest-environment jsdom
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapCollision,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { act, type ComponentProps } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test, vi } from 'vitest'
import type { MapSelection } from '../core/map-selection.js'
import { DsInspectorHost } from './design-system/index.js'
import { MapSelectionInspector as MapSelectionInspectorContent } from './MapSelectionInspector.js'

function MapSelectionInspector(props: ComponentProps<typeof MapSelectionInspectorContent>) {
  return (
    <DsInspectorHost>
      <MapSelectionInspectorContent {...props} />
    </DsInspectorHost>
  )
}

function fixture() {
  let map = buildBlankProjectMap(3, 2, 'tiles')
  map = insertProjectMapLayer(map, buildProjectMapLayer(map, 'objects', '物件'))
  map = paintProjectMapTiles(map, [
    { layerId: 'objects', row: 0, col: 0, tileId: 2, tilesetId: 'tiles', height: 1 },
    { layerId: 'objects', row: 1, col: 0, tileId: 3, tilesetId: 'tiles', height: 4 },
  ])
  map = paintProjectMapCollision(map, [{ row: 1, col: 0, value: 5 }])
  const selection: Extract<MapSelection, { kind: 'cells' }> = {
    kind: 'cells',
    visualSlots: [
      { layerId: 'objects', row: 0, col: 0 },
      { layerId: 'objects', row: 1, col: 0 },
      { layerId: 'objects', row: 2, col: 0 },
    ],
    gridPoints: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ],
    hitScope: 'active-layer',
  }
  return { map, selection }
}

describe('MapSelectionInspector React output', () => {
  test('mixed tile/height/collision 显式呈现，空槽跳过说明且不重复底栏 live region', () => {
    const { map, selection } = fixture()
    const html = renderToStaticMarkup(
      <MapSelectionInspector
        map={map}
        selection={selection}
        activeLayerId="objects"
        hiddenLayerIds={new Set()}
        lockedLayerIds={new Set()}
        onPatch={vi.fn()}
        onValidationError={vi.fn()}
        onMoveToLayer={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    )
    expect(html).toContain('placeholder="混合"')
    expect(html).toContain('跳过 1 个空槽')
    expect(html).toContain('格点 / 碰撞')
    expect(html).toContain('aria-label="清空地图选区"')
    expect(html).toContain('aria-label="清空所选视觉实例"')
    expect(html).toContain('aria-label="高度减 1"')
    expect(html).toContain('aria-label="高度加 1"')
    expect(html).toContain('role="tooltip"')
    expect(html).not.toContain('修改只作用于指定通道')
    expect(html).not.toContain('aria-live="polite"')
  })

  test('图标动作保留清空、调高和移动语义', async () => {
    const { map, selection } = fixture()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const onPatch = vi.fn()
    const onMoveToLayer = vi.fn()
    const onClearSelection = vi.fn()
    await act(async () =>
      root.render(
        <MapSelectionInspector
          map={map}
          selection={selection}
          activeLayerId="objects"
          hiddenLayerIds={new Set()}
          lockedLayerIds={new Set()}
          onPatch={onPatch}
          onValidationError={vi.fn()}
          onMoveToLayer={onMoveToLayer}
          onClearSelection={onClearSelection}
        />,
      ),
    )

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="清空地图选区"]')?.click(),
    )
    expect(onClearSelection).toHaveBeenCalledTimes(1)

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="清空所选视觉实例"]')?.click(),
    )
    expect(onPatch).toHaveBeenLastCalledWith(expect.any(Object), ['objects'], '清空选区视觉实例')

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="高度加 1"]')?.click())
    expect(onPatch).toHaveBeenLastCalledWith(expect.any(Object), ['objects'], '选区高度 +1')

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="移动到图层：物件"]')?.click(),
    )
    expect(onMoveToLayer).toHaveBeenCalledWith('objects')

    await act(async () => root.unmount())
    host.remove()
  })

  test('隐藏或锁定成员显示原因并禁用写控件，不只靠颜色', () => {
    const { map, selection } = fixture()
    const hidden = renderToStaticMarkup(
      <MapSelectionInspector
        map={map}
        selection={selection}
        activeLayerId="objects"
        hiddenLayerIds={new Set(['objects'])}
        lockedLayerIds={new Set()}
        onPatch={vi.fn()}
        onValidationError={vi.fn()}
        onMoveToLayer={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    )
    expect(hidden).toContain('当前活动层已隐藏')
    expect(hidden).toContain('disabled=""')

    const locked = renderToStaticMarkup(
      <MapSelectionInspector
        map={map}
        selection={selection}
        activeLayerId="objects"
        hiddenLayerIds={new Set()}
        lockedLayerIds={new Set(['objects'])}
        notice={{ kind: 'error', message: '整笔修改已拒绝' }}
        onPatch={vi.fn()}
        onValidationError={vi.fn()}
        onMoveToLayer={vi.fn()}
        onClearSelection={vi.fn()}
      />,
    )
    expect(locked).toContain('当前活动层已锁定')
    expect(locked).toContain('整笔修改已拒绝')
    expect(locked).toContain('map-selection-notice error')
  })

  test('非法字段同时给出字段旁错误与全局通知，切换选区后清除', async () => {
    const { map, selection } = fixture()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const onValidationError = vi.fn()
    const render = (nextSelection: typeof selection) => (
      <MapSelectionInspector
        map={map}
        selection={nextSelection}
        activeLayerId="objects"
        hiddenLayerIds={new Set()}
        lockedLayerIds={new Set()}
        onPatch={vi.fn()}
        onValidationError={onValidationError}
        onMoveToLayer={vi.fn()}
        onClearSelection={vi.fn()}
      />
    )
    await act(async () => root.render(render(selection)))
    const input = host.querySelector<HTMLInputElement>('[aria-label="选区 tileId"]')!
    await act(async () => {
      input.value = '-1'
      input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(host.textContent).toContain('tileId 必须是非负整数。')
    expect(onValidationError).toHaveBeenCalledWith('tileId 必须是非负整数。')

    await act(async () =>
      root.render(
        render({
          ...selection,
          visualSlots: selection.visualSlots.slice(0, 1),
        }),
      ),
    )
    expect(host.querySelector('[aria-invalid="true"]')).toBeNull()
    await act(async () => root.unmount())
    host.remove()
  })

  test('选区属性只编辑选中内容，不重复承载组合库操作', async () => {
    const { map, selection } = fixture()
    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    const render = () => (
      <MapSelectionInspector
        map={map}
        selection={selection}
        activeLayerId="objects"
        hiddenLayerIds={new Set()}
        lockedLayerIds={new Set()}
        onPatch={vi.fn()}
        onValidationError={vi.fn()}
        onMoveToLayer={vi.fn()}
        onClearSelection={vi.fn()}
      />
    )
    await act(async () => root.render(render()))
    expect(host.textContent).not.toContain('复用为组合')
    expect(host.textContent).not.toContain('保存为组合')
    expect(host.textContent).not.toContain('打开组合库')
    await act(async () => root.unmount())
    host.remove()
  })
})
