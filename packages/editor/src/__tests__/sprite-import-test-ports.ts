/** Delay selected hardware/asset operations while preserving their real codec and byte paths. */

import type { AssetBase } from '@type-pal/reforge'
import * as reforge from '@type-pal/reforge'
import { vi } from 'vitest'
import { installBrowserHardwarePorts } from './bitmap-test-port.js'
import { type Deferred, deferred } from './test-promises.js'

export interface GatedBitmapPort {
  /** 扣留指定文件名的 createImageBitmap；放行后才完成真实解码。 */
  gate(name: string): Deferred<void>
  /** 按进入顺序记录文件名。 */
  started: string[]
  /** 按完成顺序记录真实解码已落地的文件名（成功才计）。 */
  decoded: string[]
  /** 位图 close() 调用见证（按文件名累计次数）。 */
  closes(name: string): number
}

export function installGatedBitmapPort(): GatedBitmapPort {
  installBrowserHardwarePorts()
  const decode = globalThis.createImageBitmap
  const holds = new Map<string, Deferred<void>>()
  const started: string[] = []
  const decoded: string[] = []
  const closeCounts = new Map<string, number>()
  vi.stubGlobal('createImageBitmap', async (source: ImageBitmapSource) => {
    const name = source instanceof File ? source.name : '<blob>'
    started.push(name)
    await holds.get(name)?.promise
    const image = await decode(source)
    const closeImage = image.close.bind(image)
    decoded.push(name)
    Object.defineProperty(image, 'close', {
      configurable: true,
      value: () => {
        closeCounts.set(name, (closeCounts.get(name) ?? 0) + 1)
        closeImage()
      },
    })
    return image
  })
  return {
    gate(name) {
      const hold = deferred<void>()
      holds.set(name, hold)
      return hold
    },
    started,
    decoded,
    closes: (name) => closeCounts.get(name) ?? 0,
  }
}

/** 色盘 I/O 闸门：返回新 AssetBase，仅 readRoleText 被扣留；其余能力沿用真实 resolver/source。 */
export function gatePalette(base: AssetBase): { assetBase: AssetBase; hold: Deferred<void> } {
  const hold = deferred<void>()
  const resolver = Object.create(base.assetResolver, {
    readRoleText: {
      value: async (role: Parameters<typeof base.assetResolver.readRoleText>[0]) => {
        await hold.promise
        return base.assetResolver.readRoleText(role)
      },
    },
  }) as AssetBase['assetResolver']
  return { assetBase: { source: base.source, assetResolver: resolver }, hold }
}

/** 色盘读取直接失败（真实 I/O 错误路径）。 */
export function failingPalette(base: AssetBase, message: string): AssetBase {
  const resolver = Object.create(base.assetResolver, {
    readRoleText: {
      value: async () => {
        throw new Error(message)
      },
    },
  }) as AssetBase['assetResolver']
  return { source: base.source, assetResolver: resolver }
}

/** 只扣留 compressGzip 异步；量化/编码仍走真实实现。 */
export interface GatedCompressPort {
  hold: Deferred<void>
  calls: number
  /** Release and settle actual gzip/SHA work; UI tests call this inside act in finally. */
  drain(): Promise<void>
  restore(): void
}

export function installGatedCompressPort(): GatedCompressPort {
  const hold = deferred<void>()
  let calls = 0
  const original = reforge.compressGzip.bind(reforge)
  const reads: ReturnType<typeof reforge.compressGzip>[] = []
  const digest = vi.spyOn(crypto.subtle, 'digest')
  const spy = vi.spyOn(reforge, 'compressGzip').mockImplementation((input) => {
    calls += 1
    const pending = hold.promise.then(() => original(input))
    reads.push(pending)
    return pending
  })
  return {
    hold,
    get calls() {
      return calls
    },
    async drain() {
      hold.resolve()
      await Promise.allSettled(reads)
      // Submit starts its real SHA after gzip. No substitute hash or extra IO is run.
      await Promise.allSettled(
        digest.mock.results.flatMap((result) => (result.type === 'return' ? [result.value] : [])),
      )
    },
    restore() {
      try {
        spy.mockRestore()
      } finally {
        digest.mockRestore()
      }
    },
  }
}
