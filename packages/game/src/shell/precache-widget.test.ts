import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dumpHost, readHost } from '../__tests__/grok-render-r1/dump-evidence.js'
import { createPrecacheUiTestHost } from '../__tests__/precache-ui-host.js'
import { useFallbackLanguage } from '../localization/language.js'
import { createPrecacheWidget } from './precache-ui.js'

const host = createPrecacheUiTestHost()
beforeEach(host.prepare)
afterEach(host.close)

describe('Background cache widget', () => {
  it('挂到 document.body，update 写完整字节进度和条宽', () => {
    const w = createPrecacheWidget()
    const el = document.getElementById('precache-widget')
    expect(el).not.toBeNull()
    w.update({ done: 50, total: 100, bytes: 5 * 1024 * 1024, totalBytes: 10 * 1024 * 1024 })
    expect(el?.textContent).toBe('后台缓存资源 50% (5/10MB)')
    const fill = el?.lastElementChild?.firstElementChild
    expect(fill instanceof HTMLElement ? fill.style.width : '').toBe('50%')
  })

  it('总字节为 0 时小组件百分比和条宽都是 0', async () => {
    const widget = createPrecacheWidget()
    widget.update({ done: 0, total: 0, bytes: 0, totalBytes: 0 })
    const el = document.getElementById('precache-widget')
    const bar = el?.children[1]
    const fill = bar?.children[0]
    expect(fill instanceof HTMLElement ? fill.style.width : '').toBe('0%')
    expect(el?.textContent).toBe('后台缓存资源 0% (0/0MB)')
    await dumpHost('G09-D01', [
      readHost('precache-zero', el, fill instanceof HTMLElement ? fill : null, el),
    ])
  })
  it('0.5 MiB 显示为 1MB，37.5% 按 floor 显示为 37%', () => {
    const widget = createPrecacheWidget()
    widget.update({ done: 0, total: 0, bytes: 524288, totalBytes: 1048576 })
    expect(document.getElementById('precache-widget')?.textContent).toBe('后台缓存资源 50% (1/1MB)')

    widget.update({ done: 1, total: 2, bytes: 3, totalBytes: 8 })
    const el = document.getElementById('precache-widget')
    expect(el?.textContent).toBe('后台缓存资源 37% (0/0MB)')
    const fill = el?.lastElementChild?.firstElementChild
    expect(fill instanceof HTMLElement ? fill.style.width : '').toBe('37%')
  })
  it('小组件忽略非有限字节，不把 NaN 写入 DOM', () => {
    const widget = createPrecacheWidget()
    widget.update({ done: 0, total: 0, bytes: Number.NaN, totalBytes: 1024 })
    expect(document.getElementById('precache-widget')?.textContent).toBe('后台缓存中…')
    widget.update({ done: 0, total: 0, bytes: 1024, totalBytes: 2048 })
    expect(document.getElementById('precache-widget')?.textContent).toContain('50%')
  })
  it('done 解除语言订阅并淡出：599ms 仍在，600ms 移除', async () => {
    const widget = createPrecacheWidget()
    widget.update({ done: 1, total: 2, bytes: 1024 * 1024, totalBytes: 2 * 1024 * 1024 })
    widget.done()
    const el = document.getElementById('precache-widget')
    expect(el?.style.opacity).toBe('0')
    useFallbackLanguage('en')
    expect(el?.textContent).toBe('后台缓存资源 50% (1/2MB)')
    const atDone = readHost('done', el, null, el)
    atDone.flags = [`opacity:${el?.style.opacity ?? ''}`, ...atDone.flags]
    vi.advanceTimersByTime(599)
    const mid = document.getElementById('precache-widget')
    expect(mid).not.toBeNull()
    const at599 = readHost('599ms', mid, null, mid)
    at599.flags = [`opacity:${mid?.style.opacity ?? ''}`, ...at599.flags]
    vi.advanceTimersByTime(1)
    expect(document.getElementById('precache-widget')).toBeNull()
    await dumpHost('G09-D20', [
      atDone,
      at599,
      { label: '600ms', text: '', width: '', flags: ['absent'] },
    ])
  })
})
