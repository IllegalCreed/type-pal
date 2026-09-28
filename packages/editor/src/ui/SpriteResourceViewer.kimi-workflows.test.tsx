// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K02：SpriteResourceViewer 真实帧编辑工作流补测。
 *
 * 旧 file/title → 已证合同 → 本组缺口：
 * - SpriteResourceViewer.test.tsx「一次解码后显示真实帧数、全部帧及可切换的大图」：
 *   loadEditorSprite/loadStandardPalette/bakeFrame 全部 mock，session/assetReader 为
 *   {} as never——已证 DOM 布局与 onLoaded 形状；未证真实 PNG→量化→encode→gzip→
 *   ReplaceSpriteAssetCommand 入库链、catalog sha/bytes/path、blob、undo。
 * - SpriteResourceViewer.test.tsx「快速切换资源时不会显示较晚返回的旧资源」：
 *   用 mock loadSprite 的 deferred 证明组件 alive 标志；未证真实 reader/SpriteAssetCache/
 *   磁盘端口链路的 proof 归属与缓存落地。本组用 gatedFileSource 在磁盘 I/O 端口造迟到。
 * - SpriteResourceViewer.test.tsx「加载失败仍保留同一 canonical workspace 与 content owner」：
 *   mock 拒绝；未证真实解码失败（sha/bytes 校验）后编辑保持禁用与重试归属。
 * - SpriteResourceViewer.test.tsx「多帧源容器的默认布局只解释 #0…」：语义分组展示，不涉及编辑。
 * - SpriteFrameDeletion.test.ts：planWorldSpriteFrameDeletion 纯函数（四向阻断/姿势前移/loop 收缩）
 *   已证；未证删除按钮到 commitFrames 的真实接线（confirm 冲击清单、修复事务随替换原子提交、
 *   undo 连字节带姿势还原）。loop 布局已不可经当前 loader 合法播种（validateSprites 只放行
 *   directional/static），loop 修复臂维持纯函数已证，不在 UI 层复制。
 * - core/sprite-commands.glm-boundaries.test.ts：ReplaceSpriteAssetCommand 过期证明/消费者漂移/
 *   缩帧修复/undo 的命令级边界已证；本组不重复命令级断言，只经真实 UI 入口驱动。
 *
 * 唯一替身：kit 的浏览器硬件端口（createImageBitmap 真实解码 PNG）与 gatedFileSource 磁盘闸门；
 * reader/cache/命令全部真实。姿势编辑对话框（SpriteActionEditorDialog）属 K03 目标，本组不测。
 */

