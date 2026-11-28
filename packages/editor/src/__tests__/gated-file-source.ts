import type { FileSource } from '@type-pal/reforge'
import { deferred } from './test-promises.js'

export interface GatedFileSource {
  source: FileSource
  /** 按调用顺序记录 readBytes 进入见证（相对路径）。 */
  calls: readonly string[]
  /** 按完成顺序记录 readBytes 退出见证（相对路径；迟到读取的退出据此证实）。 */
  completed: readonly string[]
  /** 对指定路径安装共享读取闸门；返回的 deferred 放行后读取才真正落到磁盘端口。 */
  gate(path: string): ReturnType<typeof deferred<void>>
}

/** 磁盘 I/O 端口闸门：只延迟真实 readBytes 的进入，不替换 reader/解码任何核心函数。 */
export function gatedFileSource(inner: FileSource): GatedFileSource {
  const gates = new Map<string, ReturnType<typeof deferred<void>>>()
  const calls: string[] = []
  const completed: string[] = []
  const source: FileSource = {
    readText: (rel, signal) => inner.readText(rel, signal),
    readJson: (rel, signal) => inner.readJson(rel, signal),
    urlFor: (rel) => inner.urlFor(rel),
    async readBytes(rel, signal) {
      calls.push(rel)
      await gates.get(rel)?.promise
      const bytes = await inner.readBytes(rel, signal)
      completed.push(rel)
      return bytes
    },
    dispose: () => inner.dispose?.(),
  }
  return {
    source,
    calls,
    completed,
    gate(path) {
      const hold = deferred<void>()
      gates.set(path, hold)
      return hold
    },
  }
}
