// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-ASSET-LIFECYCLE-1：ImageAssetThumbnail 资源对象生命周期残余合同。
 *
 * 旧测去重（只登记，不复制）：
 * - ImageAssetPicker.glm-leaf-wave：选择/(无)清空/缺失值告警选项/空目录文案/打开图库 wiring、
 *   缩略图单 URL 渲染 + 卸载回收、缺失 id 错误芯片、无 asset 空芯片——已证。
 * - ImageTab.kimi-workflows：缩略图列挂载（revision 传参存在但替换失效轴未证）、
 *   导入/替换/删除与缺失焦点面板（ImageTab 自身合同）——已证。
 * 本文件只补未证明的生命周期合同：
 * 1) 同 AssetId 替换（revision 变化）→ 旧 object URL 回收、新 URL 重建，卸载回收最终 URL；
 * 2) 在途读取 stale：切走后迟到的旧读取不得创建 URL、不得串显；
 * 3) 读取失败只显错误芯片；同 id 真实 upsert 落新字节后（revision 变化）错误态恢复为图片；
 * 4) 战场背景缩略图：项目标准色真实重染（真实 PNG 解码 → 重染 → 再解码逐像素）、
 *    无色盘透传原始字节、索引违例与尺寸违例精确拒绝文案。
 * 唯一替身是浏览器硬件端口（kimi kit：Node Blob/crypto + createImageBitmap 真实 PNG 解码）
 * 与 URL.createObjectURL/revokeObjectURL 端口记录（jsdom 无 object URL）。
 */
import type { AssetCatalogV1, AssetRecordV1 } from '@type-pal/content'
import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { UpsertAssetCommand } from '../core/asset-commands.js'
import { sha256Hex } from '../core/binary-signature.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { toEditorState } from '../core/project-io.js'
import { buildBlankProject } from '../core/seed.js'
import { type Deferred, deferred, loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import {
  gatedFileSource,
  installBrowserHardwarePorts,
  pngRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import { ImageAssetThumbnail } from './ImageAssetPicker.js'

let host: HTMLDivElement
let root: Root
let urlCounter = 0
const createdUrls: string[] = []
const revokedUrls: string[] = []
const urlBlobs = new Map<string, Blob>()

/**
 * 端口观察点（非 mock：解码/URL 逻辑仍真实执行，只补事件信号）。
 * ImageAssetThumbnail 的异步链经 node-canvas loadImage/toBlob 等宏任务推进，
 * setUrl/setError 可能落在 render act 关闭之后；这里让每个 render act 直接
 * await 链自己的 settle 信号（createObjectURL / createImageBitmap 完成），
 * 保证状态更新发生在 act 打开期间，零 "not wrapped in act" 警告，
 * 也不需要 act 外轮询。信号带 1s 有界竞速：链未按预期到达时以明确错误失败。
 */
let urlDeferreds: Array<Deferred<string>> = []
let bitmapDeferreds: Array<Deferred<void>> = []
let realBitmapPort: ((source: Blob) => Promise<ImageBitmap>) | undefined

function settleAt<T>(queue: Array<Deferred<T>>, index: number, value: T): void {
  while (queue.length <= index) queue.push(deferred<T>())
  queue[index]!.resolve(value)
}

function signalAt<T>(queue: Array<Deferred<T>>, index: number): Promise<T> {
  while (queue.length <= index) queue.push(deferred<T>())
  return queue[index]!.promise
}

function bounded<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(label)), 1000)
    }),
  ])
}

/** 宏任务节拍：确定性排空此前排队的全部微任务（仍在 act 内）。 */
function macrotaskTick(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let urlCalls = 0
let bitmapCalls = 0

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  installBrowserHardwarePorts()
  urlCounter = 0
  urlCalls = 0
  bitmapCalls = 0
  createdUrls.length = 0
  revokedUrls.length = 0
  urlBlobs.clear()
  urlDeferreds = []
  bitmapDeferreds = []
  // createImageBitmap 观察点：包装 kit 的真实解码端口，组件链解码完成时落信号。
  realBitmapPort = globalThis.createImageBitmap.bind(globalThis)
  vi.stubGlobal(
    'createImageBitmap',
    async (source: Parameters<typeof createImageBitmap>[0]): Promise<ImageBitmap> => {
      const bitmap = await realBitmapPort!(source as Blob)
      settleAt(bitmapDeferreds, bitmapCalls, undefined)
      bitmapCalls += 1
      return bitmap
    },
  )
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: (blob: Blob): string => {
      urlCounter += 1
      const url = `blob:glm-asset-lifecycle-${urlCounter}`
      createdUrls.push(url)
      urlBlobs.set(url, blob)
      settleAt(urlDeferreds, urlCalls, url)
      urlCalls += 1
      return url
    },
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: (url: string): void => {
      revokedUrls.push(url)
    },
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
})

