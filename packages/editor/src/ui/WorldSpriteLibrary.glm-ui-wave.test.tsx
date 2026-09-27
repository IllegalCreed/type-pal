// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U2b：WorldSpriteLibrary 残差。
 * 去重：WorldSpriteLibrary.test.tsx 已证引用门禁、深链/弹窗路由、草稿回灌、布局数值提交、
 * 筛选与展示、新增用途——本文件只补当前公开入口仍未证明的业务交互：
 * 删除用途按钮的成功提交与选择回落、删除未使用源资源的 catalog+blob 精确清理与 undo 恢复、
 * 布局类型（directional/static）切换提交。
 */
import type { AssetCatalogV1, SpriteDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { WorldSpriteLibrary } from './WorldSpriteLibrary.js'

vi.mock('./SpriteResourceViewer.js', async () => {
  const React = await import('react')
  return {
    SpriteResourceViewer: (props: {
      asset: string
      revision: string
      activeDefinitionId?: string
      consumers: readonly SpriteDef[]
      headerActions?: React.ReactNode
      onLoaded?: (proof: { asset: string; revision: string; actualFrameCount: number }) => void
      onFramesLoaded?: (
        frames: readonly { canvas: undefined; width: number; height: number }[],
      ) => void
    }) => {
      React.useEffect(() => {
        props.onLoaded?.({ asset: props.asset, revision: props.revision, actualFrameCount: 20 })
        props.onFramesLoaded?.(
          Array.from({ length: 20 }, () => ({ canvas: undefined, width: 32, height: 48 })),
        )
      }, [props.asset, props.onFramesLoaded, props.onLoaded, props.revision])
      return (
        <div
          data-world-resource={props.asset}
          data-world-active-definition={props.activeDefinitionId}
          data-world-consumer-count={props.consumers.length}
        >
          {props.headerActions}
        </div>
      )
    },
  }
})

vi.mock('./SpriteUploadWizard.js', () => ({
  SpriteUploadWizard: () => <div data-world-uploader />,
}))

const definitions: SpriteDef[] = [
  {
    id: 'hero-walk',
    label: '主角行走',
    asset: 'sprite.shared',
    layout: { kind: 'directional', framesPerDir: 3 },
  },
  {
    id: 'hero-static',
    label: '主角静止',
    asset: 'sprite.shared',
    layout: { kind: 'static' },
  },
]

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'sprite.raw': {
      kind: 'sprite',
      label: '未配置精灵帧',
      path: 'assets/authored/sprites/raw.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 4,
      sha256: 'b'.repeat(64),
      origin: { kind: 'authored' },
    },
    'sprite.shared': {
      kind: 'sprite',
      label: '共享精灵帧',
      path: 'assets/authored/sprites/shared.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 4,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' },
    },
  },
}

const rawBytes = new Uint8Array([9, 9, 9, 9]).buffer

