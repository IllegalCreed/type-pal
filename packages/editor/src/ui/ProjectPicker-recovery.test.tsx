// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

const host = vi.hoisted(() => ({ open: vi.fn(), pick: vi.fn(), recent: vi.fn(), clone: vi.fn() }))
vi.mock('../core/file-system-access.js', () => ({
  currentDirectoryPickerAvailability: () => ({ available: true }),
}))
vi.mock('../core/open-actions.js', async (original) => ({
  ...(await original<typeof import('../core/open-actions.js')>()),
  finishOpen: host.open,
  pickDir: host.pick,
  newFromPal: host.clone,
}))
vi.mock('../core/handle-store.js', async (original) => ({
  ...(await original<typeof import('../core/handle-store.js')>()),
  listRecentWorkspaces: async () => [
    { workspaceId: 'w', projectId: 'p', name: '测试项目', mode: 'local-project' },
  ],
  loadWorkspaceRecord: host.recent,
  ensurePermission: async () => 'granted',
}))

import { ProjectPicker } from './ProjectPicker.js'

let root: Root, container: HTMLDivElement
beforeEach(() => {
  host.open.mockReset()
  host.clone.mockReset()
  host.pick.mockResolvedValue({ name: 'test-dir' })
  host.recent.mockResolvedValue({ workspaceId: 'w', handle: { name: 'test-dir' } })
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
})
afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})
function button(label: string) {
  const result = [...container.querySelectorAll('button')].find(
    (b) =>
      b.textContent?.startsWith(label) ||
      b.querySelector('.picker-recent-name')?.textContent === label,
  )
  if (!result) throw Error(`missing button ${label}`)
  return result
}

test.each([
  '打开项目',
  '测试项目',
])('恢复中撤权在%s显示重新授权指引，下一次打开可成功', async (entry) => {
  const opened = vi.fn()
  let reject!: (reason: unknown) => void
  host.open.mockImplementation(async (_dir, options) => {
    options.onRecovering()
    return new Promise((_resolve, fail) => {
      reject = fail
    })
  })
  await act(async () => root.render(<ProjectPicker onOpened={opened} />))
  await act(async () => button(entry).click())
  expect(container.textContent).toContain('正在完成上次保存')
  await act(async () => reject(new DOMException('native permission error', 'NotAllowedError')))
  expect(container.textContent).toContain(
    '目录访问权限已失效。请重新授权后打开原文件夹，确认保存结果或继续恢复。',
  )
  expect(container.textContent).not.toContain('恢复已停止，恢复数据仍保留')
  expect(container.textContent).not.toContain('native permission error')
  expect(opened).not.toHaveBeenCalled()
  expect(button('打开项目').disabled).toBe(false)
  const result = { project: {} }
  host.open.mockResolvedValueOnce(result)
  await act(async () => button('打开项目').click())
  expect(opened).toHaveBeenCalledWith(result)
  expect(container.textContent).not.toContain('目录访问权限已失效')
})

test('非权限恢复失败保留原原因；下一次未进入恢复的权限错误不冒称存在恢复数据', async () => {
  host.open.mockImplementationOnce(async (_dir, options) => {
    options.onRecovering()
    throw Error('项目恢复冲突：content/actors.json')
  })
  await act(async () => root.render(<ProjectPicker onOpened={vi.fn()} />))
  await act(async () => button('打开项目').click())
  expect(container.textContent).toContain('项目恢复冲突：content/actors.json')
  host.open.mockRejectedValueOnce(new DOMException('ordinary denied', 'NotAllowedError'))
  await act(async () => button('打开项目').click())
  expect(container.textContent).toContain('ordinary denied')
  expect(container.textContent).not.toContain('恢复数据仍保留')
})

test('目录选择取消仍静默返回，不进入恢复或误报权限故障', async () => {
  host.pick.mockResolvedValueOnce(null)
  const opened = vi.fn()
  await act(async () => root.render(<ProjectPicker onOpened={opened} />))
  await act(async () => button('打开项目').click())
  expect(host.open).not.toHaveBeenCalled()
  expect(opened).not.toHaveBeenCalled()
  expect(container.querySelector('.picker-err')).toBeNull()
})

test('大项目克隆先显示准备再显示写入，失败后恢复操作且下一次成功不残留进度', async () => {
  let progress!: (done: number, total: number, phase: 'preparing' | 'writing') => void
  let fail!: (error: Error) => void
  host.clone.mockImplementation((_source, notify) => {
    progress = notify
    return new Promise((_resolve, reject) => {
      fail = reject
    })
  })
  const opened = vi.fn()
  await act(async () => root.render(<ProjectPicker onOpened={opened} seedBaseUrl="projects/pal" />))
  await act(async () => button('从 PAL').click())
  expect(host.clone.mock.calls[0]?.[0]).toBe('projects/pal')
  await act(async () => progress(2 * 1024 * 1024, 8 * 1024 * 1024, 'preparing'))
  expect(container.textContent).toContain('准备保存 · 25% · 2.0/8.0 MB')
  expect(container.querySelector<HTMLElement>('.picker-bar-fill')?.style.width).toBe('25%')
  expect(container.querySelector('.picker-actions')).toBeNull()
  await act(async () => progress(4 * 1024 * 1024, 8 * 1024 * 1024, 'writing'))
  expect(container.textContent).toContain('正在保存 · 50% · 4.0/8.0 MB')
  expect(opened).not.toHaveBeenCalled()
  await act(async () => fail(Error('保存目标不可写')))
  expect(container.textContent).toContain('保存目标不可写')
  expect(container.querySelector('.picker-bar')).toBeNull()
  expect(button('从 PAL').disabled).toBe(false)
  const result = { project: {} }
  host.clone.mockResolvedValueOnce(result)
  await act(async () => button('从 PAL').click())
  expect(opened).toHaveBeenCalledOnce()
  expect(opened).toHaveBeenCalledWith(result)
  expect(container.querySelector('.picker-err')).toBeNull()
  expect(container.querySelector('.picker-bar')).toBeNull()
})
