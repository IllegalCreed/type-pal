// @vitest-environment jsdom
/**
 * K02：经真实 Viewer UI 证明源帧追加/替换/删除、原子姿势修复、取消与迟到归属。
 * 使用正式 loader 自证合法项目，PNG 为真实可解码字节；reader/cache/session/命令不替换。
 * 共享宿主跟随 session 提供 revision/consumers，硬件端口和磁盘闸门只控制外部 IO。
 * 编码算法由 codec 测试负责；本组验证 UI 到 catalog/blob/undo 的接线及字段保全。
 */

import type { AssetId } from '@type-pal/content'
import {
  compressGzip,
  decodeWorldSpriteAssetBytes,
  encodeSpriteChunk,
  type FileSource,
  loadStandardPalette,
  quantizeToRleFrame,
  type RleFrame,
} from '@type-pal/reforge'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  type MountedViewer,
  mountViewer as mountSharedViewer,
  unmountHost,
  waitForSpriteViewerResources,
} from '../__tests__/cursor-asset-r1/upload-harness.js'
import { sha256Hex } from '../core/binary-signature.js'
import { AddSpriteDefinitionCommand } from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  clickButton,
  deepSnapshot,
  loadFilesIntoInput,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { type K02Project, loadK02Project } from './__tests__/kimi-editor-workflows/k02-fixtures.js'
import {
  atlasColors,
  gatedFileSource,
  installBrowserHardwarePorts,
  pngFileOf,
  solidAtlasPng,
  solidRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import type { SpriteResourceLoadProof } from './SpriteResourceViewer.js'

const FRAME = 8
const STARTER_ASSET = 'sprite.generated.starter'
const STARTER_PATH = 'assets/generated/sprites/starter.rle'

let host: HTMLDivElement
let activeViewer: MountedViewer | undefined

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
})

