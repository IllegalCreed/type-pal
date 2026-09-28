/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K05 专属夹具：ImageTab 预览器的浏览器硬件端口见证。
 *
 * 边界纪律（与 kit.ts 同一级别，不替换任何被测业务函数）：
 * - installImageDecodePort：与 kit.ts 同源的 node-canvas 真实 libpng PNG 解码端口
 *   （createImageBitmap 语义），额外提供 进入/完成/close 见证与按来源字节长度的解码闸门，
 *   用于「未开始/在途/已完成」三态与迟到解码归属证明。kit 的端口不暴露这些见证，
 *   故这里独立安装（调用方仍需先 installBrowserHardwarePorts 取得 Blob/crypto）。
 * - installImageDomPorts：jsdom 缺失的 DOM 硬件能力，按 HTML 语义实现——
 *   pointer capture 三件套（按元素记录捕获集合）、element.scrollTo（写入 scrollLeft/Top）、
 *   URL.createObjectURL/revokeObjectURL（真实 Blob 持有与回收见证，可回读 Blob 字节）。
 *   jsdom 不布局，image-preview-stage 的 clientWidth/clientHeight 由条件 getter 给出固定视口，
 *   其余元素保持 jsdom 原生 0。
 */
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 经显式端口（node-port.d.ts）取得 Node 桥接，类型安全、无压制。 */
const { Buffer } = createRequire(join(selfDir(), '../../../../package.json'))('node:buffer')

import { vi } from 'vitest'
import { type Deferred, deferred } from '../glm-ui-wave-kit.js'

/** 本文件真实磁盘路径（vitest 下 import.meta.url 可能是 http /@fs 形式，两种都还原）。 */
function selfDir(): string {
  const url = new URL(import.meta.url)
  if (url.protocol === 'file:') return dirname(fileURLToPath(url))
  return dirname(decodeURIComponent(url.pathname.replace(/^\/@fs(?=\/)/, '')))
}

export interface ImageDecodePort {
  /** createImageBitmap 进入见证（按进入顺序记录来源字节长度）。 */
  readonly entries: readonly number[]
  /** 真实解码完成见证（按完成顺序记录来源字节长度；迟到完成据此证实）。 */
  readonly completions: readonly number[]
  /** close() 调用总数（每次解码产物必须恰好 close 一次）。 */
  readonly closes: number
  /** 已创建但尚未 close 的 bitmap 数。 */
  liveBitmaps(): number
  /** 对指定来源字节长度安装放行闸门；resolve 前所有匹配解码停在在途。 */
  gate(byteLength: number): Deferred<void>
}

/** 真实 PNG 解码端口：进入 →（可选闸门）→ node-canvas loadImage → 完成/close 见证。 */
export function installImageDecodePort(): ImageDecodePort {
  const entries: number[] = []
  const completions: number[] = []
  const gates = new Map<number, Deferred<void>[]>()
  let live = 0
  let closes = 0
  const { loadImage } = createRequire(join(selfDir(), '../../../../../game/package.json'))('canvas')
  vi.stubGlobal('createImageBitmap', async (source: { arrayBuffer(): Promise<ArrayBuffer> }) => {
    const bytes = new Uint8Array(await source.arrayBuffer())
    entries.push(bytes.byteLength)
    for (const hold of gates.get(bytes.byteLength) ?? []) await hold.promise
    const image = await loadImage(Buffer.from(bytes))
    completions.push(bytes.byteLength)
    live += 1
    Object.defineProperty(image, 'close', {
      configurable: true,
      value: () => {
        live -= 1
        closes += 1
      },
    })
    return image
  })
  return {
    entries,
    completions,
    get closes() {
      return closes
    },
    liveBitmaps: () => live,
    gate(byteLength) {
      const hold = deferred<void>()
      gates.set(byteLength, [...(gates.get(byteLength) ?? []), hold])
      return hold
    },
  }
}

