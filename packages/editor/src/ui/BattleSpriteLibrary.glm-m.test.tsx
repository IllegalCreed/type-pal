// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M05（BattleSpriteLibrary.glm-m）：敌人动作计时草稿当前合同。
 * 本文件聚焦敌人 profile 计时草稿域：待机毫秒/帧按 40ms/tick 换算
 * 落入 draft（不直接改 canonical），「应用修改」单命令提交，「放弃修改」零提交，
 * undo/redo 对称且过保存门。播种走真实量化编码 + AddBattleSpriteCommand（K01 同一入口）。
 */
import type { BattleSpriteProfileKind } from '@type-pal/content'
import {
  compressGzip,
  encodeSpriteChunk,
  loadStandardPalette,
  quantizeToRleFrame,
} from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  buttonByText,
  controlByLabel,
  fillAndBlur,
  loadLegalProject,
  stubNodeTestHost,
} from '../__tests__/glm-m/kit.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { prepareBattleSpriteImport } from '../core/battle-sprite-import.js'
import { AddBattleSpriteCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  atlasColors,
  installBrowserHardwarePorts,
  solidRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import { BattleSpriteLibrary } from './BattleSpriteLibrary.js'

const FRAME = 8

function Harness(props: {
  session: EditSession
  source: import('@type-pal/reforge').FileSource
  assetBase: import('@type-pal/reforge').AssetBase
  reader: import('../core/editor-asset-reader.js').EditorAssetReader
}) {
  const [view, setView] = useState<'definition' | 'asset'>('definition')
  const [focus, setFocus] = useState<string | undefined>()
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <BattleSpriteLibrary
      definitions={current.battleSprites ?? []}
      catalog={current.assetCatalog}
      assetBase={props.assetBase}
      assetReader={props.reader}
      session={props.session}
      tabBar={null}
      view={view}
      focusObjectId={focus}
      onViewChange={(next, objectId) => {
        setView(next)
        setFocus(objectId)
      }}
      onObjectFocus={setFocus}
      onWorldDomain={() => undefined}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      onStatusNotice={() => undefined}
    />
  )
}

let root: Root
let host: HTMLDivElement
let restoreActEnvironment: () => void

beforeEach(async () => {
  restoreActEnvironment = installReactActEnvironment()
  await stubNodeTestHost()
  installBrowserHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  restoreActEnvironment()
})

interface Mounted {
  session: EditSession
  assetBase: import('@type-pal/reforge').AssetBase
  reader: ReturnType<typeof createEditorAssetReader>
}

async function mountWithEnemySprite(): Promise<Mounted> {
  const legal = await loadLegalProject('glm-wave-m-sprite-library')
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const palette = await loadStandardPalette(legal.assetBase)
  const frames = atlasColors(6).map((color) =>
    quantizeToRleFrame(solidRgba(FRAME, FRAME, color), FRAME, FRAME, palette),
  )
  const gzip = await compressGzip(encodeSpriteChunk(frames))
  const bytes = gzip.buffer.slice(gzip.byteOffset, gzip.byteOffset + gzip.byteLength) as ArrayBuffer
  const prepared = await prepareBattleSpriteImport(session.getState(), {
    hint: 'glm-m-enemy',
    label: '赤鬼',
    kind: 'enemy' as BattleSpriteProfileKind,
    bytes,
    frameCount: frames.length,
    reader,
  })
  session.dispatch(
    new AddBattleSpriteCommand(
      prepared.definition,
      prepared.record,
      prepared.bytes,
      prepared.frameCount,
    ),
  )
  await act(async () => {
    root.render(
      <Harness
        session={session}
        source={legal.source}
        assetBase={legal.assetBase}
        reader={reader}
      />,
    )
    await Promise.resolve()
  })
  return { session, assetBase: legal.assetBase, reader }
}

describe('M05 BattleSpriteLibrary 敌人计时草稿', () => {
  test('待机毫秒/帧 40ms 换算入草稿，应用修改单命令提交，放弃修改零提交', async () => {
    const mounted = await mountWithEnemySprite()
    const session = mounted.session
    const goblin = () => session.getState().battleSprites!.find((entry) => entry.label === '赤鬼')!
    const goblinProfile = () => {
      const profile = goblin().profile
      if (profile.kind !== 'enemy') throw new Error(`非敌人 profile: ${profile.kind}`)
      return profile
    }
    // 选中赤鬼定义行 → 动作检查器装载草稿（starter-fighter 是 index 0，按稳定 id 断言）。
    const row = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find((candidate) =>
      candidate.textContent?.includes('赤鬼'),
    )
    expect(row, '赤鬼目录行').toBeDefined()
    await act(async () => row!.click())
    await act(async () => Promise.resolve())

    const idleBefore = goblinProfile().idleTicksPerFrame
    const historyBefore = session.getHistoryVersion()
    const apply = buttonByText(host, '应用修改')
    expect(apply.disabled).toBe(true)

    // 120ms → 3 ticks；canonical 不动。应用还需等当前帧源的异步解码证明。
    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '待机毫秒/帧'), '120')
    expect(goblinProfile().idleTicksPerFrame).toBe(idleBefore)
    expect(session.getHistoryVersion()).toBe(historyBefore)
    await waitForReact(() => expect(apply.disabled).toBe(false))

    await act(async () => apply.click())
    expect(goblinProfile().idleTicksPerFrame).toBe(3)
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)
    assertProjectSaveValid(session.getState())

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(goblinProfile().idleTicksPerFrame).toBe(idleBefore)
    await act(async () => {
      expect(session.redo()).toBe(true)
    })
    expect(goblinProfile().idleTicksPerFrame).toBe(3)
  })

  test('行动毫秒/帧 80ms 只改草稿，放弃修改不提交', async () => {
    const mounted = await mountWithEnemySprite()
    const session = mounted.session
    const row = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find((candidate) =>
      candidate.textContent?.includes('赤鬼'),
    )
    await act(async () => row!.click())
    await act(async () => Promise.resolve())

    const goblin = () => session.getState().battleSprites!.find((entry) => entry.label === '赤鬼')!
    const goblinProfile = () => {
      const profile = goblin().profile
      if (profile.kind !== 'enemy') throw new Error(`非敌人 profile: ${profile.kind}`)
      return profile
    }
    const actBefore = goblinProfile().actTicksPerFrame

    await fillAndBlur(controlByLabel<HTMLInputElement>(host, '行动毫秒/帧'), '80')
    expect(goblinProfile().actTicksPerFrame).toBe(actBefore)

    // 放弃修改：草稿丢弃，canonical 与历史零变化，应用按钮回到禁用。
    await act(async () => buttonByText(host, '放弃修改').click())
    expect(goblinProfile().actTicksPerFrame).toBe(actBefore)
    expect(session.getHistoryVersion()).toBe(1) // 仅播种一条 Add 命令
    const applyAfterDiscard = buttonByText(host, '应用修改')
    expect(applyAfterDiscard.disabled).toBe(true)
  })
})
