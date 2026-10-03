// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U2b：WorldSpriteLibrary 残差。
 * 去重：WorldSpriteLibrary.test.tsx 已证引用门禁、深链/弹窗路由、草稿回灌、布局数值提交、
 * 筛选与展示、新增用途——本文件只补当前公开入口仍未证明的业务交互：
 * 删除用途按钮的成功提交与选择回落、删除未使用源资源的 catalog+blob 精确清理与 undo 恢复、
 * 布局类型（directional/static）切换提交。
 */

// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { AssetCatalogV1, SpriteDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { buildSeedAssets } from '../core/seed-assets.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
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

// 正式 blank 项目自带 hero 用途（directional 3/向，asset sprite.generated.starter）；
// 追加共享同资产的第二个用途与未配置源资源，供删除/切换断言使用。
const HERO_ASSET = 'sprite.generated.starter'

const definitions: SpriteDef[] = [
  {
    id: 'hero',
    label: '主角',
    asset: HERO_ASSET,
    layout: { kind: 'directional', framesPerDir: 3 },
  },
  {
    id: 'hero-static',
    label: '主角静止',
    asset: HERO_ASSET,
    layout: { kind: 'static' },
  },
]

let catalog: AssetCatalogV1
let rawBytes: ArrayBuffer
let rawRecordPath: string

/**
 * 正式 blank 项目 + 未使用的第二源资源（真实 gzip 字节与真实 sha），经保存门自证；
 * reader 为正式 EditorAssetReader（source+session），删除资源时读真实字节。
 */
async function legalWorldState(entries: readonly SpriteDef[]): Promise<{
  state: EditorState
  reader: ReturnType<typeof createEditorAssetReader>
  assetBase: Awaited<ReturnType<typeof loadLegalUiProject>>['assetBase']
}> {
  const { source, state, assetBase } = await loadLegalUiProject('glm-ui-wave-world')
  const seedAssets = await buildSeedAssets()
  rawBytes = seedAssets.spriteRle
  rawRecordPath = 'assets/authored/sprites/raw.rle'
  const rawSha = await sha256Hex(rawBytes)
  catalog = {
    version: 1,
    assets: {
      ...state.assetCatalog.assets,
      'sprite.raw': {
        kind: 'sprite',
        label: '未配置精灵帧',
        path: rawRecordPath,
        mediaType: 'application/vnd.type-pal.rle',
        bytes: rawBytes.byteLength,
        sha256: rawSha,
        origin: { kind: 'authored' },
      },
    },
  }
  const next = {
    ...state,
    sprites: [...entries],
    assetCatalog: {
      ...catalog,
      assets: {
        ...catalog.assets,
        // 保留 catalog 中真实记录（含 sprite.generated.starter）
      },
    },
    assetBlobs: { ...state.assetBlobs, [rawRecordPath]: rawBytes },
  } as EditorState
  assertProjectSaveValid(next)
  const reader = createEditorAssetReader(source, () => next)
  return { state: next, reader, assetBase }
}

let root: Root
let host: HTMLDivElement

// Node test-host bridge（模块级一次性）：blank seed 的 gzip 依赖 Node Blob.stream。
vi.stubGlobal('Blob', NodeBlob)
vi.stubGlobal('crypto', webcrypto)
afterAll(() => {
  vi.unstubAllGlobals()
})

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
  reader: ReturnType<typeof createEditorAssetReader>
  assetBase: Awaited<ReturnType<typeof loadLegalUiProject>>['assetBase']
  view?: 'definition' | 'asset'
  focusObjectId?: string
  onViewChange?: (view: 'definition' | 'asset', objectId?: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}): void {
  root.render(
    <WorldSpriteLibrary
      definitions={input.entries}
      catalog={catalog}
      assetBase={input.assetBase}
      assetReader={input.reader}
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
  onViewChange?: (view: 'definition' | 'asset', objectId?: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}): Promise<EditSession> {
  const { state, reader, assetBase } = await legalWorldState(input.entries)
  const session = new EditSession(state)
  await act(async () => {
    renderLibrary({ ...input, session, reader, assetBase })
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
    const before = session.getHistoryVersion()
    await clickHostButton('删除用途')
    expect(session.getState().sprites?.map((entry) => entry.id)).toEqual(['hero'])
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(session.undo()).toBe(true)
    expect(session.getState().sprites?.map((entry) => entry.id)).toEqual(['hero', 'hero-static'])
  })

  test('删除未使用源资源：catalog 记录与孤立 blob 一并清理，undo 连 bytes 一起恢复', async () => {
    const session = await mountLibrary({
      entries: definitions,
      view: 'asset',
      focusObjectId: 'sprite.raw',
    })
    expect(session.getState().assetBlobs[rawRecordPath]?.byteLength).toBe(rawBytes.byteLength)
    await clickHostButton('删除源资源')
    expect(session.getState().assetCatalog.assets['sprite.raw']).toBeUndefined()
    expect(session.getState().assetBlobs[rawRecordPath]).toBeUndefined()
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().assetCatalog.assets['sprite.raw']?.label).toBe('未配置精灵帧')
    expect(session.getState().assetBlobs[rawRecordPath]?.byteLength).toBe(rawBytes.byteLength)
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
