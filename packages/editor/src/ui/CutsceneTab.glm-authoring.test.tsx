// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-AUTHORING-PANELS-1 C 组：CutsceneTab 作者面板残差合同。
 *
 * 去重（旧 fullName → 已证 → 本文件只补）：
 * - CutsceneTab.test.tsx：目录/空态、live 引用阻断、迟到 oracle、脏守卫替换确认后取消、
 *   待导入帧本地重排已证 → 不重复（dirty 弹窗本身旧测已开过，本文件只证「确认切换 + 脏复位」
 *   与「focus 深链确认后取消把 focus 还原」两条未证臂）。
 * - CutsceneTab.glm-ui-wave.test.tsx：MP4 导入落账/非法内容零提交/帧弹窗取消已证 → 不重复。
 * - CutsceneTab.kimi-workflows.test.tsx：帧队列全链、视频 metadata 音轨/切换 objectURL 建立回收、
 *   删除在途拒绝/成功+undo、metadata 接线、秒支时长已证 → 不重复。
 * 本文件合同：检查器大小行字节三分支 + 时长分钟支（C1）、webm 识别与名实不符拒绝（C2）、
 * 选中资源被外部真实删除后的选择回落（C3）、discard 确认切换与取消还原（C4a/C4b）、
 * 卸载回收 objectURL（C5）。FrameAnimationEditor 沿用两份旧测的标脏桩先例（被测对象是
 * CutsceneTab 面板本体，帧编辑内部已由 kimi/GLM 旧测覆盖）。
 */
