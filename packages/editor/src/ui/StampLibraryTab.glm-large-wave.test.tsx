// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A05（StampLibraryTab 对）：focusObjectId 深链跟随。
 * 去重：StampLibraryTab.test 已证搜索/检查器/改名复制删除/扫描失败/会话复用/锚点/组合
 * 画布/笔刷/接管等 16 项。本文件只补未被覆盖的深链：initialSelectedId 取 focusObjectId，
 * 且 prop 变化经 focusTemplate 效果跟随到目标模板；项目、模板与命令全部真实。
 */
import type { StampTemplate } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { AddStampTemplateCommand } from '../core/stamp-commands.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { StampLibraryTab } from './StampLibraryTab.js'

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  await stubNodeTestHost()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function matrix<T>(rows: number, cols: number, value: T): T[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => value))
}

function template(id: string, tilesetId: string): StampTemplate {
  const width = 2
  const height = 1
  const tiles = matrix<number | null>(height * 2, width, null)
  const sources = matrix<number | null>(height * 2, width, null)
  tiles[0]![0] = 0
  sources[0]![0] = 0
  return {
    id,
    name: id === 'tree-stamp' ? '树' : '灌木',
    origin: 'authored',
    anchor: { row: 0, col: 0 },
    width,
    height,
    tilesetRefs: [tilesetId],
    layers: [{ id: 'floor', name: '地板', tiles, sources }],
    collision: matrix<number | null>(height * 2, width, null),
  }
}

async function stampSession(): Promise<{
  session: EditSession
  tilesetBlobs: Record<string, ArrayBuffer>
  state: Awaited<ReturnType<typeof loadLegalUiProject>>['state']
  legal: Awaited<ReturnType<typeof loadLegalUiProject>>
}> {
  const legal = await loadLegalUiProject('glm-large-wave-stamp')
  const { state } = legal
  const session = new EditSession(state)
  const tilesetId = (state.tilesets ?? [])[0]!.id
  session.dispatch(new AddStampTemplateCommand(template('tree-stamp', tilesetId)))
  session.dispatch(new AddStampTemplateCommand(template('shrub-stamp', tilesetId)))
  return { session, tilesetBlobs: {}, state, legal }
}

const selectedRow = (element: HTMLElement): string | undefined =>
  element.querySelector('.stamp-library-row.selected')?.textContent

describe('A05 StampLibraryTab 深链', () => {
  test('focusObjectId 决定初始选中并随 prop 跟随', async () => {
    const { session, state, legal } = await stampSession()
    const base = {
      tilesets: state.tilesets ?? [],
      assetCatalog: state.assetCatalog,
      assetReader: createEditorAssetReader(legal.source, state),
      assetBase: legal.assetBase,
      session,
      mapIndex: state.mapIndex,
    }
    await act(async () =>
      root.render(
        <StampLibraryTab
          {...base}
          stamps={session.getState().stamps}
          focusObjectId="shrub-stamp"
        />,
      ),
    )
    expect(selectedRow(host)).toContain('灌木')

    await act(async () =>
      root.render(
        <StampLibraryTab {...base} stamps={session.getState().stamps} focusObjectId="tree-stamp" />,
      ),
    )
    expect(selectedRow(host)).toContain('树')
  })
})