import type { AssetId } from '@type-pal/content'
import {
  type AssetBase,
  compressGzip,
  decodeWorldSpriteAssetBytes,
  encodeSpriteChunk,
  type FileSource,
  loadStandardPalette,
  quantizeToRleFrame,
  type RleFrame,
} from '@type-pal/reforge'
import { act, type ReactElement, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { sha256Hex } from '../core/binary-signature.js'
import { AddSpriteDefinitionCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
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
import type { SpriteFrameView } from './SpriteFrameWorkbench.js'
import { type SpriteResourceLoadProof, SpriteResourceViewer } from './SpriteResourceViewer.js'

const FRAME = 8
const STARTER_ASSET = 'sprite.generated.starter'
const STARTER_PATH = 'assets/generated/sprites/starter.rle'

type Notice = { kind: 'info' | 'error'; message: string } | undefined

interface MountedViewer {
  project: K02Project
  session: EditSession
  reader: EditorAssetReader
  proofs: Array<SpriteResourceLoadProof | undefined>
  framesLog: Array<readonly SpriteFrameView[]>
  notices: Notice[]
  /** 用同一组稳定 callback 身份重渲染（viewer effect 依赖 onLoaded/onFramesLoaded）。 */
  render: (asset: AssetId, label: string) => ReactElement
}

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

function ViewerHarness(props: {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  asset: AssetId
  label: string
  onLoaded: (proof: SpriteResourceLoadProof | undefined) => void
  onFramesLoaded: (frames: readonly SpriteFrameView[]) => void
  onStatusNotice: (notice: Notice) => void
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const record = current.assetCatalog.assets[props.asset]
  const consumers = current.sprites.filter((entry) => entry.asset === props.asset)
  if (!record) return null
  return (
    <SpriteResourceViewer
      assetBase={props.assetBase}
      assetReader={props.reader}
      asset={props.asset}
      revision={record.sha256}
      label={props.label}
      consumers={consumers}
      session={props.session}
      onLoaded={props.onLoaded}
      onFramesLoaded={props.onFramesLoaded}
      onStatusNotice={props.onStatusNotice}
    />
  )
}

/** 直接挂载真实 SpriteResourceViewer：revision/consumers 由订阅中的 session 实时推导。 */
async function mountViewer(
  project: K02Project,
  input: { asset: AssetId; label: string; source?: FileSource },
): Promise<MountedViewer> {
  const session = new EditSession(project.state)
  const reader = createEditorAssetReader(input.source ?? project.source, () => session.getState())
  const proofs: MountedViewer['proofs'] = []
  const framesLog: MountedViewer['framesLog'] = []
  const notices: MountedViewer['notices'] = []
  const onLoaded = (proof: SpriteResourceLoadProof | undefined): void => {
    proofs.push(proof)
  }
  const onFramesLoaded = (frames: readonly SpriteFrameView[]): void => {
    framesLog.push(frames)
  }
  const onStatusNotice = (notice: Notice): void => {
    notices.push(notice)
  }
  const render = (asset: AssetId, label: string) => (
    <ViewerHarness
      session={session}
      assetBase={project.assetBase}
      reader={reader}
      asset={asset}
      label={label}
      onLoaded={onLoaded}
      onFramesLoaded={onFramesLoaded}
      onStatusNotice={onStatusNotice}
    />
  )
  await act(async () => {
    root.render(render(input.asset, input.label))
    await Promise.resolve()
  })
  return {
    project,
    session,
    reader,
    proofs,
    framesLog,
    notices,
    render,
  }
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
  await vi.waitFor(() => {
    expect(host.textContent).toContain(`${frames} 帧 · ${consumers} 个用途定义`)
  })
}

/**
 * 重读见证（反控安全）：等到 viewer 最新 proof 追踪当前 catalog sha——这一等待在注入缺陷的
 * 运行中同样成立（重读发生但内容错误），随后对帧数/字节等内容的同步断言才是 AssertionError，
 * 而不是超时。
 */
async function waitProofTracking(
  mounted: MountedViewer,
  asset: AssetId,
): Promise<SpriteResourceLoadProof> {
  await vi.waitFor(() => {
    const sha = mounted.session.getState().assetCatalog.assets[asset]?.sha256
    expect(sha).toBeDefined()
    expect(mounted.proofs.at(-1)).toEqual(expect.objectContaining({ asset, revision: sha }))
  })
  await act(async () => Promise.resolve())
  return mounted.proofs.at(-1)!
}

/** 源帧编辑结果消息：成功/失败都先等其出现，再断言文本与 kind。 */
async function rawEditorMessage(): Promise<HTMLElement> {
  await vi.waitFor(() => {
    expect(host.querySelector('.sprite-raw-editor-message')).not.toBeNull()
  })
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

/** 独立计算追加/替换后的期望字节：同一调色板量化 + encode + gzip + sha256。 */
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
    await loadFilesIntoInput(hiddenImageInputs()[1]!, [pngFileOf('追加两帧.png', atlas.bytes)])
    await vi.waitFor(() => {
      expect(host.textContent).toContain('将 16×8 图片切为')
    })
    const panel = host.querySelector<HTMLElement>('.sprite-raw-append-panel')!
    await setInputValue(panel.querySelectorAll<HTMLInputElement>('input')[0]!, '2')
    await vi.waitFor(() => {
      expect(panel.textContent).toContain('2 帧，每帧 8×8')
    })
    const historyBefore = mounted.session.getHistoryVersion()
    await clickButton(host, '确认追加')
    await vi.waitFor(() => {
      expect(confirm).toHaveBeenCalledWith('追加 2 帧会更新 1 个用途共享的源帧容器。继续吗？')
    })
    // 成功消息随 revision 重载被 viewer 清空，持久证据是状态栏通知与 catalog/blob。
    await vi.waitFor(() => {
      expect(mounted.notices.at(-1)).toEqual({ kind: 'info', message: '追加源帧 ×2；可撤销。' })
    })
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
    await clickButton(host, '替换当前帧')
    await loadFilesIntoInput(hiddenImageInputs()[0]!, [
      pngFileOf('单帧替换.png', replacement.bytes),
    ])
    await vi.waitFor(() => {
      expect(confirm).toHaveBeenCalledWith('替换源帧 #5 会同时影响 2 个用途。继续吗？')
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore)
    expect(mounted.session.getState().assetCatalog.assets[STARTER_ASSET]?.sha256).toBe(
      recordBefore.sha256,
    )
    expect(host.querySelector('.sprite-raw-editor-message')).toBeNull()
    expect(mounted.proofs.at(-1)?.revision).toBe(recordBefore.sha256)

    // 放行侧：ReplaceSpriteAssetCommand 真实入库，两个用途定义逐字段不动。
    confirm.mockReturnValue(true)
    await clickButton(host, '替换当前帧')
    await loadFilesIntoInput(hiddenImageInputs()[0]!, [
      pngFileOf('单帧替换.png', replacement.bytes),
    ])
    await vi.waitFor(() => {
      expect(mounted.notices.at(-1)).toEqual({ kind: 'info', message: '替换源帧 #5；可撤销。' })
    })

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
    await vi.waitFor(() => {
      expect(confirm).toHaveBeenCalledWith(expect.stringContaining('删除源帧 #2？'))
    })
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
    await clickButton(host, '删除当前帧')
    await vi.waitFor(() => {
      expect(mounted.notices.at(-1)).toEqual({ kind: 'info', message: '删除源帧 #2；可撤销。' })
    })

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
    const message = await rawEditorMessage()
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
    await act(async () => {
      root.render(mounted.render('sprite.authored.k02one', 'K02One'))
      await Promise.resolve()
    })
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
    })
    // 进入见证：starter 的磁盘读取已进入但未放行；加载中不得冒充就绪。
    expect(gate.calls).toContain(STARTER_PATH)
    expect(gate.completed).not.toContain(STARTER_PATH)
    expect(host.textContent).toContain('正在解析帧资源 sprite.generated.starter…')
    expect(host.textContent).toContain('正在解析')
    expect(mounted.proofs.filter(Boolean)).toHaveLength(0)

    // 切换到 B：真实解码完成并交付 proof；A 仍在途。
    await act(async () => {
      root.render(mounted.render('sprite.authored.k02b', '乙精灵'))
      await Promise.resolve()
    })
    await vi.waitFor(() => {
      expect(mounted.proofs.at(-1)).toEqual(
        expect.objectContaining({
          asset: 'sprite.authored.k02b',
          actualFrameCount: 6,
          revision: project.seeded.get('sprite.authored.k02b')!.sha256,
        }),
      )
    })
    await act(async () => Promise.resolve())
    expect(host.textContent).toContain('6 帧 · 1 个用途定义')
    expect(host.textContent).toContain('乙精灵')
    expect(mounted.framesLog.at(-1)).toHaveLength(6)

    // 放行迟到的 A：读取真实完成（退出见证），但归属已失效，不得产生任何新 proof/帧交付。
    const mark = mounted.proofs.length
    const framesMark = mounted.framesLog.length
    hold.resolve()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    expect(gate.completed).toContain(STARTER_PATH)
    expect(mounted.proofs.slice(mark).filter(Boolean)).toHaveLength(0)
    expect(mounted.framesLog.slice(framesMark).filter((frames) => frames.length > 0)).toHaveLength(
      0,
    )
    expect(host.textContent).toContain('6 帧 · 1 个用途定义')
    expect(host.textContent).toContain('乙精灵')
    expect(host.textContent).not.toContain('12 帧 · 1 个用途定义')

    // 主动切回 A：迟到的读取已落入真实 SpriteAssetCache，proof 归 A 本人。
    await act(async () => {
      root.render(mounted.render(STARTER_ASSET, '甲精灵'))
      await Promise.resolve()
    })
    await vi.waitFor(() => {
      expect(mounted.proofs.at(-1)).toEqual(
        expect.objectContaining({ asset: STARTER_ASSET, actualFrameCount: 12 }),
      )
    })
    await act(async () => Promise.resolve())
    expect(host.textContent).toContain('12 帧 · 1 个用途定义')
    expect(host.textContent).toContain('甲精灵')
  })
})
