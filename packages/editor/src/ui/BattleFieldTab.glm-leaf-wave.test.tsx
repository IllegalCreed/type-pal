// @vitest-environment jsdom

// @ts-expect-error Node test-host bridge only.
import { Blob as NodeBlob } from 'node:buffer'
// @ts-expect-error Node test-host bridge only.
import { webcrypto } from 'node:crypto'
import type { AssetRecordV1, BattleFieldDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpsertAssetCommand } from '../core/asset-commands.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
} from '../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { BattleFieldTab } from './BattleFieldTab.js'

vi.stubGlobal('Blob', NodeBlob)
vi.stubGlobal('crypto', webcrypto)

const referenceIndex = createProjectReferenceIndex(buildProjectReferenceSnapshot([]))

function field(overrides: Partial<BattleFieldDef> = {}): BattleFieldDef {
  return {
    id: 1,
    name: '云海',
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    ...overrides,
  }
}

function state(fields: BattleFieldDef[]): EditorState {
  return {
    manifest: {
      id: 'test',
      name: '测试',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: { battleFields: 'content/battle-fields.json' },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's001',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    battleFields: fields,
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
  } as unknown as EditorState
}

const stubReader = {
  readBytes: async () => new ArrayBuffer(2),
  readText: async () => '',
  readJson: async () => ({}),
  urlFor: async () => 'blob:x',
} as never

function Harness(props: { battleSession: EditSession; reader: typeof stubReader }) {
  useSyncExternalStore(
    (callback) => props.battleSession.subscribe(callback),
    () => props.battleSession.getVersion(),
  )
  const current = props.battleSession.getState()
  return (
    <BattleFieldTab
      battleFields={current.battleFields ?? []}
      assetBase={{} as never}
      session={props.battleSession}
      assetCatalog={current.assetCatalog}
      assetReader={props.reader}
      referenceIndex={referenceIndex}
      referenceStatus="current"
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
    return 1
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

async function setup(fields: BattleFieldDef[]) {
  const battleSession = new EditSession(state(fields))
  await act(async () => root.render(<Harness battleSession={battleSession} reader={stubReader} />))
  return battleSession
}

function fieldInput(label: string): HTMLInputElement {
  const labelElement = [...host.querySelectorAll('label')].find((candidate) =>
    candidate.textContent?.trim().startsWith(label),
  )
  const input = labelElement
    ? ((labelElement.htmlFor &&
        document.getElementById(labelElement.htmlFor)) as HTMLInputElement) ||
      labelElement.querySelector<HTMLInputElement>('input') ||
      labelElement.closest('.ds-field')?.querySelector<HTMLInputElement>('input')
    : null
  expect(input, label).not.toBeNull()
  return input!
}

async function typeAndBlur(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

async function chooseOption(ariaLabel: string, optionText: string): Promise<void> {
  const trigger = host.querySelector<HTMLButtonElement>(`button[aria-label="${ariaLabel}"]`)
  expect(trigger).not.toBeNull()
  await act(async () => trigger!.click())
  const option = [...document.querySelectorAll<HTMLElement>('.ds-select-option')].find(
    (candidate) => candidate.textContent?.includes(optionText),
  )
  expect(option).not.toBeNull()
  await act(async () => option!.click())
}

describe('BattleFieldTab 剩余合同', () => {
  test('background pick then clear writes and removes the asset key through real commands', async () => {
    const battleSession = await setup([field()])
    const record: AssetRecordV1 = {
      kind: 'battle-background',
      path: 'assets/runtime/bf-bg.png',
      mediaType: 'image/png',
      bytes: 4,
      sha256: 'sha-bf-bg',
      label: '云海背景',
      origin: { kind: 'authored' },
    }
    battleSession.dispatch(new UpsertAssetCommand('battle-bg.leaf.001', record, new ArrayBuffer(4)))
    await act(async () =>
      root.render(<Harness battleSession={battleSession} reader={stubReader} />),
    )

    const historyBefore = battleSession.getHistoryVersion()
    await chooseOption('战场 1 背景', '云海背景')
    expect(battleSession.getState().battleFields?.[0]?.background).toBe('battle-bg.leaf.001')
    expect(battleSession.getHistoryVersion()).toBe(historyBefore + 1)

    await chooseOption('战场 1 背景', '(无)')
    expect(battleSession.getState().battleFields?.[0]?.background).toBeUndefined()
  })

  test('element corrections commit per-key patches preserving sibling keys', async () => {
    const battleSession = await setup([field()])
    const historyBefore = battleSession.getHistoryVersion()
    await typeAndBlur(fieldInput('水'), '-3')
    const stored = battleSession.getState().battleFields?.[0]?.magicEffect
    expect(stored).toEqual({ wind: 0, thunder: 0, water: -3, fire: 0, earth: 0 })
    expect(battleSession.getHistoryVersion()).toBe(historyBefore + 1)
  })

  test('clearing the name removes the optional key and shows the placeholder', async () => {
    const battleSession = await setup([field()])
    await typeAndBlur(fieldInput('名称'), '')
    const stored = battleSession.getState().battleFields?.[0] as unknown as Record<string, unknown>
    expect(Object.hasOwn(stored, 'name')).toBe(false)
    await act(async () =>
      root.render(<Harness battleSession={battleSession} reader={stubReader} />),
    )
    expect(fieldInput('名称').placeholder).toBe('未命名战场')
  })
})
