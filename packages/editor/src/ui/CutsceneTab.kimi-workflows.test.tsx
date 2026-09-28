// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K06：CutsceneTab 真实过场工作流补测（锚 CutsceneTab.tsx:430/433/537/552）。
 *
 * 旧断言去重（旧 file/title → 已证合同 → 本组缺口；只测缺口）：
 * - CutsceneTab.test.tsx（FrameAnimationEditor 被 vi.mock；reader 为固定 4 字节假读者；catalog 手写）：
 *   - 'shows both resource groups without a redundant catalog search' → 分组/计数/选中行/hero/无搜索框已证 → 不重复。
 *   - 'distinguishes an empty project from a filtered empty result' → 空态文案已证 → 不重复（本文件 test 1 只把它当基线见证）。
 *   - 'fails closed when the live shared script still references the selected video' → live 引用下确认禁用+零提交
 *     已证（假 reader）；缺口：真实 reader/真实命令下删除成功正控与字节级 undo（本文件 test 7）。
 *   - 'does not commit deletion when the live oracle changes during the video byte read' → 迟到 oracle 拒绝侧已证
 *     （假 reader + 抛错 provider）；缺口：gatedFileSource 真实磁盘迟到 + 真实 SetStartupEntriesCommand 制造
 *     introVideo 引用 + AssetInUseError 实文本 + 解除后成功正控（test 7）。
 *   - 'keeps frame edits dirty when replacement is confirmed but the file picker is cancelled' → 脏守卫弃用弹窗
 *     已证 → 不重复，本文件不碰 frameEditorDirty 分支。
 *   - '[reorder-family:cutscene-import] 待导入图片只改本地顺序且不污染全局历史' → 键盘重排的本地性已证
 *     （输入文件名已按序给出）；缺口：乱序输入的自然排序（537 sortFrameImageFiles）、排除按钮与排除到空
 *     自关窗（552 removePendingFrame）、重排后的真实导入帧序（preserveOrder 消费队列）、创建失败保真
 *     （尺寸不齐拒绝 + 队列保留重试）（test 1/2/3）。
 * - CutsceneTab.glm-ui-wave.test.tsx（合法项目 + 真 session/reader，FrameAnimationEditor 被 vi.mock）：
 *   - '视频导入真实提交：record/blobs/选择与 onObjectFocus' → 视频导入落账已证；缺口：帧动画导入落账（test 1）
 *     与替换落账/previousBytes（test 4）。
 *   - '非 MP4/WebM 内容失败零提交并显示错误' → 视频魔数守卫已证（任务指定不重抄）。
 *   - '帧导入弹窗取消 → 零提交' → 简单弹窗取消已证（任务指定不重抄）。
 * - AssetInspectorTabs.test.tsx：'CutsceneTab 使用资源/引用/诊断 canonical Inspector' 与
 *   'Cutscene 诊断静态行与清空状态随选择切换' → 检查器结构与诊断行已证 → 不重复。
 * - FrameAnimationEditor.loading/async-ownership 等（frame-editor-fixture 真容器）→ 编辑器内部 metadata 产生与
 *   竞态已证；缺口：CutsceneTab onFrameMetadata/onVideoMetadata（430/433）到检查器属性行的接线与跨类切换
 *   （test 5/6/8），不重做帧编辑功能。
 * - core/asset-reference-commands.test.ts、workspace-persistence.test.ts 等命令层直测 → DeleteAssetCommand
 *   单元行为已证；缺口是组件 DOM → 命令 → 真实 reader 的工作流链（test 7）。
 * - core/frame-animation-images.test.ts / .boundaries.test.ts → sortFrameImageFiles 纯函数与
 *   assertFrameImageFile 类型门已证（core 层）；缺口是组件队列接线（test 1/2/3），不复制纯函数断言。
 *
 * 本文件全部走真实组件 DOM → EditSession/commands/EditorAssetReader + 合法 blank 项目（磁盘种子经
 * 真实 loader 载入，record bytes/sha256 与实际字节一致）。唯一替身：kit/k06-fixtures 的浏览器硬件端口
 * 与 gatedFileSource 磁盘闸门（观测范围见 fixtures 头注释）；视频侧只证明 ISO BMFF 盒级音轨解析与
 * objectURL 协议，不宣称解码/音质保真。
 */
import { type AssetId, type AssetRecordV1, FRAME_SEQUENCE_MEDIA_TYPE } from '@type-pal/content'
import {
  type AssetBase,
  AssetResolver,
  FrameSequenceReader,
  loadStandardPalette,
} from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { collectEditorAssetDiagnostics } from '../core/asset-diagnostics.js'
import { sha256Hex } from '../core/binary-signature.js'
import { SetStartupEntriesCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectEditorAssetReferences } from '../core/editor-asset-references.js'
import { encodeFrameAnimationRequest } from '../core/frame-animation-codec.js'
import { quantizeCompleteFrame } from '../core/frame-animation-draft.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  buttonByLabel,
  chooseComboboxOption,
  fieldControlByLabel,
  loadFilesIntoInput,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import {
  installCutsceneHardwarePorts,
  loadCutsceneFixtureProject,
  mp4AudioBytes,
  mp4SilentBytes,
  type ObjectUrlWitness,
  restoreCutsceneHardwarePorts,
} from './__tests__/kimi-editor-workflows/k06-fixtures.js'
import {
  type GatedFileSource,
  gatedFileSource,
  pngFileOf,
  pngRgba,
  solidRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import { CutsceneTab } from './CutsceneTab.js'

const FRAME_ACCEPT = 'image/png,image/jpeg,image/webp'

interface Mounted {
  session: EditSession
  gate: GatedFileSource
  reader: EditorAssetReader
  assetBase: AssetBase
  focusLog: Array<string | undefined>
}

function Harness(props: {
  session: EditSession
  reader: EditorAssetReader
  assetBase: AssetBase
  initialFocus?: AssetId
  focusLog: Array<string | undefined>
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [focus, setFocus] = useState<string | undefined>(props.initialFocus)
  return (
    <CutsceneTab
      assetBase={props.assetBase}
      catalog={current.assetCatalog}
      reader={props.reader}
      session={props.session}
      assetDiagnostics={collectEditorAssetDiagnostics(
        current.assetCatalog,
        collectEditorAssetReferences(current),
      )}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        props.focusLog.push(id)
        setFocus(id)
      }}
    />
  )
}

