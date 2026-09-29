// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-F-1 F05：battle-trial-launch 端到端端口保真与失败释放。
 * 去重：scripts/battle-trial-launch.test.ts 八例已证传输本体（nonce/restart/双端身份/abort），
 * use-battle-trial-session.test.tsx 三例以 mock launch 证会话所有权；BattleSimulatorWorkbench
 * 十例的 start 一律 vi.fn。本文件只补其间空隙：真实 hook 驱动真实 launchBattleTrial——
 * 显式配置经真实 admission（基线校验/项目重载/revision）到达端口后逐字段保真、
 * ack 才 resolve；弹窗被拒后槽位释放可重试；卸载在 ack 前中断 → abort 投递 + AbortError。
 * 唯一替身：弹窗用同源 iframe 的真实 Window（postMessage 覆写为记录器，不伪造业务结果），
 * MessageChannel 用 Node 原生通道（与旧传输测试同一端口替身）。
 */
import type { BattleTrialConfig } from '@type-pal/reforge'
import { battleTrialRevision, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { useActEnvironment } from '../ui/__tests__/glm-ui-wave-kit.js'
import { type BattleTrialSession, useBattleTrialSession } from '../ui/use-battle-trial-session.js'
import { battleTrialProjectFiles, fixtureSource } from './__tests__/battle-trial-project.js'
import { observeAuthorSource } from './author-disk-baseline.js'
import {
  parseBattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
} from './battle-simulator-library.js'
import { parseBattleTrialLocation } from './battle-trial-launch.js'
import { EditSession } from './edit-session.js'
import { toEditorState } from './project-io.js'
import { ProjectLeaveGuard } from './project-leave-guard.js'
import { ScriptEditSession } from './script-editor.js'

const origin = window.location.origin

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

let project: Awaited<ReturnType<typeof loadCurrentProjectFrom>>
let capturingSource: ReturnType<typeof observeAuthorSource>['source']
let baseline: Awaited<ReturnType<ReturnType<typeof observeAuthorSource>['finish']>>
let main: EditSession
let script: ScriptEditSession
let guard: ProjectLeaveGuard
let identity: { projectId: string; workspaceId: string; source: 'http' }
let config: BattleTrialConfig

beforeAll(async () => {
  // Node test-host bridge：blank seed 的 gzip 依赖 Node Blob.stream（jsdom 的 Blob 缺该能力）。
  const { installBrowserHardwarePorts } = await import(
    '../ui/__tests__/kimi-editor-workflows/kit.js'
  )
  installBrowserHardwarePorts()
  const files = await battleTrialProjectFiles()
  const observed = observeAuthorSource(fixtureSource(files))
  project = await loadCurrentProjectFrom(observed.source)
  baseline = await observed.finish(project)
  capturingSource = observed.source
  const scenes = await loadAllAuthorScenes(project)
  main = new EditSession(toEditorState(project, scenes, {}, {}, []))
  script = new ScriptEditSession({
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  })
  guard = new ProjectLeaveGuard(main, script)
  // App 挂载时连接守卫；未连接的守卫 blocked() 恒真，试打会被拒绝。
  guard.connect()
  identity = {
    projectId: project.manifest.id,
    workspaceId: '11111111-1111-4111-8111-111111111111',
    source: 'http',
  }
  config = resolveBattleSimulatorPlan(
    parseBattleSimulatorLibrary(files['editor/battle-simulator.json']),
    'basic',
  )
})

let host: HTMLDivElement
let root: Root
let latest: BattleTrialSession | undefined

function Harness() {
  latest = useBattleTrialSession({
    main,
    script,
    projectGuard: guard,
    projectSource: capturingSource,
    playIdentity: identity,
    getLocalDirectory: () => null,
    getAuthorBaseline: () => baseline,
    onResult: () => undefined,
  })
  return <output>trial-session</output>
}

async function mount(): Promise<void> {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root.render(<Harness />))
}

/** MessagePort 的鸭子类型窄化（环境全局通道端口在运行期满足此形状）。 */
interface TrialPort {
  postMessage(message: unknown): void
  onmessage: ((event: { data: unknown }) => void) | null
}

interface CapturedPost {
  data: Record<string, unknown>
  port: TrialPort | undefined
}

/**
 * 弹窗替身：同源 iframe 的真实 Window（window.open 类型吻合，无强转）；
 * postMessage 覆写为同步记录器，端口按引用捕获（不真正投递，ack 由测试手动回）。
 */