import type { AssetId } from '@type-pal/content'
import { type AssetBase, AssetResolver } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { collectEditorAssetDiagnostics } from '../core/asset-diagnostics.js'
import { DeleteAssetCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { collectEditorAssetReferences } from '../core/editor-asset-references.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { fileOf, mp4Bytes, webmBytes } from './__tests__/glm-authoring-kit.js'
import {
  buttonByLabel,
  inputByAccept,
  loadFilesIntoInput,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import {
  installCutsceneHardwarePorts,
  loadCutsceneFixtureProject,
  mp4SilentBytes,
  type ObjectUrlWitness,
  restoreCutsceneHardwarePorts,
} from './__tests__/kimi-editor-workflows/k06-fixtures.js'
import { solidRgba } from './__tests__/kimi-editor-workflows/kit.js'
import { CutsceneTab } from './CutsceneTab.js'

vi.mock('./FrameAnimationEditor.js', () => ({
  FrameAnimationEditor: (props: { onDirtyChange: (dirty: boolean) => void }) => (
    <button type="button" data-testid="mark-frame-dirty" onClick={() => props.onDirtyChange(true)}>
      标记帧动画已修改
    </button>
  ),
}))

/** 父级 focus 回路：点击回报回喂；测试可经 parentSetFocus 直接改 focus（导航深链）。 */
let parentSetFocus: ((id: string | undefined) => void) | undefined

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
  parentSetFocus = setFocus
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

interface AnimationSeed {
  id: AssetId
  label: string
  width: number
  height: number
  defaultFrameMs: number
  frames: readonly Uint8Array[]
}

interface Mounted {
  session: EditSession
  reader: EditorAssetReader
  focusLog: Array<string | undefined>
}

async function mountTab(options: {
  focus?: AssetId
  videos?: readonly { id: AssetId; label: string; bytes: Uint8Array }[]
  animations?: readonly AnimationSeed[]
}): Promise<Mounted> {
  const legal = await loadCutsceneFixtureProject('glm-authoring-cutscene', {
    videos: options.videos,
    animations: options.animations,
  })
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const assetBase: AssetBase = {
    source: legal.source,
    assetResolver: new AssetResolver(
      legal.manifest.id,
      legal.catalog,
      legal.manifest.assets.roles,
      legal.source,
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
  return { session, reader, focusLog }
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

function heroTitle(): string | null {
  return host.querySelector('.ds-object-hero__title')?.textContent ?? null
}

async function currentVideoElement(): Promise<HTMLVideoElement> {
  let video: HTMLVideoElement | null = null
  await vi.waitFor(() => {
    video = host.querySelector<HTMLVideoElement>('video')
    expect(video, '视频元素已挂载').not.toBeNull()
  })
  return video!
}

/** 按协议喂 loadedmetadata（jsdom 无解码器；只证明检查器接线，不宣称解码保真）。 */
async function fireLoadedMetadata(
  video: HTMLVideoElement,
  metadata: { width: number; height: number; duration: number },
): Promise<void> {
  Object.defineProperty(video, 'videoWidth', { configurable: true, value: metadata.width })
  Object.defineProperty(video, 'videoHeight', { configurable: true, value: metadata.height })
  Object.defineProperty(video, 'duration', { configurable: true, value: metadata.duration })
  Object.defineProperty(video, 'audioTracks', { configurable: true, value: undefined })
  await act(async () => {
    video.dispatchEvent(new Event('loadedmetadata'))
  })
}

function openDialogByTitle(title: string): HTMLDialogElement {
  const dialog = host.querySelector<HTMLDialogElement>(`dialog[aria-label="${title}"]`)
  expect(dialog?.open, `弹窗 ${title} 处于打开`).toBe(true)
  return dialog!
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
  parentSetFocus = undefined
  restoreCutsceneHardwarePorts()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('C 组 CutsceneTab 作者面板残差', () => {
  test('C1 检查器大小行按字节三分支格式化，时长走分钟支 M:SS.S', async () => {
    const mounted = await mountTab({
      focus: 'video.c1-b',
      videos: [
        { id: 'video.c1-b', label: '半 KB 片', bytes: mp4Bytes(512) },
        { id: 'video.c1-kb', label: '整 KB 片', bytes: mp4Bytes(2048) },
        { id: 'video.c1-mb', label: '兆级片', bytes: mp4Bytes(3 * 1024 * 1024) },
      ],
    })
    const sizes = new Map<string, string>()
    for (const label of ['半 KB 片', '整 KB 片', '兆级片']) {
      await act(async () => {
        catalogRow(label).click()
      })
      const video = await currentVideoElement()
      expect(video).not.toBeNull()
      sizes.set(label, propertyRowValue('大小') ?? '')
    }
    expect(sizes.get('半 KB 片')).toBe('512 B')
    expect(sizes.get('整 KB 片')).toBe('2.0 KB')
    expect(sizes.get('兆级片')).toBe('3.0 MB')

    // 时长分钟支：<60s 走「N.NN 秒」已由 kimi 旧测证明；这里钉 ≥60s 的 M:SS.S。
    await act(async () => {
      catalogRow('半 KB 片').click()
    })
    const video = await currentVideoElement()
    await fireLoadedMetadata(video, { width: 64, height: 48, duration: 62 })
    expect(propertyRowValue('时长')).toBe('1:02.0')
    expect(propertyRowValue('分辨率')).toBe('64 × 48')
    expect(mounted.session.getHistoryVersion()).toBe(0)
  })

  test('C2 视频扩展识别：webm（EBML 魔数）真实导入落账 .webm；.mp4 名 + webm 字节拒绝零提交', async () => {
    const mounted = await mountTab({ videos: [] })
    const authoredVideoIds = (): string[] =>
      Object.keys(mounted.session.getState().assetCatalog.assets).filter((id) =>
        id.startsWith('video.authored.'),
      )
    const input = inputByAccept(host, 'video/mp4,video/webm')

    // 正控：.webm 名 + video/webm 类型 + EBML 魔数 → 识别为 webm 落账。
    await act(async () => {
      await loadFilesIntoInput(input, [fileOf(webmBytes(), 'intro.webm', 'video/webm')])
    })
    await act(async () => {
      await vi.waitFor(() => expect(authoredVideoIds()).toHaveLength(1))
    })
    const record = mounted.session.getState().assetCatalog.assets[authoredVideoIds()[0]!]!
    expect(record.kind).toBe('video')
    expect(record.mediaType).toBe('video/webm')
    expect(record.path.endsWith('.webm')).toBe(true)
    expect(record.bytes).toBe(32)
    expect(heroTitle()).toBe('intro')
    expect(mounted.focusLog.at(-1)).toBe(authoredVideoIds()[0])
    const historyAfterImport = mounted.session.getHistoryVersion()

    // 名实不符：.mp4 名 + mp4 类型 + webm 字节 → 魔数对不上扩展，拒绝且零提交。
    await act(async () => {
      await loadFilesIntoInput(input, [fileOf(webmBytes(0x77), 'fake.mp4', 'video/mp4')])
    })
    await act(async () => {
      await vi.waitFor(() => expect(host.textContent).toContain('只支持有效的 MP4 或 WebM'))
    })
    expect(authoredVideoIds()).toHaveLength(1)
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImport)
  })

  test('C3 stale selection：选中资源被外部真实删除后选择回落第一项且不伪造 focus 回报', async () => {
    const mounted = await mountTab({
      focus: 'video.c3-b',
      videos: [
        { id: 'video.c3-a', label: '回落甲', bytes: mp4SilentBytes() },
        { id: 'video.c3-b', label: '回落乙', bytes: mp4Bytes(64) },
      ],
    })
    await currentVideoElement()
    expect(heroTitle()).toBe('回落乙')
    expect(mounted.focusLog).toEqual([])

    // 外部真命令删除当前选中资源（零引用、字节预读走真实磁盘）。
    const previousBytes = await mounted.reader.readBytes('video.c3-b', 'video')
    await act(async () => {
      mounted.session.dispatch(
        new DeleteAssetCommand('video.c3-b', collectCurrentProjectReferenceIndex, previousBytes),
      )
      await Promise.resolve()
    })
    // 回落效应同步完成：不等待、不轮询，直接断言业务结果。
    expect(heroTitle()).toBe('回落甲')
    // 回落效应不调用 onObjectFocus（focusLog 保持空），目录只剩一行。
    expect(mounted.focusLog).toEqual([])
    expect(host.querySelectorAll('.cutscene-asset-list .ds-catalog-row')).toHaveLength(1)
    expect(mounted.session.getState().assetCatalog.assets['video.c3-b']).toBeUndefined()
  })

  test('C4a discard 确认：脏帧动画下切走 → 确认后真实切换且脏标志复位（再切不弹窗）', async () => {
    const mounted = await mountTab({
      focus: 'frame-animation.logo',
      videos: [{ id: 'video.c4', label: '切换目标', bytes: mp4SilentBytes() }],
      animations: [
        {
          id: 'frame-animation.logo',
          label: '徽标动画',
          width: 2,
          height: 1,
          defaultFrameMs: 40,
          frames: [solidRgba(2, 1, [200, 84, 68, 255])],
        },
      ],
    })
    const historyAtMount = mounted.session.getHistoryVersion()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="mark-frame-dirty"]')!.click()
    })
    // 脏状态下切走：先弹放弃确认。
    await act(async () => {
      catalogRow('切换目标').click()
    })
    const dialog = openDialogByTitle('放弃未保存修改')
    await act(async () => {
      buttonByLabel(dialog, '放弃并继续').click()
    })
    expect(heroTitle()).toBe('切换目标')
    expect(mounted.focusLog.at(-1)).toBe('video.c4')

    // 脏标志已复位：切回帧动画不再需要确认弹窗（DsDialog 关闭后元素保留，以 open 判别）。
    await act(async () => {
      catalogRow('徽标动画').click()
    })
    expect(
      host.querySelector<HTMLDialogElement>('dialog[aria-label="放弃未保存修改"]')?.open,
    ).not.toBe(true)
    expect(heroTitle()).toBe('徽标动画')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
  })

  test('C4b focus 深链确认后取消：onCancel 把 focus 还原回当前选择，选择与脏状态保持', async () => {
    const mounted = await mountTab({
      focus: 'frame-animation.logo',
      videos: [{ id: 'video.c4', label: '深链目标', bytes: mp4SilentBytes() }],
      animations: [
        {
          id: 'frame-animation.logo',
          label: '徽标动画',
          width: 2,
          height: 1,
          defaultFrameMs: 40,
          frames: [solidRgba(2, 1, [104, 158, 74, 255])],
        },
      ],
    })
    const historyAtMount = mounted.session.getHistoryVersion()
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="mark-frame-dirty"]')!.click()
    })

    // 父级把 focus 深链到另一资源（非点击选择）：脏状态下走确认弹窗。
    await act(async () => {
      parentSetFocus?.('video.c4')
    })
    const dialog = openDialogByTitle('放弃未保存修改')
    expect(dialog.textContent).toContain('深链目标')

    // 取消：不切走，focus 被还原回当前选中资源。
    await act(async () => {
      buttonByLabel(dialog, '取消').click()
    })
    expect(
      host.querySelector<HTMLDialogElement>('dialog[aria-label="放弃未保存修改"]')?.open,
    ).not.toBe(true)
    expect(heroTitle()).toBe('徽标动画')
    expect(mounted.focusLog.at(-1)).toBe('frame-animation.logo')
    // 脏状态保持：再次尝试切走仍要确认。
    await act(async () => {
      catalogRow('深链目标').click()
    })
    expect(openDialogByTitle('放弃未保存修改').open).toBe(true)
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
  })

  test('C5 卸载回收 objectURL：视频预览建立的 URL 在 unmount 时被 revoke', async () => {
    await mountTab({
      focus: 'video.c5',
      videos: [{ id: 'video.c5', label: '卸载回收片', bytes: mp4SilentBytes() }],
    })
    await currentVideoElement()
    expect(objectUrls.created).toHaveLength(1)
    expect(objectUrls.revoked).toEqual([])
    await act(async () => {
      root.unmount()
    })
    expect(objectUrls.revoked).toEqual([objectUrls.created[0]!.url])
  })
})
