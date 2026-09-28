/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K06 夹具：过场磁盘种子（真实 ISO BMFF 盒结构 MP4 /
 * 真实 TPFS 编码帧动画，经真实 loader 进合法项目）与 CutsceneTab 挂载所需的额外
 * 浏览器硬件端口替身。只被本卡 K06 新测试导入，不被生产引用。
 *
 * 替身边界（只补 jsdom 缺失的硬件端口，不替换任何被测核心函数/reader/session）：
 * - ImageData 用 node-canvas 真实实现（与 jsdom 2d canvas 同一 canvas 包），
 *   putImageData/getImageData 像素链为真；ResizeObserver/HTMLElement.scrollTo
 *   是 FrameAnimationEditor 真实挂载所需的布局端口，不含业务语义。
 * - URL.createObjectURL/revokeObjectURL：jsdom 无 Blob URL 注册表；这里只记录
 *   「以哪个真实字节 Blob 建 URL、何时 revoke」的协议见证，不宣称浏览器可播放。
 * - mp4*Bytes 只构造产品 mp4HasAudioTrack 真实解析所需的盒层（ftyp/moov/trak/
 *   mdia/hdlr），不含也不宣称任何音视频解码保真。
 */

import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type AssetCatalogV1,
  type AssetId,
  type AssetRecordV1,
  FRAME_SEQUENCE_MEDIA_TYPE,
} from '@type-pal/content'
import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { vi } from 'vitest'
import { memoryAuthorDirectory } from '../../../core/__tests__/author-save-fixture.js'
import { sha256Hex } from '../../../core/binary-signature.js'
import type { EditorState } from '../../../core/edit-session.js'
import { encodeFrameAnimationRequest } from '../../../core/frame-animation-codec.js'
import { assertProjectSaveValid } from '../../../core/project-diagnostics.js'
import { toEditorState } from '../../../core/project-io.js'
import { buildBlankProject } from '../../../core/seed.js'
import { installBrowserHardwarePorts } from './kit.js'

