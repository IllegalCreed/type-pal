/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C04 专属宿主（白名单 packages/editor/src/__tests__/cursor-asset-r1/**）：
 * blank 项目 → 真 TPFS 编码 → 正式 loader → toEditorState → assertProjectSaveValid → 合法 EditSession，
 * 再挂真实 FrameAnimationEditor。唯一替身是浏览器端口：ResizeObserver / scrollTo / 时间线 clientWidth /
 * Worker（受控 postMessage，回复仍走真实 quantize 核）/ createImageBitmap 闸门（底层是真实 PNG 解码）。
 * 2D 画布由 jsdom + node-canvas 真实提供，像素直接 getImageData 读回。不使用 as never、不 mock 业务核心。
 */
import {
  type AssetId,
  type AssetRecordV1,
  FRAME_SEQUENCE_MEDIA_TYPE,
  parseFrameSequence,
} from '@type-pal/content'
import {
  type AssetBase,
  FrameSequenceReader,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { act, createElement, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, vi } from 'vitest'
import { memoryAuthorDirectory } from '../../core/__tests__/author-save-fixture.js'
import { sha256Hex } from '../../core/binary-signature.js'
import { type EditorState, EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import {
  encodeFrameAnimationRequest,
  type FrameAnimationQuantizeRequest,
  quantizeFrameAnimationRequest,
} from '../../core/frame-animation-codec.js'
import { assertProjectSaveValid } from '../../core/project-diagnostics.js'
import { toEditorState } from '../../core/project-io.js'
import { buildBlankProject } from '../../core/seed.js'
import { FrameAnimationEditor, type FrameAnimationMetadata } from '../../ui/FrameAnimationEditor.js'
import {
  dispatchDragEvent,
  installBrowserHardwarePorts,
  MemoryDataTransfer,
  pngFileOf,
  pngRgba,
} from './frame-editor-ports.js'
import { deferred } from './kit.js'

export const C04_MAIN: AssetId = 'frame-animation.c04main'
export const C04_OTHER: AssetId = 'frame-animation.c04other'

export interface C04Frame {
  rgba: Uint8Array
  durationMs?: number
}

/** 两像素互异不透明帧；n 不同则两个像素都不同。 */
export function px(n: number): Uint8Array {
  return new Uint8Array([
    (20 + n * 41) % 256,
    (100 + n * 17) % 256,
    (200 - n * 29 + 256) % 256,
    255,
    (240 - n * 37 + 256) % 256,
    (60 + n * 23) % 256,
    (30 + n * 53) % 256,
    255,
  ])
}

export function frameId(asset: AssetId, index: number): string {
  return `${asset}\0${index}`
}

export interface C04Options {
  frames?: readonly C04Frame[]
  defaultFrameMs?: number
}

function owned(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function buildState(options: C04Options): Promise<{
  state: EditorState
  assetBase: AssetBase
  source: ReturnType<typeof fsaSource>
  records: Record<AssetId, AssetRecordV1>
}> {
  const files = await buildBlankProject('cursor-c04')
  const catalog = (files['assets/index.json'] as { assets: Record<AssetId, AssetRecordV1> }).assets
  const specs: Array<[AssetId, readonly C04Frame[], number]> = [
    [
      C04_MAIN,
      options.frames ?? [{ rgba: px(0) }, { rgba: px(1), durationMs: 70 }, { rgba: px(2) }],
      options.defaultFrameMs ?? 40,
    ],
    [C04_OTHER, [{ rgba: px(7) }, { rgba: px(8) }], 40],
  ]
  for (const [id, frames, defaultFrameMs] of specs) {
    const encoded = await encodeFrameAnimationRequest({
      width: 2,
      height: 1,
      defaultFrameMs,
      colorTreatment: 'preserve',
      frames: frames.map((frame) => ({
        rgba: owned(frame.rgba),
        ...(frame.durationMs === undefined ? {} : { durationMs: frame.durationMs }),
      })),
    })
    expect(parseFrameSequence(encoded).index.frames).toHaveLength(frames.length)
    const bytes = owned(encoded)
    const sha256 = await sha256Hex(bytes)
    const path = `assets/authored/frame-animation/${sha256}.tpfs`
    catalog[id] = {
      kind: 'frame-animation',
      path,
      mediaType: FRAME_SEQUENCE_MEDIA_TYPE,
      bytes: bytes.byteLength,
      sha256,
      label: id,
      origin: { kind: 'authored', ref: id },
    }
    files[path] = bytes
  }
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { state, assetBase: project.assetBase, source, records: structuredClone(catalog) }
}

type Cleanup = () => void | Promise<void>

function defineHostProperty(
  cleanups: Cleanup[],
  target: object,
  name: string,
  descriptor: PropertyDescriptor,
): void {
  const previous = Object.getOwnPropertyDescriptor(target, name)
  Object.defineProperty(target, name, { configurable: true, ...descriptor })
  cleanups.push(() => {
    if (previous) Object.defineProperty(target, name, previous)
    else Reflect.deleteProperty(target, name)
  })
}

/** 受控量化 Worker：postMessage 只记录，reply 由测试显式触发，结果走真实 quantize 核。 */
export interface QuantizeWorkerHandle {
  terminate: ReturnType<typeof vi.fn<() => void>>
  reply(error?: string): Promise<void>
}

export async function mountFrameEditor(options: C04Options = {}) {
  installBrowserHardwarePorts()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const cleanups: Cleanup[] = []
  const { state: initialState, assetBase, source, records } = await buildState(options)
  const before = structuredClone(initialState)
  const session = new EditSession(initialState)
  const reader: EditorAssetReader = createEditorAssetReader(source, () => session.getState())

  vi.stubGlobal(
    'ResizeObserver',
    class implements ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
  defineHostProperty(cleanups, HTMLElement.prototype, 'scrollTo', {
    value(this: HTMLElement, scroll: ScrollToOptions) {
      if (scroll.left !== undefined) this.scrollLeft = scroll.left
      if (scroll.top !== undefined) this.scrollTop = scroll.top
    },
  })
  defineHostProperty(cleanups, HTMLElement.prototype, 'clientWidth', {
    get(this: HTMLElement) {
      return this.classList.contains('fa-timeline') ? 600 : 100
    },
  })
  const captures = new Map<HTMLElement, Set<number>>()
  defineHostProperty(cleanups, HTMLElement.prototype, 'setPointerCapture', {
    value(this: HTMLElement, id: number) {
      captures.set(this, (captures.get(this) ?? new Set<number>()).add(id))
    },
  })
  defineHostProperty(cleanups, HTMLElement.prototype, 'hasPointerCapture', {
    value(this: HTMLElement, id: number) {
      return captures.get(this)?.has(id) ?? false
    },
  })
  defineHostProperty(cleanups, HTMLElement.prototype, 'releasePointerCapture', {
    value(this: HTMLElement, id: number) {
      captures.get(this)?.delete(id)
    },
  })

  const metadata = vi.fn<(value?: FrameAnimationMetadata) => void>()
  const dirty = vi.fn<(value: boolean) => void>()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let selected: AssetId = C04_MAIN
  let mounted = true

  function Harness() {
    useSyncExternalStore(
      (listener) => session.subscribe(listener),
      () => session.getVersion(),
    )
    const record = session.getState().assetCatalog.assets[selected]
    if (!record) throw new Error(`C04 harness: 资源 ${selected} 不在目录`)
    return createElement(FrameAnimationEditor, {
      asset: { id: selected, record },
      reader,
      assetBase,
      session,
      onMetadata: metadata,
      onDirtyChange: dirty,
    })
  }

  async function render(id: AssetId = selected): Promise<void> {
    selected = id
    await act(async () => root.render(createElement(Harness)))
  }
  async function unmount(): Promise<void> {
    if (!mounted) return
    mounted = false
    await act(async () => root.unmount())
    host.remove()
  }
  cleanups.push(unmount)
  await render()

  const cards = () => [...host.querySelectorAll<HTMLButtonElement>('.fa-frame')]
  const mainCanvas = () => host.querySelector<HTMLCanvasElement>('.fa-preview-surface canvas')
  const pixelsOf = (canvas: HTMLCanvasElement | null): number[] => {
    if (!canvas) throw new Error('C04 harness: 画布不存在')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('C04 harness: 无真实 2D 画布')
    return [...context.getImageData(0, 0, canvas.width, canvas.height).data]
  }
  const mainPixels = () => pixelsOf(mainCanvas())
  const cardPixels = () => cards().map((card) => pixelsOf(card.querySelector('canvas')))
  const ids = () => cards().map((card) => card.dataset.frameId)
  const selectedIds = () =>
    cards()
      .filter((card) => card.getAttribute('aria-pressed') === 'true')
      .map((card) => card.dataset.frameId)
  const currentIndex = () =>
    cards().findIndex((card) => card.getAttribute('aria-current') === 'true')
  const counter = () => host.querySelector('.fa-counter')?.textContent
  const headerText = () => host.querySelector('.fa-timeline-head')?.textContent ?? ''
  const latest = () => metadata.mock.lastCall?.[0]
  const errorText = () => host.querySelector('.fa-error')?.textContent ?? ''

  function button(label: string): HTMLButtonElement {
    const hit = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) =>
        candidate.textContent === label || candidate.getAttribute('aria-label') === label,
    )
    if (!hit) throw new Error(`C04 harness: 找不到按钮 ${label}`)
    return hit
  }
  const click = (label: string) => act(async () => button(label).click())
  const select = async (index: number, mods: MouseEventInit = {}) => {
    const card = cards()[index]
    if (!card) throw new Error(`C04 harness: 没有第 ${index} 张帧卡`)
    await act(async () => card.dispatchEvent(new MouseEvent('click', { bubbles: true, ...mods })))
  }
  function field(label: string): HTMLInputElement {
    const labelElement = [...host.querySelectorAll('label')].find(
      (candidate) => candidate.textContent === label,
    )
    const input = [...host.querySelectorAll<HTMLInputElement>('input')].find(
      (candidate) => candidate.id === labelElement?.htmlFor,
    )
    if (!input) throw new Error(`C04 harness: 找不到数字字段 ${label}`)
    return input
  }
  async function number(label: string, value: string, blur = false): Promise<void> {
    const input = field(label)
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (!setter) throw new Error('C04 harness: 缺 input.value setter')
    await act(async () => {
      setter.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      if (blur) input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
  }
  /** 默认可观察就绪：不扩 timeout/interval，靠 drawn/cards 条件收敛。 */
  const wait = (condition: () => void) =>
    vi.waitFor(async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      condition()
    })
  /** drawFrame 把画布设为帧尺寸后才算真正绘制（默认 300x150 不算）。 */
  const drawn = (canvas: HTMLCanvasElement | null) => canvas?.width === 2 && canvas.height === 1
  const ready = () =>
    wait(() => {
      expect(latest()).toBeDefined()
      expect(cards().length).toBeGreaterThan(0)
      expect(drawn(mainCanvas())).toBe(true)
      for (const card of cards()) expect(drawn(card.querySelector('canvas'))).toBe(true)
    })

  /** 以 dragstart → dragover → drop → dragend 原生事件重排第 from 张到第 to 张。 */
  async function dragFrame(from: number, to: number): Promise<void> {
    const transfer = new MemoryDataTransfer()
    const source = cards()[from]
    const target = cards()[to]
    if (!source || !target) throw new Error(`C04 harness: 拖拽 ${from}->${to} 无帧卡`)
    await act(async () => dispatchDragEvent(source, 'dragstart', transfer))
    await act(async () => dispatchDragEvent(target, 'dragover', transfer))
    await act(async () => dispatchDragEvent(target, 'drop', transfer))
    await act(async () => dispatchDragEvent(source, 'dragend', transfer))
  }

  /** 真实 PNG 字节经文件输入进入组件；0 插入、1 替换。 */
  async function chooseFiles(input: 'insert' | 'replace', files: File[]): Promise<void> {
    const element =
      host.querySelectorAll<HTMLInputElement>('input[type="file"]')[input === 'insert' ? 0 : 1]
    if (!element) throw new Error('C04 harness: 缺文件输入')
    await act(async () => {
      Object.defineProperty(element, 'files', { configurable: true, value: files })
      element.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }
  const png = (name: string, n: number, width = 2, height = 1): File => {
    const rgba = new Uint8Array(width * height * 4)
    for (let at = 0; at < rgba.byteLength; at += 4) rgba.set(px(n).subarray(0, 4), at)
    return pngFileOf(name, pngRgba(width, height, rgba))
  }
  /** 单色 PNG 解码后得到的 2x1 RGBA（两像素同色）。 */
  const solid = (n: number): number[] => [...px(n).subarray(0, 4), ...px(n).subarray(0, 4)]

  /** createImageBitmap 闸门：真实 PNG 解码，放行前不返回；记录调用数。 */
  function gateImageDecode() {
    const real = globalThis.createImageBitmap
    const gate = deferred<void>()
    const calls = { count: 0 }
    vi.stubGlobal('createImageBitmap', async (...args: Parameters<typeof createImageBitmap>) => {
      calls.count += 1
      await gate.promise
      return real(...args)
    })
    return {
      calls,
      async release() {
        await act(async () => {
          gate.resolve()
          await gate.promise
          await new Promise((resolve) => setTimeout(resolve, 0))
        })
      },
    }
  }

  /** 受控量化 Worker 宿主。 */
  function quantizeWorkers(): QuantizeWorkerHandle[] {
    const workers: QuantizeWorkerHandle[] = []
    class QuantizeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: ErrorEvent) => void) | null = null
      message?: { id: number; kind: 'quantize'; request: FrameAnimationQuantizeRequest }
      terminate = vi.fn<() => void>()
      settled = false
      constructor() {
        workers.push({
          terminate: this.terminate,
          reply: async (error) => {
            if (this.settled || !this.message) return
            this.settled = true
            const { id, request } = this.message
            const data = error
              ? { id, error }
              : { id, frames: quantizeFrameAnimationRequest(request) }
            await act(async () => this.onmessage?.(new MessageEvent('message', { data })))
          },
        })
      }
      postMessage(message: NonNullable<QuantizeWorker['message']>, transfer: Transferable[]) {
        this.message = structuredClone(message, { transfer })
      }
    }
    vi.stubGlobal('Worker', QuantizeWorker)
    return workers
  }

  /** 保存走无 Worker 降级路径（真实编码核同线程执行）。 */
  const withoutWorker = () => vi.stubGlobal('Worker', undefined)

  /** 保存 sha256 之后的闸门：最后 hash 等待中可切源/撤销/卸载。 */
  function holdSaveHash() {
    const gate = deferred<void>()
    const original = crypto.subtle.digest.bind(crypto.subtle)
    const pending: Promise<ArrayBuffer>[] = []
    const state = { entered: false }
    vi.spyOn(crypto.subtle, 'digest').mockImplementation((algorithm, data) => {
      const result = (async () => {
        const hash = await original(algorithm, data)
        state.entered = true
        await gate.promise
        return hash
      })()
      pending.push(result)
      return result
    })
    return {
      state,
      async release() {
        await act(async () => {
          gate.resolve()
          await Promise.all(pending)
        })
      },
    }
  }

  async function reopened(id: AssetId = selected) {
    const sequenceReader = new FrameSequenceReader(reader)
    const sequence = await sequenceReader.sequence(id)
    const frames: number[][] = []
    for (let index = 0; index < sequence.index.frames.length; index += 1)
      frames.push([...(await sequenceReader.frame(id, index)).rgba])
    return { index: sequence.index, frames }
  }
  /** 等保存落进会话并让组件重载新 revision。 */
  async function saved() {
    await wait(() => {
      expect(session.getHistoryVersion()).toBeGreaterThan(0)
      expect(button('保存动画').disabled).toBe(true)
    })
    await ready()
    return reopened()
  }
  const sessionPristine = () => {
    expect(session.getState()).toBe(initialState)
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.isDirty()).toBe(false)
    expect(initialState).toEqual(before)
  }

  return {
    session,
    reader,
    host,
    metadata,
    dirty,
    records,
    initialState,
    render,
    unmount,
    cards,
    mainCanvas,
    mainPixels,
    cardPixels,
    ids,
    selectedIds,
    currentIndex,
    counter,
    headerText,
    latest,
    errorText,
    button,
    click,
    select,
    field,
    number,
    wait,
    ready,
    dragFrame,
    chooseFiles,
    png,
    solid,
    gateImageDecode,
    quantizeWorkers,
    withoutWorker,
    holdSaveHash,
    reopened,
    saved,
    sessionPristine,
    cleanup: async () => {
      for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
    },
  }
}

export type MountedFrameEditor = Awaited<ReturnType<typeof mountFrameEditor>>
