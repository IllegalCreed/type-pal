// @vitest-environment jsdom

import { BattleSpriteAssetCache } from '@type-pal/reforge'
import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import {
  type MountedBattleInline,
  mountBattleInline,
  unmountBattleInline,
} from '../__tests__/battle-inline-test-host.js'
import { enemyProfile, loadBattleSpriteProject } from '../__tests__/battle-sprite-project.js'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { gatedFileSource } from '../__tests__/gated-file-source.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import {
  BattleSpriteInlinePreview,
  type BattleSpritePreviewProof,
  type BattleSpriteResourceSnapshot,
} from './BattleSpriteInlinePreview.js'

const oldAsset = 'battle-sprite.authored.first-selection'
const newAsset = 'battle-sprite.authored.second-selection'
let project: Awaited<ReturnType<typeof loadBattleSpriteProject>>
let preview: MountedBattleInline | undefined
let restoreAct: () => void

beforeEach(async () => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  project = await loadBattleSpriteProject('battle-inline-resources', [
    {
      asset: oldAsset,
      label: '旧帧',
      frameCount: 2,
      colorPicks: [0, 1],
      definitions: [{ id: 'first', label: '旧定义', profile: enemyProfile(2, 0, 0) }],
    },
    {
      asset: newAsset,
      label: '新帧',
      frameCount: 3,
      colorPicks: [2, 3, 4],
      definitions: [{ id: 'second', label: '新定义', profile: enemyProfile(1, 1, 1) }],
    },
  ])
})

afterEach(async () => {
  try {
    if (preview) await unmountBattleInline(preview)
  } finally {
    preview = undefined
    restoreAct()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

test('only the selected resource can publish an ABI proof and image snapshot', async () => {
  const prior = project.seeded.get(oldAsset)
  const next = project.seeded.get(newAsset)
  if (!prior || !next) throw new Error('Expected both resources in the loaded project')
  const gated = gatedFileSource(project.source)
  const hold = gated.gate(prior.path)
  const loads = vi.spyOn(BattleSpriteAssetCache.prototype, 'load')
  const proofs: Array<BattleSpritePreviewProof | undefined> = []
  const snapshots: Array<BattleSpriteResourceSnapshot | undefined> = []
  const onLoaded = (proof: BattleSpritePreviewProof | undefined) => proofs.push(proof)
  const onResourceLoaded = (snapshot: BattleSpriteResourceSnapshot | undefined) =>
    snapshots.push(snapshot)
  try {
    const view = await mountBattleInline(project, {
      asset: oldAsset,
      source: gated.source,
      layout: 'library',
      onLoaded,
      onResourceLoaded,
    })
    preview = view
    await waitForReact(() => expect(gated.calls).toContain(prior.path))
    expect(view.host.querySelector('[role="status"]')?.textContent).toContain('加载战斗精灵原始帧')
    const firstLoad = loads.mock.results[0]?.value
    if (!firstLoad) throw new Error('The original sprite decoder did not start')
    await act(async () =>
      view.root.render(
        <BattleSpriteInlinePreview
          asset={newAsset}
          label="新帧"
          assetBase={project.assetBase}
          assetReader={view.reader}
          layout="library"
          onLoaded={onLoaded}
          onResourceLoaded={onResourceLoaded}
        />,
      ),
    )
    await waitForReact(() =>
      expect(proofs.at(-1)).toMatchObject({
        asset: newAsset,
        sha256: next.sha256,
        actualFrameCount: 3,
      }),
    )
    expect(snapshots.at(-1)?.baked).toHaveLength(3)
    const settledProofs = [...proofs]
    const settledSnapshots = [...snapshots]
    await act(async () => {
      hold.resolve()
      expect((await firstLoad).frames).toHaveLength(2)
    })
    expect(proofs).toEqual(settledProofs)
    expect(snapshots).toEqual(settledSnapshots)
    expect(view.host.querySelectorAll('.sprite-resource-frame-grid button')).toHaveLength(3)
  } finally {
    hold.resolve()
  }
})

test.each([
  ['battle-sprite.unknown', 'AssetId "battle-sprite.unknown" 不在 catalog'],
  ['tileset.generated.starter', '期望 battle-sprite，实际 tileset'],
])('rejecting resource %s gives a catalog error rather than a proof', async (asset, detail) => {
  const proof = vi.fn()
  preview = await mountBattleInline(project, { asset, layout: 'library', onLoaded: proof })
  expect(preview.host.querySelector('[role="alert"]')?.textContent).toContain(detail)
  expect(proof.mock.calls).toEqual([[undefined]])
  expect(preview.host.querySelector('.sprite-resource-frame-grid')).toBeNull()
})

test('the compact preview rejects a mismatched profile and recovers for a matching use', async () => {
  const definition = project.state.battleSprites.find((entry) => entry.id === 'second')
  if (!definition) throw new Error('Enemy definition is missing')
  const onLoaded = vi.fn()
  const view = await mountBattleInline(project, {
    definition,
    expected: 'player-fighter',
    onLoaded,
  })
  preview = view
  await waitForReact(() =>
    expect(view.host.querySelector('.err')?.textContent).toContain(
      'profile 期望 player-fighter，实际 enemy',
    ),
  )
  expect(onLoaded.mock.calls.flat()).toEqual([undefined, undefined])
  await act(async () =>
    view.root.render(
      <BattleSpriteInlinePreview
        definition={definition}
        expected="enemy"
        assetBase={project.assetBase}
        assetReader={view.reader}
        onLoaded={onLoaded}
      />,
    ),
  )
  await waitForReact(() =>
    expect(onLoaded).toHaveBeenLastCalledWith(
      expect.objectContaining({
        asset: newAsset,
        sha256: project.seeded.get(newAsset)?.sha256,
        actualFrameCount: 3,
      }),
    ),
  )
  expect(view.host.querySelector('.err')).toBeNull()
  expect(view.host.textContent).toContain('新定义 · second · 3 帧')
})
