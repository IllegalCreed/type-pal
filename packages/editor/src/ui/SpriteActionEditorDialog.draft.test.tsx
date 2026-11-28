// @vitest-environment jsdom

import { act } from 'react'
import { expect, test } from 'vitest'
import {
  applyHistoryAction,
  clickButtonByText,
  fillAndBlur,
  typeDraft,
} from '../__tests__/cursor-asset-r1/kit.js'
import {
  ACTION_ASSET,
  ACTION_SPRITE,
  actionDialog,
  actionPoses,
  mountActionWorkspace,
  openActionEditor,
  waitForActionDialog,
} from '../__tests__/sprite-action-workspace.js'
import { setupWorldSpriteLibrarySuite } from '../__tests__/world-sprite-library-gestures.js'
import { UpdateSpriteCommand } from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { loadEditorSprite } from '../core/sprite-assets.js'

const suite = setupWorldSpriteLibrarySuite()

async function startCreate(project: string) {
  const library = await mountActionWorkspace(suite, project)
  await clickButtonByText(library.host, '新建预制动作')
  const dialog = await waitForActionDialog(library)
  const name = dialog.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
  await act(async () => name.focus())
  await typeDraft(name, '新动作的最终名称')
  expect(document.activeElement).toBe(name)
  expect(library.session.getHistoryVersion()).toBe(0)
  return { library, dialog, name }
}

test('名称字段仍聚焦时，创建动作提交最后键入的名称', async () => {
  const { library, dialog } = await startCreate('sprite-action-focused-confirm')
  await clickButtonByText(dialog, '创建动作')
  expect(actionPoses(library)).toEqual({
    action: {
      label: '新动作的最终名称',
      order: 0,
      steps: [{ frame: 0, durationMs: 250 }],
    },
  })
  expect(library.session.getHistoryVersion()).toBe(1)
  const editor = actionDialog(library)
  expect(editor.getAttribute('aria-label')).toBe('编辑预制动作')
  expect(editor.querySelector<HTMLInputElement>('[name="sprite-action-name"]')?.value).toBe(
    '新动作的最终名称',
  )
  expect(library.notices).toContainEqual({ kind: 'info', message: '预制动作已创建，可继续编辑。' })
  const duration = editor.querySelector<HTMLInputElement>('[id$="-duration"]')!
  await fillAndBlur(duration, '420')
  const nextName = actionDialog(library).querySelector<HTMLInputElement>(
    '[name="sprite-action-name"]',
  )!
  await fillAndBlur(nextName, '创建后的名称')
  expect(actionPoses(library)?.action).toEqual({
    label: '创建后的名称',
    order: 0,
    steps: [{ frame: 0, durationMs: 420 }],
  })
  expect(library.session.getHistoryVersion()).toBe(3)
  assertProjectSaveValid(library.session.getState())
})

test('对话框收到取消时，仍聚焦的动作名称需要明确确认放弃', async () => {
  const { library, dialog, name } = await startCreate('sprite-action-focused-discard')
  await act(async () => dialog.dispatchEvent(new Event('cancel', { cancelable: true })))
  const discard = library.host.querySelector<HTMLDialogElement>('dialog[role="alertdialog"]')!
  expect(discard?.open ?? false).toBe(true)
  expect(actionDialog(library)).toBe(dialog)
  expect(actionPoses(library)).toBeUndefined()
  expect(library.session.getHistoryVersion()).toBe(0)

  await clickButtonByText(discard, '继续编辑')
  expect(discard.open).toBe(false)
  expect(name.value).toBe('新动作的最终名称')
  await clickButtonByText(dialog, '取消')
  expect(discard.open).toBe(true)
  await clickButtonByText(discard, '放弃新动作')
  expect(library.host.querySelector('dialog.sprite-action-dialog[open]')).toBeNull()
  expect(actionPoses(library)).toBeUndefined()
  expect(library.session.getHistoryVersion()).toBe(0)
})

