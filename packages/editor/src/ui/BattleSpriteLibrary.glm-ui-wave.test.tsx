// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U2a：BattleSpriteLibrary 残差。
 * 去重：BattleSpriteLibrary.test.tsx 已证引用门禁、领域深链/筛选、合并列表展示、
 * 动作阶段拖放、缩帧收紧、共享 ABI 确认——本文件只补当前公开入口仍未证明的业务交互：
 * 仅改名提交 UpdateBattleSpriteDefinitionCommand 且稳定 id、无 confirm（profile 未变）、
 * undo 精确还原；删除用途成功路径提交 RemoveBattleSpriteDefinitionCommand 并回落兄弟用途。
 */

// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { AssetCatalogV1, BattleSpriteDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { buildSeedAssets } from '../core/seed-assets.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { BattleSpriteLibrary } from './BattleSpriteLibrary.js'

const previewFrameCount = vi.hoisted(() => ({ value: 11 }))
const previewSha = vi.hoisted(() => ({ value: 'a'.repeat(64) }))

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
          sha256: asset === 'battle-sprite.shared' ? previewSha.value : 'b'.repeat(64),
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

/** starter-fighter 为 blank 既有定义（hero 的 battler 引用），保留以维持引用闭包；
 *  追加的两个用途共享新帧源（真实字节）。playerProfile 裁掉 steal:10 以匹配 10 帧源。 */
const STARTER_ID = 'starter-fighter'
const sharedProfile = (() => {
  const profile = structuredClone(playerProfile)
  delete (profile.frames as Record<string, number>).steal
  return profile
})()

const definitions: BattleSpriteDef[] = [
  {
    id: STARTER_ID,
    label: '占位主角战斗形象',
    asset: 'battle-sprite.generated.starter',
    profile: structuredClone(playerProfile),
  },
  {
    id: 'fighter-a',
    label: '甲战士',
    asset: 'battle-sprite.shared',
    profile: structuredClone(sharedProfile),
  },
  {
    id: 'fighter-b',
    label: '乙战士',
    asset: 'battle-sprite.shared',
    profile: structuredClone(sharedProfile),
  },
]

/** 正式 blank 项目 + 共享战斗帧源（真实 gzip 字节与真实 sha），经保存门自证。 */
let catalog: AssetCatalogV1

async function legalBattleState(entries: readonly BattleSpriteDef[]): Promise<EditorState> {
  const { state } = await loadLegalUiProject('glm-ui-wave-battle')
  const seedAssets = await buildSeedAssets()
  const bytes = seedAssets.battleSpriteRle
  const sha = await sha256Hex(bytes)
  previewSha.value = sha
  catalog = {
    version: 1,
    assets: {
      ...state.assetCatalog.assets,
      'battle-sprite.shared': {
        kind: 'battle-sprite',
        label: '共享战斗帧',
        path: 'assets/authored/battle-sprites/shared.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: bytes.byteLength,
        sha256: sha,
        origin: { kind: 'authored' },
      },
    },
  }
  const next = {
    ...state,
    battleSprites: [...entries],
    assetCatalog: catalog,
    assetBlobs: {
      ...state.assetBlobs,
      'assets/authored/battle-sprites/shared.rle': bytes,
    },
  } as EditorState
  assertProjectSaveValid(next)
  return next
}

let root: Root
let host: HTMLDivElement

vi.stubGlobal('Blob', NodeBlob)
vi.stubGlobal('crypto', webcrypto)
afterAll(() => {
  vi.unstubAllGlobals()
})

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
  onStatusNotice?: (notice: { kind: 'error' | 'info'; message?: string } | undefined) => void
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
      onStatusNotice={props.onStatusNotice}
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
  const session = new EditSession(await legalBattleState(entries))
  await act(async () => {
    root.render(<Harness entries={entries} session={session} focusObjectId={focus} {...hooks} />)
    await Promise.resolve()
  })
  return session
}

describe('U2a BattleSpriteLibrary 残差', () => {
  test('仅改名提交稳定 id 且无需 confirm；undo 还原旧名', async () => {
    const session = await mountBattle(definitions, 'fighter-a')
    const input = document.querySelector<HTMLInputElement>('#battle-sprite-usage-name')!
    expect(input, 'usage name input').not.toBeNull()
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '甲战士·改')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const apply = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '应用修改',
    )
    console.log(
      'APPLY disabled =',
      apply?.disabled,
      'input value =',
      JSON.stringify(document.querySelector<HTMLInputElement>('#battle-sprite-usage-name')?.value),
      'input id exists =',
      Boolean(document.getElementById('battle-sprite-usage-name')),
    )
    await act(async () => {
      apply!.click()
    })
    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().battleSprites?.find((entry) => entry.id === 'fighter-a')?.label).toBe(
      '甲战士·改',
    )
    expect(session.getState().battleSprites?.map((entry) => entry.id)).toEqual([
      'starter-fighter',
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
    expect(session.getState().battleSprites?.map((entry) => entry.id)).toEqual([
      'starter-fighter',
      'fighter-b',
    ])
    expect(session.getHistoryVersion()).toBe(before + 1)
    expect(focused.at(-1)).toBe('fighter-b')
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().battleSprites?.map((entry) => entry.id)).toEqual([
      'starter-fighter',
      'fighter-a',
      'fighter-b',
    ])
  })
})
