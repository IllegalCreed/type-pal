// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { shellProject } from './__tests__/runtime-shell/project.js'

vi.mock('./runnable-project-loader.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./runnable-project-loader.js')>()
  return {
    ...actual,
    loadRunnableProject: (projectId: string) => wired.loader(projectId),
  }
})

const wired = vi.hoisted(() => ({
  loader: (id: string): Promise<unknown> => {
    throw new Error(`test loader not installed (${id})`)
  },
}))

let host: ShellHost | undefined
afterEach(async () => {
  await host?.close()
  host = undefined
  wired.loader = (id: string): Promise<unknown> => {
    throw new Error(`test loader not installed (${id})`)
  }
})

test('页壳默认加载 demo 工程：真实 bootGame 进入主循环并设置标题', async () => {
  host = await installShellHost()
  const calls: string[] = []
  wired.loader = async (id) => {
    calls.push(id)
    return (await shellProject()).project
  }
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  await import('./boot.js')
  await vi.waitFor(() => expect(document.title).toBe('Shell Project · reforge'))
  expect(calls).toEqual(['demo'])
  expect(error).not.toHaveBeenCalled()
  await vi.waitFor(() => expect(host!.frames.size).toBeGreaterThan(0)) // 主循环已排帧
  await host!.frame()
  expect(host!.frames.size).toBeGreaterThan(0) // 主循环持续排帧
})

test('VITE_PROJECT_ID 覆写工程 id 并透传给加载器', async () => {
  host = await installShellHost()
  vi.stubEnv('VITE_PROJECT_ID', 'pal')
  const calls: string[] = []
  wired.loader = async (id) => {
    calls.push(id)
    return (await shellProject()).project
  }
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  await import('./boot.js')
  await vi.waitFor(() => expect(document.title).toBe('Shell Project · reforge'))
  expect(calls).toEqual(['pal'])
  // Title is set before the asynchronous boot body; await its actual RAF ownership.
  await vi.waitFor(() => expect(host!.frames.size).toBeGreaterThan(0))
  expect(error).not.toHaveBeenCalled()
})

test('加载失败：错误画屏绘制 reforge ERR 文本并 console.error，模块导入不 reject', async () => {
  host = await installShellHost()
  wired.loader = async () => {
    throw new Error('boom: no such project')
  }
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  await import('./boot.js')
  await vi.waitFor(() => expect(error).toHaveBeenCalled())
  expect(error.mock.calls[0]?.[0]).toBe('[reforge]')
  const texts = host.draws
    .filter((draw) => draw.method === 'fillText')
    .map((draw) => String(draw.args[0]))
  expect(texts).toContain('reforge ERR: boom: no such project')
  const rects = host.draws.filter((draw) => draw.method === 'fillRect')
  expect(rects.length).toBeGreaterThan(0)
})

test('加载失败且页面无画布：不绘制任何内容，仅 console.error', async () => {
  host = await installShellHost()
  document.body.replaceChildren()
  wired.loader = async () => {
    throw new Error('no canvas anywhere')
  }
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  await import('./boot.js')
  await vi.waitFor(() => expect(error).toHaveBeenCalled())
  expect(host.draws.filter((draw) => draw.method === 'fillText')).toHaveLength(0)
  expect(error.mock.calls[0]?.[0]).toBe('[reforge]')
})

test('加载失败且画布无 2d 上下文：跳过画屏，仅 console.error', async () => {
  host = await installShellHost()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  wired.loader = async () => {
    throw new Error('no ctx')
  }
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  await import('./boot.js')
  await vi.waitFor(() => expect(error).toHaveBeenCalled())
  expect(host.draws.filter((draw) => draw.method === 'fillText')).toHaveLength(0)
  expect(error.mock.calls[0]?.[0]).toBe('[reforge]')
})

test('非 Error 拒绝值按 String 序列化进错误画屏', async () => {
  host = await installShellHost()
  wired.loader = async () => {
    throw 'plain string failure'
  }
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  await import('./boot.js')
  await vi.waitFor(() => expect(error).toHaveBeenCalled())
  const texts = host.draws
    .filter((draw) => draw.method === 'fillText')
    .map((draw) => String(draw.args[0]))
  expect(texts).toContain('reforge ERR: plain string failure')
})
