// @vitest-environment jsdom

import { act } from 'react'
import { expect, test } from 'vitest'
import { clickButtonByText, fillAndBlur, typeDraft } from '../__tests__/cursor-asset-r1/kit.js'
import {
  ACTION_SPRITE,
  actionDialog,
  actionPoses,
  mountActionWorkspace,
  openActionEditor,
} from '../__tests__/sprite-action-workspace.js'
import { setupWorldSpriteLibrarySuite } from '../__tests__/world-sprite-library-gestures.js'
import { loadWorldSpriteProject } from '../__tests__/world-sprite-project.js'

const suite = setupWorldSpriteLibrarySuite()
const actions = {
  idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 250 }] },
  wave: { label: '挥手', order: 1, steps: [{ frame: 1, durationMs: 160 }] },
}

test('中心按钮与动作行打开同一类编辑器，源帧选择与工作区同步', async () => {
  const library = await mountActionWorkspace(suite, 'world-sprite-action-entrances', actions)
  const editor = await openActionEditor(library)
  expect(library.host.querySelector('.world-sprite-inspector .sprite-action-editor')).toBeNull()
  expect(library.host.querySelectorAll('dialog.sprite-action-dialog[open]')).toHaveLength(1)
  const frames = [...editor.querySelectorAll<HTMLButtonElement>('[data-source-frame-index]')]
  expect(frames).toHaveLength(4)
  expect(frames.every((frame) => frame.draggable)).toBe(true)
  await act(async () => frames[3]!.click())
  expect(frames[3]?.getAttribute('aria-pressed')).toBe('true')
  await clickButtonByText(editor, '完成')
  expect(library.host.querySelector('dialog.sprite-action-dialog[open]')).toBeNull()

  const actionRows = library.host.querySelector('.semantic-frame-rows')!
  await clickButtonByText(actionRows, '挥手')
  const reopened = actionDialog(library)
  expect(reopened.querySelector('h3')?.textContent).toBe('挥手')
  expect(
    reopened.querySelector('[data-source-frame-index="3"]')?.getAttribute('aria-pressed'),
  ).toBe('true')
  expect(actionPoses(library)).toEqual(actions)
  expect(library.session.getHistoryVersion()).toBe(0)
})

test('有效动作深链更新同一对话框，清除或未知的动作地址不会误开其它动作', async () => {
  const library = await mountActionWorkspace(suite, 'world-sprite-action-deep-link', actions)
  const location = { view: 'definition', objectId: ACTION_SPRITE } as const
  await library.navigate({ ...location, actionId: 'idle' })
  const routed = actionDialog(library)
  expect(routed.querySelector('h3')?.textContent).toBe('待机')
  await library.navigate({ ...location, actionId: 'wave' })
  expect(actionDialog(library)).toBe(routed)
  expect(routed.querySelector('h3')?.textContent).toBe('挥手')
  await library.navigate(location)
  expect(library.host.querySelector('dialog.sprite-action-dialog[open]')).toBeNull()

  for (const actionId of ['unknown', 'constructor']) {
    await library.navigate({ ...location, actionId })
    expect(library.host.querySelector('dialog.sprite-action-dialog[open]')).toBeNull()
    expect(library.notices.at(-1)).toEqual({
      kind: 'error',
      message: `预制动作 ${actionId} 不存在；未自动选择其它动作。`,
    })
  }
  expect(actionPoses(library)).toEqual(actions)
})

test('动作地址能打开工程真正定义的 constructor 动作', async () => {
  const actionId = 'constructor'
  const declared = { label: '明确定义的动作', steps: [{ frame: 2, durationMs: 150 }] }
  const library = await mountActionWorkspace(suite, 'world-sprite-own-action-id', {
    ...actions,
    [actionId]: declared,
  })
  await library.navigate({ view: 'definition', objectId: ACTION_SPRITE, actionId })
  expect(actionDialog(library).querySelector('h3')?.textContent).toBe(declared.label)
  expect(actionPoses(library)?.[actionId]).toEqual(declared)
  expect(library.session.getHistoryVersion()).toBe(0)
})

test('从已有动作深链发起新建时清空地址选择，再次回灌空地址保留草稿', async () => {
  const library = await mountActionWorkspace(suite, 'world-sprite-action-create-route', actions)
  const location = { view: 'definition', objectId: ACTION_SPRITE } as const
  await library.navigate({ ...location, actionId: 'wave' })
  const edited = actionDialog(library)
  expect(edited.querySelector('h3')?.textContent).toBe('挥手')
  await clickButtonByText(edited, '新建预制动作')
  const draft = actionDialog(library)
  expect(draft.getAttribute('aria-label')).toBe('新建预制动作')
  expect(library.focusHistory.at(-1)).toEqual(location)
  await library.navigate(location)
  expect(actionDialog(library)).toBe(draft)
  expect(actionPoses(library)).toEqual(actions)
  expect(library.session.getHistoryVersion()).toBe(0)
})

test('同名动作切到另一用途再编辑，两个草稿及历史独立', async () => {
  const project = await loadWorldSpriteProject('world-sprite-action-context', [
    {
      asset: 'sprite.authored.shared-action-context',
      label: '共享源帧',
      frameCount: 4,
      definitions: ['first', 'second'].map((id) => ({
        id,
        label: id,
        layout: { kind: 'static' },
        poses: { idle: actions.idle },
      })),
    },
  ])
  const library = await suite.mount(project, { focus: 'first' })
  await clickButtonByText(library.host, '编辑预制动作（1）')
  const old = actionDialog(library)
  const name = (scope: ParentNode) =>
    scope.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
  await typeDraft(name(old), '只属于第一个用途')
  expect(library.session.getHistoryVersion()).toBe(0)

  await library.navigate({ view: 'definition', objectId: 'second' })
  expect(library.host.querySelector('dialog.sprite-action-dialog[open]')).toBeNull()
  await clickButtonByText(library.host, '编辑预制动作（1）')
  const current = actionDialog(library)
  expect(name(current).value).toBe('待机')
  await fillAndBlur(name(current), '中间值')
  expect(library.session.getHistoryVersion()).toBe(1)
  const posesFor = (id: string) =>
    library.session.getState().sprites.find((sprite) => sprite.id === id)?.poses
  expect(posesFor('first')?.idle?.label).toBe('待机')
  expect(posesFor('second')?.idle?.label).toBe('中间值')
})
