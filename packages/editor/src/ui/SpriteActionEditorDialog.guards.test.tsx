// @vitest-environment jsdom

import { act } from 'react'
import { expect, test } from 'vitest'
import { clickButtonByText, typeDraft } from '../__tests__/cursor-asset-r1/kit.js'
import {
  ACTION_ASSET,
  actionDialog,
  actionPoses,
  mountActionWorkspace,
  openActionEditor,
  waitForActionDialog,
} from '../__tests__/sprite-action-workspace.js'
import { setupWorldSpriteLibrarySuite } from '../__tests__/world-sprite-library-gestures.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'
import { UpsertAssetCommand } from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'

const suite = setupWorldSpriteLibrarySuite()
const start = { idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 120 }] } }

function nameField(dialog: ParentNode): HTMLInputElement {
  return dialog.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
}

async function saveShortcut(key: 'Meta' | 'Control') {
  await act(async () =>
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        metaKey: key === 'Meta',
        ctrlKey: key === 'Control',
        bubbles: true,
        cancelable: true,
      }),
    ),
  )
}

test('保存键在新建时保留草稿，在编辑时等名称提交后才让宿主保存', async () => {
  const saved: Array<string | undefined> = []
  const library = await mountActionWorkspace(suite, 'sprite-dialog-save-shortcut', start, {
    onRequestSave: () => saved.push(actionPoses(library)?.idle?.label),
  })
  await clickButtonByText(library.host, '新建预制动作')
  const create = await waitForActionDialog(library)
  await saveShortcut('Control')
  expect(create.querySelector('[role="alert"]')?.textContent).toContain('请先创建动作')
  expect(document.activeElement).toBe(nameField(create))
  expect(saved).toEqual([])
  expect(actionPoses(library)).toEqual(start)
  expect(library.session.getHistoryVersion()).toBe(0)
  await clickButtonByText(create, '取消')

  const editor = await openActionEditor(library)
  const field = nameField(editor)
  await act(async () => field.focus())
  await typeDraft(field, '   ')
  await saveShortcut('Meta')
  expect(editor.querySelector('[role="alert"]')?.textContent).toContain('无效字段')
  expect(saved).toEqual([])
  expect(actionPoses(library)).toEqual(start)

  await typeDraft(field, '即将保存')
  expect(library.session.getHistoryVersion()).toBe(0)
  await saveShortcut('Meta')
  expect(saved).toEqual(['即将保存'])
  expect(library.session.getHistoryVersion()).toBe(1)
  assertProjectSaveValid(library.session.getState())
})

test('完成先清理焦点字段，非法名称时保持对话框并让作者修正', async () => {
  const library = await mountActionWorkspace(suite, 'sprite-dialog-complete', start)
  const editor = await openActionEditor(library)
  const field = nameField(editor)
  await act(async () => field.focus())
  await typeDraft(field, ' ')
  await clickButtonByText(editor, '完成')
  expect(actionDialog(library)).toBe(editor)
  expect(document.activeElement).toBe(field)
  expect(library.session.getHistoryVersion()).toBe(0)

  await typeDraft(field, '完成后的名称')
  await clickButtonByText(editor, '完成')
  expect(library.host.querySelector('dialog.sprite-action-dialog[open]')).toBeNull()
  expect(actionPoses(library)?.idle?.label).toBe('完成后的名称')
  expect(library.session.getHistoryVersion()).toBe(1)
})

test.each([
  'create',
  'edit',
] as const)('源素材换版后 %s 按当前证明决定是否保留窗口', async (mode) => {
  const library = await mountActionWorkspace(suite, `sprite-dialog-proof-${mode}`, start)
  const replacement = await loadWorldSpriteProject(`replacement-${mode}`, [
    { asset: ACTION_ASSET, label: '换版后的动作源帧', frameCount: 5, definitions: [] },
  ])
  const bytes = replacement.seeded.get(ACTION_ASSET)!.bytes
  const revision = replacement.state.assetCatalog.assets[ACTION_ASSET]!
  expect(revision.sha256).not.toBe(library.reader.record(ACTION_ASSET, 'sprite').sha256)
  if (mode === 'edit') await openActionEditor(library)
  else await clickButtonByText(library.host, '新建预制动作')
  const editor = await waitForActionDialog(library)
  if (mode === 'create') {
    await act(async () => nameField(editor).focus())
    await typeDraft(nameField(editor), '保留待核的新动作')
    await act(async () => nameField(editor).blur())
  }
  await act(async () => {
    expect(library.session.dispatch(new UpsertAssetCommand(ACTION_ASSET, revision, bytes))).toBe(
      true,
    )
  })
  if (mode === 'create') {
    expect(actionDialog(library)).toBe(editor)
    expect(editor.querySelector('[role="alert"]')?.textContent).toContain('源资源已变化')
    await clickButtonByText(editor, '创建动作')
    expect(editor.querySelector('[role="alert"]')?.textContent).toContain('源资源已变化')
    expect(nameField(editor).value).toBe('保留待核的新动作')
  } else {
    expect(library.host.querySelector('dialog.sprite-action-dialog[open]')).toBeNull()
  }
  expect(actionPoses(library)).toEqual(start)
  expect(library.session.getHistoryVersion()).toBe(1)
  assertProjectSaveValid(library.session.getState())
})