/** 本文件真实磁盘路径（vitest 下 import.meta.url 可能是 http /@fs 形式，两种都还原）。 */
function selfDir(): string {
  const url = new URL(import.meta.url)
  if (url.protocol === 'file:') return dirname(fileURLToPath(url))
  return dirname(decodeURIComponent(url.pathname.replace(/^\/@fs(?=\/)/, '')))
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function joinBytes(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

function u32be(value: number): Uint8Array {
  const bytes = new Uint8Array(4)
  new DataView(bytes.buffer).setUint32(0, value)
  return bytes
}

function fourCc(value: string): Uint8Array {
  return new TextEncoder().encode(value)
}

/** ISO BMFF 盒：size(4, 大端含头) + type(4) + content。 */
function mp4Box(type: string, content: Uint8Array): Uint8Array {
  return joinBytes([u32be(8 + content.byteLength), fourCc(type), content])
}

/** ftyp-only 盒层合法 MP4：产品 mp4HasAudioTrack 真实解析结果为 false（无 hdlr/soun）。 */
export function mp4SilentBytes(): Uint8Array {
  return mp4Box(
    'ftyp',
    joinBytes([fourCc('isom'), u32be(0), fourCc('isom'), fourCc('iso2'), fourCc('mp41')]),
  )
}

/** ftyp + moov/trak/mdia/hdlr(soun)：产品 mp4HasAudioTrack 真实解析结果为 true。 */
export function mp4AudioBytes(): Uint8Array {
  const hdlr = mp4Box('hdlr', joinBytes([u32be(0), u32be(0), fourCc('soun')]))
  const ftyp = mp4Box('ftyp', joinBytes([fourCc('isom'), u32be(0), fourCc('isom')]))
  return joinBytes([ftyp, mp4Box('moov', mp4Box('trak', mp4Box('mdia', hdlr)))])
}

export interface CutsceneVideoSeed {
  id: AssetId
  label: string
  bytes: Uint8Array
}

export interface CutsceneAnimationSeed {
  id: AssetId
  label: string
  width: number
  height: number
  defaultFrameMs: number
  frames: readonly Uint8Array[]
}

export interface CutsceneFixtureProject {
  source: FileSource
  state: EditorState
  manifest: EditorState['manifest']
  catalog: AssetCatalogV1
}

/**
 * 合法磁盘种子装载器：blank seed 文件集 + 过场资源（record bytes/sha256 与实际字节一致）
 * → memory 目录 → 真实 loader → 全量场景与地图正文 → toEditorState → assertProjectSaveValid。
 * 需在安装硬件端口后调用（Blob/crypto 与编码链路依赖）。
 */
export async function loadCutsceneFixtureProject(
  name: string,
  seeds: {
    videos?: readonly CutsceneVideoSeed[]
    animations?: readonly CutsceneAnimationSeed[]
  } = {},
): Promise<CutsceneFixtureProject> {
  const files = await buildBlankProject(name)
  const catalog = structuredClone(files['assets/index.json']) as AssetCatalogV1
  for (const video of seeds.videos ?? []) {
    const sha256 = await sha256Hex(video.bytes)
    const path = `assets/authored/video/${sha256}.mp4`
    const record: AssetRecordV1 = {
      kind: 'video',
      path,
      mediaType: 'video/mp4',
      bytes: video.bytes.byteLength,
      sha256,
      label: video.label,
      origin: { kind: 'authored', ref: `${video.id}.mp4` },
    }
    catalog.assets[video.id] = record
    files[path] = ownedBuffer(video.bytes)
  }
  for (const animation of seeds.animations ?? []) {
    const encoded = await encodeFrameAnimationRequest({
      width: animation.width,
      height: animation.height,
      defaultFrameMs: animation.defaultFrameMs,
      colorTreatment: 'preserve',
      frames: animation.frames.map((rgba) => ({ rgba: ownedBuffer(rgba) })),
    })
    const sha256 = await sha256Hex(encoded)
    const path = `assets/authored/frame-animation/${sha256}.tpfs`
    const record: AssetRecordV1 = {
      kind: 'frame-animation',
      path,
      mediaType: FRAME_SEQUENCE_MEDIA_TYPE,
      bytes: encoded.byteLength,
      sha256,
      label: animation.label,
      origin: { kind: 'authored', ref: `${animation.frames.length} 张图片` },
    }
    catalog.assets[animation.id] = record
    files[path] = ownedBuffer(encoded)
  }
  files['assets/index.json'] = catalog
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { source, state, manifest: state.manifest, catalog: state.assetCatalog }
}

export interface ObjectUrlWitness {
  created: Array<{ url: string; blob: Blob }>
  revoked: string[]
}

const manualRestores: Array<() => void> = []

function replaceProperty(target: object, name: string, value: unknown): void {
  const previous = Object.getOwnPropertyDescriptor(target, name)
  Object.defineProperty(target, name, { configurable: true, writable: true, value })
  manualRestores.push(() => {
    if (previous) Object.defineProperty(target, name, previous)
    else Reflect.deleteProperty(target, name)
  })
}

/**
 * 安装 CutsceneTab 真实挂载所需的全部硬件端口：kit 的 Blob/crypto/createImageBitmap
 * 之外，补 node-canvas ImageData、ResizeObserver、HTMLElement.scrollTo 与
 * objectURL 协议见证。restoreCutsceneHardwarePorts 只恢复非 stubGlobal 的部分，
 * stubGlobal 部分由 vitest 侧 unstubAllGlobals 统一回收。
 */
export function installCutsceneHardwarePorts(): ObjectUrlWitness {
  installBrowserHardwarePorts()
  const { ImageData } = createRequire(join(selfDir(), '../../../../../game/package.json'))('canvas')
  vi.stubGlobal('ImageData', ImageData)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    },
  )
  const witness: ObjectUrlWitness = { created: [], revoked: [] }
  let counter = 0
  replaceProperty(URL, 'createObjectURL', (blob: Blob): string => {
    counter += 1
    const url = `blob:k06-cutscene-${counter}`
    witness.created.push({ url, blob })
    return url
  })
  replaceProperty(URL, 'revokeObjectURL', (url: string): void => {
    witness.revoked.push(url)
  })
  // jsdom 缺 Element.scrollTo：按 CSSOM 语义写 scrollLeft/scrollTop（仅布局端口）。
  replaceProperty(
    HTMLElement.prototype,
    'scrollTo',
    function scrollTo(this: HTMLElement, x?: number | ScrollToOptions, y?: number): void {
      if (typeof x === 'object' && x !== null) {
        if (typeof x.left === 'number') this.scrollLeft = x.left
        if (typeof x.top === 'number') this.scrollTop = x.top
      } else if (typeof x === 'number') {
        this.scrollLeft = x
        if (typeof y === 'number') this.scrollTop = y
      }
    },
  )
  return witness
}

export function restoreCutsceneHardwarePorts(): void {
  for (const restore of manualRestores.splice(0).reverse()) restore()
}
