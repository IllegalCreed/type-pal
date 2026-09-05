// @vitest-environment jsdom
import type { StampTemplate } from '@type-pal/content'
import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { MapSelection } from '../core/map-selection.js'
import { StampTemplateDialog } from './StampTemplateDialog.js'

function fixture(tilesetId = 'tiles-a') {
  let map = buildBlankProjectMap(3, 2, tilesetId)
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId, height: 0 },
  ])
  const objects = buildProjectMapLayer(map, 'objects', '物件')
  map = insertProjectMapLayer(map, objects)
  map = paintProjectMapTiles(map, [
    { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId, height: 3 },
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

function template(
  id: string,
  tilesetId = 'tiles-a',
  origin: StampTemplate['origin'] = 'authored',
): StampTemplate {
  return {
    id,
    name: id,
    origin,
    anchor: { row: 0, col: 0 },
    width: 1,
    height: 1,
    tilesetRefs: [tilesetId],
    layers: [{ id: 'floor', name: '地板', tiles: [[1], [null]], sources: [[0], [null]] }],
    collision: [[null], [null]],
  }
}

function state(stamps: StampTemplate[] = []): EditorState {
  return {
    manifest: {
      content: stamps.length ? { stamps: 'content/stamps.json' } : {},
    } as EditorState['manifest'],
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps,
  } as EditorState
}

function button(text: string): HTMLButtonElement {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

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

describe('StampTemplateDialog', () => {
  test('新建时显式保存跨层槽、anchor 与 collision 0', async () => {
    const { map, selection } = fixture()
    const session = new EditSession(state())
    await act(async () =>
      root.render(
        <StampTemplateDialog
          map={map}
          selection={selection}
          stamps={[]}
          session={session}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />,
      ),
    )
    await input(document.querySelector<HTMLInputElement>('[name="stamp-name"]')!, '双层树')
    await input(document.querySelector<HTMLInputElement>('[name="stamp-slot-objects"]')!, '树冠槽')
    await act(async () =>
      document.querySelector<HTMLInputElement>('[name="stamp-include-collision"]')!.click(),
    )
    await act(async () => button('创建组合').click())

    const created = session.getState().stamps[0]!
    expect(created).toMatchObject({ name: '双层树', tilesetRefs: ['tiles-a'], origin: 'authored' })
    expect(created.layers.map((layer) => [layer.id, layer.name])).toEqual([
      ['floor', '地板'],
      ['objects', '树冠槽'],
    ])
    expect(
      created.layers.flatMap((layer) => layer.tiles.flat()).filter((value) => value !== null),
    ).toHaveLength(2)
    expect(created.collision.flat()).toEqual([0, 4])
  })

  test('新建模板不会继承同 tileset 旧模板的名称、分类或局部槽名', async () => {
    const { map, selection } = fixture()
    const existing: StampTemplate = {
      ...template('old-tree'),
      name: '旧树',
      category: '旧分类',
      layers: [{ id: 'floor', name: '旧地板槽', tiles: [[1], [null]], sources: [[0], [null]] }],
    }
    const session = new EditSession(state([existing]))
    await act(async () =>
      root.render(
        <StampTemplateDialog
          map={map}
          selection={selection}
          stamps={[existing]}
          session={session}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />,
      ),
    )

    expect(document.querySelector<HTMLInputElement>('[name="stamp-name"]')?.value).toBe('新组合')
    expect(document.querySelector<HTMLInputElement>('[name="stamp-category"]')?.value).toBe('')
    expect(document.querySelector<HTMLInputElement>('[name="stamp-slot-floor"]')?.value).toBe(
      '地板',
    )
    expect(document.querySelector<HTMLInputElement>('[name="stamp-slot-objects"]')?.value).toBe(
      '物件',
    )

    await act(async () => button('更新已有模板').click())
    expect(document.querySelector<HTMLInputElement>('[name="stamp-name"]')?.value).toBe('旧树')
    await act(async () => button('新建模板').click())
    expect(document.querySelector<HTMLInputElement>('[name="stamp-name"]')?.value).toBe('新组合')
    expect(document.querySelector<HTMLInputElement>('[name="stamp-slot-floor"]')?.value).toBe(
      '地板',
    )
  })

  test('migrated 更新未经确认拒绝，确认后整项接管且可撤销', async () => {
    const { map, selection } = fixture()
    const migrated = template('builtin-tree', 'tiles-a', 'migrated')
    const session = new EditSession(state([migrated]))
    await act(async () =>
      root.render(
        <StampTemplateDialog
          map={map}
          selection={selection}
          stamps={session.getState().stamps}
          session={session}
          initialMode="update"
          initialTargetId="builtin-tree"
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />,
      ),
    )
    await act(async () => button('替换模板内容').click())
    expect(document.body.textContent).toContain('必须先明确接管')
    expect(session.getState().stamps[0]).toEqual(migrated)

    await act(async () =>
      document.querySelector<HTMLInputElement>('[name="stamp-take-ownership"]')!.click(),
    )
    await act(async () => button('替换模板内容').click())
    expect(session.getState().stamps[0]?.origin).toBe('authored')
    session.undo()
    expect(session.getState().stamps[0]).toEqual(migrated)
  })

  test('精确 update target 可接收来自其他瓦片源的当前选区', async () => {
    const { map, selection } = fixture('tiles-b')
    const stamps = [template('wanted', 'tiles-a'), template('other', 'tiles-b')]
    const session = new EditSession(state(stamps))
    await act(async () =>
      root.render(
        <StampTemplateDialog
          map={map}
          selection={selection}
          stamps={stamps}
          session={session}
          initialMode="update"
          initialTargetId="wanted"
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />,
      ),
    )
    expect(button('替换模板内容')).toBeTruthy()
    await act(async () => button('替换模板内容').click())
    expect(session.getState().stamps.find(({ id }) => id === 'wanted')?.tilesetRefs).toEqual([
      'tiles-b',
    ])
    expect(session.getState().stamps.find(({ id }) => id === 'other')).toEqual(stamps[1])
  })

  test('校验失败会标记并聚焦首个错误字段', async () => {
    const { map, selection } = fixture()
    const session = new EditSession(state())
    await act(async () =>
      root.render(
        <StampTemplateDialog
          map={map}
          selection={selection}
          stamps={[]}
          session={session}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />,
      ),
    )
    const idInput = document.querySelector<HTMLInputElement>('[name="stamp-id"]')!
    await input(idInput, 'bad/id')
    await act(async () => button('创建组合').click())
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    expect(idInput.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(idInput)
  })

  test('Esc 关闭 native dialog 并把焦点还给触发按钮', async () => {
    const { map, selection } = fixture()
    const session = new EditSession(state())
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            打开
          </button>
          {open ? (
            <StampTemplateDialog
              map={map}
              selection={selection}
              stamps={[]}
              session={session}
              onClose={() => setOpen(false)}
              onSaved={vi.fn()}
            />
          ) : null}
        </>
      )
    }
    await act(async () => root.render(<Harness />))
    const trigger = button('打开')
    trigger.focus()
    await act(async () => trigger.click())
    await act(async () =>
      document
        .querySelector('dialog')!
        .dispatchEvent(new Event('cancel', { bubbles: false, cancelable: true })),
    )
    expect(document.querySelector('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})
