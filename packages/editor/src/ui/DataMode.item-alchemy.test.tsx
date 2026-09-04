// @vitest-environment jsdom
import type { ItemData } from '@type-pal/content'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type EditorState, EditSession } from '../core/edit-session.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
} from '../core/project-reference.js'
import { DataMode } from './DataMode.js'

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

const item = (id: string, name: string): ItemData => ({
  id,
  name,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
})

function fixture() {
  const material = item('material', '虫卵')
  const product = item('product', '蛊')
  const vessel: ItemData = {
    ...item('268', '炼蛊皿'),
    use: {
      target: 'scene',
      consuming: false,
      effects: [
        {
          kind: 'craftRecipe',
          recipes: [
            {
              ingredients: [{ itemId: material.id, count: 1 }],
              products: [{ itemId: product.id, count: 1 }],
            },
          ],
        },
      ],
    },
  }
  const gourd: ItemData = {
    ...item('270', '紫金葫芦'),
    use: {
      target: 'scene',
      consuming: false,
      effects: [
        {
          kind: 'drawFromResourcePool',
          resource: 'collectValue',
          maxRoll: 1,
          rewards: [{ itemId: product.id, count: 1 }],
        },
      ],
    },
  }
  const items = [material, product, vessel, gourd]
  const session = new EditSession({
    items,
    maps: {},
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState)
  return { items, session }
}

describe('DataMode dual item mechanism routes', () => {
  test('crafting 与 spirit-gourd 分别挂载独立机制页', async () => {
    const { items, session } = fixture()
    const projectReferenceIndex = createProjectReferenceIndex(buildProjectReferenceSnapshot([]))
    const base: Omit<ComponentProps<typeof DataMode>, 'tab' | 'focusObjectId'> = {
      sprites: [],
      battleSprites: [],
      skills: {},
      itemList: items,
      locale: {},
      assetBase: {} as never,
      session,
      enemies: [],
      enemyTeams: [],
      assetCatalog: { version: 1, assets: {} },
      assetReader: {} as never,
      audioResolver: {} as never,
      tilesets: [],
      tilesetBlobs: {},
      stamps: [],
      mapIndex: { version: 1, maps: [] },
      battleFields: [],
      poisons: [],
      ambiences: [],
      shops: [],
      skillList: [],
      scenes: [],
      manifest: {
        id: 'test',
        name: 'test',
        contentVersion: 19,
        minimumSaveVersion: 8,
        defaultEntryId: 'main',
        content: {},
        assets: { catalog: 'assets/index.json', roles: {} },
        entryPoints: [
          {
            id: 'main',
            label: '主要入口',
            scene: 'scene-a',
            startWorld: { party: [], money: 0, inventory: [] },
          },
        ],
      },
      projectIssues: [],
      projectDiagnosticsStatus: 'current',
      projectReferenceIndex,
      projectReferenceStatus: 'current',
      getCurrentProjectReferenceIndex: () => projectReferenceIndex,
      onOpenProjectReference: vi.fn(),
      actors: [],
      onJumpToEvent: vi.fn(),
      tabBar: null,
    }

    await act(async () => root.render(<DataMode {...base} tab="crafting" focusObjectId="268" />))
    expect(host.querySelector('main')?.getAttribute('aria-label')).toBe('炼蛊皿机制工作区')
    expect(host.querySelector('.item-alchemy-recipe-row')).not.toBeNull()

    await act(async () =>
      root.render(<DataMode {...base} tab="spirit-gourd" focusObjectId="270" />),
    )
    expect(host.querySelector('main')?.getAttribute('aria-label')).toBe('紫金葫芦机制工作区')
    expect(host.querySelector('.item-alchemy-reward-row')).not.toBeNull()
  })
})
