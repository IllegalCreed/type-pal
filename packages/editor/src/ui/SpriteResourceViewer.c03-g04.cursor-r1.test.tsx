// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C03-G04：SpriteResourceViewer 迟到 I/O、失败与恢复。
 * 排重：SpriteResourceViewer.test 用 mock deferred 证 alive 标志与失败 workspace；
 * kimi-workflows K02 证 append/replace 命令链。本组只补：磁盘 readBytes 闸门迟到、
 * 真实解码/sha 失败、切资源清错、revision 变更重载、卸载归属与色盘 I/O 失败恢复。
 */
import type { AssetId } from '@type-pal/content'
import {
  compressGzip,
  encodeSpriteChunk,
  loadStandardPalette,
  quantizeToRleFrame,
} from '@type-pal/reforge'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  installBrowserHardwarePorts,
  pngFileOf,
  solidRgba,
} from '../__tests__/cursor-asset-r1/image-ports.js'
import {
  gatedFileSource,
  loadFilesIntoInput,
  useActEnvironment,
} from '../__tests__/cursor-asset-r1/kit.js'
import { loadCursorSpriteProject } from '../__tests__/cursor-asset-r1/sprite-fixtures.js'
import {
  type MountedViewer,
  mountViewer,
  unmountHost,
} from '../__tests__/cursor-asset-r1/upload-harness.js'
import { gatePalette, installGatedBitmapPort } from '../__tests__/cursor-asset-r1/upload-ports.js'
import { appendInput, waitEditorMessage, waitMeta } from '../__tests__/cursor-asset-r1/upload-ui.js'
import { sha256Hex } from '../core/binary-signature.js'
import { ReplaceSpriteAssetCommand } from '../core/commands.js'

const PAIR = [
  {
    asset: 'sprite.late.a' as AssetId,
    label: 'LateA',
    frameCount: 3,
    definitions: [{ id: 'late-a', label: 'A 用途', layout: { kind: 'static' as const } }],
  },
  {
    asset: 'sprite.late.b' as AssetId,
    label: 'LateB',
    frameCount: 1,
    definitions: [{ id: 'late-b', label: 'B 用途', layout: { kind: 'static' as const } }],
  },
] as const

let mounted: MountedViewer | undefined

beforeEach(async () => {
  useActEnvironment()
  await installBrowserHardwarePorts()
})

