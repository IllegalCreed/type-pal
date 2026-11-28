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
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { vi } from 'vitest'
import { installBrowserHardwarePorts } from '../../__tests__/canvas-test-ports.js'
import { loadFixtureProjectMaps } from '../../__tests__/project-map-fixtures.js'
import { memoryAuthorDirectory } from '../../core/__tests__/author-save-fixture.js'
import { sha256Hex } from '../../core/binary-signature.js'
import type { EditorState } from '../../core/edit-session.js'
import { encodeFrameAnimationRequest } from '../../core/frame-animation-codec.js'
import { assertProjectSaveValid } from '../../core/project-diagnostics.js'
import { toEditorState } from '../../core/project-io.js'
import { buildBlankProject } from '../../core/seed.js'

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer
}

export interface CutsceneVideoSeed {
  id: AssetId
  label: string
  bytes: Uint8Array
}

export interface CutsceneAnimationSeed {
  id: AssetId
  label?: string
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
      ...(animation.label !== undefined ? { label: animation.label } : {}),
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
  const maps = await loadFixtureProjectMaps(project)
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
    const url = `blob:cutscene-test-${counter}`
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