let root: Root
let host: HTMLDivElement
let objectUrls: ObjectUrlWitness

beforeEach(() => {
  useActEnvironment()
  objectUrls = installCutsceneHardwarePorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  restoreCutsceneHardwarePorts()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function mountTab(
  options: {
    focus?: AssetId
    videos?: readonly { id: AssetId; label: string; bytes: Uint8Array }[]
    animations?: readonly {
      id: AssetId
      label: string
      width: number
      height: number
      defaultFrameMs: number
      frames: readonly Uint8Array[]
    }[]
    prepareGates?: (gate: GatedFileSource) => void
  } = {},
): Promise<Mounted> {
  const legal = await loadCutsceneFixtureProject('kimi-k06-cutscene', {
    videos: options.videos,
    animations: options.animations,
  })
  const gate = gatedFileSource(legal.source)
  options.prepareGates?.(gate)
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(gate.source, () => session.getState())
  // 与 project.assetBase 同数据、仅磁盘端口换成闸门包裹的 source。
  const assetBase: AssetBase = {
    source: gate.source,
    assetResolver: new AssetResolver(
      legal.manifest.id,
      legal.catalog,
      legal.manifest.assets.roles,
      gate.source,
    ),
  }
  const focusLog: Array<string | undefined> = []
  await act(async () => {
    root.render(
      <Harness
        session={session}
        reader={reader}
        assetBase={assetBase}
        initialFocus={options.focus}
        focusLog={focusLog}
      />,
    )
    await Promise.resolve()
  })
  return { session, gate, reader, assetBase, focusLog }
}

/** 帧文件输入（限 CutsceneTab 自己的 outliner；真实 FrameAnimationEditor 自带同 accept 输入）：
 *  第一个为新建导入，第二个为替换。 */
function frameFileInputs(): HTMLInputElement[] {
  const inputs = [
    ...host.querySelectorAll<HTMLInputElement>('.cutscene-outliner input[hidden][multiple]'),
  ].filter((input) => input.accept === FRAME_ACCEPT)
  expect(inputs).toHaveLength(2)
  return inputs
}

function openDialogByTitle(title: string): HTMLDialogElement {
  const dialog = host.querySelector<HTMLDialogElement>(`dialog[aria-label="${title}"]`)
  expect(dialog, `弹窗 ${title}`).not.toBeNull()
  expect(dialog!.open, `弹窗 ${title} 处于打开`).toBe(true)
  return dialog!
}

async function waitOpenDialog(title: string): Promise<HTMLDialogElement> {
  let dialog: HTMLDialogElement | null = null
  await vi.waitFor(() => {
    dialog = host.querySelector<HTMLDialogElement>(`dialog[aria-label="${title}"]`)
    expect(dialog?.open, `弹窗 ${title} 打开`).toBe(true)
  })
  return dialog!
}

function queueNames(dialog: ParentNode): string[] {
  return [...dialog.querySelectorAll('li.cutscene-import-file code')].map(
    (node) => node.textContent ?? '',
  )
}

async function excludeFrame(dialog: ParentNode, name: string): Promise<void> {
  const row = [...dialog.querySelectorAll('li.cutscene-import-file')].find(
    (candidate) => candidate.querySelector('code')?.textContent === name,
  )
  expect(row, `队列帧行 ${name}`).toBeDefined()
  const button = row!.querySelector<HTMLButtonElement>('button[title="排除此帧"]')
  expect(button, `排除按钮 ${name}`).not.toBeNull()
  await act(async () => {
    button!.click()
  })
}

function catalogRow(label: string): HTMLElement {
  const row = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find(
    (candidate) => candidate.querySelector('.ds-catalog-row__title')?.textContent === label,
  )
  expect(row, `目录行 ${label}`).toBeDefined()
  return row!
}

function propertyRowValue(label: string): string | null {
  return (
    host.querySelector(`[data-property-label="${label}"] .ds-property-row__value`)?.textContent ??
    null
  )
}

async function currentVideoElement(): Promise<HTMLVideoElement> {
  let video: HTMLVideoElement | null = null
  await vi.waitFor(() => {
    video = host.querySelector<HTMLVideoElement>('video')
    expect(video, '视频元素已挂载').not.toBeNull()
  })
  return video!
}

/**
 * 真实视频解码器不可用，jsdom 的 HTMLMediaElement 硬件端口由本函数按协议喂元数据。
 * jsdom 的 video 自带空 audioTracks（恒 no），会盖住产品的容器解析回退；
 * audio='container'（默认）按协议模拟「浏览器不上报音轨轨道」（audioTracks 不存在），
 * 让产品回退到 mp4HasAudioTrack 的真实盒级解析；audio='reported' 模拟浏览器上报有音轨，
 * 证明元素上报优先于容器解析的分支序。观测范围仅协议级，不宣称解码/音质保真。
 */
async function fireLoadedMetadata(
  video: HTMLVideoElement,
  metadata: { width: number; height: number; duration: number; audio?: 'container' | 'reported' },
): Promise<void> {
  Object.defineProperty(video, 'videoWidth', { configurable: true, value: metadata.width })
  Object.defineProperty(video, 'videoHeight', { configurable: true, value: metadata.height })
  Object.defineProperty(video, 'duration', { configurable: true, value: metadata.duration })
  Object.defineProperty(video, 'audioTracks', {
    configurable: true,
    value: metadata.audio === 'reported' ? { length: 1 } : undefined,
  })
  await act(async () => {
    video.dispatchEvent(new Event('loadedmetadata'))
  })
}

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

/** 与组件共用同一真实编码核的独立期望：输入像素显式交付，逐字节对拍。 */
async function expectedAnimation(input: {
  width: number
  height: number
  defaultFrameMs: number
  colorTreatment: 'preserve' | 'project-standard'
  frames: readonly Uint8Array[]
}): Promise<{ bytes: Uint8Array; sha256: string }> {
  const bytes = await encodeFrameAnimationRequest({
    width: input.width,
    height: input.height,
    defaultFrameMs: input.defaultFrameMs,
    colorTreatment: input.colorTreatment,
    frames: input.frames.map((rgba) => ({ rgba: ownedBuffer(rgba) })),
  })
  return { bytes, sha256: await sha256Hex(bytes) }
}

/** 以当前 catalog/blob/磁盘真实解码 TPFS（FrameSequenceReader 即编辑器编辑器同源消费者）。 */
async function decodeAnimation(reader: EditorAssetReader, id: AssetId) {
  const sequenceReader = new FrameSequenceReader(reader)
  const sequence = await sequenceReader.sequence(id)
  const frames: Uint8Array[] = []
  for (let index = 0; index < sequence.index.frames.length; index += 1)
    // 归一化为 Uint8Array 逐字节比较（快照类型允许 Uint8ClampedArray，值域一致）。
    frames.push(new Uint8Array((await sequenceReader.frame(id, index)).rgba))
  return { index: sequence.index, frames }
}

describe('K06 CutsceneTab 真实过场工作流', () => {
  test('帧队列乱序输入自然排序、按钮重排与排除后真实创建：TPFS 帧序等于队列序且 undo/redo 对称', async () => {
    const mounted = await mountTab()
    const historyAtMount = mounted.session.getHistoryVersion()
    // 基线见证：合法 blank 项目没有任何过场资源。
    expect(host.textContent).toContain('还没有过场资源')

    const colors = {
      'alpha-1.png': [216, 32, 32, 255],
      'delta-2.png': [32, 200, 64, 255],
      'delta-10.png': [32, 64, 216, 255],
    } as const
    const fileOf = (name: keyof typeof colors): File =>
      pngFileOf(name, pngRgba(4, 3, solidRgba(4, 3, colors[name])))
    // 乱序交付：自然排序应得 alpha-1 < delta-2 < delta-10（纯字典序会把 10 排 2 前）。
    await loadFilesIntoInput(frameFileInputs()[0]!, [
      fileOf('delta-10.png'),
      fileOf('alpha-1.png'),
      fileOf('delta-2.png'),
    ])
    const dialog = await waitOpenDialog('新建帧动画')
    expect(dialog.textContent).toContain('3 张图片。当前清单顺序就是动画帧顺序。')
    expect(queueNames(dialog)).toEqual(['alpha-1.png', 'delta-2.png', 'delta-10.png'])

    // 重排（真实 DsReorderMoveButton）：alpha-1 下移一格；本地队列变化，零提交。
    await act(async () => {
      buttonByLabel(dialog, '下移 alpha-1.png').click()
    })
    expect(queueNames(dialog)).toEqual(['delta-2.png', 'alpha-1.png', 'delta-10.png'])
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)

    // 排除 delta-10：队列收缩、描述同步，仍零提交。
    await excludeFrame(dialog, 'delta-10.png')
    expect(queueNames(dialog)).toEqual(['delta-2.png', 'alpha-1.png'])
    expect(dialog.textContent).toContain('2 张图片')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)

    // 帧率 25 → 10：defaultFrameMs 应落 100。
    await setInputValue(fieldControlByLabel<HTMLInputElement>(dialog, '默认帧率'), '10')

    // 队列序（delta-2 绿 → alpha-1 红）是动画帧序；标签取自然排序首文件（alpha-1 → alpha）。
    const expected = await expectedAnimation({
      width: 4,
      height: 3,
      defaultFrameMs: 100,
      colorTreatment: 'preserve',
      frames: [solidRgba(4, 3, colors['delta-2.png']), solidRgba(4, 3, colors['alpha-1.png'])],
    })

    // 在途见证（busy 文案/aria-busy/禁用）由 test 4 的磁盘闸门确定性地证；本用例聚焦
    // 队列 → 真实导入帧序。中性退出等待：资源出现与否不预设帧序结论，帧序由下方解码断言分胜负。
    await act(async () => {
      buttonByLabel(dialog, '创建').click()
    })
    // 中性退出等待：资源出现与否不预设帧序结论，帧序差异由下方解码断言分胜负。
    let createdId = ''
    await vi.waitFor(() => {
      const hit = Object.keys(mounted.session.getState().assetCatalog.assets).find((key) =>
        key.startsWith('frame-animation.authored.'),
      )
      expect(hit, '新帧动画已入 catalog').toBeDefined()
      createdId = hit!
    })
    const record = mounted.session.getState().assetCatalog.assets[createdId]!
    expect(record).toEqual({
      kind: 'frame-animation',
      path: `assets/authored/frame-animation/${expected.sha256}.tpfs`,
      mediaType: FRAME_SEQUENCE_MEDIA_TYPE,
      bytes: expected.bytes.byteLength,
      sha256: expected.sha256,
      label: 'alpha',
      origin: { kind: 'authored', ref: '2 张图片' },
    } satisfies AssetRecordV1)
    const blob = mounted.session.getState().assetBlobs[record.path]
    expect(blob).toBeDefined()
    expect(await sha256Hex(blob!)).toBe(expected.sha256)

    const decoded = await decodeAnimation(mounted.reader, createdId)
    expect(decoded.index.width).toBe(4)
    expect(decoded.index.height).toBe(3)
    expect(decoded.index.defaultFrameMs).toBe(100)
    expect(decoded.index.colorTreatment).toBe('preserve')
    expect(decoded.index.frames).toHaveLength(2)
    expect(decoded.frames[0]).toEqual(solidRgba(4, 3, colors['delta-2.png']))
    expect(decoded.frames[1]).toEqual(solidRgba(4, 3, colors['alpha-1.png']))

    // 弹窗关闭、选中新条目、focus 同步、历史恰好 +1、保存门通过。
    expect(host.querySelector('dialog[aria-label="新建帧动画"]')).toBeNull()
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('alpha')
    expect(mounted.focusLog.at(-1)).toBe(createdId)
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    assertProjectSaveValid(mounted.session.getState())

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[createdId]).toBeUndefined()
    expect(mounted.session.getState().assetBlobs[record.path]).toBeUndefined()
    await expect(decodeAnimation(mounted.reader, createdId)).rejects.toThrow('不在 catalog')

    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets[createdId]?.sha256).toBe(expected.sha256)
    const restored = await decodeAnimation(mounted.reader, createdId)
    expect(restored.frames[0]).toEqual(solidRgba(4, 3, colors['delta-2.png']))
    expect(restored.frames[1]).toEqual(solidRgba(4, 3, colors['alpha-1.png']))
  })

  test('帧队列空选择不开窗、排除到空自动关窗且全程零提交', async () => {
    const mounted = await mountTab()
    const historyAtMount = mounted.session.getHistoryVersion()

    // 空选择：onFrameFiles 不开启弹窗（537 的 files.length 守卫）。
    await loadFilesIntoInput(frameFileInputs()[0]!, [])
    await act(async () => {
      await Promise.resolve()
    })
    expect(host.querySelector('dialog[aria-label="新建帧动画"]')).toBeNull()

    const fileOf = (name: string, color: readonly [number, number, number, number]): File =>
      pngFileOf(name, pngRgba(2, 2, solidRgba(2, 2, color)))
    await loadFilesIntoInput(frameFileInputs()[0]!, [
      fileOf('a.png', [200, 40, 40, 255]),
      fileOf('b.png', [40, 200, 60, 255]),
    ])
    const dialog = await waitOpenDialog('新建帧动画')
    expect(queueNames(dialog)).toEqual(['a.png', 'b.png'])

    await excludeFrame(dialog, 'a.png')
    expect(queueNames(dialog)).toEqual(['b.png'])
    expect(dialog.textContent).toContain('1 张图片')
    // 排除最后一帧：pendingFrames 收 undefined（552），弹窗自关。
    await excludeFrame(dialog, 'b.png')
    expect(host.querySelector('dialog[aria-label="新建帧动画"]')).toBeNull()

    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(
      Object.keys(mounted.session.getState().assetCatalog.assets).some((id) =>
        id.startsWith('frame-animation.'),
      ),
    ).toBe(false)
    expect(mounted.session.getState().assetBlobs).toEqual({})
    expect(host.querySelector('.cutscene-side-error')).toBeNull()
  })

  test('帧序列尺寸不齐创建失败：错误可见、队列保留、排除坏帧后重试成功', async () => {
    const mounted = await mountTab()
    const historyAtMount = mounted.session.getHistoryVersion()
    // 真实 PNG 解码后尺寸不齐：decodeFrameImages 拒绝（b.png 3×2 vs 首帧 2×2）。
    await loadFilesIntoInput(frameFileInputs()[0]!, [
      pngFileOf('a.png', pngRgba(2, 2, solidRgba(2, 2, [200, 40, 40, 255]))),
      pngFileOf('b.png', pngRgba(3, 2, solidRgba(3, 2, [40, 200, 60, 255]))),
    ])
    const dialog = await waitOpenDialog('新建帧动画')
    expect(queueNames(dialog)).toEqual(['a.png', 'b.png'])

    await act(async () => {
      buttonByLabel(dialog, '创建').click()
    })
    // 中性等待：错误出现或资源创建都代表退出在途，业务断言随后分胜负。
    await vi.waitFor(() => {
      expect(
        host.querySelector('.cutscene-side-error') !== null ||
          Object.keys(mounted.session.getState().assetCatalog.assets).some((id) =>
            id.startsWith('frame-animation.authored.'),
          ),
      ).toBe(true)
    })
    expect(host.querySelector('.cutscene-side-error')?.textContent).toBe(
      'b.png: 尺寸 3x2，应与首帧 2x2 一致',
    )
    // 失败保真：弹窗保持、队列不丢、零提交。
    expect(dialog.open).toBe(true)
    expect(queueNames(dialog)).toEqual(['a.png', 'b.png'])
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(mounted.session.getState().assetBlobs).toEqual({})

    // 正控：排除坏帧后重试真实成功。
    await excludeFrame(dialog, 'b.png')
    expect(queueNames(dialog)).toEqual(['a.png'])
    await act(async () => {
      buttonByLabel(dialog, '创建').click()
    })
    let createdId = ''
    await vi.waitFor(() => {
      const hit = Object.keys(mounted.session.getState().assetCatalog.assets).find((key) =>
        key.startsWith('frame-animation.authored.'),
      )
      expect(hit, '重试后新帧动画已入 catalog').toBeDefined()
      createdId = hit!
    })
    const decoded = await decodeAnimation(mounted.reader, createdId)
    expect(decoded.index.width).toBe(2)
    expect(decoded.index.height).toBe(2)
    expect(decoded.index.defaultFrameMs).toBe(40)
    expect(decoded.index.frames).toHaveLength(1)
    expect(decoded.frames[0]).toEqual(solidRgba(2, 2, [200, 40, 40, 255]))
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    assertProjectSaveValid(mounted.session.getState())
  })

  test('替换帧动画：同 AssetId 真实换字节、标签保全、项目标准色彩量化生效且 undo 还原旧字节', async () => {
    const oldFrames = [
      solidRgba(2, 1, [200, 84, 68, 255]),
      solidRgba(2, 1, [104, 158, 74, 255]),
      solidRgba(2, 1, [222, 226, 232, 255]),
    ]
    const mounted = await mountTab({
      animations: [
        {
          id: 'frame-animation.k06-old',
          label: '旧片头',
          width: 2,
          height: 1,
          defaultFrameMs: 40,
          frames: oldFrames,
        },
      ],
      focus: 'frame-animation.k06-old',
    })
    // 真实 FrameAnimationEditor 装载旧动画（编辑器内部就绪见证，与 metadata 断言无关）。
    await vi.waitFor(() => expect(host.querySelectorAll('.fa-frame').length).toBe(3))
    const originalRecord =
      mounted.session.getState().assetCatalog.assets['frame-animation.k06-old']!
    const originalDecoded = await decodeAnimation(mounted.reader, 'frame-animation.k06-old')
    expect(originalDecoded.frames).toEqual(oldFrames)
    const historyAtMount = mounted.session.getHistoryVersion()

    // 英雄区「替换」→ 替换文件输入（第二个 multiple 输入），乱序交付两张 4×2 真实 PNG。
    await act(async () => {
      buttonByLabel(host, '替换').click()
    })
    const newPixels = [solidRgba(4, 2, [250, 250, 250, 255]), solidRgba(4, 2, [10, 200, 110, 255])]
    await loadFilesIntoInput(frameFileInputs()[1]!, [
      pngFileOf('new-2.png', pngRgba(4, 2, newPixels[1]!)),
      pngFileOf('new-1.png', pngRgba(4, 2, newPixels[0]!)),
    ])
    const dialog = await waitOpenDialog('替换帧动画')
    expect(queueNames(dialog)).toEqual(['new-1.png', 'new-2.png'])

    // 色彩处理 → 贴合项目标准色彩（真实色盘 + 真实量化核，最近色）。
    await chooseComboboxOption(fieldControlByLabel(dialog, '色彩处理'), '贴合项目标准色彩')
    expect(fieldControlByLabel(dialog, '转换方式')).toBeDefined()

    const palette = (await loadStandardPalette(mounted.assetBase)).colors
    const quantized = newPixels.map((rgba) => quantizeCompleteFrame(rgba, 4, 2, palette, 'nearest'))
    // 量化确实改变像素的鉴别：输入色不在项目标准色彩内，最近色必被吸附。
    expect(quantized[0]).not.toEqual(newPixels[0])
    expect(quantized[1]).not.toEqual(newPixels[1])
    const expected = await expectedAnimation({
      width: 4,
      height: 2,
      defaultFrameMs: 40,
      colorTreatment: 'project-standard',
      frames: quantized,
    })

    // 闸门拦旧 .tpfs 的磁盘读（previousBytes 捕获点），制造可观测在途窗。
    const callsBefore = mounted.gate.calls.length
    const completedBefore = mounted.gate.completed.length
    const hold = mounted.gate.gate(originalRecord.path)
    try {
      await act(async () => {
        buttonByLabel(dialog, '创建').click()
      })
      await vi.waitFor(() => expect(mounted.gate.calls.length).toBeGreaterThan(callsBefore))
      expect(mounted.gate.calls.at(-1)).toBe(originalRecord.path)
      expect(mounted.gate.completed.length).toBe(completedBefore)
      expect(dialog.getAttribute('aria-busy')).toBe('true')
      expect(host.textContent).toContain('正在后台压缩完整帧…')
      await act(async () => {
        hold.resolve()
      })
      // 中性等待：sha 变化或错误出现都代表退出在途，业务断言随后分胜负。
      await vi.waitFor(() => {
        expect(
          mounted.session.getState().assetCatalog.assets['frame-animation.k06-old']!.sha256 !==
            originalRecord.sha256 || host.querySelector('.cutscene-side-error') !== null,
        ).toBe(true)
      })
    } finally {
      hold.resolve()
    }
    expect(mounted.gate.completed.length).toBe(completedBefore + 1)
    expect(mounted.gate.completed.at(-1)).toBe(originalRecord.path)
    expect(host.querySelector('.cutscene-side-error')).toBeNull()
    expect(host.querySelector('dialog[aria-label="替换帧动画"]')).toBeNull()

    const record = mounted.session.getState().assetCatalog.assets['frame-animation.k06-old']!
    expect(record).toEqual({
      ...originalRecord,
      path: `assets/authored/frame-animation/${expected.sha256}.tpfs`,
      bytes: expected.bytes.byteLength,
      sha256: expected.sha256,
      label: '旧片头',
      origin: { kind: 'authored', ref: '2 张图片' },
    } satisfies AssetRecordV1)
    expect(mounted.session.getState().assetBlobs[record.path]).toBeDefined()
    expect(mounted.session.getState().assetBlobs[originalRecord.path]).toBeUndefined()
    const decoded = await decodeAnimation(mounted.reader, 'frame-animation.k06-old')
    expect(decoded.index.colorTreatment).toBe('project-standard')
    expect(decoded.index.frames).toHaveLength(2)
    expect(decoded.frames).toEqual(quantized)
    // 选中保持同 id；编辑器按新 sha 真实重载出 2 帧。
    await vi.waitFor(() => expect(host.querySelectorAll('.fa-frame').length).toBe(2))
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('旧片头')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    assertProjectSaveValid(mounted.session.getState())

    // undo：record 全字段还原 + previousBytes 物化旧字节到 pending，真实解码得旧 3 帧。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['frame-animation.k06-old']).toEqual(
      originalRecord,
    )
    const restoredBlob = mounted.session.getState().assetBlobs[originalRecord.path]
    expect(restoredBlob).toBeDefined()
    expect(await sha256Hex(restoredBlob!)).toBe(originalRecord.sha256)
    expect((await decodeAnimation(mounted.reader, 'frame-animation.k06-old')).frames).toEqual(
      oldFrames,
    )
    await vi.waitFor(() => expect(host.querySelectorAll('.fa-frame').length).toBe(3))

    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['frame-animation.k06-old']!.sha256).toBe(
      expected.sha256,
    )
  })

  test('视频 metadata 真实容器解析与切换在途重置：音轨有/无、objectURL 建立与回收', async () => {
    const audioBytes = mp4AudioBytes()
    const silentBytes = mp4SilentBytes()
    const mounted = await mountTab({
      videos: [
        { id: 'video.k06-audio', label: '有声过场', bytes: audioBytes },
        { id: 'video.k06-silent', label: '无声过场', bytes: silentBytes },
      ],
      focus: 'video.k06-audio',
    })
    const historyAtMount = mounted.session.getHistoryVersion()
    const videoA = await currentVideoElement()
    // objectURL 协议见证：以真实字节 Blob 建 URL（不宣称可播放）。
    expect(objectUrls.created).toHaveLength(1)
    expect(objectUrls.created[0]!.blob.type).toBe('video/mp4')
    expect(new Uint8Array(await objectUrls.created[0]!.blob.arrayBuffer())).toEqual(audioBytes)
    expect(videoA.getAttribute('src')).toBe(objectUrls.created[0]!.url)

    await fireLoadedMetadata(videoA, { width: 320, height: 240, duration: 12.5 })
    expect(propertyRowValue('分辨率')).toBe('320 × 240')
    expect(propertyRowValue('时长')).toBe('12.50 秒')
    expect(propertyRowValue('音轨')).toBe('有')

    // 切到无声视频：闸门造磁盘迟到，在途窗内检查器回到「读取中」，旧 objectURL 被回收。
    const silentPath = mounted.session.getState().assetCatalog.assets['video.k06-silent']!.path
    const callsBefore = mounted.gate.calls.length
    const completedBefore = mounted.gate.completed.length
    const hold = mounted.gate.gate(silentPath)
    try {
      await act(async () => {
        catalogRow('无声过场').click()
      })
      expect(mounted.gate.calls.length).toBe(callsBefore + 1)
      expect(mounted.gate.calls.at(-1)).toBe(silentPath)
      expect(mounted.gate.completed.length).toBe(completedBefore)
      expect(objectUrls.revoked).toEqual([objectUrls.created[0]!.url])
      expect(host.querySelector('video')).toBeNull()
      expect(host.textContent).toContain('正在读取视频…')
      expect(propertyRowValue('分辨率')).toBe('读取中')
      expect(propertyRowValue('时长')).toBe('读取中')
      expect(propertyRowValue('音轨')).toBe('浏览器未报告')
      await act(async () => {
        hold.resolve()
      })
      await vi.waitFor(() => expect(host.querySelector('video')).not.toBeNull())
    } finally {
      hold.resolve()
    }
    expect(mounted.gate.completed.length).toBe(completedBefore + 1)
    expect(mounted.gate.completed.at(-1)).toBe(silentPath)

    const videoB = host.querySelector<HTMLVideoElement>('video')!
    expect(objectUrls.created).toHaveLength(2)
    expect(new Uint8Array(await objectUrls.created[1]!.blob.arrayBuffer())).toEqual(silentBytes)
    await fireLoadedMetadata(videoB, { width: 80, height: 60, duration: 2.5 })
    expect(propertyRowValue('分辨率')).toBe('80 × 60')
    expect(propertyRowValue('时长')).toBe('2.50 秒')
    expect(propertyRowValue('音轨')).toBe('无')

    // 分支序：浏览器上报音轨轨道时元素优先于容器解析（同一视频由 无 → 有）。
    await fireLoadedMetadata(videoB, { width: 80, height: 60, duration: 2.5, audio: 'reported' })
    expect(propertyRowValue('音轨')).toBe('有')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(mounted.focusLog.at(-1)).toBe('video.k06-silent')
  })

  test('视频读取失败只伤当前资源：错误可见、检查器保持读取中、切走正常', async () => {
    const brokenBytes = mp4AudioBytes()
    const silentBytes = mp4SilentBytes()
    const brokenPath = `assets/authored/video/${await sha256Hex(brokenBytes)}.mp4`
    let hold!: ReturnType<GatedFileSource['gate']>
    const mounted = await mountTab({
      videos: [
        { id: 'video.k06-broken', label: '损坏视频', bytes: brokenBytes },
        { id: 'video.k06-silent', label: '无声过场', bytes: silentBytes },
      ],
      focus: 'video.k06-broken',
      prepareGates: (gate) => {
        hold = gate.gate(brokenPath)
      },
    })
    const historyAtMount = mounted.session.getHistoryVersion()
    // 挂载预览读已进入闸门但未完成：未开始/在途/已完成三态可区分。
    expect(mounted.gate.calls).toContain(brokenPath)
    expect(mounted.gate.completed).not.toContain(brokenPath)
    expect(host.querySelector('video')).toBeNull()
    expect(host.textContent).toContain('正在读取视频…')

    await act(async () => {
      hold.reject(new Error('磁盘读取失败'))
    })
    await vi.waitFor(() => {
      expect(host.querySelector('.cutscene-video-stage .cf-err')?.textContent).toBe('磁盘读取失败')
    })
    expect(host.querySelector('video')).toBeNull()
    expect(propertyRowValue('分辨率')).toBe('读取中')
    expect(propertyRowValue('时长')).toBe('读取中')
    expect(propertyRowValue('音轨')).toBe('浏览器未报告')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(mounted.gate.completed).not.toContain(brokenPath)

    // 失败归属单资源：切到无声视频正常读取并上报 metadata。
    await act(async () => {
      catalogRow('无声过场').click()
    })
    const video = await currentVideoElement()
    await fireLoadedMetadata(video, { width: 80, height: 60, duration: 2.5 })
    expect(propertyRowValue('分辨率')).toBe('80 × 60')
    expect(propertyRowValue('音轨')).toBe('无')
    expect(host.querySelector('.cutscene-video-stage .cf-err')).toBeNull()

    // 切回损坏视频：再次真实读取仍失败，错误回到当前资源，项目状态零污染。
    await act(async () => {
      catalogRow('损坏视频').click()
    })
    await vi.waitFor(() => {
      expect(host.querySelector('.cutscene-video-stage .cf-err')?.textContent).toBe('磁盘读取失败')
    })
    expect(propertyRowValue('分辨率')).toBe('读取中')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(mounted.focusLog).toEqual(['video.k06-silent', 'video.k06-broken'])
  })

  test('删除在途期间实时引用出现则真实拒绝；解除后真实删除且 undo 字节级还原', async () => {
    const targetBytes = mp4AudioBytes()
    const fallbackBytes = mp4SilentBytes()
    const mounted = await mountTab({
      videos: [
        { id: 'video.k06-fallback', label: '兜底视频', bytes: fallbackBytes },
        { id: 'video.k06-target', label: '待删视频', bytes: targetBytes },
      ],
      focus: 'video.k06-target',
    })
    // 挂载预览读真实完成。
    await currentVideoElement()
    const targetRecord = mounted.session.getState().assetCatalog.assets['video.k06-target']!
    const historyAtMount = mounted.session.getHistoryVersion()

    // 打开删除弹窗：实时索引零引用 → 确认可用。
    await act(async () => {
      buttonByLabel(host, '删除').click()
    })
    const dialog = openDialogByTitle('删除过场资源')
    expect(dialog.textContent).toContain('0 处')
    expect(buttonByLabel(dialog, '删除资源').disabled).toBe(false)

    // 闸门拦删除前读字节；在途期间经真实 SetStartupEntriesCommand 给入口点挂 introVideo 引用。
    const callsBefore = mounted.gate.calls.length
    const completedBefore = mounted.gate.completed.length
    const hold = mounted.gate.gate(targetRecord.path)
    try {
      const confirmButton = buttonByLabel(dialog, '删除资源')
      await act(async () => {
        confirmButton.click()
      })
      expect(mounted.gate.calls.length).toBe(callsBefore + 1)
      expect(mounted.gate.calls.at(-1)).toBe(targetRecord.path)
      expect(mounted.gate.completed.length).toBe(completedBefore)
      expect(confirmButton.disabled).toBe(true)
      expect(confirmButton.textContent).toBe('处理中')

      const entry = structuredClone(mounted.session.getState().manifest.entryPoints[0]!)
      await act(async () => {
        mounted.session.dispatch(
          new SetStartupEntriesCommand({
            defaultEntryId: mounted.session.getState().manifest.defaultEntryId,
            entryPoints: [{ ...entry, introVideo: 'video.k06-target' }],
          }),
        )
      })
      const historyAfterSeed = mounted.session.getHistoryVersion()
      expect(historyAfterSeed).toBe(historyAtMount + 1)
      // 弹窗实时反映新索引：1 处引用；确认按钮仍在 busy（引用禁用与 busy 叠加，busy 退后再分验）。
      expect(dialog.textContent).toContain('1 处')
      expect(confirmButton.disabled).toBe(true)

      await act(async () => {
        hold.resolve()
      })
      // 中性等待：错误出现或资源被删都代表退出在途，业务断言随后分胜负。
      await vi.waitFor(() => {
        expect(
          host.querySelector('.cutscene-side-error') !== null ||
            mounted.session.getState().assetCatalog.assets['video.k06-target'] === undefined,
        ).toBe(true)
      })
      expect(mounted.gate.completed.length).toBe(completedBefore + 1)
      expect(mounted.gate.completed.at(-1)).toBe(targetRecord.path)
      // 拒绝侧：AssetInUseError 实文本、零提交、弹窗保持、hero 不动。
      expect(host.querySelector('.cutscene-side-error')?.textContent).toBe(
        '资源 video.k06-target 仍被 1 处引用，不能删除',
      )
      expect(mounted.session.getState().assetCatalog.assets['video.k06-target']).toEqual(
        targetRecord,
      )
      expect(mounted.session.getHistoryVersion()).toBe(historyAfterSeed)
      expect(dialog.open).toBe(true)
      expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('待删视频')
      // busy 已退（删除流程结束），确认仍禁用 —— 禁用来自实时引用而非在途。
      expect(buttonByLabel(dialog, '删除资源').disabled).toBe(true)

      // 正控：撤销引用命令 → 实时索引归零、确认恢复可用 → 真实删除。
      await act(async () => {
        expect(mounted.session.undo()).toBe(true)
      })
      const historyAfterUndo = mounted.session.getHistoryVersion()
      expect(dialog.textContent).toContain('0 处')
      expect(buttonByLabel(dialog, '删除资源').disabled).toBe(false)
      await act(async () => {
        buttonByLabel(dialog, '删除资源').click()
      })
      await vi.waitFor(() => {
        expect(mounted.session.getState().assetCatalog.assets['video.k06-target']).toBeUndefined()
      })
      expect(mounted.session.getHistoryVersion()).toBe(historyAfterUndo + 1)
      expect(dialog.open).toBe(false)
      // 选中回退到兜底视频并同步 focus，目录行只剩一项。
      expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('兜底视频')
      expect(mounted.focusLog.at(-1)).toBe('video.k06-fallback')
      expect(host.querySelectorAll('.cutscene-asset-list .ds-catalog-row')).toHaveLength(1)

      // undo 删除：record 全字段还原 + previousBytes（真实磁盘预读）物化到 pending。
      await act(async () => {
        expect(mounted.session.undo()).toBe(true)
      })
      expect(mounted.session.getState().assetCatalog.assets['video.k06-target']).toEqual(
        targetRecord,
      )
      const restoredBlob = mounted.session.getState().assetBlobs[targetRecord.path]
      expect(restoredBlob).toBeDefined()
      expect(new Uint8Array(restoredBlob!)).toEqual(targetBytes)
      assertProjectSaveValid(mounted.session.getState())
      await act(async () => {
        expect(mounted.session.redo()).toBe(true)
      })
      expect(mounted.session.getState().assetCatalog.assets['video.k06-target']).toBeUndefined()
    } finally {
      hold.resolve()
    }
  })

  test('帧动画 metadata 经真实 FrameAnimationEditor 进检查器，并与视频行随选择互切', async () => {
    const frames = [
      solidRgba(2, 1, [200, 84, 68, 255]),
      solidRgba(2, 1, [104, 158, 74, 255]),
      solidRgba(2, 1, [222, 226, 232, 255]),
    ]
    const silentBytes = mp4SilentBytes()
    const mounted = await mountTab({
      animations: [
        {
          id: 'frame-animation.k06-logo',
          label: '徽标动画',
          width: 2,
          height: 1,
          defaultFrameMs: 40,
          frames,
        },
      ],
      videos: [{ id: 'video.k06-silent', label: '无声过场', bytes: silentBytes }],
      focus: 'frame-animation.k06-logo',
    })
    const historyAtMount = mounted.session.getHistoryVersion()
    // 真实编辑器就绪（内部见证）：3 张帧卡。
    await vi.waitFor(() => expect(host.querySelectorAll('.fa-frame').length).toBe(3))
    // 检查器动画区：metadata 由真实解码链经 onFrameMetadata（430）上报。
    expect(propertyRowValue('画布')).toBe('2 × 1')
    expect(propertyRowValue('帧数')).toBe('3')
    expect(propertyRowValue('时长')).toBe('0.12 秒')
    expect(propertyRowValue('色彩')).toBe('保留原色')

    // 切到视频：视频区行替换帧动画行（onVideoMetadata 433 接线）。
    await act(async () => {
      catalogRow('无声过场').click()
    })
    const video = await currentVideoElement()
    await fireLoadedMetadata(video, { width: 80, height: 60, duration: 2.5 })
    expect(propertyRowValue('分辨率')).toBe('80 × 60')
    expect(propertyRowValue('时长')).toBe('2.50 秒')
    expect(propertyRowValue('音轨')).toBe('无')
    expect(propertyRowValue('画布')).toBeNull()
    expect(propertyRowValue('帧数')).toBeNull()

    // 切回帧动画：真实重读后行恢复。
    await act(async () => {
      catalogRow('徽标动画').click()
    })
    await vi.waitFor(() => expect(host.querySelectorAll('.fa-frame').length).toBe(3))
    expect(propertyRowValue('画布')).toBe('2 × 1')
    expect(propertyRowValue('帧数')).toBe('3')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(mounted.focusLog).toEqual(['video.k06-silent', 'frame-animation.k06-logo'])
  })
})
