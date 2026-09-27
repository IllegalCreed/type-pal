// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U2a：BattleSpriteLibrary 残差。
 * 去重：BattleSpriteLibrary.test.tsx 已证引用门禁、领域深链/筛选、合并列表展示、
 * 动作阶段拖放、缩帧收紧、共享 ABI 确认——本文件只补当前公开入口仍未证明的业务交互：
 * 仅改名提交 UpdateBattleSpriteDefinitionCommand 且稳定 id、无 confirm（profile 未变）、
 * undo 精确还原；删除用途成功路径提交 RemoveBattleSpriteDefinitionCommand 并回落兄弟用途。
 */
import type { AssetCatalogV1, BattleSpriteDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { BattleSpriteLibrary } from './BattleSpriteLibrary.js'

const previewFrameCount = vi.hoisted(() => ({ value: 11 }))

vi.mock('./BattleSpriteInlinePreview.js', async () => {
  const React = await import('react')
  return {
    BattleSpriteInlinePreview: (props: {
      asset?: string
      definition?: BattleSpriteDef
      activeDefinitionId?: string
      onLoaded?: (proof: {
        asset: string
        sha256: string
        actualFrameCount: number
        frames: never[]
      }) => void
      onResourceLoaded?: (snapshot: {
        frames: readonly Record<string, never>[]
        palette: { colors: [number, number, number][]; cycles: never[] }
        baked: never[]
      }) => void
    }) => {
      const asset = props.definition?.asset ?? props.asset
      React.useEffect(() => {
        if (!asset) return
        props.onLoaded?.({
          asset,
          sha256: asset === 'battle-sprite.shared' ? 'a'.repeat(64) : 'b'.repeat(64),
          actualFrameCount: previewFrameCount.value,
          frames: [],
        })
        props.onResourceLoaded?.({
          frames: Array.from({ length: previewFrameCount.value }, () => ({})),
          palette: {
            colors: Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]),
            cycles: [],
          },
          baked: [],
        })
      }, [asset, props.definition?.id, props.onLoaded, props.onResourceLoaded])
      return (
        <div
          data-preview={`raw:${props.asset}`}
          data-active-definition={props.activeDefinitionId}
        />
      )
    },
  }
})

vi.mock('./BattleSpriteUploader.js', () => ({
  BattleSpriteUploader: () => <div data-uploader />,
}))

const playerProfile = {
  kind: 'player-fighter' as const,
  frames: {
    idle: 0,
    dying: 1,
    dead: 2,
    defend: 3,
    hurt: 4,
    preMagic: 5,
    magic: 6,
    attackWindup: 7,
    attackRush: 8,
    attackStrike: 9,
    steal: 10,
  },
  castEffectBase: 0,
  attackEffectBase: 0,
}

const definitions: BattleSpriteDef[] = [
  {
    id: 'fighter-a',
    label: '甲战士',
    asset: 'battle-sprite.shared',
    profile: structuredClone(playerProfile),
  },
  {
    id: 'fighter-b',
    label: '乙战士',
    asset: 'battle-sprite.shared',
    profile: structuredClone(playerProfile),
  },
]

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'battle-sprite.aaa-unrelated': {
      kind: 'battle-sprite',
      label: '未配置战斗帧',
      path: 'assets/authored/battle-sprites/unrelated.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 2,
      sha256: 'b'.repeat(64),
      origin: { kind: 'authored' },
    },
    'battle-sprite.shared': {
      kind: 'battle-sprite',
      label: '共享战斗帧',
      path: 'assets/authored/battle-sprites/shared.rle',
      mediaType: 'application/vnd.type-pal.rle',
      bytes: 2,
      sha256: 'a'.repeat(64),
      origin: { kind: 'authored' },
    },
  },
}

function state(entries: readonly BattleSpriteDef[]): EditorState {
  return {
    manifest: { assets: { roles: {} } } as never,
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [...entries],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: catalog,
    assetBlobs: {},
    stamps: [],
    scriptChunks: {},
  } as EditorState
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  previewFrameCount.value = 11
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

function Harness(props: {
  entries: readonly BattleSpriteDef[]
  session: EditSession
  focusObjectId?: string
  onViewChange?: (view: 'definition' | 'asset', objectId?: string) => void
  onObjectFocus?: (objectId: string | undefined) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  return (
    <BattleSpriteLibrary
      definitions={props.entries}
      catalog={catalog}
      assetBase={{} as never}
      assetReader={{} as never}
      session={props.session}
      tabBar={null}
      view="definition"
      focusObjectId={props.focusObjectId}
      onViewChange={props.onViewChange ?? vi.fn()}
      onObjectFocus={props.onObjectFocus}
      onWorldDomain={vi.fn()}
      referenceIndex={collectCurrentProjectReferenceIndex(props.session.getState())}
      referenceStatus="current"
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
    />
  )
}

async function mountBattle(
  entries: readonly BattleSpriteDef[],
  focus: string,
  hooks: {
    onViewChange?: (view: 'definition' | 'asset', objectId?: string) => void
    onObjectFocus?: (objectId: string | undefined) => void
  } = {},
): Promise<EditSession> {
  const session = new EditSession(state(entries))
  await act(async () => {
    root.render(<Harness entries={entries} session={session} focusObjectId={focus} {...hooks} />)
    await Promise.resolve()
  })
  return session
}

describe('U2a BattleSpriteLibrary 残差', () => {
  test('仅改名提交稳定 id 且无需 confirm；undo 还原旧名', async () => {
    const session = await mountBattle(definitions, 'fighter-a')
    const name = document.querySelector<HTMLInputElement>('#battle-sprite-usage-name')!
    expect(name, 'usage name input').not.toBeNull()
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(name, '甲战士·改')
      name.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      ;[...document.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.trim() === '应用修改')!
        .click()
    })
    expect(session.getState().battleSprites?.find((entry) => entry.id === 'fighter-a')?.label).toBe(
      '甲战士·改',
    )
    expect(session.getState().battleSprites?.map((entry) => entry.id)).toEqual([
      'fighter-a',
      'fighter-b',
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().battleSprites?.find((entry) => entry.id === 'fighter-a')?.label).toBe(
      '甲战士',
    )
  })

  test('删除用途：确认后提交 RemoveBattleSpriteDefinitionCommand 并回落兄弟用途', async () => {
    const views: Array<[string, string | undefined]> = []
    const focused: Array<string | undefined> = []
    const session = await mountBattle(definitions, 'fighter-a', {
      onViewChange: (view, objectId) => views.push([view, objectId]),
      onObjectFocus: (objectId) => focused.push(objectId),
    })
    const before = session.getHistoryVersion()
    await act(async () => {
      ;[...document.querySelectorAll<HTMLButtonElement>('button')]
        .find((candidate) => candidate.textContent?.trim() === '删除用途')!
        .click()
    })
    expect(session.getState().battleSprites?.map((entry) => entry.id)).toEqual(['fighter-b'])
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(focused.at(-1)).toBe('fighter-b')
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().battleSprites?.map((entry) => entry.id)).toEqual([
      'fighter-a',
      'fighter-b',
    ])
  })
})
