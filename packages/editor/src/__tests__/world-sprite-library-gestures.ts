import { act } from 'react'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { pickCombobox, stubNodeTestHost, typeDraft } from './cursor-asset-r1/kit.js'
import { installReactActEnvironment, waitForReact } from './react-io-wait.js'
import {
  type MountedWorldSpriteLibrary,
  mountWorldSpriteLibrary,
  unmountWorldSpriteLibrary,
  waitForWorldSpriteResource,
} from './world-sprite-library-test-host.js'
import { loadWorldSpriteProject } from './world-sprite-project.js'

/** Keep exactly one mounted library and wait for admitted bytes between interactions. */
export function setupWorldSpriteLibrarySuite() {
  let mounted: MountedWorldSpriteLibrary | undefined
  let restoreAct: () => void
  beforeEach(async () => {
    restoreAct = installReactActEnvironment()
    await stubNodeTestHost()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })
  afterEach(async () => {
    try {
      if (mounted) await unmountWorldSpriteLibrary(mounted)
    } finally {
      mounted = undefined
      restoreAct()
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    }
  })
  return {
    async mount(...input: Parameters<typeof mountWorldSpriteLibrary>) {
      if (mounted) throw new Error('The world sprite library is already mounted')
      mounted = await mountWorldSpriteLibrary(...input)
      return mounted
    },
  }
}

export async function waitMeta(
  host: HTMLElement,
  frames: number,
  consumers: number,
): Promise<void> {
  await waitForReact(() => {
    expect(host.textContent).toContain(`${frames} 帧 · ${consumers} 个用途定义`)
  })
}

export function catalogMetas(host: HTMLElement): string[] {
  return [...host.querySelectorAll('.sprite-resource-row .ds-catalog-row__meta')].map(
    (node) => node.textContent ?? '',
  )
}

export async function selectAssetRow(
  library: MountedWorldSpriteLibrary,
  asset: string,
): Promise<void> {
  const row = [...library.host.querySelectorAll<HTMLElement>('.sprite-resource-row')].find(
    (candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === asset,
  )
  expect(row, `目录行 ${asset}`).toBeDefined()
  await act(async () => {
    row!.click()
  })
  await waitForWorldSpriteResource(library, asset)
}

export async function setKindFilter(host: HTMLElement, label: string): Promise<void> {
  const trigger = host.querySelector<HTMLButtonElement>(
    'button[role="combobox"][aria-label="按用途与实例行为筛选源帧资源"]',
  )
  expect(trigger, 'kind filter').not.toBeNull()
  await pickCombobox(trigger!, label)
}

export async function setTextFilter(host: HTMLElement, value: string): Promise<void> {
  const input = host.querySelector<HTMLInputElement>('input[aria-label="过滤大世界精灵库"]')
  expect(input, 'text filter').not.toBeNull()
  await typeDraft(input!, value)
}

export async function multiAssetProject(
  name: string,
  options: {
    alphaLabel?: string
    betaLabel?: string
    gammaLabel?: string
    betaAction?: boolean
  } = {},
) {
  return loadWorldSpriteProject(name, [
    {
      asset: 'sprite.authored.c01alpha',
      label: options.alphaLabel ?? 'C01Alpha',
      frameCount: 8,
      definitions: [
        {
          id: 'c01-alpha-walk',
          label: 'AlphaWalk',
          layout: { kind: 'directional', framesPerDir: 2 },
        },
        {
          id: 'c01-alpha-idle',
          label: 'AlphaIdle',
          layout: { kind: 'static' },
          poses: {
            wave: {
              label: 'Wave',
              steps: [
                { frame: 0, durationMs: 100 },
                { frame: 1, durationMs: 100 },
              ],
              loopFrom: 0,
            },
          },
        },
      ],
    },
    {
      asset: 'sprite.authored.c01beta',
      label: options.betaLabel ?? 'C01Beta',
      frameCount: 4,
      definitions: [
        {
          id: 'c01-beta-static',
          label: 'BetaStatic',
          layout: { kind: 'static' },
          ...(options.betaAction
            ? { poses: { single: { label: '单次动作', steps: [{ frame: 0, durationMs: 100 }] } } }
            : {}),
        },
      ],
    },
    {
      asset: 'sprite.authored.c01gamma',
      label: options.gammaLabel ?? 'C01Gamma',
      frameCount: 3,
      definitions: [],
    },
  ])
}

export function buttonByLoose(host: ParentNode, text: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) =>
      candidate.textContent?.trim() === text || candidate.getAttribute('aria-label') === text,
  )
}
