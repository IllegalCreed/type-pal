// @vitest-environment jsdom
import type { ProjectMap, StampTemplateV1 } from '@type-pal/content'
import { buildBlankProjectMap, paintProjectMapTiles } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { StampSelectionSource } from '../core/stamp-template.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import { StampLibraryTab } from './StampLibraryTab.js'

function template(id = 'tree', tilesetId = 'tiles-a'): StampTemplateV1 {
  return {
    id,
    name: id,
    category: '植被',
    tilesetId,
    origin: 'authored',
    layerSlots: [{ id: 'floor', name: '地板', depthMode: 'flat' }],
    visual: [{ layerSlotId: 'floor', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 }],
    collision: [],
  }
}

function placedMap(sourceStampId: string, tilesetId = 'tiles-a'): ProjectMap {
  let map = buildBlankProjectMap(2, 2, tilesetId)
  map = paintProjectMapTiles(map, [{ layerId: 'floor', row: 0, col: 0, tileId: 1, height: 0 }])
  return {
    ...map,
    version: 3,
    authoring: {
      version: 1,
      stampPlacements: [
        {
          id: 'placement-1',
          sourceStampId,
          anchor: { row: 0, col: 0 },
          visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
          gridPoints: [],
        },
      ],
    },
  }
}

function state(stamps: StampTemplateV1[], maps: Record<string, ProjectMap>): EditorState {
  return {
    manifest: { content: { stamps: 'content/stamps.json' } } as unknown as EditorState['manifest'],
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    maps,
    mapIndex: {
      version: 1,
      maps: Object.keys(maps).map((id) => ({ id, name: id, path: `content/maps/${id}.json` })),
    },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps,
  } as EditorState
}

