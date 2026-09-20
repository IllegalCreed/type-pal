/**
 * TEST-REFORGE-ASSET-IO-1 B9：FSA 逐 await 取消门（fsa-source.ts）。
 * fsa-source.test.ts 已覆盖目录遍历/ArrayBuffer/urlFor 缓存/越界/缺文件/预取消——不重复；
 * 本文件补：取消发生在各 await 之后、下一 IO 开始之前（中间门），证取消后后续 IO 没有开始。
 * 内存目录句柄双替身逐段记录访问序；HTTP 无此类门，两宿主分开不混用 oracle。
 */
import { describe, expect, test } from 'vitest'
import { fsaSource } from './fsa-source.js'

interface HandleLog {
  ops: string[]
}

/** 内存目录句柄：dir/a/b.json 结构；每个 await 后记录 op。 */
function makeDir(log: HandleLog) {
  const file = {
    async text() {
      log.ops.push('file.text')
      return '{"ok":true}'
    },
    async arrayBuffer() {
      log.ops.push('file.bytes')
      return new ArrayBuffer(4)
    },
  }
  const fileHandle = {
    async getFile() {
      log.ops.push('getFile')
      return file
    },
  }
  const innerDir = {
    async getDirectoryHandle(name: string) {
      log.ops.push(`dir:${name}`)
      if (name === 'a') return innerDir
      throw new Error('not found')
    },
    async getFileHandle(name: string) {
      log.ops.push(`file:${name}`)
      return fileHandle
    },
  }
  const root = {
    async getDirectoryHandle(name: string) {
      log.ops.push(`dir:${name}`)
      if (name === 'a') return innerDir
      throw new Error('not found')
    },
  }
  return root as FileSystemDirectoryHandle
}

describe('B9 FSA 逐 await 取消门（进入见证 + 中止点 + 后续 IO 零开始）', () => {
  test('目录段之后、文件段之前取消 → AbortError 且文件段 IO 未开始（可控门见证）', async () => {
    const log: HandleLog = { ops: [] }
    let releaseDir!: () => void
    const dirGate = new Promise<void>((resolve) => {
      releaseDir = resolve
    })
    const file = {
      async text() {
        log.ops.push('file.text')
        return '{}'
      },
      async arrayBuffer() {
        log.ops.push('file.bytes')
        return new ArrayBuffer(4)
      },
    }
    const fileHandle = {
      async getFile() {
        log.ops.push('getFile')
        return file
      },
    }
    const root = {
      async getDirectoryHandle(name: string) {
        log.ops.push(`dir:${name}`)
        await dirGate // 目录段挂起（可释放门 = 真实进入见证）
        return {
          async getFileHandle(fn: string) {
            log.ops.push(`file:${fn}`)
            return fileHandle
          },
        }
      },
    }
    const source = fsaSource(root as unknown as FileSystemDirectoryHandle)
    const controller = new AbortController()
    const settled = source.readText('a/b.json', controller.signal)
    const observed = { outcome: 'pending' }
    void settled.then(
      () => {
        observed.outcome = 'fulfilled'
      },
      (error: unknown) => {
        observed.outcome = (error as Error).name
      },
    )
    await Promise.resolve()
    controller.abort() // 目录段挂起期间取消
    await Promise.resolve()
    await Promise.resolve()
    expect(observed.outcome).toBe('pending') // 取消不被目录挂起吞掉：外层尚未结束
    releaseDir() // 放行目录段 → throwIfAborted 在文件段之前拦截
    const outcome = await settled.then(
      () => 'fulfilled',
      (error: unknown) => (error as Error).name,
    )
    expect(outcome).toBe('AbortError')
    expect(log.ops).toEqual(['dir:a']) // 文件段零开始
  })
  test('预取消 signal：任何目录访问之前即拒（零 IO 见证）', async () => {
    const log: HandleLog = { ops: [] }
    const source = fsaSource(makeDir(log))
    const controller = new AbortController()
    controller.abort()
    await expect(source.readJson('a/b.json', controller.signal)).rejects.toThrow()
    expect(log.ops).toEqual([]) // 零句柄访问
  })
  test('readJson 的 JSON 解析错误透传（text 已成功读取后；坏 JSON 真实到达解析器）', async () => {
    const log: HandleLog = { ops: [] }
    // text 真实返回坏 JSON：readText 原样成功，readJson 拒绝且错误名为 SyntaxError
    const file = {
      async text() {
        log.ops.push('file.text')
        return '{bad'
      },
      async arrayBuffer() {
        log.ops.push('file.bytes')
        return new ArrayBuffer(4)
      },
    }
    const fileHandle = {
      async getFile() {
        log.ops.push('getFile')
        return file
      },
    }
    const innerDir = {
      async getDirectoryHandle(name: string) {
        log.ops.push(`dir:${name}`)
        if (name === 'a') return innerDir
        throw new Error('not found')
      },
      async getFileHandle(name: string) {
        log.ops.push(`file:${name}`)
        return fileHandle
      },
    }
    const badDir = {
      async getDirectoryHandle(name: string) {
        log.ops.push(`dir:${name}`)
        if (name === 'a') return innerDir
        throw new Error('not found')
      },
    } as unknown as FileSystemDirectoryHandle
    const source = fsaSource(badDir)
    await expect(source.readText('a/b.json')).resolves.toBe('{bad') // 文本层原样透传
    const outcome = await source.readJson('a/b.json').then(
      () => 'fulfilled',
      (error: unknown) => (error as Error).name,
    )
    expect(outcome).toBe('SyntaxError') // 解析错误不被吞（值形式拒绝见证）
    expect(log.ops).toEqual([
      'dir:a',
      'file:b.json',
      'getFile',
      'file.text',
      'dir:a',
      'file:b.json',
      'getFile',
      'file.text',
    ])
  })
})