afterEach(async () => {
  try {
    if (activeViewer) await unmountHost(activeViewer)
  } finally {
    activeViewer = undefined
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

async function mountViewer(
  project: K02Project,
  input: { asset: AssetId; label: string; source?: FileSource; waitForResource?: boolean },
): Promise<MountedViewer> {
  activeViewer = await mountSharedViewer(project, input)
  host = activeViewer.host
  return activeViewer
}

/** 以当前 catalog/blob/磁盘真实解码（含 sha256/bytes/gzip 校验），不绕过产品校验。 */
async function decodeCurrent(mounted: MountedViewer, asset: AssetId) {
  const record = mounted.session.getState().assetCatalog.assets[asset]
  expect(record, `catalog 应有 ${asset}`).toBeDefined()
  const pending = mounted.session.getState().assetBlobs[record!.path]
  const bytes = pending ? pending.slice(0) : await mounted.project.source.readBytes(record!.path)
  return decodeWorldSpriteAssetBytes(record!, bytes, `K02 断言 ${asset}`)
}

async function waitMeta(frames: number, consumers: number): Promise<void> {
  await waitForSpriteViewerResources(host)
  expect(host.textContent).toContain(`${frames} 帧 · ${consumers} 个用途定义`)
}

/** 等真实读取完成，再独立断言 proof 归属；错误结果不能被轮询当作尚未完成。 */
async function waitProofTracking(
  mounted: MountedViewer,
  asset: AssetId,
): Promise<SpriteResourceLoadProof> {
  await waitForSpriteViewerResources(mounted.host, asset)
  const sha = mounted.session.getState().assetCatalog.assets[asset]?.sha256
  expect(sha).toBeDefined()
  expect(mounted.proofs.at(-1)).toEqual(expect.objectContaining({ asset, revision: sha }))
  return mounted.proofs.at(-1)!
}

/** 透传观察实际 PNG 解码，不另行启动解码或猜测宏任务次数。 */
async function pickImage(input: HTMLInputElement, file: File): Promise<void> {
  const bitmap = vi.spyOn(globalThis, 'createImageBitmap')
  try {
    await act(async () => {
      await loadFilesIntoInput(input, [file])
      expect(bitmap).toHaveBeenCalledExactlyOnceWith(file)
      const result = bitmap.mock.results[0]
      if (!result || result.type !== 'return') throw new Error('PNG decode did not start')
      await result.value
    })
  } finally {
    bitmap.mockRestore()
  }
}

/** 状态通知是实际提交/错误出口；等待期间保持 act，再等 revision 的真实重读。 */
async function editAndWait(mounted: MountedViewer, interact: () => Promise<void>): Promise<void> {
  const mark = mounted.notices.length
  await act(async () => {
    await interact()
    await vi.waitFor(() => expect(mounted.notices.length).toBeGreaterThan(mark))
  })
  await waitForSpriteViewerResources(mounted.host)
}

/** 读取已完成交互的反馈，文本与 kind 由业务断言核实。 */
function rawEditorMessage(): HTMLElement {
  expect(host.querySelector('.sprite-raw-editor-message')).not.toBeNull()
  return host.querySelector<HTMLElement>('.sprite-raw-editor-message')!
}

function hiddenImageInputs(): HTMLInputElement[] {
  return [...host.querySelectorAll<HTMLInputElement>('input[type="file"].sprite-hidden-file-input')]
}

async function selectFrameCell(index: number): Promise<void> {
  const cell = host.querySelector<HTMLElement>(`[data-source-frame-index="${index}"]`)
  expect(cell, `源帧格子 ${index}`).not.toBeNull()
  await act(async () => cell!.click())
}

/** 从编辑前帧与显式像素构建期望容器，检验接线，不重复证明编码算法。 */
async function expectedAssetBytes(frames: RleFrame[]) {
  const gzip = await compressGzip(encodeSpriteChunk(frames))
  const bytes = gzip.buffer.slice(gzip.byteOffset, gzip.byteOffset + gzip.byteLength) as ArrayBuffer
  return { bytes, sha256: await sha256Hex(bytes) }
}

describe('K02 SpriteResourceViewer 真实帧编辑工作流', () => {
  test('追加源帧：真实量化编码入库、共享用途逐字段保全、reader 重读 14 帧、undo/redo 对称', async () => {
    const project = await loadK02Project('k02-viewer-append', [])
    const mounted = await mountViewer(project, { asset: STARTER_ASSET, label: '占位主角' })
    await waitMeta(12, 1)
    expect(host.textContent).toContain('这 12 帧由 1 个用途共享；修改源帧会同时影响它们。')
    const heroBefore = deepSnapshot(
      mounted.session.getState().sprites.find((entry) => entry.id === 'hero')!,
    )
    const recordBefore = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    const decodedBefore = await decodeCurrent(mounted, STARTER_ASSET)
    expect(decodedBefore.frames).toHaveLength(12)

    const palette = await loadStandardPalette(project.assetBase)
    const appendedColors = [atlasColors(16)[10]!, atlasColors(16)[11]!]
    const expectedAppended = appendedColors.map((color) =>
      quantizeToRleFrame(solidRgba(FRAME, FRAME, color), FRAME, FRAME, palette),
    )
    const expected = await expectedAssetBytes([...decodedBefore.frames, ...expectedAppended])

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await clickButton(host, '追加帧')
    const atlas = solidAtlasPng(FRAME, FRAME, appendedColors)
    await pickImage(hiddenImageInputs()[1]!, pngFileOf('追加两帧.png', atlas.bytes))
    expect(host.textContent).toContain('将 16×8 图片切为')
    const panel = host.querySelector<HTMLElement>('.sprite-raw-append-panel')!
    await setInputValue(panel.querySelectorAll<HTMLInputElement>('input')[0]!, '2')
    expect(panel.textContent).toContain('2 帧，每帧 8×8')
    const historyBefore = mounted.session.getHistoryVersion()
    await editAndWait(mounted, () => clickButton(host, '确认追加'))
    expect(confirm).toHaveBeenCalledWith('追加 2 帧会更新 1 个用途共享的源帧容器。继续吗？')
    // 成功消息随 revision 重载被 viewer 清空，持久证据是状态栏通知与 catalog/blob。
    expect(mounted.notices.at(-1)).toEqual({ kind: 'info', message: '追加源帧 ×2；可撤销。' })
    expect(mounted.session.getHistoryVersion()).toBeGreaterThan(historyBefore)

    const record = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    expect(record.path).toBe(`assets/authored/sprites/${expected.sha256}.rle`)
    expect(record.sha256).toBe(expected.sha256)
    expect(record.bytes).toBe(expected.bytes.byteLength)
    expect(record.origin).toEqual({ kind: 'authored' })
    const blob = mounted.session.getState().assetBlobs[record.path]
    expect(blob).toBeDefined()
    expect(await sha256Hex(blob!.slice(0))).toBe(expected.sha256)
    expect(mounted.session.getState().sprites.find((entry) => entry.id === 'hero')).toEqual(
      heroBefore,
    )
    assertProjectSaveValid(mounted.session.getState())

    const proof = await waitProofTracking(mounted, STARTER_ASSET)
    expect(proof.actualFrameCount).toBe(14)
    expect(mounted.framesLog.at(-1)).toHaveLength(14)
    expect(host.textContent).toContain('14 帧 · 1 个用途定义')
    expect(host.textContent).toContain('已选择源帧 12，共 14 帧')
    const decoded = await decodeCurrent(mounted, STARTER_ASSET)
    expect(decoded.frames).toHaveLength(14)
    expect(decoded.frames[0]).toEqual(decodedBefore.frames[0])
    expect(decoded.frames[11]).toEqual(decodedBefore.frames[11])
    expect(decoded.frames[12]).toEqual(expectedAppended[0])
    expect(decoded.frames[13]).toEqual(expectedAppended[1])

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      recordBefore.sha256,
    )
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.path).toBe(
      recordBefore.path,
    )
    const restoredProof = await waitProofTracking(mounted, STARTER_ASSET)
    expect(restoredProof.actualFrameCount).toBe(12)
    const restored = await decodeCurrent(mounted, STARTER_ASSET)
    expect(restored.frames).toHaveLength(12)
    expect(restored.frames[0]).toEqual(decodedBefore.frames[0])

    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      expected.sha256,
    )
    expect((await waitProofTracking(mounted, STARTER_ASSET)).actualFrameCount).toBe(14)
    const redone = await decodeCurrent(mounted, STARTER_ASSET)
    expect(redone.frames).toHaveLength(14)
  })

  test('替换当前帧：双用途 confirm 取消侧零提交、放行侧真实重编码且双定义保全、undo 还原字节', async () => {
    const project = await loadK02Project('k02-viewer-replace', [])
    const mounted = await mountViewer(project, { asset: STARTER_ASSET, label: '占位主角' })
    // 第二个共享用途：经生产命令 + 真实 proof（sha/帧数取自真实解码）入库。
    const decodedBefore = await decodeCurrent(mounted, STARTER_ASSET)
    const recordBefore = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    await act(async () => {
      mounted.session.dispatch(
        new AddSpriteDefinitionCommand(
          { id: 'hero-alt', asset: STARTER_ASSET, label: '主角定格', layout: { kind: 'static' } },
          {
            asset: STARTER_ASSET,
            sha256: recordBefore.sha256,
            actualFrameCount: decodedBefore.frames.length,
          },
        ),
      )
    })
    await waitMeta(12, 2)
    const spritesBefore = deepSnapshot(mounted.session.getState().sprites)
    await selectFrameCell(5)
    expect(host.textContent).toContain('已选择源帧 5，共 12 帧')

    const palette = await loadStandardPalette(project.assetBase)
    const replacementColor = atlasColors(16)[14]!
    const expectedCell = quantizeToRleFrame(
      solidRgba(FRAME, FRAME, replacementColor),
      FRAME,
      FRAME,
      palette,
    )
    const replacement = solidAtlasPng(FRAME, FRAME, [replacementColor])
    const expected = await expectedAssetBytes(
      decodedBefore.frames.map((frame, index) => (index === 5 ? expectedCell : frame)),
    )

    // 取消侧：真实解码与量化已发生，但 confirm=false → 零提交、零消息、零重读。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const historyBefore = mounted.session.getHistoryVersion()
    const proofCount = mounted.proofs.length
    const frameDeliveryCount = mounted.framesLog.length
    await clickButton(host, '替换当前帧')
    await pickImage(hiddenImageInputs()[0]!, pngFileOf('单帧替换.png', replacement.bytes))
    expect(confirm).toHaveBeenCalledWith('替换源帧 #5 会同时影响 2 个用途。继续吗？')
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      recordBefore.sha256,
    )
    expect(host.querySelector('.sprite-raw-editor-message')).toBeNull()
    expect(mounted.proofs.at(-1)?.revision).toBe(recordBefore.sha256)
    expect(mounted.proofs).toHaveLength(proofCount)
    expect(mounted.framesLog).toHaveLength(frameDeliveryCount)

    // 放行侧：ReplaceSpriteAssetCommand 真实入库，两个用途定义逐字段不动。
    confirm.mockReturnValue(true)
    await clickButton(host, '替换当前帧')
    await editAndWait(mounted, () =>
      pickImage(hiddenImageInputs()[0]!, pngFileOf('单帧替换.png', replacement.bytes)),
    )
    expect(mounted.notices.at(-1)).toEqual({ kind: 'info', message: '替换源帧 #5；可撤销。' })

    const record = mounted.session.getState().assetCatalog.assets[STARTER_ASSET]!
    expect(record.sha256).toBe(expected.sha256)
    expect(record.path).toBe(`assets/authored/sprites/${expected.sha256}.rle`)
    expect(record.bytes).toBe(expected.bytes.byteLength)
    expect(mounted.session.getState().sprites).toEqual(spritesBefore)
    const proof = await waitProofTracking(mounted, STARTER_ASSET)
    expect(proof.actualFrameCount).toBe(12)
    const decoded = await decodeCurrent(mounted, STARTER_ASSET)
    expect(decoded.frames).toHaveLength(12)
    expect(decoded.frames[4]).toEqual(decodedBefore.frames[4])
    expect(decoded.frames[5]).toEqual(expectedCell)
    expect(decoded.frames[6]).toEqual(decodedBefore.frames[6])

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      recordBefore.sha256,
    )
    expect((await waitProofTracking(mounted, STARTER_ASSET)).actualFrameCount).toBe(12)
    const restored = await decodeCurrent(mounted, STARTER_ASSET)
    expect(restored.frames[5]).toEqual(decodedBefore.frames[5])
    expect(mounted.session.getState().sprites).toEqual(spritesBefore)
  })

  test('删除源帧：姿势修复随替换原子提交、confirm 列精确冲击清单、取消零提交、undo 全还原', async () => {
    const project = await loadK02Project('k02-viewer-delete', [
      {
        asset: 'sprite.authored.k02six',
        label: 'K02Six',
        frameCount: 6,
        definitions: [
          {
            id: 'k02-six-main',
            label: 'K02SixMain',
            layout: { kind: 'static' },
            poses: {
              flash: {
                label: '闪烁',
                steps: [
                  { frame: 1, durationMs: 100 },
                  { frame: 4, durationMs: 200 },
                  { frame: 5, durationMs: 300 },
                ],
              },
            },
          },
          { id: 'k02-six-plain', label: 'K02SixPlain', layout: { kind: 'static' } },
        ],
      },
    ])
    const seeded = project.seeded.get('sprite.authored.k02six')!
    const mounted = await mountViewer(project, {
      asset: 'sprite.authored.k02six',
      label: 'K02Six',
    })
    await waitMeta(6, 2)
    const spritesBefore = deepSnapshot(mounted.session.getState().sprites)
    await selectFrameCell(2)

    // 取消侧：confirm 列出精确修复清单，confirm=false → 零提交、姿势不动。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const historyBefore = mounted.session.getHistoryVersion()
    await clickButton(host, '删除当前帧')
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('删除源帧 #2？'))
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('同步修复'))
    expect(confirm).toHaveBeenCalledWith(
      expect.stringContaining('K02SixMain·闪烁：[1, 4, 5] → [1, 3, 4]'),
    )
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(mounted.session.getState().assetCatalog.assets['sprite.authored.k02six']?.sha256).toBe(
      seeded.sha256,
    )
    expect(mounted.session.getState().sprites).toEqual(spritesBefore)
    expect(host.querySelector('.sprite-raw-editor-message')).toBeNull()

    // 放行侧：缩帧修复事务与资源替换同一命令提交。
    confirm.mockReturnValue(true)
    await editAndWait(mounted, () => clickButton(host, '删除当前帧'))
    expect(mounted.notices.at(-1)).toEqual({ kind: 'info', message: '删除源帧 #2；可撤销。' })

    const expected = await expectedAssetBytes(seeded.frames.filter((_, index) => index !== 2))
    const record = mounted.session.getState().assetCatalog.assets['sprite.authored.k02six']!
    expect(record.sha256).toBe(expected.sha256)
    expect(record.path).toBe(`assets/authored/sprites/${expected.sha256}.rle`)
    expect(record.bytes).toBe(expected.bytes.byteLength)
    const main = mounted.session.getState().sprites.find((entry) => entry.id === 'k02-six-main')!
    expect(main.layout).toEqual({ kind: 'static' })
    expect(main.poses).toEqual({
      flash: {
        label: '闪烁',
        steps: [
          { frame: 1, durationMs: 100 },
          { frame: 3, durationMs: 200 },
          { frame: 4, durationMs: 300 },
        ],
      },
    })
    expect(
      mounted.session.getState().sprites.find((entry) => entry.id === 'k02-six-plain'),
    ).toEqual(spritesBefore.find((entry) => entry.id === 'k02-six-plain'))
    const proof = await waitProofTracking(mounted, 'sprite.authored.k02six')
    expect(proof.actualFrameCount).toBe(5)
    expect(host.textContent).toContain('已选择源帧 2，共 5 帧')
    const decoded = await decodeCurrent(mounted, 'sprite.authored.k02six')
    expect(decoded.frames).toHaveLength(5)
    expect(decoded.frames[2]).toEqual(seeded.frames[3])
    expect(decoded.frames[4]).toEqual(seeded.frames[5])

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['sprite.authored.k02six']?.sha256).toBe(
      seeded.sha256,
    )
    expect(mounted.session.getState().sprites).toEqual(spritesBefore)
    expect((await waitProofTracking(mounted, 'sprite.authored.k02six')).actualFrameCount).toBe(6)
    const restored = await decodeCurrent(mounted, 'sprite.authored.k02six')
    expect(restored.frames).toHaveLength(6)
    expect(restored.frames[2]).toEqual(seeded.frames[2])
  })

  test('四向行走前缀内删帧被真实规划器阻断（错误反馈零提交）；单帧容器删除按钮禁用', async () => {
    const project = await loadK02Project('k02-viewer-block', [
      {
        asset: 'sprite.authored.k02one',
        label: 'K02One',
        frameCount: 1,
        definitions: [{ id: 'k02-one-user', label: 'K02OneUser', layout: { kind: 'static' } }],
      },
    ])
    const mounted = await mountViewer(project, { asset: STARTER_ASSET, label: '占位主角' })
    await waitMeta(12, 1)
    await selectFrameCell(0)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const historyBefore = mounted.session.getHistoryVersion()
    await clickButton(host, '删除当前帧')
    const message = rawEditorMessage()
    expect(message.classList.contains('error')).toBe(true)
    expect(message.textContent).toBe(
      '帧 #0 属于“占位主角”的四向行走结构；单独删除会打乱方向分组，请先在布局中调整每向帧数。',
    )
    expect(confirm).not.toHaveBeenCalled()
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.path).toBe(STARTER_PATH)
    expect(mounted.notices.at(-1)).toEqual({
      kind: 'error',
      message:
        '帧 #0 属于“占位主角”的四向行走结构；单独删除会打乱方向分组，请先在布局中调整每向帧数。',
    })
    const decoded = await decodeCurrent(mounted, STARTER_ASSET)
    expect(decoded.frames).toHaveLength(12)

    // 单帧容器：删除按钮随真实帧数禁用（loaded.sprite.frames.length <= 1 守卫）。
    await mounted.setAsset('sprite.authored.k02one', 'K02One')
    await waitMeta(1, 1)
    const deleteButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '删除当前帧',
    )!
    expect(deleteButton.disabled).toBe(true)
    expect(deleteButton.title).toBe('源帧至少保留一帧')
    expect(mounted.session.getState().assetCatalog.assets['sprite.authored.k02one']?.sha256).toBe(
      project.seeded.get('sprite.authored.k02one')!.sha256,
    )
  })

  test('迟到磁盘读取归属：闸门内旧资源完成后不得盖掉已切换的新选择，缓存结果归原资产', async () => {
    const project = await loadK02Project('k02-viewer-late', [
      {
        asset: 'sprite.authored.k02b',
        label: 'K02B',
        frameCount: 6,
        definitions: [{ id: 'k02-b-user', label: 'K02BUser', layout: { kind: 'static' } }],
      },
    ])
    const gate = gatedFileSource(project.source)
    // 闸门必须在首次渲染前安装：starter 的磁盘读取进入即被扣留。
    const hold = gate.gate(STARTER_PATH)
    const mounted = await mountViewer(project, {
      asset: STARTER_ASSET,
      label: '甲精灵',
      source: gate.source,
      waitForResource: false,
    })
    // 进入见证：starter 的磁盘读取已进入但未放行；加载中不得冒充就绪。
    expect(gate.calls).toContain(STARTER_PATH)
    expect(gate.completed).not.toContain(STARTER_PATH)
    expect(host.textContent).toContain('正在解析帧资源 sprite.generated.starter…')
    expect(host.textContent).toContain('正在解析')
    expect(mounted.proofs.filter(Boolean)).toHaveLength(0)

    // 切换到 B：真实解码完成并交付 proof；A 仍在途。
    await mounted.setAsset('sprite.authored.k02b', '乙精灵')
    expect(mounted.proofs.at(-1)).toEqual(
      expect.objectContaining({
        asset: 'sprite.authored.k02b',
        actualFrameCount: 6,
        revision: project.seeded.get('sprite.authored.k02b')!.sha256,
      }),
    )
    expect(host.textContent).toContain('6 帧 · 1 个用途定义')
    expect(host.textContent).toContain('乙精灵')
    expect(mounted.framesLog.at(-1)).toHaveLength(6)

    // 放行迟到的 A：读取真实完成（退出见证），但归属已失效，不得产生任何新 proof/帧交付。
    const mark = mounted.proofs.length
    const framesMark = mounted.framesLog.length
    await act(async () => {
      hold.resolve()
      await waitForSpriteViewerResources(host, STARTER_ASSET)
    })
    expect(gate.completed).toContain(STARTER_PATH)
    expect(mounted.proofs.slice(mark).filter(Boolean)).toHaveLength(0)
    expect(mounted.framesLog.slice(framesMark).filter((frames) => frames.length > 0)).toHaveLength(
      0,
    )
    expect(host.textContent).toContain('6 帧 · 1 个用途定义')
    expect(host.textContent).toContain('乙精灵')
    expect(host.textContent).not.toContain('12 帧 · 1 个用途定义')

    // 主动切回 A：迟到的读取已落入真实 SpriteAssetCache，无第二次磁盘读且 proof 归 A。
    const starterReads = gate.calls.filter((path) => path === STARTER_PATH).length
    expect(starterReads).toBe(1)
    await mounted.setAsset(STARTER_ASSET, '甲精灵')
    expect(gate.calls.filter((path) => path === STARTER_PATH)).toHaveLength(starterReads)
    expect(mounted.proofs.at(-1)).toEqual(
      expect.objectContaining({ asset: STARTER_ASSET, actualFrameCount: 12 }),
    )
    expect(host.textContent).toContain('12 帧 · 1 个用途定义')
    expect(host.textContent).toContain('甲精灵')
  })
})
