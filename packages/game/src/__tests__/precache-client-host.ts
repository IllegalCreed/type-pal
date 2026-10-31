/**
 * 只实现客户端实际读取的 SW IO 端口；message 使用真实 EventTarget/MessageEvent。
 * 不是完整 ServiceWorker 环境，不注册真实 worker 或申请真实存储权限。
 */
import { vi } from 'vitest'

export interface ReadyWorkerPort {
  active: Pick<ServiceWorker, 'postMessage'> | null
}

export function createPrecacheClientTestHost() {
  let serviceWorker: PropertyDescriptor | undefined
  let storage: PropertyDescriptor | undefined
  function prepare(): void {
    serviceWorker = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker')
    storage = Object.getOwnPropertyDescriptor(navigator, 'storage')
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { persist: vi.fn<StorageManager['persist']>().mockResolvedValue(true) },
    })
  }
  function close(): void {
    if (serviceWorker) Object.defineProperty(navigator, 'serviceWorker', serviceWorker)
    else Reflect.deleteProperty(navigator, 'serviceWorker')
    if (storage) Object.defineProperty(navigator, 'storage', storage)
    else Reflect.deleteProperty(navigator, 'storage')
    vi.restoreAllMocks()
  }
  return { prepare, close }
}

export function installServiceWorker(ready?: Promise<ReadyWorkerPort>) {
  const post =
    vi.fn<(message: unknown, options?: Transferable[] | StructuredSerializeOptions) => void>()
  const worker = { postMessage: post }
  const registration: ReadyWorkerPort = { active: worker }
  const container = Object.assign(new EventTarget(), {
    register: vi
      .fn<(scriptURL: string | URL, options?: RegistrationOptions) => Promise<ReadyWorkerPort>>()
      .mockResolvedValue(registration),
    ready: ready ?? Promise.resolve(registration),
  })
  Object.defineProperty(navigator, 'serviceWorker', { value: container, configurable: true })
  return { container, post, worker }
}
