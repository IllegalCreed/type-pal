// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsDialog } from './overlays.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }),
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }),
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  document.body.style.overflow = ''
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('DsDialog lifecycle contract', () => {
  test('uses instance-unique title and description ids for dialogs with the same title', async () => {
    await act(async () =>
      root.render(
        <>
          <DsDialog open title="添加道具" description="选择一个道具" onClose={() => undefined}>
            甲
          </DsDialog>
          <DsDialog open title="添加道具" description="选择另一个道具" onClose={() => undefined}>
            乙
          </DsDialog>
        </>,
      ),
    )

    const dialogs = [...host.querySelectorAll<HTMLDialogElement>('dialog')]
    expect(dialogs).toHaveLength(2)
    const titleIds = dialogs.map((dialog) => dialog.getAttribute('aria-labelledby'))
    const descriptionIds = dialogs.map((dialog) => dialog.getAttribute('aria-describedby'))
    expect(new Set(titleIds).size).toBe(2)
    expect(new Set(descriptionIds).size).toBe(2)
    for (const dialog of dialogs) {
      expect(
        document.getElementById(dialog.getAttribute('aria-labelledby')!)?.closest('dialog'),
      ).toBe(dialog)
      expect(
        document.getElementById(dialog.getAttribute('aria-describedby')!)?.closest('dialog'),
      ).toBe(dialog)
    }
  })

  test('opens once, locks scrolling, closes from native close once and restores opener focus', async () => {
    const closes = vi.fn()
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            打开
          </button>
          <DsDialog
            open={open}
            title="测试弹窗"
            onClose={() => {
              closes()
              setOpen(false)
            }}
          >
            <input aria-label="首个字段" />
          </DsDialog>
        </>
      )
    }

    await act(async () => root.render(<Harness />))
    const opener = host.querySelector<HTMLButtonElement>('button')!
    opener.focus()
    await act(async () => opener.click())
    const dialog = host.querySelector<HTMLDialogElement>('dialog')!
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.activeElement).toBe(dialog.querySelector('[aria-label="首个字段"]'))

    await act(async () => dialog.close())
    expect(closes).toHaveBeenCalledTimes(1)
    expect(document.body.style.overflow).toBe('')
    expect(document.activeElement).toBe(opener)
  })

  test('controlled close does not echo onClose and repeated open does not call showModal twice', async () => {
    const closes = vi.fn()
    const render = async (open: boolean) => {
      await act(async () =>
        root.render(
          <DsDialog open={open} title="受控弹窗" onClose={closes}>
            内容
          </DsDialog>,
        ),
      )
    }

    await render(true)
    await render(true)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1)
    await render(false)
    expect(HTMLDialogElement.prototype.close).toHaveBeenCalledTimes(1)
    expect(closes).not.toHaveBeenCalled()
    expect(document.body.style.overflow).toBe('')
  })

  test('keeps a reopened cycle alive when the previous controlled close event arrives late', async () => {
    let nextFrame = 1
    const frames = new Map<number, FrameRequestCallback>()
    const delayedCloseEvents: HTMLDialogElement[] = []
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const frame = nextFrame
      nextFrame += 1
      frames.set(frame, callback)
      return frame
    })
    vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame))
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        if (!this.hasAttribute('open')) return
        this.removeAttribute('open')
        delayedCloseEvents.push(this)
      }),
    })
    const flushFrames = async () => {
      const queued = [...frames.entries()]
      frames.clear()
      await act(async () => {
        for (const [frame, callback] of queued) callback(frame)
      })
    }
    const closes = vi.fn()
    const view = (open: boolean) => (
      <>
        <button type="button">外部入口</button>
        <DsDialog open={open} title="延迟关闭" onClose={closes}>
          <input aria-label="弹窗字段" />
        </DsDialog>
      </>
    )

    await act(async () => root.render(view(false)))
    const opener = host.querySelector<HTMLButtonElement>('button')!
    opener.focus()
    await act(async () => root.render(view(true)))
    await flushFrames()
    expect(document.activeElement).toBe(host.querySelector('[aria-label="弹窗字段"]'))

    await act(async () => root.render(view(false)))
    expect(delayedCloseEvents).toHaveLength(1)
    await act(async () => root.render(view(true)))
    await act(async () => delayedCloseEvents.shift()?.dispatchEvent(new Event('close')))

    const dialog = host.querySelector<HTMLDialogElement>('dialog')!
    expect(dialog.open).toBe(true)
    expect(closes).not.toHaveBeenCalled()
    expect(document.body.style.overflow).toBe('hidden')

    await act(async () => dialog.close())
    await act(async () => delayedCloseEvents.shift()?.dispatchEvent(new Event('close')))
    await flushFrames()
    expect(closes).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe('')
  })

  test('reference-counts document scroll lock and restores the original inline overflow', async () => {
    document.body.style.overflow = 'clip'
    const view = (first: boolean, second: boolean) => (
      <>
        <DsDialog open={first} title="第一层" onClose={() => undefined}>
          甲
        </DsDialog>
        <DsDialog open={second} title="第二层" onClose={() => undefined}>
          乙
        </DsDialog>
      </>
    )

    await act(async () => root.render(view(true, true)))
    expect(document.body.style.overflow).toBe('hidden')
    await act(async () => root.render(view(false, true)))
    expect(document.body.style.overflow).toBe('hidden')
    await act(async () => root.render(view(false, false)))
    expect(document.body.style.overflow).toBe('clip')
  })

  test('restores fallback focus when the opener disappears during unmount', async () => {
    const fallback = document.createElement('button')
    fallback.textContent = '章节操作'
    document.body.append(fallback)
    const fallbackRef = { current: fallback }

    const view = (open: boolean) => (
      <>
        <button type="button">临时入口</button>
        <DsDialog
          open={open}
          title="即将卸载"
          fallbackFocusRef={fallbackRef}
          onClose={() => undefined}
        >
          <input aria-label="弹窗字段" />
        </DsDialog>
      </>
    )
    await act(async () => root.render(view(false)))
    const opener = host.querySelector<HTMLButtonElement>('button')!
    opener.focus()
    await act(async () => root.render(view(true)))
    await act(async () => root.render(<></>))

    expect(document.activeElement).toBe(fallback)
    expect(document.body.style.overflow).toBe('')
    fallback.remove()
  })
})
