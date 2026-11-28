// @vitest-environment jsdom

import { type AssetId, type AssetRecordV1, FRAME_SEQUENCE_MEDIA_TYPE } from '@type-pal/content'
import { FrameSequenceReader } from '@type-pal/reforge'
import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { sha256Hex } from '../core/binary-signature.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { installCutsceneTestHost } from './__tests__/cutscene-test-host.js'
import {
  buttonByLabel,
  chooseComboboxOption,
  fieldControlByLabel,
  loadFilesIntoInput,
  setInputValue,
} from './__tests__/glm-ui-wave-kit.js'
import { pngFileOf, pngRgba, solidRgba } from './__tests__/kimi-editor-workflows/kit.js'

const { host, mountTab } = installCutsceneTestHost()
const FRAME_ACCEPT = 'image/png,image/jpeg,image/webp'

/** 帧文件输入（限 CutsceneTab 自己的 outliner；真实 FrameAnimationEditor 自带同 accept 输入）：
 *  第一个为新建导入，第二个为替换。 */
function frameFileInputs(): HTMLInputElement[] {
  const inputs = [
    ...host.querySelectorAll<HTMLInputElement>('.cutscene-outliner input[hidden][multiple]'),
  ].filter((input) => input.accept === FRAME_ACCEPT)
  expect(inputs).toHaveLength(2)
  return inputs
}

