// @vitest-environment jsdom

import type { BattleTrialConfig, FileSource } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { AuthorDiskBaseline } from '../core/author-disk-baseline.js'
import type { BattleSimulatorDraft } from '../core/battle-simulator-state.js'
import type { EditSession } from '../core/edit-session.js'
import type { ProjectLeaveGuard } from '../core/project-leave-guard.js'
import type { ScriptEditSession } from '../core/script-editor.js'
import { type BattleTrialSession, useBattleTrialSession } from './use-battle-trial-session.js'

interface LaunchOptions {
  assertCanLaunch(): void | Promise<void>
  onResult?(result: string): void
  onClosed?(): void
}

const trialMock = vi.hoisted(() => ({
  launches: [] as Array<{
    options: LaunchOptions
    handle: { ready: Promise<void>; close: ReturnType<typeof vi.fn<() => void>> }
  }>,
}))
const verifyBaseline = vi.hoisted(() => vi.fn(async () => undefined))

vi.mock('../core/author-disk-baseline.js', () => ({
  verifySourceAuthorBaseline: verifyBaseline,
}))
vi.mock('../core/battle-trial-launch.js', () => ({
  launchBattleTrial: vi.fn((options: LaunchOptions) => {
    const handle = {
      ready: Promise.resolve(),
      close: vi.fn(() => options.onClosed?.()),
    }
    trialMock.launches.push({ options, handle })
    return handle
  }),
}))

const config: BattleTrialConfig = {
  party: { members: [] },
  enemies: { kind: 'slots', slots: [null, null, null, null, null] },
  bag: { items: [] },
  fieldId: 1,
  music: { kind: 'default' },
  money: 0,
  auto: false,
  boss: false,
}
const changedDraft: BattleSimulatorDraft = {
  label: '本场临时方案',
  changed: true,
  plan: {
    ...config,
    party: { kind: 'inline', config: config.party },
    enemies: { kind: 'inline', config: config.enemies },
    bag: { kind: 'inline', config: config.bag },
    overrides: {},
  },
}
const source: FileSource = {
  readText: vi.fn(async () => ''),
  async readJson<T>() {
    return {} as T
  },
  readBytes: vi.fn(async () => new ArrayBuffer(0)),
  urlFor: vi.fn(async () => 'about:blank'),
}

let root: Root | undefined
let host: HTMLDivElement | undefined
let current: BattleTrialSession | undefined
let state: object
let mainDirty: boolean
let scriptDirty: boolean
let scriptVersion: number
let blocked: boolean
let result: ReturnType<typeof vi.fn<(value: string) => void>>

function Harness() {
  const main = {
    getState: () => state,
    isDirty: () => mainDirty,
  } as unknown as EditSession
  const script = {
    getVersion: () => scriptVersion,
    isDirty: () => scriptDirty,
  } as unknown as ScriptEditSession
  const projectGuard = { blocked: () => blocked } as unknown as ProjectLeaveGuard
  current = useBattleTrialSession({
    main,
    script,
    projectGuard,
    projectSource: source,
    playIdentity: { projectId: 'project-a', workspaceId: 'workspace-a', source: 'http' },
    getLocalDirectory: () => null,
    getAuthorBaseline: () => ({}) as AuthorDiskBaseline,
    onResult: result,
  })
  return <output>{current.discardPending ? 'discard' : 'ready'}</output>
}

async function render(): Promise<void> {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<Harness />))
}

function unload(): boolean {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

async function rejectionMessage(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  current = undefined
  state = {}
  mainDirty = false
  scriptDirty = false
  scriptVersion = 1
  blocked = false
  result = vi.fn()
  trialMock.launches.length = 0
  verifyBaseline.mockClear()
})

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  host?.remove()
  root = undefined
  host = undefined
  vi.clearAllMocks()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false
})

describe('battle trial session ownership', () => {
  test('changed temporary configuration owns beforeunload and explicit discard continuation', async () => {
    await render()
    expect(unload()).toBe(false)
    await act(async () => current!.setDraft(changedDraft))
    expect(unload()).toBe(true)

    const continuation = vi.fn()
    await act(async () => current!.requestDiscard(continuation))
    expect(current!.discardPending).toBe(true)
    await act(async () => current!.cancelDiscard())
    expect(continuation).not.toHaveBeenCalled()
    await act(async () => current!.requestDiscard(continuation))
    await act(async () => current!.confirmDiscard())
    expect(continuation).toHaveBeenCalledOnce()
    expect(current!.discardPending).toBe(false)

    await act(async () => current!.setDraft({ ...changedDraft, changed: false }))
    const immediate = vi.fn()
    await act(async () => current!.requestDiscard(immediate))
    expect(immediate).toHaveBeenCalledOnce()
    expect(current!.discardPending).toBe(false)
  })

  test('launch owns one popup, revalidates the captured editor revision and forwards results', async () => {
    await render()
    await act(async () => current!.start(config))
    expect(trialMock.launches).toHaveLength(1)
    const launch = trialMock.launches[0]
    expect(launch).toBeDefined()
    if (!launch) throw new Error('missing launch')
    const { options, handle } = launch
    await expect(options.assertCanLaunch()).resolves.toBeUndefined()
    expect(verifyBaseline).toHaveBeenCalledOnce()
    options.onResult?.('胜利')
    expect(result).toHaveBeenCalledExactlyOnceWith('胜利')
    expect(await rejectionMessage(current!.start(config))).toContain('已有独立试打窗口')

    state = {}
    expect(await rejectionMessage(Promise.resolve(options.assertCanLaunch()))).toContain(
      '项目状态已变化',
    )
    handle.close()
    await act(async () => current!.start(config))
    expect(trialMock.launches).toHaveLength(2)
  })

  test('dirty or blocked launch is rejected before popup creation and unmount closes owned windows', async () => {
    await render()
    mainDirty = true
    expect(await rejectionMessage(current!.start(config))).toContain('请先保存项目')
    blocked = true
    mainDirty = false
    expect(await rejectionMessage(current!.start(config))).toContain('请先保存项目')
    blocked = false
    await act(async () => current!.start(config))
    const handle = trialMock.launches[0]!.handle
    await act(async () => root!.unmount())
    root = undefined
    expect(handle.close).toHaveBeenCalledOnce()
    trialMock.launches[0]!.options.onResult?.('迟到结果')
    expect(result).not.toHaveBeenCalled()
    expect(unload()).toBe(false)
  })
})
