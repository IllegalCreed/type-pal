// @vitest-environment jsdom
// Q02 · runnable-project-loader 合同（排重：旧测 0 命中，全源新覆盖）。
// 只测公开版本门与 httpSource 接线；工程加载本体由 project-loader 旧测负责。
import { CONTENT_VERSION } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import { loadRunnableProjectFrom } from './runnable-project-loader.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test('Q02 版本门：过期 contentVersion 带工程名精确拒绝', async () => {
  host = await installShellHost()
  const fixture = await shellProject()
  const files = new Map<string, unknown>(Object.entries(fixture.files))
  const source = {
    async readJson<T>(rel: string): Promise<T> {
      const value = files.get(rel)
      if (value === undefined) throw new Error(`missing ${rel}`)
      return structuredClone(value) as T
    },
    async readText(rel: string): Promise<string> {
      return JSON.stringify(files.get(rel))
    },
    async readBytes(rel: string): Promise<ArrayBuffer> {
      const value = files.get(rel)
      if (value === undefined) throw new Error(`missing ${rel}`)
      return new TextEncoder().encode(JSON.stringify(value)).buffer as ArrayBuffer
    },
    async urlFor(rel: string): Promise<string> {
      return `https://fixture.invalid/${rel}`
    },
  }
  const stale = files.get('manifest.json') as { contentVersion: number }
  stale.contentVersion = CONTENT_VERSION - 1
  await expect(loadRunnableProjectFrom(source)).rejects.toThrow(
    `工程 "shell-project": runtime 只接受当前 contentVersion ${CONTENT_VERSION}，收到 ${CONTENT_VERSION - 1}`,
  )
})

test('Q02 版本门：manifest.id 非字符串时回退匿名校验消息', async () => {
  host = await installShellHost()
  const source = {
    async readJson<T>(): Promise<T> {
      return { id: 42, contentVersion: CONTENT_VERSION - 7 } as T
    },
    async readText(): Promise<string> {
      throw new Error('not used')
    },
    async readBytes(): Promise<ArrayBuffer> {
      throw new Error('not used')
    },
    async urlFor(rel: string): Promise<string> {
      return `https://fixture.invalid/${rel}`
    },
  }
  await expect(loadRunnableProjectFrom(source)).rejects.toThrow(
    `工程: runtime 只接受当前 contentVersion ${CONTENT_VERSION}，收到 ${CONTENT_VERSION - 7}`,
  )
})

test('Q02 版本匹配：透传正式 loader 装出完整当前工程', async () => {
  host = await installShellHost()
  const fixture = await shellProject()
  const project = await loadRunnableProjectFrom(fixture.source)
  expect(project.manifest.contentVersion).toBe(CONTENT_VERSION)
  expect(project.manifest.id).toBe('shell-project')
  expect(Object.keys(project.actorsById)).toEqual(expect.arrayContaining(['hero', 'friend']))
})

test('Q02 loadRunnableProject 经 httpSource 请求 projects/<id>/manifest.json', async () => {
  host = await installShellHost()
  const urls: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input))
      return new Response(JSON.stringify({ id: 'demo', contentVersion: CONTENT_VERSION - 1 }), {
        status: 200,
      })
    }),
  )
  const { loadRunnableProject } = await import('./runnable-project-loader.js')
  await expect(loadRunnableProject('demo')).rejects.toThrow(
    `工程 "demo": runtime 只接受当前 contentVersion ${CONTENT_VERSION}，收到 ${CONTENT_VERSION - 1}`,
  )
  expect(urls).toEqual(['projects/demo/manifest.json'])
})
