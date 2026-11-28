// @vitest-environment jsdom

import { act } from 'react'
import { expect, test, vi } from 'vitest'
import {
  applyHistoryAction,
  buttonByText,
  clickButtonByText,
  controlByAriaLabel,
  fillAndBlur,
  typeDraft,
} from '../__tests__/cursor-asset-r1/kit.js'
import {
  actionDialog,
  actionPoses,
  mountActionWorkspace,
  openActionEditor,
} from '../__tests__/sprite-action-workspace.js'
import { setupWorldSpriteLibrarySuite } from '../__tests__/world-sprite-library-gestures.js'

const suite = setupWorldSpriteLibrarySuite()
const poses = {
  idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 100 }] },
  short: { label: 'Wave', order: 1, steps: [{ frame: 2, durationMs: 150 }] },
  retreat: { label: '退后', order: 2, steps: [{ frame: 1, durationMs: 200 }] },
}

function directoryIds(dialog: ParentNode): Array<string | null> {
  return [...dialog.querySelectorAll('.sprite-action-directory [role="option"] code')].map(
    (item) => item.textContent,
  )
}

async function selectAction(dialog: ParentNode, actionId: string): Promise<void> {
  const item = [
    ...dialog.querySelectorAll<HTMLElement>('.sprite-action-directory [role="option"]'),
  ].find((option) => option.querySelector('code')?.textContent === actionId)
  expect(item, `动作目录缺少 ${actionId}`).toBeDefined()
  await act(async () => item!.click())
}

test('目录分别匹配 ActionId 和忽略大小写的标签，Escape 还原完整目录', async () => {
  const library = await mountActionWorkspace(suite, 'sprite-action-search', poses)
  await openActionEditor(library)
  const search = () => controlByAriaLabel<HTMLInputElement>(actionDialog(library), '搜索预制动作')
  await typeDraft(search(), 'trea')
  expect(directoryIds(actionDialog(library))).toEqual(['retreat'])
  await selectAction(actionDialog(library), 'retreat')
  expect(actionDialog(library).querySelector('h3')?.textContent).toBe('退后')

  await typeDraft(search(), 'WAVE')
  expect(directoryIds(actionDialog(library))).toEqual(['short'])
  await typeDraft(search(), '未匹配')
  expect(directoryIds(actionDialog(library))).toEqual([])
  expect(actionDialog(library).textContent).toContain('没有匹配的预制动作。')
  expect(actionDialog(library).querySelector('h3')?.textContent).toBe('退后')
  await act(async () =>
    search().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  expect(directoryIds(actionDialog(library))).toEqual(['idle', 'short', 'retreat'])
  expect(actionPoses(library)).toEqual(poses)
  expect(library.session.getHistoryVersion()).toBe(0)
})

test('使用过滤后的标题栏移动动作仍重排完整目录且保留固定 ID', async () => {
  const library = await mountActionWorkspace(suite, 'sprite-action-filtered-reorder', poses)
  await openActionEditor(library)
  expect(buttonByText(actionDialog(library), '前移预制动作：待机').disabled).toBe(true)
  await selectAction(actionDialog(library), 'retreat')
  expect(buttonByText(actionDialog(library), '后移预制动作：退后').disabled).toBe(true)
  await selectAction(actionDialog(library), 'short')
  await typeDraft(controlByAriaLabel(actionDialog(library), '搜索预制动作'), 'Wave')
  expect(directoryIds(actionDialog(library))).toEqual(['short'])
  await clickButtonByText(actionDialog(library), '后移预制动作：Wave')
  const moved = {
    idle: poses.idle,
    short: { ...poses.short, order: 2 },
    retreat: { ...poses.retreat, order: 1 },
  }
  expect(actionPoses(library)).toEqual(moved)
  expect(library.session.getHistoryVersion()).toBe(1)
  expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
  expect(actionPoses(library)).toEqual(poses)
  expect(await applyHistoryAction(library.session, 'redo')).toBe(true)
  expect(actionPoses(library)).toEqual(moved)
  await clickButtonByText(actionDialog(library), '前移预制动作：Wave')
  expect(actionPoses(library)).toEqual(poses)
})

test('无效名称阻止切换动作和开启新建，修正后提交一条历史', async () => {
  const library = await mountActionWorkspace(suite, 'sprite-action-invalid-name', poses)
  await openActionEditor(library)
  const name = () =>
    actionDialog(library).querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
  await fillAndBlur(name(), '   ')
  expect(name().getAttribute('aria-invalid')).toBe('true')
  await selectAction(actionDialog(library), 'short')
  expect(actionDialog(library).querySelector('h3')?.textContent).toBe('待机')
  await clickButtonByText(actionDialog(library), '新建预制动作')
  expect(actionDialog(library).getAttribute('aria-label')).toBe('编辑预制动作')
  expect(actionDialog(library).querySelector('[role="alert"]')?.textContent).toContain('无效字段')
  expect(library.session.getHistoryVersion()).toBe(0)

  await fillAndBlur(name(), '准备就绪')
  expect(actionPoses(library)).toEqual({ ...poses, idle: { ...poses.idle, label: '准备就绪' } })
  expect(library.session.getHistoryVersion()).toBe(1)
  await selectAction(actionDialog(library), 'short')
  expect(actionDialog(library).querySelector('h3')?.textContent).toBe('Wave')
})

test('确认删除后选择跟随后继或前项，删空时保留编辑器及新建焦点', async () => {
  const library = await mountActionWorkspace(suite, 'sprite-action-delete', poses)
  await openActionEditor(library)
  await selectAction(actionDialog(library), 'short')
  vi.mocked(window.confirm).mockReturnValueOnce(false)
  await clickButtonByText(actionDialog(library), '删除预制动作：Wave')
  expect(actionPoses(library)).toEqual(poses)
  expect(library.session.getHistoryVersion()).toBe(0)

  await clickButtonByText(actionDialog(library), '删除预制动作：Wave')
  expect(actionPoses(library)).toEqual({
    idle: poses.idle,
    retreat: { ...poses.retreat, order: 1 },
  })
  expect(actionDialog(library).querySelector('h3')?.textContent).toBe('退后')
  expect(document.activeElement).toBe(actionDialog(library).querySelector('h3'))
  await clickButtonByText(actionDialog(library), '删除预制动作：退后')
  expect(actionPoses(library)).toEqual({ idle: poses.idle })
  expect(actionDialog(library).querySelector('h3')?.textContent).toBe('待机')
  expect(document.activeElement).toBe(actionDialog(library).querySelector('h3'))
  await clickButtonByText(actionDialog(library), '删除预制动作：待机')
  expect(actionPoses(library)).toBeUndefined()
  expect(actionDialog(library).textContent).toContain('尚无预制动作')
  expect(document.activeElement).toBe(buttonByText(actionDialog(library), '新建预制动作'))
  expect(library.session.getHistoryVersion()).toBe(3)
  expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
  expect(actionPoses(library)).toEqual({ idle: poses.idle })
  expect(actionDialog(library).querySelector('h3')?.textContent).toBe('待机')
})
