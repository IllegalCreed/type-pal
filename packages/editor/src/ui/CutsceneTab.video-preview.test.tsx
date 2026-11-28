// @vitest-environment jsdom

import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { sha256Hex } from '../core/binary-signature.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { mp4AudioBytes, mp4SilentBytes } from './__tests__/cutscene-resource-fixtures.js'
import { installCutsceneTestHost } from './__tests__/cutscene-test-host.js'
import { fileOf, mp4Bytes, webmBytes } from './__tests__/glm-authoring-kit.js'
import {
  buttonByLabel,
  deferred,
  inputByAccept,
  loadFilesIntoInput,
} from './__tests__/glm-ui-wave-kit.js'
import { type GatedFileSource, solidRgba } from './__tests__/kimi-editor-workflows/kit.js'

const {
  host,
  mountTab,
  catalogRow,
  propertyRowValue,
  currentVideoElement,
  fireLoadedMetadata,
  unmount,
  objectUrls,
} = installCutsceneTestHost()
const heroTitle = () => host.querySelector('.ds-object-hero__title')?.textContent

function ownedBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer
}

describe('过场视频导入与预览', () => {
  test('视频 metadata 真实容器解析与切换在途重置：音轨有/无、objectURL 建立与回收', async () => {
    const audioBytes = mp4AudioBytes()
    const silentBytes = mp4SilentBytes()
    const mounted = await mountTab({
      videos: [
        { id: 'video.preview-audio', label: '有声过场', bytes: audioBytes },
        { id: 'video.preview-silent', label: '无声过场', bytes: silentBytes },
      ],
      focus: 'video.preview-audio',
    })
    const historyAtMount = mounted.session.getHistoryVersion()
    const videoA = await currentVideoElement()
    // objectURL 协议见证：以真实字节 Blob 建 URL（不宣称可播放）。
    expect(objectUrls().created).toHaveLength(1)
    expect(objectUrls().created[0]!.blob.type).toBe('video/mp4')
    expect(new Uint8Array(await objectUrls().created[0]!.blob.arrayBuffer())).toEqual(audioBytes)
    expect(videoA.getAttribute('src')).toBe(objectUrls().created[0]!.url)

    await fireLoadedMetadata(videoA, { width: 320, height: 240, duration: 12.5 })
    expect(propertyRowValue('分辨率')).toBe('320 × 240')
    expect(propertyRowValue('时长')).toBe('12.50 秒')
    expect(propertyRowValue('音轨')).toBe('有')

    // 切到无声视频：闸门造磁盘迟到，在途窗内检查器回到「读取中」，旧 objectURL 被回收。
    const silentPath = mounted.session.getState().assetCatalog.assets['video.preview-silent']!.path
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
      expect(objectUrls().revoked).toEqual([objectUrls().created[0]!.url])
      expect(host.querySelector('video')).toBeNull()
      expect(host.textContent).toContain('正在读取视频…')
      expect(propertyRowValue('分辨率')).toBe('读取中')
      expect(propertyRowValue('时长')).toBe('读取中')
      expect(propertyRowValue('音轨')).toBe('浏览器未报告')
      await act(async () => {
        hold.resolve()
      })
      await waitForReact(() => expect(host.querySelector('video')).not.toBeNull())
    } finally {
      hold.resolve()
    }
    expect(mounted.gate.completed.length).toBe(completedBefore + 1)
    expect(mounted.gate.completed.at(-1)).toBe(silentPath)

    const videoB = host.querySelector<HTMLVideoElement>('video')!
    expect(objectUrls().created).toHaveLength(2)
    expect(new Uint8Array(await objectUrls().created[1]!.blob.arrayBuffer())).toEqual(silentBytes)
    await fireLoadedMetadata(videoB, { width: 80, height: 60, duration: 2.5 })
    expect(propertyRowValue('分辨率')).toBe('80 × 60')
    expect(propertyRowValue('时长')).toBe('2.50 秒')
    expect(propertyRowValue('音轨')).toBe('无')

    // 分支序：浏览器上报音轨轨道时元素优先于容器解析（同一视频由 无 → 有）。
    await fireLoadedMetadata(videoB, { width: 80, height: 60, duration: 2.5, audio: 'reported' })
    expect(propertyRowValue('音轨')).toBe('有')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(mounted.focusLog.at(-1)).toBe('video.preview-silent')
  })

  test('先后完成的同内容视频导入各有独立 ID 与原文件标签', async () => {
    const { session } = await mountTab()
    const input = host.querySelector<HTMLInputElement>('input[accept="video/mp4,video/webm"]')
    if (!input) throw new Error('video import field missing')
    const bytes = ownedBuffer(mp4SilentBytes())
    const digest = await sha256Hex(bytes)
    const original = new File([bytes], 'first.mp4', { type: 'video/mp4' })
    let finishRead!: (result: ArrayBuffer) => void
    const delayed = new Promise<ArrayBuffer>((resolve) => {
      finishRead = resolve
    })
    vi.spyOn(original, 'arrayBuffer').mockReturnValue(delayed)
    try {
      await loadFilesIntoInput(input, [original])
      await loadFilesIntoInput(input, [new File([bytes], 'second.mp4', { type: 'video/mp4' })])
      await waitForReact(() => expect(session.getHistoryVersion()).toBe(1))
    } finally {
      await act(async () => finishRead(bytes))
    }
    await waitForReact(() => expect(session.getHistoryVersion()).toBe(2))
    const assets = session.getState().assetCatalog.assets
    const id = `video.authored.${digest.slice(0, 16)}`
    expect(assets[id]?.label).toBe('second')
    expect(assets[`${id}-2`]?.label).toBe('first')
  })

  test('同一视频 ID 替换及撤销后，预览读取实际新旧字节并回收上一份 URL', async () => {
    const id = 'video.intro'
    const original = mp4AudioBytes()
    const replacement = mp4SilentBytes()
    const mounted = await mountTab({
      focus: id,
      videos: [{ id, label: '片头', bytes: original }],
    })
    const video = await currentVideoElement()
    await fireLoadedMetadata(video, { width: 320, height: 240, duration: 3 })
    expect(propertyRowValue('音轨')).toBe('有')

    await act(async () => buttonByLabel(host, '替换').click())
    const inputs = host.querySelectorAll<HTMLInputElement>('input[accept="video/mp4,video/webm"]')
    expect(inputs).toHaveLength(2)
    const file = new File([ownedBuffer(replacement)], 'silent.mp4', { type: 'video/mp4' })
    const replacementHash = await sha256Hex(replacement)
    await loadFilesIntoInput(inputs[1]!, [file])
    await waitForReact(() => {
      expect(mounted.session.getState().assetCatalog.assets[id]?.sha256).toBe(replacementHash)
    })

    expect(objectUrls().revoked).toEqual([objectUrls().created[0]!.url])
    expect(propertyRowValue('分辨率')).toBe('读取中')
    const newVideo = await currentVideoElement()
    expect(newVideo).not.toBe(video)
    expect(new Uint8Array(await objectUrls().created[1]!.blob.arrayBuffer())).toEqual(replacement)
    await fireLoadedMetadata(newVideo, { width: 160, height: 120, duration: 2 })
    expect(propertyRowValue('音轨')).toBe('无')

    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    const restored = await currentVideoElement()
    expect(restored.getAttribute('src')).toBe(objectUrls().created[2]!.url)
    expect(objectUrls().revoked).toEqual(
      objectUrls()
        .created.slice(0, 2)
        .map(({ url }) => url),
    )
    expect(new Uint8Array(await objectUrls().created[2]!.blob.arrayBuffer())).toEqual(original)
  })

  test('undo restores the video bytes present when a slow replacement commits', async () => {
    const id = 'video.intro'
    const silent = mp4SilentBytes()
    const { session, reader } = await mountTab({
      focus: id,
      videos: [{ id, label: '片头', bytes: silent }],
    })
    await currentVideoElement()
    const firstBytes = ownedBuffer(mp4AudioBytes())
    const second = Uint8Array.from([...silent, 0, 0, 0, 8, 0x66, 0x72, 0x65, 0x65])
    const secondHash = await sha256Hex(second)
    const originalBytes = await reader.readBytes(id, 'video')
    const hold = deferred<ArrayBuffer>()
    const entered = vi.spyOn(reader, 'readBytes').mockReturnValueOnce(hold.promise)
    const input = host.querySelectorAll<HTMLInputElement>('input[accept="video/mp4,video/webm"]')[1]
    if (!input) throw new Error('Missing video replacement input')
    const replace = async (file: File) => {
      await act(async () => buttonByLabel(host, '替换').click())
      await loadFilesIntoInput(input, [file])
    }
    const before = session.getHistoryVersion()
    try {
      await replace(new File([firstBytes], 'audio.mp4', { type: 'video/mp4' }))
      await waitForReact(() => expect(entered).toHaveBeenCalledWith(id, 'video'))
      await replace(new File([second], 'silent.mp4', { type: 'video/mp4' }))
      await waitForReact(() => expect(session.getHistoryVersion()).toBe(before + 1))
    } finally {
      await act(async () => hold.resolve(originalBytes))
    }
    await waitForReact(() => expect(session.getHistoryVersion()).toBe(before + 2))
    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().assetCatalog.assets[id]?.sha256).toBe(secondHash)
    expect(new Uint8Array(await reader.readBytes(id, 'video'))).toEqual(second)
    assertProjectSaveValid(session.getState())
  })

  test('视频读取失败只伤当前资源：错误可见、检查器保持读取中、切走正常', async () => {
    const brokenBytes = mp4AudioBytes()
    const silentBytes = mp4SilentBytes()
    const brokenPath = `assets/authored/video/${await sha256Hex(brokenBytes)}.mp4`
    let hold!: ReturnType<GatedFileSource['gate']>
    const mounted = await mountTab({
      videos: [
        { id: 'video.preview-broken', label: '损坏视频', bytes: brokenBytes },
        { id: 'video.preview-silent', label: '无声过场', bytes: silentBytes },
      ],
      focus: 'video.preview-broken',
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
    await waitForReact(() => {
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
    await waitForReact(() => {
      expect(host.querySelector('.cutscene-video-stage .cf-err')?.textContent).toBe('磁盘读取失败')
    })
    expect(propertyRowValue('分辨率')).toBe('读取中')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(mounted.focusLog).toEqual(['video.preview-silent', 'video.preview-broken'])
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
          id: 'frame-animation.preview-logo',
          label: '徽标动画',
          width: 2,
          height: 1,
          defaultFrameMs: 40,
          frames,
        },
      ],
      videos: [{ id: 'video.preview-silent', label: '无声过场', bytes: silentBytes }],
      focus: 'frame-animation.preview-logo',
    })
    const historyAtMount = mounted.session.getHistoryVersion()
    // 真实编辑器就绪（内部见证）：3 张帧卡。
    await waitForReact(() => expect(host.querySelectorAll('.fa-frame').length).toBe(3))
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
    await waitForReact(() => expect(host.querySelectorAll('.fa-frame').length).toBe(3))
    expect(propertyRowValue('画布')).toBe('2 × 1')
    expect(propertyRowValue('帧数')).toBe('3')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(mounted.focusLog).toEqual(['video.preview-silent', 'frame-animation.preview-logo'])
  })

  test('检查器大小行按字节三分支格式化，时长走分钟支 M:SS.S', async () => {
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

    // 小于一分钟走秒数，此处验证分钟格式。
    await act(async () => {
      catalogRow('半 KB 片').click()
    })
    const video = await currentVideoElement()
    await fireLoadedMetadata(video, { width: 64, height: 48, duration: 62 })
    expect(propertyRowValue('时长')).toBe('1:02.0')
    expect(propertyRowValue('分辨率')).toBe('64 × 48')
    expect(mounted.session.getHistoryVersion()).toBe(0)
  })

  test('视频扩展识别：webm（EBML 魔数）真实导入落账 .webm；.mp4 名 + webm 字节拒绝零提交', async () => {
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
    await waitForReact(() => expect(authoredVideoIds()).toHaveLength(1))
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
    await waitForReact(() => expect(host.textContent).toContain('只支持有效的 MP4 或 WebM'))
    expect(authoredVideoIds()).toHaveLength(1)
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterImport)
  })

  test('卸载回收 objectURL：视频预览建立的 URL 在 unmount 时被 revoke', async () => {
    await mountTab({
      focus: 'video.c5',
      videos: [{ id: 'video.c5', label: '卸载回收片', bytes: mp4SilentBytes() }],
    })
    await currentVideoElement()
    expect(objectUrls().created).toHaveLength(1)
    expect(objectUrls().revoked).toEqual([])
    await unmount()
    expect(objectUrls().revoked).toEqual([objectUrls().created[0]!.url])
  })

  test('导入 MP4 按真实字节生成条目，坏容器保留当前选择', async () => {
    const { session, reader, focusLog } = await mountTab()
    const bytes = mp4SilentBytes()
    const sha256 = await sha256Hex(bytes)
    const id = `video.authored.${sha256.slice(0, 16)}`
    const input = inputByAccept(host, 'video/mp4,video/webm')
    await loadFilesIntoInput(input, [fileOf(bytes, 'opening.mp4', 'video/mp4')])
    await waitForReact(() => expect(session.getState().assetCatalog.assets[id]).toBeDefined())
    const record = session.getState().assetCatalog.assets[id]
    expect(record).toEqual({
      kind: 'video',
      path: `assets/authored/video/${sha256}.mp4`,
      mediaType: 'video/mp4',
      bytes: bytes.byteLength,
      sha256,
      label: 'opening',
      origin: { kind: 'authored', ref: 'opening.mp4' },
    })
    expect(new Uint8Array(await reader.readBytes(id, 'video'))).toEqual(bytes)
    expect(focusLog).toEqual([id])
    expect(session.getHistoryVersion()).toBe(1)

    await loadFilesIntoInput(input, [fileOf(new Uint8Array(24), 'invalid.mp4', 'video/mp4')])
    await waitForReact(() => expect(host.textContent).toContain('只支持有效的 MP4 或 WebM'))
    expect(session.getState().assetCatalog.assets[id]).toEqual(record)
    expect(session.getHistoryVersion()).toBe(1)
    expect(focusLog).toEqual([id])
  })
})
