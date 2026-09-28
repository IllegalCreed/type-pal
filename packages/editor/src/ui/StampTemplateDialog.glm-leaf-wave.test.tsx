// @vitest-environment jsdom
import type { StampTemplate } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { MapSelection } from '../core/map-selection.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { StampTemplateDialog } from './StampTemplateDialog.js'

vi.stubGlobal('Blob', NodeBlob)
vi.stubGlobal('crypto', webcrypto)

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  document.body.innerHTML = ''
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
    },
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

function fixture() {
  let map = buildBlankProjectMap(3, 2, 'tiles-a')
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles-a', height: 0 },
  ])
  const objects = buildProjectMapLayer(map, 'objects', '物件')
  map = insertProjectMapLayer(map, objects)
  map = paintProjectMapTiles(map, [
    { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId: 'tiles-a', height: 3 },
  ])
  map.collision[0]![0] = 0
  map.collision[1]![0] = 4
  const selection: Extract<MapSelection, { kind: 'cells' }> = {
    kind: 'cells',
    hitScope: 'visible-unlocked-layers',
    visualSlots: [
      { layerId: 'floor', row: 0, col: 0 },
      { layerId: 'objects', row: 1, col: 0 },
    ],
    gridPoints: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ],
  }
  return { map, selection }
}

function button(text: string): HTMLButtonElement {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  expect(button).not.toBeNull()
  return button!
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function inputByLabel(label: string): HTMLInputElement {
  const element = document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)
  expect(element).not.toBeNull()
  return element!
}

describe('StampTemplateDialog 剩余合同', () => {
  test('cancel keeps the session untouched and the map identical', async () => {
    const legal = await loadLegalUiProject('glm-leaf-stamp-dialog')
    const session = new EditSession(legal.state)
    const onSaved = vi.fn()
    const onClose = vi.fn()
    const { map, selection } = fixture()
    const mapBefore = JSON.stringify(map)
    await act(async () =>
      root.render(
        <StampTemplateDialog
          map={map}
          selection={selection}
          stamps={[]}
          session={session}
          onClose={onClose}
          onSaved={onSaved}
        />,
      ),
    )
    await input(document.querySelector<HTMLInputElement>('input[name="stamp-name"]')!, '临时名')
    await act(async () => button('取消').click())
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(session.getState().stamps).toHaveLength(0)
    expect(JSON.stringify(map)).toBe(mapBefore)
  })

  test('a completed create passes the full template with renamed slots and anchor to the session', async () => {
    const legal = await loadLegalUiProject('glm-leaf-stamp-dialog')
    const session = new EditSession(legal.state)
    const onSaved = vi.fn()
    const onClose = vi.fn()
    const { map, selection } = fixture()
    await act(async () =>
      root.render(
        <StampTemplateDialog
          map={map}
          selection={selection}
          stamps={[]}
          session={session}
          initialMode="create"
          onClose={onClose}
          onSaved={onSaved}
        />,
      ),
    )
    // 重命名两个局部槽。
    await input(inputByLabel('floor 局部槽名称'), '地面槽')
    await input(inputByLabel('objects 局部槽名称'), '物件槽')
    await input(document.querySelector<HTMLInputElement>('input[name="stamp-name"]')!, '双槽图章')
    // 勾选碰撞快照：0 值也被显式保留。
    await act(async () => {
      const checkbox = document.querySelector<HTMLInputElement>(
        'input[name="stamp-include-collision"]',
      )!
      checkbox.click()
    })
    await act(async () => button('创建组合').click())

    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    const [savedId, mode] = onSaved.mock.calls[0] as [string, string]
    expect(mode).toBe('create')
    const stored = session.getState().stamps.find((template) => template.id === savedId)
    expect(stored?.name).toBe('双槽图章')
    expect(stored?.tilesetRefs).toEqual(['tiles-a'])
    expect(stored?.layers.map((layer) => [layer.id, layer.name])).toEqual([
      ['floor', '地面槽'],
      ['objects', '物件槽'],
    ])
    expect(stored?.anchor).toEqual({ row: 0, col: 0 })
    expect(stored?.collision).toEqual([
      [0],
      [4],
    ])
    // 未勾选时碰撞会被丢弃，这里已勾选 → 汇总数为 2。
    expect(
      stored?.collision.flatMap((row) => row.filter((value) => value !== null)),
    ).toHaveLength(2)
    expect(
      stored?.layers.flatMap((layer) => layer.tiles.flat()).filter((tile) => tile !== null),
    ).toHaveLength(2)
  })

  test('anchor validation reports integers only and keeps the dialog open', async () => {
    const legal = await loadLegalUiProject('glm-leaf-stamp-dialog')
    const session = new EditSession(legal.state)
    const onSaved = vi.fn()
    const onClose = vi.fn()
    const { map, selection } = fixture()
    await act(async () =>
      root.render(
        <StampTemplateDialog
          map={map}
          selection={selection}
          stamps={[]}
          session={session}
          onClose={onClose}
          onSaved={onSaved}
        />,
      ),
    )
    await input(
      document.querySelector<HTMLInputElement>('input[name="stamp-anchor-row"]')!,
      '1.5',
    )
    await act(async () => button('创建组合').click())
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('锚点行必须是整数。')
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(session.getState().stamps).toHaveLength(0)
  })
})