function Harness(props: {
  session: EditSession
  selectionSource?: StampSelectionSource
  onObjectFocus?: (id: string | undefined) => void
  onOpenMap?: (id: string) => void
  onOpenTileset?: (id: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const { session, selectionSource, onObjectFocus, onOpenMap, onOpenTileset, onStatusNotice } =
    props
  useSyncExternalStore(
    (callback) => session.subscribe(callback),
    () => session.getVersion(),
  )
  const current = session.getState()
  return (
    <StampLibraryTab
      stamps={current.stamps}
      tilesets={[]}
      assetCatalog={{ version: 1, assets: {} }}
      assetReader={{} as never}
      assetBase={{} as never}
      session={session}
      mapIndex={current.mapIndex}
      selectionSource={selectionSource}
      onObjectFocus={onObjectFocus}
      onOpenMap={onOpenMap ?? vi.fn()}
      onOpenTileset={onOpenTileset}
      onStatusNotice={onStatusNotice}
    />
  )
}

function button(text: string, root: ParentNode = document): HTMLButtonElement {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
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

async function chooseSelectOption(label: string, optionText: string): Promise<void> {
  const trigger = host.querySelector<HTMLButtonElement>(`[role="combobox"][aria-label="${label}"]`)!
  await act(async () => trigger.click())
  const listbox = document.getElementById(trigger.getAttribute('aria-controls')!)!
  const option = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
    candidate.textContent?.includes(optionText),
  )!
  await act(async () => option.click())
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  document.body.innerHTML = ''
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('StampLibraryTab', () => {
  test('搜索、分类和来源覆盖各值、组合、空结果和清空恢复，且不偷换选择', async () => {
    const authoredTree = template('tree', 'tiles-a')
    const authoredShrub = { ...template('shrub', 'tiles-b'), name: '灌木' }
    const migratedRock = {
      ...template('rock', 'tiles-b'),
      name: '岩石',
      category: '地貌',
      origin: 'migrated' as const,
    }
    const session = new EditSession(state([authoredTree, authoredShrub, migratedRock], {}))
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    const rows = () => host.querySelectorAll('.stamp-library-row')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索组合模板"]')!
    expect(rows()).toHaveLength(3)

    await chooseSelectOption('筛选组合分类', '地貌')
    await chooseSelectOption('筛选组合来源', '预置')
    expect(rows()).toHaveLength(1)
    expect(rows()[0]?.textContent).toContain('岩石')
    expect(host.querySelector('.stamp-library-row.selected')).toBeNull()

    await setCatalogSearch(search, 'tree')
    expect(rows()).toHaveLength(0)
    await chooseSelectOption('筛选组合分类', '植被')
    await chooseSelectOption('筛选组合来源', '作者')
    expect(rows()).toHaveLength(1)
    expect(rows()[0]?.textContent).toContain('tree')

    await setCatalogSearch(search, '不存在')
    expect(rows()).toHaveLength(0)
    await setCatalogSearch(search, '')
    await chooseSelectOption('筛选组合分类', '全部分类')
    await chooseSelectOption('筛选组合来源', '全部来源')
    expect(rows()).toHaveLength(3)
    expect(host.querySelector('.stamp-library-row.selected')?.textContent).toContain('tree')
  })

  test('检查器使用共享属性/引用/动作 Tab 完整键盘与 ARIA 合同', async () => {
    const session = new EditSession(state([template()], {}))
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    await verifyInspectorTabs(host, '组合模板检查器', ['属性', /^引用 \d+$/, '动作'])
  })

  test('改名/分类/复制/删除均走 undo，删除模板不改 placement 且库级显示悬空来源', async () => {
    const map = placedMap('tree')
    const session = new EditSession(state([template()], { 'map-a': map }))
    const beforeMap = structuredClone(map)
    const onOpenMap = vi.fn()
    await act(async () => {
      root.render(<Harness session={session} onOpenMap={onOpenMap} />)
      await Promise.resolve()
    })

    await input(host.querySelector<HTMLInputElement>('[name="stamp-name"]')!, '古树')
    await input(host.querySelector<HTMLInputElement>('[name="stamp-category"]')!, '古迹')
    await act(async () => button('保存名称与分类', host).click())
    expect(session.getState().stamps[0]).toMatchObject({ name: '古树', category: '古迹' })

    await act(async () => button('复制为作者模板', host).click())
    expect(session.getState().stamps).toHaveLength(2)
    expect(session.getState().stamps[1]).toMatchObject({ id: 'tree-copy', origin: 'authored' })

    const originalRow = [...host.querySelectorAll<HTMLButtonElement>('.stamp-library-row')].find(
      (candidate) => candidate.dataset.stampId === 'tree',
    )!
    await act(async () => originalRow.click())
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    await act(async () => button('删除模板', host).click())
    const confirm = button('确认删除', host)
    expect(confirm.disabled).toBe(false)
    expect(host.textContent).toContain('检测到 1 处来源引用')
    await act(async () => confirm.click())

    expect(session.getState().maps['map-a']).toEqual(beforeMap)
    expect(session.getState().stamps.map((item) => item.id)).toEqual(['tree-copy'])
    expect(host.textContent).toContain('悬空来源引用')
    expect(host.textContent).toContain('tree · 1 处')
    await act(async () => button('map-a', host).click())
    expect(onOpenMap).toHaveBeenCalledWith('map-a')

    await act(async () => session.undo())
    expect(session.getState().stamps.map((item) => item.id)).toEqual(['tree', 'tree-copy'])
    await act(async () => session.redo())
    expect(session.getState().stamps.map((item) => item.id)).toEqual(['tree-copy'])
  })

  test('地图扫描失败时不把 partial 0 当精确值，也不允许确认删除', async () => {
    const initial = state([template()], {})
    initial.mapIndex = {
      version: 1,
      maps: [{ id: 'missing-map', name: '缺失地图', path: 'content/maps/missing.json' }],
    }
    const session = new EditSession(initial)
    await act(async () => {
      root.render(<Harness session={session} />)
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(host.textContent).toContain('扫描不完整')
    expect(host.textContent).toContain('引用数未知')
    expect(host.textContent).toContain('至少 0 处')
    expect(
      host.querySelector('[role="tablist"][aria-label="组合模板检查器"] .ds-tab__count'),
    ).toBeNull()
    await act(async () => button('删除模板', host).click())
    expect(button('确认删除', host).disabled).toBe(true)
  })

  test('扫描失败提示会在重试成功时清除，卸载时也不残留', async () => {
    const initial = state([template()], {})
    initial.mapIndex = {
      version: 1,
      maps: [{ id: 'recover-map', name: '可恢复地图', path: 'content/maps/recover.json' }],
    }
    const session = new EditSession(initial)
    vi.spyOn(session, 'ensureMapLoaded')
      .mockRejectedValueOnce(new Error('第一次读取失败'))
      .mockResolvedValueOnce(placedMap('tree'))
    const onStatusNotice = vi.fn()
    await act(async () => {
      root.render(<Harness session={session} onStatusNotice={onStatusNotice} />)
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(onStatusNotice).toHaveBeenLastCalledWith({
      kind: 'error',
      message: '组合来源扫描不完整：1 张地图读取失败。',
    })

    await act(async () => {
      button('重试扫描', host).click()
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    })
    expect(host.textContent).toContain('已扫描 1/1 张地图')
    expect(onStatusNotice).toHaveBeenLastCalledWith(undefined)

    await act(async () => root.unmount())
    expect(onStatusNotice).toHaveBeenLastCalledWith(undefined)
    root = createRoot(host)
  })

  test('来源瓦片集按钮精确跳转到当前模板的 tileset', async () => {
    const session = new EditSession(state([template()], {}))
    const onOpenTileset = vi.fn()
    await act(async () => {
      root.render(<Harness session={session} onOpenTileset={onOpenTileset} />)
      await Promise.resolve()
    })
    await act(async () => button('tiles-a', host).click())
    expect(onOpenTileset).toHaveBeenCalledWith('tiles-a')
  })

  test('预置接管确认出现后把焦点移到取消按钮，Esc 可回到原动作', async () => {
    const migrated = { ...template(), origin: 'migrated' as const }
    const session = new EditSession(state([migrated], {}))
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    await input(host.querySelector<HTMLInputElement>('[name="stamp-name"]')!, '接管后的树')
    const save = button('保存名称与分类', host)
    await act(async () => save.click())
    const cancel = button('取消', host)
    expect(document.activeElement).toBe(cancel)
    await act(async () =>
      cancel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 0)))
    expect(document.activeElement).toBe(save)
  })

  test('库页用选区更新前先拒绝 tileset mismatch，不会覆盖其他模板', async () => {
    const map = placedMap('unrelated', 'tiles-b')
    const stamps = [template('wanted', 'tiles-a'), template('other', 'tiles-b')]
    const session = new EditSession(state(stamps, { 'map-b': map }))
    const selectionSource: StampSelectionSource = {
      mapId: 'map-b',
      selection: {
        kind: 'cells',
        hitScope: 'active-layer',
        visualSlots: [{ layerId: 'floor', row: 0, col: 0 }],
        gridPoints: [{ row: 0, col: 0 }],
      },
    }
    await act(async () => {
      root.render(<Harness session={session} selectionSource={selectionSource} />)
      await Promise.resolve()
    })
    await act(async () => button('用当前地图选区更新', host).click())
    expect(host.textContent).toContain('不能更新 tileset “tiles-a”')
    expect(document.querySelector('dialog')).toBeNull()
    expect(session.getState().stamps).toEqual(stamps)
  })
})