afterEach(async () => {
  if (mounted) await unmountHost(mounted)
  mounted = undefined
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C03-G04 迟到、失败与恢复', () => {
  test('C03-G04-01 磁盘 readBytes 迟到：先切走资源，旧读完成不覆盖新资源帧数', async () => {
    const project = await loadCursorSpriteProject('c03-g04-01', PAIR)
    const gated = gatedFileSource(project.source)
    const slowPath = project.seeded.get('sprite.late.a')!.path
    const hold = gated.gate(slowPath)
    mounted = await mountViewer(project, {
      asset: 'sprite.late.a',
      label: '慢 A',
      source: gated.source,
    })
    expect(mounted.host.textContent).toContain('正在解析帧资源 sprite.late.a')
    await mounted.setAsset('sprite.late.b', '快 B')
    hold.resolve()
    await waitMeta(mounted.host, 1, 1)
    expect(mounted.host.textContent).toContain('快 B')
    expect(mounted.host.textContent).toContain('1 帧')
    expect(mounted.host.textContent).not.toContain('3 帧')
    expect(mounted.proofs.at(-1)?.asset).toBe('sprite.late.b')
  })

  test('C03-G04-02 损坏字节真实解码失败：role=alert 且 onLoaded 末次为 undefined', async () => {
    const project = await loadCursorSpriteProject('c03-g04-02', [
      {
        asset: 'sprite.late.bad' as AssetId,
        label: 'Bad',
        frameCount: 2,
        corruptBytes: true,
        definitions: [{ id: 'bad-use', label: '坏资源', layout: { kind: 'static' } }],
      },
    ])
    mounted = await mountViewer(project, {
      asset: 'sprite.late.bad',
      label: '损坏',
    })
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('[role="alert"]')).not.toBeNull()
    })
    expect(mounted.proofs.at(-1)).toBeUndefined()
    expect(mounted.framesLog.at(-1)).toEqual([])
  })

  test('C03-G04-03 失败后切到合法资源：清 alert 并给出 proof', async () => {
    const project = await loadCursorSpriteProject('c03-g04-03', [
      ...PAIR,
      {
        asset: 'sprite.late.bad' as AssetId,
        label: 'Bad',
        frameCount: 1,
        corruptBytes: true,
        definitions: [{ id: 'bad-use', label: '坏', layout: { kind: 'static' } }],
      },
    ])
    mounted = await mountViewer(project, {
      asset: 'sprite.late.bad',
      label: '损坏',
    })
    await vi.waitFor(() => expect(mounted!.host.querySelector('[role="alert"]')).not.toBeNull())
    await mounted.setAsset('sprite.late.b', '好 B')
    await waitMeta(mounted.host, 1, 1)
    expect(mounted.host.querySelector('[role="alert"]')).toBeNull()
    expect(mounted.proofs.at(-1)?.actualFrameCount).toBe(1)
  })

  test('C03-G04-04 增帧 Replace 后会话 revision 更新且 viewer 读到 3 帧', async () => {
    const project = await loadCursorSpriteProject('c03-g04-04', PAIR)
    mounted = await mountViewer(project, {
      asset: 'sprite.late.b',
      label: 'B',
    })
    await waitMeta(mounted.host, 1, 1)
    const record = mounted.session.getState().assetCatalog.assets['sprite.late.b']!
    const prevBytes = project.seeded.get('sprite.late.b')!.bytes
    const palette = await loadStandardPalette(project.assetBase)
    const frames = (
      [
        [90, 100, 110, 255],
        [120, 130, 140, 255],
        [150, 160, 170, 255],
      ] as const
    ).map((color) => quantizeToRleFrame(solidRgba(10, 10, color), 10, 10, palette))
    const gzip = await compressGzip(encodeSpriteChunk(frames))
    const bytes = gzip.buffer.slice(
      gzip.byteOffset,
      gzip.byteOffset + gzip.byteLength,
    ) as ArrayBuffer
    const sha = await sha256Hex(bytes)
    mounted.session.dispatch(
      new ReplaceSpriteAssetCommand(
        'late-b',
        'sprite.late.b',
        {
          ...record,
          sha256: sha,
          bytes: bytes.byteLength,
          path: `assets/authored/sprites/${sha}.rle`,
        },
        bytes,
        prevBytes,
        {
          asset: 'sprite.late.b',
          previousSha256: record.sha256,
          previousFrameCount: 1,
          nextFrameCount: 3,
          consumerIds: ['late-b'],
        },
        '增帧替换',
      ),
    )
    await vi.waitFor(() => {
      expect(mounted!.proofs.at(-1)?.revision).toBe(sha)
      expect(mounted!.proofs.at(-1)?.actualFrameCount).toBe(3)
    })
    await waitMeta(mounted.host, 3, 1)
  })

  test('C03-G04-05 解码在途卸载：不抛错且末次 proof 为 undefined', async () => {
    const project = await loadCursorSpriteProject('c03-g04-05', PAIR)
    const gated = gatedFileSource(project.source)
    const hold = gated.gate(project.seeded.get('sprite.late.a')!.path)
    mounted = await mountViewer(project, {
      asset: 'sprite.late.a',
      label: 'A',
      source: gated.source,
    })
    await unmountHost(mounted)
    hold.resolve()
    await vi.waitFor(() =>
      expect(gated.completed).toContain(project.seeded.get('sprite.late.a')!.path),
    )
    expect(mounted.proofs.at(-1)).toBeUndefined()
    mounted = undefined
  })

  test('C03-G04-06 色盘 I/O 迟到：放行后才出现帧网格与 proof', async () => {
    const project = await loadCursorSpriteProject('c03-g04-06', PAIR)
    const { assetBase, hold } = gatePalette(project.assetBase)
    mounted = await mountViewer(project, {
      asset: 'sprite.late.b',
      label: 'B',
      assetBase,
    })
    await vi.waitFor(() => expect(mounted!.host.textContent).toContain('正在解析'))
    hold.resolve()
    await waitMeta(mounted.host, 1, 1)
    expect(mounted.host.querySelector('.sprite-resource-frame-grid')).not.toBeNull()
    expect(mounted.proofs.at(-1)?.actualFrameCount).toBe(1)
  })

  test('C03-G04-07 连续快速切换 A→B→A：最终 proof 仍指向 A 且帧数 3', async () => {
    const project = await loadCursorSpriteProject('c03-g04-07', PAIR)
    mounted = await mountViewer(project, {
      asset: 'sprite.late.a',
      label: 'A',
    })
    await waitMeta(mounted.host, 3, 1)
    await mounted.setAsset('sprite.late.b', 'B')
    await waitMeta(mounted.host, 1, 1)
    await mounted.setAsset('sprite.late.a', 'A2')
    await waitMeta(mounted.host, 3, 1)
    expect(mounted.proofs.at(-1)).toMatchObject({
      asset: 'sprite.late.a',
      actualFrameCount: 3,
    })
  })

  test('C03-G04-08 失败后再切仍失败：alert 更新为第二次错误文案', async () => {
    const project = await loadCursorSpriteProject('c03-g04-08', [
      {
        asset: 'sprite.late.bad1' as AssetId,
        label: 'Bad1',
        frameCount: 1,
        corruptBytes: true,
        definitions: [{ id: 'b1', label: 'B1', layout: { kind: 'static' } }],
      },
      {
        asset: 'sprite.late.bad2' as AssetId,
        label: 'Bad2',
        frameCount: 1,
        corruptBytes: true,
        definitions: [{ id: 'b2', label: 'B2', layout: { kind: 'static' } }],
      },
    ])
    mounted = await mountViewer(project, {
      asset: 'sprite.late.bad1',
      label: '坏1',
    })
    await vi.waitFor(() => expect(mounted!.host.querySelector('[role="alert"]')).not.toBeNull())
    const first = mounted.host.querySelector('[role="alert"]')!.textContent
    await mounted.setAsset('sprite.late.bad2', '坏2')
    await vi.waitFor(() => {
      const next = mounted!.host.querySelector('[role="alert"]')!.textContent
      expect(next).not.toBe(first)
    })
  })

  test('C03-G04-09 追加帧选非 PNG 字节：editor message 报错且零历史', async () => {
    await installGatedBitmapPort()
    const project = await loadCursorSpriteProject('c03-g04-09', PAIR)
    mounted = await mountViewer(project, {
      asset: 'sprite.late.b',
      label: 'B',
    })
    await waitMeta(mounted.host, 1, 1)
    await loadFilesIntoInput(appendInput(mounted.host), [
      pngFileOf('bad-append.png', new Uint8Array([9, 9, 9])),
    ])
    const message = await waitEditorMessage(mounted.host)
    expect(message.classList.contains('error')).toBe(true)
    expect(mounted.session.getHistoryVersion()).toBe(0)
  })

  test('C03-G04-10 合法资源加载后 framesLog 与网格 aria 数一致', async () => {
    const project = await loadCursorSpriteProject('c03-g04-10', PAIR)
    mounted = await mountViewer(project, {
      asset: 'sprite.late.a',
      label: 'A',
    })
    await waitMeta(mounted.host, 3, 1)
    expect(mounted.framesLog.at(-1)).toHaveLength(3)
    expect(
      mounted.host.querySelectorAll('.sprite-resource-frame-grid [aria-label^="选择源帧 "]'),
    ).toHaveLength(3)
  })
})
