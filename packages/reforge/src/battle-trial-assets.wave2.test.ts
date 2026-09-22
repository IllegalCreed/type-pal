/**
 * TEST-NONVISUAL-COVERAGE-2 W2-B B04/B05：battle-trial-assets 冻结定位剩余臂（wave2）。
 * 既有 scripts/battle-trial-assets.test.ts 五标题已证：冻结字节副本隔离/seal 拒未缓存 IO/
 * 取消迟到不能复活/预中止零 IO/catalog bytes·sha 校验。本文件只补：
 * B04 abortableTrial 三态（同步已中止/监听后中止/正常透传）、readText/readJson 包装经冻结源
 * 取数（urlFor :88-89 已证不重测）；B05 prepare 资源预载链的可观察结果——.abortableTrial
 * 包装与 readText/readJson 的中止传播。
 */
import { describe, expect, test } from 'vitest'
import { abortableTrial, createTrialFileSnapshot } from './battle-trial-assets.js'
import type { FileSource } from './project-loader.js'

const utf8 = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer as ArrayBuffer

function memorySource(files: Record<string, string>): FileSource {
  return {
    readBytes: async (path) => {
      if (!(path in files)) throw new Error(`ENOENT ${path}`)
      return utf8(files[path]!)
    },
    readText: async (path) => files[path] ?? '',
    readJson: async <T>(path: string): Promise<T> => JSON.parse(files[path] ?? 'null') as T,
    urlFor: async () => 'blob:x',
  }
}

describe('W2-B B04 abortableTrial 三态', () => {
  test('同步已中止：promise 即刻拒绝、底层 promise 被消费不悬空', async () => {
    const controller = new AbortController()
    controller.abort()
    let settled = false
    const pending = new Promise<string>((resolve) => {
      setTimeout(() => {
        settled = true
        resolve('late')
      }, 0)
    })
    await expect(abortableTrial(pending, controller.signal)).rejects.toThrow()
    expect(settled).toBe(false) // 未等待底层
  })

  test('监听后中止：resolve 前中止即拒绝；正常 resolve 原样透传', async () => {
    const controller = new AbortController()
    const gate = new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 5))
    const wrapped = abortableTrial(gate, controller.signal)
    controller.abort()
    await expect(wrapped).rejects.toThrow()
    const fresh = abortableTrial(Promise.resolve('pass-through'), new AbortController().signal)
    await expect(fresh).resolves.toBe('pass-through')
  })
})

describe('W2-B B04 readText/readJson 经冻结源取数', () => {
  test('readText/readJson 与 readBytes 同源：缓存命中相等、seal 后未缓存读取同样拒绝', async () => {
    const snapshot = createTrialFileSnapshot(
      memorySource({ 'a.txt': 'hello', 'b.json': '{"n":7}' }),
      new AbortController().signal,
    )
    const textFirst = await snapshot.source.readText('a.txt')
    const bytesFirst = new TextDecoder().decode(await snapshot.source.readBytes('a.txt'))
    expect(textFirst).toBe('hello')
    expect(bytesFirst).toBe('hello') // 同一冻结缓存
    const json = await snapshot.source.readJson<{ n: number }>('b.json')
    expect(json).toEqual({ n: 7 })
    snapshot.seal()
    // 已缓存路径经 readText 仍可读（冻结副本）
    await expect(snapshot.source.readText('a.txt')).resolves.toBe('hello')
    // 未缓存路径经 readText 同样拒绝（包装不绕过冻结源）
    await expect(snapshot.source.readText('new.txt')).rejects.toThrow()
    await expect(snapshot.source.readJson('new.json')).rejects.toThrow()
    snapshot.dispose()
    // dispose 后一切读取拒绝
    await expect(snapshot.source.readBytes('a.txt')).rejects.toThrow()
  })

  test('readText 解码经 readBytes 中止传播（同一 signal 链）', async () => {
    const controller = new AbortController()
    let entered = false
    const gateSource: FileSource = {
      readBytes: () => {
        entered = true
        return new Promise<ArrayBuffer>(() => {}) // 挂起到底层
      },
      readText: async () => '',
      readJson: async () => ({}),
      urlFor: async () => '',
    }
    const snapshot = createTrialFileSnapshot(gateSource, controller.signal)
    const pending = snapshot.source.readText('slow.txt')
    const outcome = pending.then(
      () => 'resolved',
      (error: unknown) => (error instanceof Error ? error.name : String(error)),
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(entered).toBe(true) // 真进入底层读取
    controller.abort()
    expect(await outcome).toBe('AbortError') // 同步观察变量断言（不 await 可能不 settle 的 promise）
  })
})