function editorState(
  entries: readonly SpriteDef[],
  blobs: Record<string, ArrayBuffer> = {},
): EditorState {
  return {
    manifest: { assets: { roles: {} } } as never,
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [...entries],
    battleSprites: [],
    enemies: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: catalog,
    assetBlobs: { 'assets/authored/sprites/raw.rle': rawBytes, ...blobs },
    stamps: [],
    scriptChunks: {},
  } as EditorState
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

function renderLibrary(input: {
  entries: readonly SpriteDef[]
  session: EditSession
  view?: 'definition' | 'asset'
  focusObjectId?: string
  onViewChange?: (view: 'definition' | 'asset', objectId?: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}): void {
  root.render(
    <WorldSpriteLibrary
      definitions={input.entries}
      catalog={catalog}
      assetBase={{} as never}
      assetReader={{
        projectId: 'test',
        record: (asset: string) => catalog.assets[asset]!,
        readBytes: async () => rawBytes.slice(0),
        readRoleBytes: async () => new ArrayBuffer(0),
        urlFor: async () => '',
      }}
      session={input.session}
      tabBar={null}
      view={input.view ?? 'definition'}
      focusObjectId={input.focusObjectId}
      onViewChange={input.onViewChange ?? vi.fn()}
      onBattleDomain={vi.fn()}
      referenceIndex={collectCurrentProjectReferenceIndex(input.session.getState())}
      referenceStatus="current"
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
      onStatusNotice={input.onStatusNotice}
    />,
  )
}

async function mountLibrary(input: {
  entries: readonly SpriteDef[]
  view?: 'definition' | 'asset'
  focusObjectId?: string
  blobs?: Record<string, ArrayBuffer>
  onViewChange?: (view: 'definition' | 'asset', objectId?: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}): Promise<EditSession> {
  const session = new EditSession(editorState(input.entries, input.blobs))
  await act(async () => {
    renderLibrary({ ...input, session })
    await Promise.resolve()
  })
  return session
}

async function clickHostButton(text: string): Promise<void> {
  const hit = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(hit, `button ${text}`).not.toBeNull()
  await act(async () => hit!.click())
}

describe('U2b WorldSpriteLibrary 残差', () => {
  test('删除用途：确认后提交 RemoveSpriteDefinitionCommand，选择回落到兄弟用途', async () => {
    const session = await mountLibrary({
      entries: definitions,
      focusObjectId: 'hero-static',
    })
    console.log(
      'ACTIVE-DEF =',
      host
        .querySelector('[data-world-active-definition]')
        ?.getAttribute('data-world-active-definition'),
    )
    console.log(
      'RESOURCE =',
      host.querySelector('[data-world-resource]')?.getAttribute('data-world-resource'),
      'CONSUMERS =',
      host.querySelector('[data-world-consumer-count]')?.getAttribute('data-world-consumer-count'),
    )
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    console.log(
      'BTNS =',
      JSON.stringify(
        [...host.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean),
      ),
    )
    const before = session.getHistoryVersion()
    await clickHostButton('删除用途')
    expect(session.getState().sprites?.map((entry) => entry.id)).toEqual(['hero-walk'])
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(session.undo()).toBe(true)
    expect(session.getState().sprites?.map((entry) => entry.id)).toEqual([
      'hero-walk',
      'hero-static',
    ])
  })

  test('删除未使用源资源：catalog 记录与孤立 blob 一并清理，undo 连 bytes 一起恢复', async () => {
    const session = await mountLibrary({
      entries: definitions,
      view: 'asset',
      focusObjectId: 'sprite.raw',
      blobs: {},
    })
    expect(session.getState().assetBlobs['assets/authored/sprites/raw.rle']?.byteLength).toBe(4)
    await clickHostButton('删除源资源')
    expect(session.getState().assetCatalog.assets['sprite.raw']).toBeUndefined()
    expect(session.getState().assetBlobs['assets/authored/sprites/raw.rle']).toBeUndefined()
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().assetCatalog.assets['sprite.raw']?.label).toBe('未配置精灵帧')
    expect(session.getState().assetBlobs['assets/authored/sprites/raw.rle']?.byteLength).toBe(4)
  })

  test('布局类型切换提交 UpdateSpriteCommand：directional ↔ static', async () => {
    const session = await mountLibrary({
      entries: definitions,
      focusObjectId: 'hero-static',
    })
    const trigger = document.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')!
    await act(async () => trigger.click())
    const listbox = document.getElementById(trigger.getAttribute('aria-controls')!)!
    const option = [...listbox.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('四向行走'),
    )
    expect(option, '四向行走 option').not.toBeNull()
    await act(async () => option!.click())
    expect(session.getState().sprites?.find((entry) => entry.id === 'hero-static')?.layout).toEqual(
      {
        kind: 'directional',
        framesPerDir: 3,
      },
    )
    expect(session.undo()).toBe(true)
    expect(session.getState().sprites?.find((entry) => entry.id === 'hero-static')?.layout).toEqual(
      {
        kind: 'static',
      },
    )
  })
})
