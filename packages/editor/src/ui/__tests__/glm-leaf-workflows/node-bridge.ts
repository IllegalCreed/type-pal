/**
 * Node 测试宿主桥（硬件端口替身，白名单 fixture）：jsdom 环境的 Blob 缺
 * stream()（gzip 编解码需要）、缺 webcrypto。经 vi.stubGlobal 注入 Node 的
 * 标准实现。动态 import 字符串变量以保持 editor DOM-only 类型环境不被扩张。
 * 仅测试导入，不进生产。
 */
import { vi } from 'vitest'

/** 注入 Node Blob 与 webcrypto；测试结束由 vi.unstubAllGlobals 释放。 */
export async function stubNodeTestHost(): Promise<void> {
  const nodeBufferModule = 'node:buffer'
  const nodeCryptoModule = 'node:crypto'
  const buffer = (await import(nodeBufferModule)) as { Blob: typeof Blob }
  const webcryptoModule = (await import(nodeCryptoModule)) as { webcrypto: typeof crypto }
  vi.stubGlobal('Blob', buffer.Blob)
  vi.stubGlobal('crypto', webcryptoModule.webcrypto)
}