test('动作名称按 Enter 再移到时长字段只产生一条可撤销的编辑', async () => {
  const original = { label: '出场', order: 0, steps: [{ frame: 0, durationMs: 250 }] }
  const library = await mountActionWorkspace(suite, 'sprite-action-name-history', {
    entrance: original,
  })
  await openActionEditor(library)
  const nameField = () =>
    actionDialog(library).querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
  const name = nameField()
  await act(async () => name.focus())
  await typeDraft(name, '新入场动作')
  await act(async () =>
    name.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    ),
  )
  const duration = actionDialog(library).querySelector<HTMLInputElement>('[id$="-duration"]')!
  await act(async () => duration.focus())
  expect(document.activeElement).toBe(duration)
  expect(library.session.getHistoryVersion()).toBe(1)
  expect(actionPoses(library)?.entrance).toEqual({ ...original, label: '新入场动作' })

  expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
  expect(actionPoses(library)?.entrance).toEqual(original)
  expect(nameField().value).toBe('出场')
  expect(await applyHistoryAction(library.session, 'redo')).toBe(true)
  expect(nameField().value).toBe('新入场动作')
  assertProjectSaveValid(library.session.getState())
})

test('撤销未修改的草稿零命令，再次创建连续动作保留各自 ID、源帧和工作区历史', async () => {
  const library = await mountActionWorkspace(suite, 'sprite-action-consecutive-create')
  await clickButtonByText(library.host, '新建预制动作')
  await clickButtonByText(actionDialog(library), '取消')
  expect(library.host.querySelector('dialog[open]')).toBeNull()
  expect(actionPoses(library)).toBeUndefined()
  expect(library.session.getHistoryVersion()).toBe(0)

  await clickButtonByText(library.host, '新建预制动作')
  await clickButtonByText(actionDialog(library), '创建动作')
  const first = { label: '动作 1', order: 0, steps: [{ frame: 0, durationMs: 250 }] }
  expect(actionPoses(library)).toEqual({ action: first })
  const frame = actionDialog(library).querySelector<HTMLButtonElement>(
    '[data-source-frame-index="2"]',
  )!
  await act(async () => frame.click())
  await clickButtonByText(actionDialog(library), '新建预制动作')
  const create = actionDialog(library)
  expect(create.getAttribute('aria-label')).toBe('新建预制动作')
  const listed = [...create.querySelectorAll('.sprite-action-directory [role="option"] code')].map(
    (option) => option.textContent,
  )
  expect(listed).toEqual(['action-2'])
  expect(actionPoses(library)).toEqual({ action: first })
  await clickButtonByText(create, '创建动作')
  const second = { label: '动作 2', order: 1, steps: [{ frame: 2, durationMs: 250 }] }
  expect(actionPoses(library)).toEqual({ action: first, 'action-2': second })
  expect(library.session.getHistoryVersion()).toBe(2)
  expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
  expect(actionPoses(library)).toEqual({ action: first })
  expect(await applyHistoryAction(library.session, 'redo')).toBe(true)
  expect(actionPoses(library)).toEqual({ action: first, 'action-2': second })
})

test('创建期间另一个编辑命令取得动作 ID 后，保留草稿且拒绝覆盖', async () => {
  const { library, dialog, name } = await startCreate('sprite-action-history-drift')
  await act(async () => name.blur())
  const layoutFrames = await loadEditorSprite(library.reader, ACTION_ASSET)
  const record = library.reader.record(ACTION_ASSET, 'sprite')
  const other = { label: '从其他入口创建', order: 0, steps: [{ frame: 1, durationMs: 120 }] }
  await act(async () => {
    expect(
      library.session.dispatch(
        new UpdateSpriteCommand(
          ACTION_SPRITE,
          { poses: { action: other } },
          {
            asset: ACTION_ASSET,
            sha256: record.sha256,
            actualFrameCount: layoutFrames.frames.length,
          },
          collectCurrentProjectReferenceIndex,
        ),
      ),
    ).toBe(true)
  })
  await clickButtonByText(dialog, '创建动作')
  expect(dialog.querySelector('[role="alert"]')?.textContent).toContain('项目已变化')
  expect(actionDialog(library)).toBe(dialog)
  expect(name.value).toBe('新动作的最终名称')
  expect(actionPoses(library)).toEqual({ action: other })
  expect(library.session.getHistoryVersion()).toBe(1)
  assertProjectSaveValid(library.session.getState())
})
