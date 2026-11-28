// @vitest-environment jsdom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { waitForReact } from '../__tests__/react-io-wait.js'
import { DeleteAssetCommand, SetStartupEntriesCommand } from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { mp4AudioBytes, mp4SilentBytes } from './__tests__/cutscene-resource-fixtures.js'
import { installCutsceneTestHost } from './__tests__/cutscene-test-host.js'
import { mp4Bytes } from './__tests__/glm-authoring-kit.js'
import { buttonByLabel } from './__tests__/glm-ui-wave-kit.js'
import { solidRgba } from './__tests__/kimi-editor-workflows/kit.js'

const { host, mountTab, catalogRow, currentVideoElement, openDialogByTitle, focusAsset } =
  installCutsceneTestHost()
const heroTitle = () => host.querySelector('.ds-object-hero__title')?.textContent

async function markDraftDirty() {
  await waitForReact(() => expect(host.querySelector('.fa-frame')).not.toBeNull())
  await act(async () => buttonByLabel(host, '复制选中帧').click())
}

describe('过场选择、草稿所有权与引用删除', () => {
  test('删除在途期间实时引用出现则真实拒绝；解除后真实删除且 undo 字节级还原', async () => {
    const targetBytes = mp4AudioBytes()
    const fallbackBytes = mp4SilentBytes()
    const mounted = await mountTab({
      videos: [
        { id: 'video.delete-fallback', label: '兜底视频', bytes: fallbackBytes },
        { id: 'video.delete-target', label: '待删视频', bytes: targetBytes },
      ],
      focus: 'video.delete-target',
    })
    // 挂载预览读真实完成。
    await currentVideoElement()
    const targetRecord = mounted.session.getState().assetCatalog.assets['video.delete-target']!
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
            entryPoints: [{ ...entry, introVideo: 'video.delete-target' }],
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
      await waitForReact(() => {
        expect(
          host.querySelector('.cutscene-side-error') !== null ||
            mounted.session.getState().assetCatalog.assets['video.delete-target'] === undefined,
        ).toBe(true)
      })
      expect(mounted.gate.completed.length).toBe(completedBefore + 1)
      expect(mounted.gate.completed.at(-1)).toBe(targetRecord.path)
      // 拒绝侧：AssetInUseError 实文本、零提交、弹窗保持、hero 不动。
      expect(host.querySelector('.cutscene-side-error')?.textContent).toBe(
        '资源 video.delete-target 仍被 1 处引用，不能删除',
      )
      expect(mounted.session.getState().assetCatalog.assets['video.delete-target']).toEqual(
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
      await waitForReact(() => {
        expect(
          mounted.session.getState().assetCatalog.assets['video.delete-target'],
        ).toBeUndefined()
      })
      expect(mounted.session.getHistoryVersion()).toBe(historyAfterUndo + 1)
      expect(dialog.open).toBe(false)
      // 选中回退到兜底视频并同步 focus，目录行只剩一项。
      expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('兜底视频')
      expect(mounted.focusLog.at(-1)).toBe('video.delete-fallback')
      expect(host.querySelectorAll('.cutscene-asset-list .ds-catalog-row')).toHaveLength(1)

      // undo 删除：record 全字段还原 + previousBytes（真实磁盘预读）物化到 pending。
      await act(async () => {
        expect(mounted.session.undo()).toBe(true)
      })
      expect(mounted.session.getState().assetCatalog.assets['video.delete-target']).toEqual(
        targetRecord,
      )
      const restoredBlob = mounted.session.getState().assetBlobs[targetRecord.path]
      expect(restoredBlob).toBeDefined()
      expect(new Uint8Array(restoredBlob!)).toEqual(targetBytes)
      assertProjectSaveValid(mounted.session.getState())
      await act(async () => {
        expect(mounted.session.redo()).toBe(true)
      })
      expect(mounted.session.getState().assetCatalog.assets['video.delete-target']).toBeUndefined()
    } finally {
      hold.resolve()
    }
  })

  test('选中资源被外部真实删除后选择回落第一项且不伪造 focus 回报', async () => {
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

  test('脏帧动画下切走 → 确认后真实切换且脏标志复位（再切不弹窗）', async () => {
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
    await markDraftDirty()

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

  test('onCancel 把 focus 还原回当前选择，选择与脏状态保持', async () => {
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
    await markDraftDirty()

    // 父级把 focus 深链到另一资源（非点击选择）：脏状态下走确认弹窗。
    await focusAsset('video.c4')
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

  test('确认替换后取消文件选择，保留现有动画草稿和脏保护', async () => {
    const { session } = await mountTab({
      focus: 'frame-animation.logo',
      videos: [{ id: 'video.opening', label: '开场视频', bytes: mp4SilentBytes() }],
      animations: [
        {
          id: 'frame-animation.logo',
          label: '徽标',
          width: 2,
          height: 1,
          defaultFrameMs: 40,
          frames: [solidRgba(2, 1, [10, 40, 220, 255])],
        },
      ],
    })
    await markDraftDirty()
    await act(async () => buttonByLabel(host, '替换').click())
    const dialog = openDialogByTitle('放弃未保存修改')
    await act(async () => buttonByLabel(dialog, '放弃并继续').click())

    // Chromium fires cancel when the file chooser returns without a new selection.
    const replaceInput = host.querySelectorAll<HTMLInputElement>(
      '.cutscene-outliner input[hidden][multiple]',
    )[1]
    if (!replaceInput) throw new Error('Missing frame replacement file input')
    await act(async () => replaceInput.dispatchEvent(new Event('cancel', { bubbles: true })))
    expect(host.querySelectorAll('.fa-frame')).toHaveLength(2)
    await act(async () => catalogRow('开场视频').click())
    expect(openDialogByTitle('放弃未保存修改').textContent).toContain('开场视频')
    expect(session.getHistoryVersion()).toBe(0)
  })
})