async function blobBytes(url: string): Promise<Uint8Array> {
  const blob = urlBlobs.get(url)
  if (!blob) throw new Error(`URL ${url} 没有对应 blob 记录`)
  return new Uint8Array(await blob.arrayBuffer())
}

function asBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

const portraitRecord = (id: string, sha256: string, bytes: number): AssetRecordV1 => ({
  kind: 'portrait',
  path: `assets/authored/images/${id}-${sha256.slice(0, 8)}.png`,
  mediaType: 'image/png',
  bytes,
  sha256,
  label: `立绘 ${id}`,
  origin: { kind: 'authored' },
})

const pngA = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4])
const pngB = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 9, 9, 9, 9])

/**
 * blank 工程 + 磁盘 backed 资源（字节不入会话 assetBlobs，读取必经 FileSource），
 * 供在途/失败读取需要端口闸门的用例。
 */
async function diskBackedProject(
  name: string,
  assets: ReadonlyArray<readonly [id: string, record: AssetRecordV1, bytes: Uint8Array]>,
): Promise<ReturnType<typeof gatedFileSource>> {
  const blank = await buildBlankProject(name)
  const catalogValue = blank['assets/index.json']
  if (typeof catalogValue !== 'object' || catalogValue === null)
    throw new Error('blank 种子缺资源 catalog')
  const catalog = catalogValue as AssetCatalogV1
  for (const [id, record, bytes] of assets) {
    catalog.assets[id] = record
    blank[record.path] = bytes.slice().buffer
  }
  return gatedFileSource(fsaSource(memoryAuthorDirectory(blank).dir))
}

