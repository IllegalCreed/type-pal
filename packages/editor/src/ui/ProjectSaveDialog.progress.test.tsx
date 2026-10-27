// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { type ProjectSaveActivity, ProjectSaveDialog } from './ProjectSaveDialog.js'

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    },
  })
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.restoreAllMocks()
})

test('save-as displays measured file/byte progress and clears percentages between stages', async () => {
  const render = async (activity: ProjectSaveActivity) => {
    if (activity.phase === 'choosing-directory') throw new Error('picker is not a modal stage')
    await act(async () => root.render(<ProjectSaveDialog activity={activity} />))
  }
  const bar = () => host.querySelector<HTMLElement>('[role="progressbar"]')!
  await render({ phase: 'saving-as', progress: { phase: 'staging', completed: 37, total: 100 } })
  expect(bar().getAttribute('aria-valuenow')).toBe('37')
  expect(host.textContent).toContain('复制与暂存文件 37% · 37 / 100 个文件')
  expect(bar().querySelector('span')?.style.width).toBe('37%')
  await render({ phase: 'saving-as', progress: { phase: 'validating' } })
  expect(host.textContent).toContain('正在校验暂存内容与来源')
  expect(host.textContent).not.toContain('%')
  expect(bar().hasAttribute('aria-valuenow')).toBe(false)
  expect(bar().querySelector('span')).toBeNull()
  await render({ phase: 'saving-as', progress: { phase: 'writing', completed: 512, total: 1024 } })
  expect(bar().getAttribute('aria-valuenow')).toBe('50')
  expect(host.textContent).toContain('写入并核验文件 50% · 512 B / 1 KB')
  await render({ phase: 'saving-as', progress: { phase: 'reopening' } })
  expect(host.textContent).toContain('正在重新打开已保存工程')
  expect(host.textContent).not.toContain('%')
  expect(bar().hasAttribute('aria-valuenow')).toBe(false)
  expect(bar().querySelector('span')).toBeNull()
})
