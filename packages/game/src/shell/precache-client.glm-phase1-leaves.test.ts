/**
 * L22 保留 early pause/resume 不缓冲的负控。
 * ready 后协议载荷顺序移到 precache-client.test 的 onReady 合同；start 的缓冲另有受控 ready 测试。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  installPrecacheClientTestHooks,
  installServiceWorker,
} from '../__tests__/precache-client-host.js'

installPrecacheClientTestHooks()
let client: typeof import('./precache-client.js')
beforeEach(async () => {
  vi.resetModules()
  client = await import('./precache-client.js')
})

describe('L22 precache-client 早到指令', () => {
  it('pause/resume 早于 ready：静默丢弃，不缓冲也不补发', async () => {
    client.pausePrecache()
    client.resumePrecache()
    const { post } = installServiceWorker()
    await client.registerPrecache({ isProd: true, onProgress: () => {} })
    expect(post.mock.calls).toEqual([])
  })
})