describe('ImageAssetThumbnail 对象 URL 生命周期残余合同', () => {
  test('同 AssetId 替换：revision 变化令旧 URL 回收、新 URL 重建，卸载回收最终 URL', async () => {
    const legal = await loadLegalUiProject('glm-asset-lifecycle-replace')
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(legal.source, () => session.getState())
    const shaA = await sha256Hex(pngA)
    await act(async () => {
      expect(
        session.dispatch(
          new UpsertAssetCommand(
            'portrait.replace',
            portraitRecord('portrait.replace', shaA, pngA.byteLength),
            asBuffer(pngA),
          ),
        ),
      ).toBe(true)
    })

    // 两段式：渲染 act 启动 effect 链；信号 act 保持打开直到链到达 createObjectURL，
    // 使 setUrl 落在 act 内（链全微任务时信号已解决，第二个 act 立即返回）。
    const render = async (revision: string, urlIndex: number): Promise<string> => {
      await act(async () => {
        root.render(
          <ImageAssetThumbnail
            asset="portrait.replace"
            kind="portrait"
            reader={reader}
            revision={revision}
          />,
        )
      })
      return act(async () =>
        bounded(signalAt(urlDeferreds, urlIndex), `缩略图链未创建第 ${urlIndex + 1} 个 object URL`),
      )
    }

    const urlA = await render(shaA, 0)
    expect(host.querySelector('img')?.getAttribute('src')).toBe(urlA)
    expect(new Uint8Array(await blobBytes(urlA))).toEqual(pngA)

    // 真实替换：同 id 新 sha/新路径字节 + previousBytes 保全旧字节。
    const shaB = await sha256Hex(pngB)
    await act(async () => {
      expect(
        session.dispatch(
          new UpsertAssetCommand(
            'portrait.replace',
            portraitRecord('portrait.replace', shaB, pngB.byteLength),
            asBuffer(pngB),
            asBuffer(pngA),
          ),
        ),
      ).toBe(true)
    })
    assertProjectSaveValid(session.getState())

    // 同 asset/kind/reader，只有 revision 变化 → effect 必须失效重建。
    const urlB = await render(shaB, 1)
    expect(urlB).not.toBe(urlA)
    expect(host.querySelector('img')?.getAttribute('src')).toBe(urlB)
    expect(new Uint8Array(await blobBytes(urlB))).toEqual(pngB)
    expect(revokedUrls).toContain(urlA)
    expect(revokedUrls).not.toContain(urlB)

    await act(async () => root.unmount())
    expect(revokedUrls).toContain(urlB)
  })

  test('在途 stale：读取未完成即切走，迟到的旧读取不建 URL、不串显', async () => {
    const shaA = await sha256Hex(pngA)
    const shaB = await sha256Hex(pngB)
    const recordA = portraitRecord('portrait.stale-a', shaA, pngA.byteLength)
    const recordB = portraitRecord('portrait.stale-b', shaB, pngB.byteLength)
    const gated = await diskBackedProject('glm-asset-lifecycle-stale', [
      ['portrait.stale-a', recordA, pngA],
      ['portrait.stale-b', recordB, pngB],
    ])
    const holdA = gated.gate(recordA.path)
    const holdB = gated.gate(recordB.path)
    const project = await loadCurrentProjectFrom(gated.source)
    const state = toEditorState(
      project,
      await loadAllAuthorScenes(project),
      await loadAllProjectMaps(project),
      {},
      [],
    )
    const session = new EditSession(state)
    const reader = createEditorAssetReader(gated.source, () => session.getState())

    await act(async () => {
      root.render(
        <ImageAssetThumbnail
          asset="portrait.stale-a"
          kind="portrait"
          reader={reader}
          revision={shaA}
        />,
      )
    })
    expect(gated.calls).toContain(recordA.path)
    expect(host.querySelector('img')).toBeNull()

    // A 读取仍在途时切到 B；只有 B 放行。B 的链（放行→磁盘读→blob→URL）全程在 act 内。
    await act(async () => {
      root.render(
        <ImageAssetThumbnail
          asset="portrait.stale-b"
          kind="portrait"
          reader={reader}
          revision={shaB}
        />,
      )
    })
    const urlB = await act(async () => {
      holdB.resolve()
      return bounded(signalAt(urlDeferreds, 0), 'B 缩略图链未创建 object URL')
    })
    expect(host.querySelector('img')?.getAttribute('src')).toBe(urlB)
    expect(new Uint8Array(await blobBytes(urlB))).toEqual(pngB)

    // A 的读取此刻才完成：不得为它创建 URL，也不得覆盖 B 的显示。
    await act(async () => {
      holdA.resolve()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(createdUrls).toEqual([urlB])
    expect(host.querySelector('img')?.getAttribute('src')).toBe(urlB)

    await act(async () => root.unmount())
    expect(revokedUrls).toEqual([urlB])
  })

  test('失败后恢复：读取失败只显错误芯片；同 id 真实 upsert 后错误态恢复为图片', async () => {
    const shaA = await sha256Hex(pngA)
    const record = portraitRecord('portrait.flaky', shaA, pngA.byteLength)
    const gated = await diskBackedProject('glm-asset-lifecycle-recover', [
      ['portrait.flaky', record, pngA],
    ])
    // 磁盘端口故障：该路径读取必败。
    const failing: FileSource = {
      ...gated.source,
      async readBytes(rel: string, signal?: AbortSignal): Promise<ArrayBuffer> {
        if (rel === record.path) throw new Error('注入磁盘读取失败')
        return gated.source.readBytes(rel, signal)
      },
    }
    const project = await loadCurrentProjectFrom(failing)
    const state = toEditorState(
      project,
      await loadAllAuthorScenes(project),
      await loadAllProjectMaps(project),
      {},
      [],
    )
    const session = new EditSession(state)
    const reader = createEditorAssetReader(failing, () => session.getState())

    // 失败链是纯微任务（端口同步抛出→拒绝→catch→setError），宏任务节拍内排空。
    await act(async () => {
      root.render(
        <ImageAssetThumbnail
          asset="portrait.flaky"
          kind="portrait"
          reader={reader}
          revision={shaA}
        />,
      )
      await macrotaskTick()
    })
    const chip = host.querySelector<HTMLElement>('.image-asset-thumb.error')
    expect(chip, '错误芯片应在失败链排空后同步可见').not.toBeNull()
    expect(chip?.getAttribute('title')).toContain('注入磁盘读取失败')
    expect(host.querySelector('img')).toBeNull()
    expect(createdUrls).toHaveLength(0)

    // 恢复：真实命令把新字节写入会话 pending blob；readBytes 短路，不再触盘。
    const shaB = await sha256Hex(pngB)
    await act(async () => {
      expect(
        session.dispatch(
          new UpsertAssetCommand(
            'portrait.flaky',
            portraitRecord('portrait.flaky', shaB, pngB.byteLength),
            asBuffer(pngB),
            asBuffer(pngA),
          ),
        ),
      ).toBe(true)
    })
    await act(async () => {
      root.render(
        <ImageAssetThumbnail
          asset="portrait.flaky"
          kind="portrait"
          reader={reader}
          revision={shaB}
        />,
      )
    })
    const urlB = await act(async () =>
      bounded(signalAt(urlDeferreds, 0), '恢复链未创建 object URL'),
    )
    expect(host.querySelector('img')?.getAttribute('src')).toBe(urlB)
    expect(host.querySelector('.image-asset-thumb.error')).toBeNull()
    expect(new Uint8Array(await blobBytes(urlB))).toEqual(pngB)

    await act(async () => root.unmount())
    expect(revokedUrls).toEqual([urlB])
  })
})

describe('战场背景缩略图项目标准色合同', () => {
  const paletteColors: readonly (readonly [number, number, number])[] = [
    [255, 0, 0],
    [0, 255, 0],
  ]

  /** 索引图：R=G=B=索引、A=255；左半索引 0、右半索引 1。 */
  function indexedRgba(width: number, height: number): Uint8Array {
    const rgba = new Uint8Array(width * height * 4)
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const offset = pixel * 4
      const index = pixel % width < width / 2 ? 0 : 1
      rgba[offset] = index
      rgba[offset + 1] = index
      rgba[offset + 2] = index
      rgba[offset + 3] = 255
    }
    return rgba
  }

  async function decodeBlobPixels(
    url: string,
    width: number,
    height: number,
  ): Promise<Uint8ClampedArray> {
    const blob = urlBlobs.get(url)
    if (!blob) throw new Error(`URL ${url} 没有对应 blob 记录`)
    if (!realBitmapPort) throw new Error('真实解码端口尚未安装')
    // 用真实端口直接解码（不经过组件观察点，避免消耗组件链信号）。
    const bitmap = await realBitmapPort(blob)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new Error('解码画布 2d context 不可用')
      context.drawImage(bitmap, 0, 0)
      return context.getImageData(0, 0, width, height).data
    } finally {
      ;(bitmap as unknown as { close(): void }).close()
    }
  }

  async function seedBattleAsset(
    id: string,
    png: Uint8Array,
    sha: string,
  ): Promise<ReturnType<typeof createEditorAssetReader>> {
    const legal = await loadLegalUiProject(`glm-asset-lifecycle-battle-${id}`)
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(legal.source, () => session.getState())
    await act(async () => {
      expect(
        session.dispatch(
          new UpsertAssetCommand(
            id,
            {
              kind: 'battle-background',
              path: `assets/authored/images/${id}-${sha.slice(0, 8)}.png`,
              mediaType: 'image/png',
              bytes: png.byteLength,
              sha256: sha,
              label: `战场 ${id}`,
              origin: { kind: 'authored' },
            },
            asBuffer(png),
          ),
        ),
      ).toBe(true)
    })
    return reader
  }

  test('带色盘：真实重染为项目标准色像素；无色盘：透传原始索引字节', async () => {
    const png = pngRgba(320, 200, indexedRgba(320, 200))
    const sha = await sha256Hex(png)
    const reader = await seedBattleAsset('battle.recolor', png, sha)

    await act(async () => {
      root.render(
        <ImageAssetThumbnail
          asset="battle.recolor"
          kind="battle-background"
          reader={reader}
          revision={sha}
          paletteColors={paletteColors}
        />,
      )
    })
    const coloredUrl = await act(async () =>
      bounded(signalAt(urlDeferreds, 0), '重染链未创建 object URL'),
    )
    expect(host.querySelector('img')?.getAttribute('src')).toBe(coloredUrl)
    const pixels = await decodeBlobPixels(coloredUrl, 320, 200)
    const at = (x: number, y: number): number[] => [
      pixels[(y * 320 + x) * 4]!,
      pixels[(y * 320 + x) * 4 + 1]!,
      pixels[(y * 320 + x) * 4 + 2]!,
      pixels[(y * 320 + x) * 4 + 3]!,
    ]
    expect(at(0, 0)).toEqual([255, 0, 0, 255])
    expect(at(0, 199)).toEqual([255, 0, 0, 255])
    expect(at(319, 0)).toEqual([0, 255, 0, 255])
    expect(at(319, 199)).toEqual([0, 255, 0, 255])
    // 重染产物不是原始索引字节（不暴露灰度索引图）。
    expect(new Uint8Array(await blobBytes(coloredUrl))).not.toEqual(png)
    await act(async () => root.unmount())
    root = createRoot(host)

    // 同一资源不传色盘：blob 就是原始字节（透传分支，不经解码端口）。
    await act(async () => {
      root.render(
        <ImageAssetThumbnail
          asset="battle.recolor"
          kind="battle-background"
          reader={reader}
          revision={sha}
        />,
      )
    })
    const rawUrl = await act(async () =>
      bounded(signalAt(urlDeferreds, 1), '透传链未创建 object URL'),
    )
    expect(new Uint8Array(await blobBytes(rawUrl))).toEqual(png)
    await act(async () => root.unmount())
  })

  test('索引违例与尺寸违例：精确拒绝文案且不产生 object URL', async () => {
    const illegalPixels = indexedRgba(320, 200)
    // 像素 0 破坏索引契约：R≠G。
    illegalPixels[1] = 2
    const illegal = pngRgba(320, 200, illegalPixels)
    const shaIllegal = await sha256Hex(illegal)
    const illegalReader = await seedBattleAsset('battle.illegal', illegal, shaIllegal)
    // 错误链：readBytes(微任务)→真实解码(宏任务)→像素校验抛出→catch→setError。
    // act 内等解码完成信号 + 一个宏任务节拍，把 catch→setError 全部收进 act。
    await act(async () => {
      root.render(
        <ImageAssetThumbnail
          asset="battle.illegal"
          kind="battle-background"
          reader={illegalReader}
          revision={shaIllegal}
          paletteColors={paletteColors}
        />,
      )
    })
    await act(async () => {
      await bounded(signalAt(bitmapDeferreds, 0), '索引违例链未到达真实解码')
      await macrotaskTick()
    })
    const chip = host.querySelector<HTMLElement>('.image-asset-thumb.error')
    expect(chip, '索引违例错误芯片应在链排空后同步可见').not.toBeNull()
    expect(chip?.getAttribute('title')).toBe('战场背景像素 0 不满足项目索引图契约')
    expect(createdUrls).toHaveLength(0)
    await act(async () => root.unmount())
    root = createRoot(host)

    const small = pngRgba(319, 200, indexedRgba(319, 200))
    const shaSmall = await sha256Hex(small)
    const smallReader = await seedBattleAsset('battle.small', small, shaSmall)
    await act(async () => {
      root.render(
        <ImageAssetThumbnail
          asset="battle.small"
          kind="battle-background"
          reader={smallReader}
          revision={shaSmall}
          paletteColors={paletteColors}
        />,
      )
    })
    await act(async () => {
      await bounded(signalAt(bitmapDeferreds, 1), '尺寸违例链未到达真实解码')
      await macrotaskTick()
    })
    const sizeChip = host.querySelector<HTMLElement>('.image-asset-thumb.error')
    expect(sizeChip, '尺寸违例错误芯片应在链排空后同步可见').not.toBeNull()
    expect(sizeChip?.getAttribute('title')).toBe('战场背景必须是 320×200，实际 319×200')
    expect(createdUrls).toHaveLength(0)
  })
})
