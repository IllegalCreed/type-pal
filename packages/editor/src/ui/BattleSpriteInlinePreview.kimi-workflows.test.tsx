// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K01：BattleSpriteInlinePreview 异步归属补测。
 *
 * 旧断言去重：BattleSpriteInlinePreview.test.tsx 两例已证资源库布局平铺/比例与紧凑预览
 * 分组循环——均用同步即返回的 reader，未证异步归属。本文件补：
 * - 迟到解码结果不得覆盖已切换的新选择（effect alive 归属 + proof 绑定 asset/sha256）；
 * - record 缺失/kind 不符的同步 fail-loud（不冒充永久加载中）；
 * - loadBattleSpriteDefinition 期望不符的真实拒绝与缺资源空态。
 * 全部走真实 BattleSpriteAssetCache/解码链；唯一闸门在磁盘 I/O 端口（kit.gatedFileSource）。
 */
import {
  compressGzip,
  decodeBattleSpriteAssetBytes,
  encodeSpriteChunk,
  loadStandardPalette,
  quantizeToRleFrame,
} from '@type-pal/reforge'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { prepareBattleSpriteImport } from '../core/battle-sprite-import.js'
import { AddBattleSpriteCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { loadLegalUiProject, useActEnvironment } from './__tests__/glm-ui-wave-kit.js'
import {
  atlasColors,
  gatedFileSource,
  installBrowserHardwarePorts,
  solidRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import {
  BattleSpriteInlinePreview,
  type BattleSpritePreviewProof,
  type BattleSpriteResourceSnapshot,
} from './BattleSpriteInlinePreview.js'

const STARTER_ASSET = 'battle-sprite.generated.starter'
const STARTER_PATH = 'assets/generated/battle-sprites/starter.rle'

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('K01 BattleSpriteInlinePreview 异步归属', () => {
  test('迟到解码结果不得覆盖已切换的新选择', async () => {
    const legal = await loadLegalUiProject('kimi-k01-preview')
    const gate = gatedFileSource(legal.source)
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(gate.source, () => session.getState())

    // 第二资源：真实命令入库（pending blob → 读立即返回），帧数刻意不同。
    const palette = await loadStandardPalette(legal.assetBase)
    const framesB = atlasColors(6).map((color) =>
      quantizeToRleFrame(solidRgba(8, 8, color), 8, 8, palette),
    )
    const gzip = await compressGzip(encodeSpriteChunk(framesB))
    const bytesB = gzip.buffer.slice(
      gzip.byteOffset,
      gzip.byteOffset + gzip.byteLength,
    ) as ArrayBuffer
    const preparedB = await prepareBattleSpriteImport(session.getState(), {
      hint: 'k01-late-b',
      label: '迟到对照乙',
      kind: 'enemy',
      bytes: bytesB,
      frameCount: framesB.length,
      reader,
    })
    session.dispatch(
      new AddBattleSpriteCommand(preparedB.definition, preparedB.record, preparedB.bytes, 6),
    )
    const assetB = preparedB.definition.asset

    // A 的真实帧数（不经闸门，直接解码磁盘真值）。
    const recordA = session.getState().assetCatalog.assets[STARTER_ASSET]!
    const decodedA = await decodeBattleSpriteAssetBytes(
      recordA,
      await legal.source.readBytes(recordA.path),
      'K01 对照 A',
    )
    expect(decodedA.frames.length).not.toBe(6)

    const proofs: Array<BattleSpritePreviewProof | undefined> = []
    const snapshots: Array<BattleSpriteResourceSnapshot | undefined> = []
    const renderPreview = (asset: string) => (
      <BattleSpriteInlinePreview
        asset={asset}
        label={asset === STARTER_ASSET ? '甲资源' : '乙资源'}
        assetBase={legal.assetBase}
        assetReader={reader}
        layout="library"
        onLoaded={(proof) => proofs.push(proof)}
        onResourceLoaded={(snapshot) => snapshots.push(snapshot)}
      />
    )

    // 进入见证：A 的磁盘读取已开始但未放行 → 加载中，不得冒充就绪。
    const hold = gate.gate(STARTER_PATH)
    await act(async () => {
      root.render(renderPreview(STARTER_ASSET))
      await Promise.resolve()
    })
    expect(gate.calls).toContain(STARTER_PATH)
    expect(gate.completed).not.toContain(STARTER_PATH)
    expect(host.textContent).toContain('加载战斗精灵原始帧…')

    // 切换到 B：B 真实解码完成并交付 proof；A 仍在途。
    await act(async () => {
      root.render(renderPreview(assetB))
      await Promise.resolve()
    })
    await vi.waitFor(() => {
      expect(proofs.at(-1)?.asset).toBe(assetB)
    })
    expect(proofs.at(-1)?.actualFrameCount).toBe(6)
    expect(proofs.at(-1)?.sha256).toBe(preparedB.record.sha256)
    expect(snapshots.at(-1)?.frames).toHaveLength(6)

    // 放行迟到的 A：A 的读取真实完成（退出见证），但归属已失效，不得盖掉 B。
    proofs.length = 0
    snapshots.length = 0
    hold.resolve()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(gate.completed).toContain(STARTER_PATH)
    const definedAfterRelease = proofs.filter(
      (proof): proof is BattleSpritePreviewProof => proof !== undefined,
    )
    expect(definedAfterRelease.every((proof) => proof.asset === assetB)).toBe(true)
    expect(snapshots.filter(Boolean)).toHaveLength(0)
    expect(host.textContent).toContain('6 帧 · 0 个用途定义')
  })

  test('record 缺失或 kind 不符立即 fail-loud，不冒充加载中', async () => {
    const legal = await loadLegalUiProject('kimi-k01-preview-record')
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(legal.source, () => session.getState())
    const proofs: Array<BattleSpritePreviewProof | undefined> = []

    await act(async () => {
      root.render(
        <BattleSpriteInlinePreview
          asset="battle-sprite.absent"
          assetBase={legal.assetBase}
          assetReader={reader}
          layout="library"
          onLoaded={(proof) => proofs.push(proof)}
        />,
      )
      await Promise.resolve()
    })
    await vi.waitFor(() => {
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        'AssetId "battle-sprite.absent" 不在 catalog',
      )
    })
    expect(host.textContent).not.toContain('加载战斗精灵原始帧…')
    expect(proofs.filter(Boolean)).toHaveLength(0)

    // kind 不符同样同步拒绝。
    await act(async () => {
      root.render(
        <BattleSpriteInlinePreview
          asset="tileset.generated.starter"
          assetBase={legal.assetBase}
          assetReader={reader}
          layout="library"
          onLoaded={(proof) => proofs.push(proof)}
        />,
      )
      await Promise.resolve()
    })
    await vi.waitFor(() => {
      expect(host.querySelector('[role="alert"]')?.textContent).toContain(
        '期望 battle-sprite，实际 tileset',
      )
    })

    // 正控：合法资源正常解码出真实帧数。
    const record = session.getState().assetCatalog.assets[STARTER_ASSET]!
    const decoded = await decodeBattleSpriteAssetBytes(
      record,
      await legal.source.readBytes(record.path),
      'K01 正控',
    )
    await act(async () => {
      root.render(
        <BattleSpriteInlinePreview
          asset={STARTER_ASSET}
          assetBase={legal.assetBase}
          assetReader={reader}
          layout="library"
          onLoaded={(proof) => proofs.push(proof)}
        />,
      )
      await Promise.resolve()
    })
    await vi.waitFor(() => {
      expect(proofs.at(-1)?.actualFrameCount).toBe(decoded.frames.length)
    })
    expect(proofs.at(-1)?.sha256).toBe(record.sha256)
    expect(host.textContent).toContain(`${decoded.frames.length} 帧 · 0 个用途定义`)
  })

  test('profile 期望不符走真实拒绝；缺资源空态与正常加载分明', async () => {
    const legal = await loadLegalUiProject('kimi-k01-preview-kind')
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(legal.source, () => session.getState())
    const palette = await loadStandardPalette(legal.assetBase)
    const frames = atlasColors(4).map((color) =>
      quantizeToRleFrame(solidRgba(8, 8, color), 8, 8, palette),
    )
    const gzip = await compressGzip(encodeSpriteChunk(frames))
    const bytes = gzip.buffer.slice(
      gzip.byteOffset,
      gzip.byteOffset + gzip.byteLength,
    ) as ArrayBuffer
    const prepared = await prepareBattleSpriteImport(session.getState(), {
      hint: 'k01-kind',
      label: '期望对照',
      kind: 'enemy',
      bytes,
      frameCount: frames.length,
      reader,
    })
    session.dispatch(
      new AddBattleSpriteCommand(prepared.definition, prepared.record, prepared.bytes, 4),
    )
    const proofs: Array<BattleSpritePreviewProof | undefined> = []

    // 期望不符：loadBattleSpriteDefinition 真实拒绝（definition + 紧凑布局路径）。
    await act(async () => {
      root.render(
        <BattleSpriteInlinePreview
          definition={prepared.definition}
          expected="player-fighter"
          assetBase={legal.assetBase}
          assetReader={reader}
          onLoaded={(proof) => proofs.push(proof)}
        />,
      )
      await Promise.resolve()
    })
    await vi.waitFor(() => {
      expect(host.querySelector('.err')?.textContent).toContain(
        'profile 期望 player-fighter，实际 enemy',
      )
    })
    expect(proofs.filter(Boolean)).toHaveLength(0)

    // 正控：期望相符真实加载并标注帧数。
    await act(async () => {
      root.render(
        <BattleSpriteInlinePreview
          definition={prepared.definition}
          expected="enemy"
          assetBase={legal.assetBase}
          assetReader={reader}
          onLoaded={(proof) => proofs.push(proof)}
        />,
      )
      await Promise.resolve()
    })
    await vi.waitFor(() => {
      expect(proofs.at(-1)?.actualFrameCount).toBe(4)
    })
    expect(host.textContent).toContain(
      `${prepared.definition.label} · ${prepared.definition.id} · 4 帧`,
    )

    // 空态：无 definition 且无 asset → 不伪造 summon，不转圈。
    await act(async () => {
      root.render(
        <BattleSpriteInlinePreview
          assetBase={legal.assetBase}
          assetReader={reader}
          onLoaded={(proof) => proofs.push(proof)}
        />,
      )
      await Promise.resolve()
    })
    expect(host.textContent).toContain('战斗精灵源文件不存在')
  })
})