function popup(): { child: Window; posts: CapturedPost[]; open: ReturnType<typeof vi.spyOn> } {
  const frame = document.createElement('iframe')
  frame.style.display = 'none'
  document.body.append(frame)
  const child = frame.contentWindow!
  const posts: CapturedPost[] = []
  const recordPost = (message: unknown, targetOrigin: string, transfer?: Transferable[]): void => {
    expect(targetOrigin).toBe(origin)
    const candidate = transfer?.[0]
    posts.push({
      data: asRecord(message),
      port:
        candidate && typeof (candidate as TrialPort).postMessage === 'function'
          ? (candidate as TrialPort)
          : undefined,
    })
  }
  ;(child as { postMessage: typeof recordPost }).postMessage = recordPost
  const open = vi.spyOn(window, 'open').mockImplementation(() => child)
  return { child, posts, open }
}

function sendFromChild(child: Window, data: unknown): void {
  const event = new MessageEvent('message', { data, origin })
  Object.defineProperties(event, { source: { value: child } })
  window.dispatchEvent(event)
}

function launchedId(open: { mock: { calls: unknown[][] } }): string {
  const url = new URL(String(open.mock.calls[0]![0]), origin)
  return parseBattleTrialLocation(url.searchParams)!.launchId
}

function configPost(posts: readonly CapturedPost[]): CapturedPost {
  const hit = posts.find((post) => post.data.kind === 'config')
  expect(hit, 'config packet').toBeDefined()
  return hit!
}

async function fullHandshake(
  child: Window,
  posts: readonly CapturedPost[],
  open: { mock: { calls: unknown[][] } },
): Promise<void> {
  sendFromChild(child, {
    protocol: 'type-pal-battle-trial',
    kind: 'ready',
    launchId: launchedId(open),
  })
  await vi.waitFor(() => expect(posts.some((post) => post.data.kind === 'config')).toBe(true))
}

beforeEach(() => {
  useActEnvironment()
})

afterEach(async () => {
  await act(async () => root?.unmount())
  host?.remove()
  vi.restoreAllMocks()
})

describe('F05 battle-trial-launch 端到端端口保真与失败释放', () => {
  test('显式配置经真实 admission 到达端口逐字段保真，ack 后 start 才完成', async () => {
    await mount()
    const { child, posts, open } = popup()
    const started = latest!.start(config)
    await fullHandshake(child, posts, open)
    const received = configPost(posts)
    const packet = asRecord(received.data.packet)
    // URL 只携带身份三元组，配置永不过 URL。
    expect([...new URL(String(open.mock.calls[0]![0]), origin).searchParams.keys()]).toEqual([
      'project',
      'save-workspace',
      'battle-trial',
    ])
    expect(packet.launchId).toBe(launchedId(open))
    expect(packet.identity).toEqual(identity)
    expect(packet.config).toEqual(config)
    expect(packet.revision).toMatch(/^[a-f0-9]{64}$/)
    expect(packet.revision).toBe(await battleTrialRevision(project))
    expect(packet.sourceToken).toEqual(expect.any(String))
    // 未 ack 前 start 未完成；ack 后才 resolve。
    await Promise.resolve()
    expect(
      await Promise.race([
        started.then(() => 'done' as const),
        Promise.resolve('pending' as const),
      ]),
    ).toBe('pending')
    received.port!.postMessage({ kind: 'ack' })
    await expect(started).resolves.toBeUndefined()
  })

  test('弹窗被拒即失败并释放独占槽位，随后完整握手仍可成功', async () => {
    await mount()
    const blocked = vi.spyOn(window, 'open').mockImplementation(() => null)
    await expect(latest!.start(config)).rejects.toThrow('浏览器阻止了试玩窗口，请允许弹窗后重试')
    blocked.mockRestore()
    // 失败尝试未占用独占槽位：同一会话可再次发起并完成完整握手。
    const { child, posts, open } = popup()
    const started = latest!.start(config)
    await fullHandshake(child, posts, open)
    configPost(posts).port!.postMessage({ kind: 'ack' })
    await expect(started).resolves.toBeUndefined()
  })

  test('ack 前卸载编辑器：abort 投递到端口，start 以 AbortError 拒绝', async () => {
    await mount()
    const { child, posts, open } = popup()
    // 立即挂上处理器：超时/卸载路径的拒绝不得成为未处理拒绝。
    const outcome: Promise<unknown> = latest!.start(config).then(
      () => 'done',
      (error: unknown) => error,
    )
    await fullHandshake(child, posts, open)
    const received = configPost(posts)
    const aborted = new Promise<string>((resolve) => {
      const port = received.port
      if (!port) throw new Error('config packet 缺端口')
      port.onmessage = (event) => resolve(String(asRecord(event.data).kind))
    })
    await act(async () => root.unmount())
    expect(await aborted).toBe('abort')
    const failure = await outcome
    expect((failure as { name?: string }).name).toBe('AbortError')
    expect((failure as Error).message).toBe('试打已关闭')
  })
})