async function waitOpenDialog(title: string): Promise<HTMLDialogElement> {
  let dialog: HTMLDialogElement | null = null
  await waitForReact(() => {
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

describe('过场帧动画导入', () => {
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

    // 重排的两帧收势及焦点恢复仍属于本次交互，先等它们结束再进入外部编码 IO。
    await waitForReact(() => {
      expect(dialog.querySelector('[data-reorder-settling="true"]')).toBeNull()
    })

    // 排除 delta-10：队列收缩、描述同步，仍零提交。
    await excludeFrame(dialog, 'delta-10.png')
    expect(queueNames(dialog)).toEqual(['delta-2.png', 'alpha-1.png'])
    expect(dialog.textContent).toContain('2 张图片')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)

    // 帧率 25 → 10：defaultFrameMs 应落 100。
    await setInputValue(fieldControlByLabel<HTMLInputElement>(dialog, '默认帧率'), '10')

    await act(async () => {
      buttonByLabel(dialog, '创建').click()
    })
    // 中性退出等待：资源出现与否不预设帧序结论，帧序差异由下方解码断言分胜负。
    let createdId = ''
    await waitForReact(() => {
      const hit = Object.keys(mounted.session.getState().assetCatalog.assets).find((key) =>
        key.startsWith('frame-animation.authored.'),
      )
      expect(hit, '新帧动画已入 catalog').toBeDefined()
      createdId = hit!
    })
    const record = mounted.session.getState().assetCatalog.assets[createdId]!
    const blob = mounted.session.getState().assetBlobs[record.path]!
    const sha256 = await sha256Hex(blob)
    expect(createdId).toBe(`frame-animation.authored.${sha256.slice(0, 16)}`)
    expect(record).toEqual({
      kind: 'frame-animation',
      path: `assets/authored/frame-animation/${sha256}.tpfs`,
      mediaType: FRAME_SEQUENCE_MEDIA_TYPE,
      bytes: blob.byteLength,
      sha256: sha256,
      label: 'alpha',
      origin: { kind: 'authored', ref: '2 张图片' },
    } satisfies AssetRecordV1)

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
    expect(mounted.session.getState().assetCatalog.assets[createdId]?.sha256).toBe(sha256)
    const restored = await decodeAnimation(mounted.reader, createdId)
    expect(restored.frames[0]).toEqual(solidRgba(4, 3, colors['delta-2.png']))
    expect(restored.frames[1]).toEqual(solidRgba(4, 3, colors['alpha-1.png']))
  })

  test('帧队列空选择不开窗、排除到空自动关窗且全程零提交', async () => {
    const mounted = await mountTab()
    const historyAtMount = mounted.session.getHistoryVersion()

    // 空选择：onFrameFiles 不开启弹窗。
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
    // 排除最后一帧：pendingFrames 收 undefined，弹窗自关。
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
    await waitForReact(() => {
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
    await waitForReact(() => {
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
          id: 'frame-animation.original',
          label: '旧片头',
          width: 2,
          height: 1,
          defaultFrameMs: 40,
          frames: oldFrames,
        },
      ],
      focus: 'frame-animation.original',
    })
    // 真实 FrameAnimationEditor 装载旧动画（编辑器内部就绪见证，与 metadata 断言无关）。
    await waitForReact(() => expect(host.querySelectorAll('.fa-frame').length).toBe(3))
    const originalRecord =
      mounted.session.getState().assetCatalog.assets['frame-animation.original']!
    const originalDecoded = await decodeAnimation(mounted.reader, 'frame-animation.original')
    expect(originalDecoded.frames).toEqual(oldFrames)
    const historyAtMount = mounted.session.getHistoryVersion()

    // 英雄区「替换」→ 替换文件输入（第二个 multiple 输入），乱序交付两张 4×2 真实 PNG。
    await act(async () => {
      buttonByLabel(host, '替换').click()
    })
    const newPixels = [solidRgba(4, 2, [220, 224, 230, 255]), solidRgba(4, 2, [104, 156, 76, 255])]
    await loadFilesIntoInput(frameFileInputs()[1]!, [
      pngFileOf('new-2.png', pngRgba(4, 2, newPixels[1]!)),
      pngFileOf('new-1.png', pngRgba(4, 2, newPixels[0]!)),
    ])
    const dialog = await waitOpenDialog('替换帧动画')
    expect(queueNames(dialog)).toEqual(['new-1.png', 'new-2.png'])

    // 色彩处理 → 贴合项目标准色彩（真实色盘 + 真实量化核，最近色）。
    await chooseComboboxOption(fieldControlByLabel(dialog, '色彩处理'), '贴合项目标准色彩')
    expect(fieldControlByLabel(dialog, '转换方式')).toBeDefined()

    // The blank project's standard palette has these two distinct nearest colors.
    const quantized = [solidRgba(4, 2, [222, 226, 232, 255]), solidRgba(4, 2, [104, 158, 74, 255])]

    // 闸门拦旧 .tpfs 的磁盘读（previousBytes 捕获点），制造可观测在途窗。
    const callsBefore = mounted.gate.calls.length
    const completedBefore = mounted.gate.completed.length
    const hold = mounted.gate.gate(originalRecord.path)
    try {
      await act(async () => {
        buttonByLabel(dialog, '创建').click()
      })
      await waitForReact(() => expect(mounted.gate.calls.length).toBeGreaterThan(callsBefore))
      expect(mounted.gate.calls.at(-1)).toBe(originalRecord.path)
      expect(mounted.gate.completed.length).toBe(completedBefore)
      expect(dialog.getAttribute('aria-busy')).toBe('true')
      expect(host.textContent).toContain('正在后台压缩完整帧…')
      await act(async () => {
        hold.resolve()
      })
      // 中性等待：sha 变化或错误出现都代表退出在途，业务断言随后分胜负。
      await waitForReact(() => {
        expect(
          mounted.session.getState().assetCatalog.assets['frame-animation.original']!.sha256 !==
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

    const record = mounted.session.getState().assetCatalog.assets['frame-animation.original']!
    const replacement = await mounted.reader.readBytes(
      'frame-animation.original',
      'frame-animation',
    )
    const replacementHash = await sha256Hex(replacement)
    expect(record).toEqual({
      ...originalRecord,
      path: `assets/authored/frame-animation/${replacementHash}.tpfs`,
      bytes: replacement.byteLength,
      sha256: replacementHash,
      label: '旧片头',
      origin: { kind: 'authored', ref: '2 张图片' },
    } satisfies AssetRecordV1)
    expect(mounted.session.getState().assetBlobs[record.path]).toBeDefined()
    expect(mounted.session.getState().assetBlobs[originalRecord.path]).toBeUndefined()
    const decoded = await decodeAnimation(mounted.reader, 'frame-animation.original')
    expect(decoded.index.colorTreatment).toBe('project-standard')
    expect(decoded.index.frames).toHaveLength(2)
    expect(decoded.frames).toEqual(quantized)
    // 选中保持同 id；编辑器按新 sha 真实重载出 2 帧。
    await waitForReact(() => expect(host.querySelectorAll('.fa-frame').length).toBe(2))
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('旧片头')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    assertProjectSaveValid(mounted.session.getState())

    // undo：record 全字段还原 + previousBytes 物化旧字节到 pending，真实解码得旧 3 帧。
    await act(async () => {
      expect(mounted.session.undo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['frame-animation.original']).toEqual(
      originalRecord,
    )
    const restoredBlob = mounted.session.getState().assetBlobs[originalRecord.path]
    expect(restoredBlob).toBeDefined()
    expect(await sha256Hex(restoredBlob!)).toBe(originalRecord.sha256)
    expect((await decodeAnimation(mounted.reader, 'frame-animation.original')).frames).toEqual(
      oldFrames,
    )
    await waitForReact(() => expect(host.querySelectorAll('.fa-frame').length).toBe(3))

    await act(async () => {
      expect(mounted.session.redo()).toBe(true)
    })
    expect(mounted.session.getState().assetCatalog.assets['frame-animation.original']!.sha256).toBe(
      replacementHash,
    )
  })

  test('[reorder-family:cutscene-import] 待导入图片只改本地顺序且不污染全局历史', async () => {
    const { session } = await mountTab()
    const pixel = solidRgba(2, 2, [32, 40, 64, 255])
    const png = pngRgba(2, 2, pixel)
    await loadFilesIntoInput(frameFileInputs()[0]!, [
      pngFileOf('frame-1.png', png),
      pngFileOf('frame-2.png', png),
      pngFileOf('frame-3.png', png),
    ])
    await waitOpenDialog('新建帧动画')

    const collection = host.querySelector<HTMLElement>(
      '[data-ds-reorder-adoption="asset/cutscene-import-frames"]',
    )!
    const items = () => [...collection.querySelectorAll<HTMLElement>('.cutscene-import-file')]
    const names = () => items().map((item) => item.querySelector('code')?.textContent)
    expect(names()).toEqual(['frame-1.png', 'frame-2.png', 'frame-3.png'])
    const source = items()[0]!
    const sourceToken = source.dataset.itemKey
    const handle = source.querySelector<HTMLButtonElement>('[data-ds-reorder-handle]')!

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(names()).toEqual(['frame-1.png', 'frame-2.png', 'frame-3.png'])
    expect(items()[0]?.dataset.itemKey).toBe(sourceToken)
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(names()).toEqual(['frame-2.png', 'frame-3.png', 'frame-1.png'])
    expect(items()[2]?.dataset.itemKey).toBe(sourceToken)
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.undo()).toBe(false)
    expect(session.redo()).toBe(false)
    expect(names()).toEqual(['frame-2.png', 'frame-3.png', 'frame-1.png'])
  })

  test('取消待导入的合法 PNG 保留工程和本地目录', async () => {
    const { session } = await mountTab()
    await loadFilesIntoInput(frameFileInputs()[0]!, [
      pngFileOf('single.png', pngRgba(2, 2, solidRgba(2, 2, [0, 0, 255, 255]))),
    ])
    const dialog = await waitOpenDialog('新建帧动画')
    await act(async () => buttonByLabel(dialog, '取消').click())
    expect(host.querySelector('dialog[open]')).toBeNull()
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.getState().assetBlobs).toEqual({})
  })
})