export interface ImageDomPort {
  /** setPointerCapture 收到的 pointerId（按调用顺序）。 */
  readonly pointerCaptures: readonly number[]
  /** releasePointerCapture 收到的 pointerId（按调用顺序）。 */
  readonly pointerReleases: readonly number[]
  /** element.scrollTo 调用次数。 */
  readonly scrollTos: number
  /** 仍未 revoke 的 object URL 数（组件拥有并释放 URL 的生命周期见证）。 */
  liveObjectUrls(): number
  /** 回读 object URL 当前持有的 Blob（协议级观测，不宣称图像解码保真）。 */
  objectUrlBlob(url: string): Blob | undefined
}

const STAGE_WIDTH = 560
const STAGE_HEIGHT = 208

const savedDescriptors: Array<[object, string, PropertyDescriptor | undefined]> = []

function replaceProperty(owner: object, name: string, descriptor: PropertyDescriptor): void {
  savedDescriptors.push([owner, name, Object.getOwnPropertyDescriptor(owner, name)])
  Object.defineProperty(owner, name, { configurable: true, ...descriptor })
}

/** 恢复 installImageDomPorts 安装的全部描述符（含还原 jsdom 原生 clientWidth/Height）。 */
export function restoreImageDomPorts(): void {
  for (const [owner, name, descriptor] of savedDescriptors.splice(0)) {
    if (descriptor) Object.defineProperty(owner, name, descriptor)
    else Reflect.deleteProperty(owner, name)
  }
}

/** jsdom 缺失 DOM 硬件能力的最小语义实现 + 见证；重复安装幂等。 */
export function installImageDomPorts(): ImageDomPort {
  restoreImageDomPorts()
  const pointerCaptures: number[] = []
  const pointerReleases: number[] = []
  const capturedByElement = new WeakMap<Element, Set<number>>()
  let scrollTos = 0
  let urlSeq = 0
  const liveUrls = new Map<string, Blob>()

  replaceProperty(Element.prototype, 'setPointerCapture', {
    value(this: Element, pointerId: number) {
      const captured = capturedByElement.get(this) ?? new Set<number>()
      captured.add(pointerId)
      capturedByElement.set(this, captured)
      pointerCaptures.push(pointerId)
    },
  })
  replaceProperty(Element.prototype, 'hasPointerCapture', {
    value(this: Element, pointerId: number) {
      return capturedByElement.get(this)?.has(pointerId) ?? false
    },
  })
  replaceProperty(Element.prototype, 'releasePointerCapture', {
    value(this: Element, pointerId: number) {
      capturedByElement.get(this)?.delete(pointerId)
      pointerReleases.push(pointerId)
    },
  })
  replaceProperty(Element.prototype, 'scrollTo', {
    value(this: Element, options?: { left?: number; top?: number }) {
      scrollTos += 1
      if (typeof options?.left === 'number') this.scrollLeft = options.left
      if (typeof options?.top === 'number') this.scrollTop = options.top
    },
  })
  replaceProperty(Element.prototype, 'clientWidth', {
    get(this: Element) {
      return this.classList.contains('image-preview-stage') ? STAGE_WIDTH : 0
    },
  })
  replaceProperty(Element.prototype, 'clientHeight', {
    get(this: Element) {
      return this.classList.contains('image-preview-stage') ? STAGE_HEIGHT : 0
    },
  })
  replaceProperty(URL, 'createObjectURL', {
    value(blob: Blob) {
      urlSeq += 1
      const url = `blob:k05-image-${urlSeq}`
      liveUrls.set(url, blob)
      return url
    },
  })
  replaceProperty(URL, 'revokeObjectURL', {
    value(url: string) {
      liveUrls.delete(url)
    },
  })
  return {
    pointerCaptures,
    pointerReleases,
    get scrollTos() {
      return scrollTos
    },
    liveObjectUrls: () => liveUrls.size,
    objectUrlBlob: (url) => liveUrls.get(url),
  }
}
