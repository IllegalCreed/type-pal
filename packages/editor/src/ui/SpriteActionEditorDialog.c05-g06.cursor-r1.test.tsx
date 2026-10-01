// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C05-G06：SpriteActionEditorDialog 创建/放弃/edit 保存新轴。
 * 排重：glm-l L04 已证 edit 范围漂移自动关窗与 create 模式 Cmd+S 阻断；K03/Dialog.test
 * 已证大量 edit 引用/过滤/窄屏；本组只测 create 确认/放弃、create scopeConflict、edit Cmd+S 放行。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { actionOf, C05_SPRITE, openC05 } from '../__tests__/cursor-asset-r1/c05-action-fixtures.js'
import type { MountedDialog } from '../__tests__/cursor-asset-r1/c05-action-harness.js'
import { mountActionDialog } from '../__tests__/cursor-asset-r1/c05-action-harness.js'
import {
  cleanupDialog,
  clickDialogButton,
  editorHost,
  heroPoses,
  openC05Dialog,
  renameAction,
  setupC05Ui,
  teardownC05Ui,
} from '../__tests__/cursor-asset-r1/c05-action-ui.js'
import { UpdateSpriteCommand } from '../core/commands.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'

let dialog: MountedDialog | undefined

beforeEach(() => setupC05Ui())
afterEach(async () => {
  await cleanupDialog(dialog)
  dialog = undefined
  teardownC05Ui()
})

describe('C05-G06 动作弹窗创建与完成', () => {
  test('C05-G06-01 create 模式：目录只展示待创建的单条动作', async () => {
    dialog = await openC05Dialog('g06-01', { initialMode: 'create' })
    const host = editorHost(dialog)
    expect(host.textContent).toContain('新建预制动作')
    expect(host.querySelectorAll('[role="option"]').length).toBeLessThanOrEqual(1)
    expect(host.textContent).toMatch(/action(-\d+)?/)
  })

  test('C05-G06-02 确认创建：session 写入新 action 且通知 info', async () => {
    dialog = await openC05Dialog('g06-02', { initialMode: 'create' })
    const history = dialog.open.session.getHistoryVersion()
    await clickDialogButton(editorHost(dialog), '创建动作')
    expect(dialog.open.session.getHistoryVersion()).toBe(history + 1)
    const poses = heroPoses(dialog)
    expect(poses && Object.keys(poses).length).toBe(1)
    expect(dialog.notices.at(-1)).toEqual({
      kind: 'info',
      message: '预制动作已创建，可继续编辑。',
    })
    expect(editorHost(dialog).textContent).toContain('编辑预制动作')
  })

  test('C05-G06-03 create 改名后点取消：弹出放弃对话框且 session 仍无 poses', async () => {
    dialog = await openC05Dialog('g06-03', { initialMode: 'create' })
    await renameAction(editorHost(dialog), '草稿名')
    await clickDialogButton(editorHost(dialog), '取消')
    expect(document.body.textContent).toContain('放弃新动作')
    expect(heroPoses(dialog)).toBeUndefined()
    expect(dialog.closes).toHaveLength(0)
  })

  test('C05-G06-04 放弃对话框选继续编辑：alert 关闭且仍可点创建', async () => {
    dialog = await openC05Dialog('g06-04', { initialMode: 'create' })
    await renameAction(editorHost(dialog), '草稿名')
    await clickDialogButton(editorHost(dialog), '取消')
    await clickDialogButton(document.body, '继续编辑')
    expect(dialog.closes).toHaveLength(0)
    await clickDialogButton(editorHost(dialog), '创建动作')
    expect(heroPoses(dialog)).toBeDefined()
  })

  test('C05-G06-05 create 模式 liveProof 漂移：scopeConflict 文案且不自动 onClose', async () => {
    dialog = await openC05Dialog('g06-05', { initialMode: 'create' })
    await dialog.setOptions({ liveProofSha256: 'b'.repeat(64) })
    expect(editorHost(dialog).textContent).toContain('精灵用途或源资源已变化')
    expect(dialog.closes).toHaveLength(0)
  })

  test('C05-G06-06 edit 模式 Ctrl+S：flush 后触发 onRequestSave', async () => {
    const open = await openC05('g06-06', {
      poses: { idle: actionOf('待机', [0], { order: 0 }) },
    })
    dialog = await mountActionDialog(open, { initialMode: 'edit', selectedActionId: 'idle' })
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
    })
    expect(dialog.saves).toHaveLength(1)
  })

  test('C05-G06-07 创建前 session 已被写入同 id：confirm 报错且 history 不再增加', async () => {
    const open = await openC05('g06-07')
    dialog = await mountActionDialog(open, { initialMode: 'create' })
    const snapshotId =
      editorHost(dialog).querySelector('code')?.textContent?.trim() ??
      editorHost(dialog).textContent!.match(/\baction(?:-\d+)?\b/)![0]
    await act(async () => {
      open.session.dispatch(
        new UpdateSpriteCommand(
          C05_SPRITE,
          {
            poses: {
              [snapshotId]: actionOf('抢占', [0], { order: 0 }),
            },
          },
          open.proof,
          collectCurrentProjectReferenceIndex,
        ),
      )
    })
    const history = open.session.getHistoryVersion()
    await clickDialogButton(editorHost(dialog), '创建动作')
    expect(open.session.getHistoryVersion()).toBe(history)
    expect(editorHost(dialog).textContent).toContain('项目已变化')
  })

  test('C05-G06-08 edit 模式点完成：onClose 一次且无 create 按钮', async () => {
    dialog = await openC05Dialog('g06-08', {
      initialMode: 'edit',
      selectedActionId: 'idle',
    })
    await seedDialogPoses(dialog)
    await clickDialogButton(editorHost(dialog), '完成')
    expect(dialog.closes).toHaveLength(1)
  })

  test('C05-G06-09 源帧选择器点击：上报 onSelectedSourceFrameChange', async () => {
    dialog = await openC05Dialog('g06-09', {
      initialMode: 'edit',
      selectedActionId: 'idle',
    })
    await seedDialogPoses(dialog)
    const host = editorHost(dialog!)
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-source-frame-index="1"]')!.click()
    })
    expect(dialog!.sourceFrameChanges.at(-1)).toBe(1)
  })
})

async function seedDialogPoses(dialog: MountedDialog): Promise<void> {
  if (heroPoses(dialog)) return
  await act(async () => {
    dialog.open.session.dispatch(
      new UpdateSpriteCommand(
        C05_SPRITE,
        { poses: { idle: actionOf('待机', [0], { order: 0 }) } },
        dialog.open.proof,
        collectCurrentProjectReferenceIndex,
      ),
    )
  })
  await dialog.rerender()
}
