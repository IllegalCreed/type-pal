// @vitest-environment jsdom

import { BattleSpriteAssetCache } from '@type-pal/reforge'
import { act } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { expectedBattleRgb } from '../__tests__/battle-sprite-pixel-oracle.js'
import { enemyProfile, loadBattleSpriteProject } from '../__tests__/battle-sprite-project.js'
import { installBrowserHardwarePorts } from '../__tests__/canvas-test-ports.js'
import { isBlank, pixelAt } from '../__tests__/cursor-asset-r1/canvas-pixels.js'
import { pickCombobox } from '../__tests__/cursor-asset-r1/kit.js'
import {
  enemyDef,
  type MountedEnemyAnim,
  mountEnemyAnim,
  unmountEnemyAnim,
} from '../__tests__/enemy-animation-test-host.js'
import { gatedFileSource } from '../__tests__/gated-file-source.js'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { fieldControlByLabel } from './__tests__/dom-gestures.js'

const mainAsset = 'battle-sprite.authored.enemy-original'
const nextAsset = 'battle-sprite.authored.enemy-replacement'
type Project = Awaited<ReturnType<typeof loadBattleSpriteProject>>

let project: Project
let mounted: MountedEnemyAnim | undefined
let restoreAct: () => void

beforeEach(async () => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  project = await loadBattleSpriteProject('enemy-resource-admission', [
    {
      asset: mainAsset,
      label: '原图',
      definitions: [{ id: 'original', label: '原图', profile: enemyProfile(2, 1, 2) }],
      frameCount: 5,
      colorPicks: [0, 1, 2, 3, 4],
    },
    {
      asset: nextAsset,
      label: '替换图',
      definitions: [{ id: 'replacement', label: '替换图', profile: enemyProfile(1, 1, 1) }],
      frameCount: 3,
      colorPicks: [9, 12, 15],
    },
  ])
})

afterEach(async () => {
  try {
    if (mounted) await unmountEnemyAnim(mounted)
  } finally {
    mounted = undefined
    restoreAct()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

function pathOf(asset: string): string {
  const entry = project.seeded.get(asset)
  if (!entry) throw new Error(`Unseeded battle sprite ${asset}`)
  return entry.path
}

async function mount(source: Project['source'] = project.source): Promise<MountedEnemyAnim> {
  mounted = await mountEnemyAnim(project, {
    enemy: enemyDef('enemy-resource-preview', 'original'),
    source,
  })
  return mounted
}

async function switchToReplacement(preview: MountedEnemyAnim): Promise<void> {
  const picker = preview.host.querySelector<HTMLButtonElement>('[aria-label="敌人战斗精灵"]')
  if (!picker) throw new Error('Enemy appearance picker is missing')
  await pickCombobox(picker, '替换图')
  expect(
    preview.session.getState().enemies?.find((enemy) => enemy.id === preview.enemyId)?.battleSprite,
  ).toBe('replacement')
}

function expectFrame(preview: MountedEnemyAnim, asset: string): void {
  expect(pixelAt(preview.canvas(), 0, 0)).toEqual([...expectedBattleRgb(project, asset, 0), 255])
}

test('profile edits wait for the decoded image while the enemy offset remains editable', async () => {
  const file = pathOf(mainAsset)
  const gated = gatedFileSource(project.source)
  const hold = gated.gate(file)
  try {
    const preview = await mount(gated.source)
    await waitForReact(() => expect(gated.calls).toContain(file))
    expect(isBlank(preview.canvas())).toBe(true)
    expect(preview.host.querySelector('.ds-tag')).toBeNull()
    expect(fieldControlByLabel<HTMLInputElement>(preview.host, '待机帧').disabled).toBe(true)
    expect(fieldControlByLabel<HTMLInputElement>(preview.host, 'Y 偏移').disabled).toBe(false)
    await act(async () => hold.resolve())
    await waitForReact(() => expectFrame(preview, mainAsset))
    expect(fieldControlByLabel<HTMLInputElement>(preview.host, '待机帧').disabled).toBe(false)
    expect(preview.host.querySelector('.ds-tag')?.textContent).toBe('5 帧')
  } finally {
    hold.resolve()
  }
})

test('a failed replacement sprite read cannot leave the previous enemy painted', async () => {
  const gated = gatedFileSource(project.source)
  const hold = gated.gate(pathOf(nextAsset))
  try {
    const preview = await mount(gated.source)
    await waitForReact(() => expectFrame(preview, mainAsset))
    await switchToReplacement(preview)
    await act(async () => hold.reject(new Error('所选敌人的精灵无法读取')))
    await waitForReact(() =>
      expect(preview.host.querySelector('.err[role="status"]')?.textContent).toContain(
        '所选敌人的精灵无法读取',
      ),
    )
    expect(isBlank(preview.canvas())).toBe(true)
    expect(fieldControlByLabel<HTMLInputElement>(preview.host, '待机帧').disabled).toBe(true)
  } finally {
    hold.resolve()
  }
})

test('the late decoded original cannot replace the newly selected enemy image', async () => {
  const gated = gatedFileSource(project.source)
  const before = pathOf(mainAsset)
  const hold = gated.gate(before)
  const loads = vi.spyOn(BattleSpriteAssetCache.prototype, 'load')
  try {
    const preview = await mount(gated.source)
    await waitForReact(() => expect(gated.calls).toContain(before))
    expect(loads.mock.calls[0]?.[1]).toBe(mainAsset)
    const oldLoad = loads.mock.results[0]?.value
    if (!oldLoad) throw new Error('Original sprite decoding did not start')
    await switchToReplacement(preview)
    await waitForReact(() => expectFrame(preview, nextAsset))
    await act(async () => {
      hold.resolve()
      expect((await oldLoad).frames).toHaveLength(5)
    })
    expectFrame(preview, nextAsset)
    expect(preview.host.querySelector('.ds-tag')?.textContent).toBe('3 帧')
  } finally {
    hold.resolve()
  }
})
