/**
 * TEST-GLM-PHASE1-LEAVES-3 L22（precache-client.ts）— 去重表：
 *  - precache-client.test（PROD 门/注册参数/无 SW 降级/onReady/start 早于 ready 缓冲补发/
 *    register 抛错）→ 不重复
 *  - 新差异：pause/resume 早于 SW ready → 静默丢弃不缓存不补发（只有 start 缓冲）、
 *    ready 后 start/pause/resume 的消息协议载荷顺序。
 * 所有 SW/storage 硬件端口隔离：fake ServiceWorkerContainer + MessagePort 桩，
 * 不注册真实 SW、不清浏览器缓存、不请求持久权限。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  pausePrecache,
  registerPrecache,
  resumePrecache,
  startPrecache,
} from './precache-client.js'

type Msg = { type: string }
const posted: Msg[] = []

function installFakeSw(): void {
  const worker = {
    postMessage: vi.fn((m: Msg) => posted.push(m)),
  }
  const container = {
    register: vi.fn(async () => ({
      active: worker,
      postMessage: (m: Msg) => worker.postMessage(m),
    })),
    addEventListener: vi.fn(),
    ready: Promise.resolve({ active: worker }),
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  })
}

function removeFakeSw(): void {
  delete (navigator as { serviceWorker?: unknown }).serviceWorker
}

afterEach(() => {
  posted.length = 0
  removeFakeSw()
  vi.restoreAllMocks()
})

describe('L22 precache-client 早到指令', () => {
  it('pause/resume 早于 ready：静默丢弃（不缓冲不补发）；start 早到才缓冲补发', async () => {
    pausePrecache() // 无 SW → no-op
    resumePrecache() // 无 SW → no-op
    startPrecache() // 缓冲
    installFakeSw()
    await registerPrecache({ isProd: true, onProgress: () => {}, onReady: () => {} })
    // 只有 start 被补发；pause/resume 不补发
    expect(posted).toEqual([{ type: 'precache' }])
  })

  it('ready 后 start/pause/resume 依次按协议载荷直达 worker', async () => {
    installFakeSw()
    await registerPrecache({ isProd: true, onProgress: () => {}, onReady: () => {} })
    startPrecache()
    pausePrecache()
    resumePrecache()
    expect(posted).toEqual([
      { type: 'precache' },
      { type: 'precache-pause' },
      { type: 'precache-resume' },
    ])
  })
})
