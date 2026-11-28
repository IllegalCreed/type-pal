// @vitest-environment jsdom

import { type AuthorSceneDef, emptyWorldScriptState, instantiate } from '@type-pal/content'
import { act } from 'react'
import { expect, test } from 'vitest'
import {
  applyHistoryAction,
  buttonByText,
  clickButtonByText,
  fillAndBlur,
} from '../__tests__/cursor-asset-r1/kit.js'
import {
  ACTION_SPRITE,
  actionPoses,
  loadActionProject,
  openActionEditor,
} from '../__tests__/sprite-action-workspace.js'
import { setupWorldSpriteLibrarySuite } from '../__tests__/world-sprite-library-gestures.js'
import { AddEntityCommand } from '../core/commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import type { ProjectReferenceEdge } from '../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'

const suite = setupWorldSpriteLibrarySuite()
const poses = {
  idle: { label: '待机', order: 0, steps: [{ frame: 0, durationMs: 120 }] },
  wave: { label: '挥手', order: 1, steps: [{ frame: 1, durationMs: 160 }] },
}

const idleBinding = { sprite: ACTION_SPRITE, action: 'idle', loop: true }
const waveBinding = { sprite: ACTION_SPRITE, action: 'wave', loop: false }

async function openReferences(host: HTMLElement): Promise<HTMLElement> {
  const tab = host.querySelector<HTMLButtonElement>(
    '[role="tab"][aria-controls="world-sprite-inspector-panel-references"]',
  )!
  await act(async () => tab.click())
  expect(tab.getAttribute('aria-selected')).toBe('true')
  return host.querySelector<HTMLElement>('#world-sprite-inspector-panel-references')!
}

test.each([
  ['checking', 'loading', '正在检查'],
  ['stale', 'partial', '待刷新'],
  ['failed', 'error', '检查失败'],
  ['current', 'error', '检查失败'],
] as const)('%s 无可用引用快照时，两种删除均按未知处理', async (status, panelState, message) => {
  const project = await loadActionProject('world-sprite-unverified-references', poses)
  const library = await suite.mount(project, {
    focus: ACTION_SPRITE,
    bindings: {
      references: {
        referenceStatus: status,
        getCurrentReferenceIndex: collectCurrentProjectReferenceIndex,
      },
    },
  })
  expect(buttonByText(library.host, '删除用途').disabled).toBe(true)
  const references = await openReferences(library.host)
  const panel = references.querySelector<HTMLElement>('.ds-reference-panel')!
  expect(panel.dataset.state).toBe(panelState)
  expect(panel.textContent).toContain('数量未知')
  const editor = await openActionEditor(library)
  expect(buttonByText(editor, '删除预制动作：待机').disabled).toBe(true)
  expect(editor.textContent).toContain(message)
  expect(library.session.getHistoryVersion()).toBe(0)
  expect(actionPoses(library)).toEqual(poses)
})

test('实时引用服务失败时，精灵定义和动作删除都原样保留', async () => {
  const project = await loadActionProject('world-sprite-reference-service', poses)
  const providerError = new Error('当前项目引用索引不可用')
  const library = await suite.mount(project, {
    focus: ACTION_SPRITE,
    bindings: {
      references: {
        referenceIndex: collectCurrentProjectReferenceIndex(project.state),
        referenceStatus: 'current',
        getCurrentReferenceIndex: () => {
          throw providerError
        },
      },
    },
  })
  expect(buttonByText(library.host, '删除用途').disabled).toBe(false)
  await clickButtonByText(library.host, '删除用途')
  expect(library.notices.at(-1)).toEqual({ kind: 'error', message: providerError.message })
  const editor = await openActionEditor(library)
  await clickButtonByText(editor, '删除预制动作：待机')
  expect(editor.querySelector('[role="alert"]')?.textContent).toBe(providerError.message)
  expect(actionPoses(library)).toEqual(poses)
  expect(library.session.getHistoryVersion()).toBe(0)
})

test('展示索引尚无引用时，刚加入的实体动作仍阻止两种删除', async () => {
  const project = await loadActionProject('world-sprite-live-references', poses)
  const published = collectCurrentProjectReferenceIndex(project.state)
  const library = await suite.mount(project, {
    focus: ACTION_SPRITE,
    bindings: {
      references: {
        referenceStatus: 'current',
        referenceIndex: published,
        getCurrentReferenceIndex: collectCurrentProjectReferenceIndex,
      },
    },
  })
  const entity = {
    id: 'new-actor',
    pos: { col: 2, row: 2, height: 0 },
    sprite: ACTION_SPRITE,
    initialPage: 'default',
    pages: [{ id: 'default', label: '默认', animation: idleBinding }],
  } satisfies AuthorSceneDef['entities'][number]
  await act(async () => {
    expect(library.session.dispatch(new AddEntityCommand('start', entity))).toBe(true)
  })
  assertProjectSaveValid(library.session.getState())
  expect(buttonByText(library.host, '删除用途').disabled).toBe(false)
  await clickButtonByText(library.host, '删除用途')
  expect(library.notices.at(-1)).toEqual({
    kind: 'error',
    message: expect.stringContaining('无法删除精灵用途'),
  })
  const editor = await openActionEditor(library)
  expect(buttonByText(editor, '删除预制动作：待机').disabled).toBe(false)
  await clickButtonByText(editor, '删除预制动作：待机')
  expect(editor.querySelector('[role="alert"]')?.textContent).toContain('仍被 1 处引用')
  expect(actionPoses(library)).toEqual(poses)
  expect(library.session.getHistoryVersion()).toBe(1)
})

test('查看动作引用后留在引用页，并以准确的场景页定位打开替代动作', async () => {
  const project = await loadActionProject('world-sprite-reference-locators', poses)
  const opened: ProjectReferenceEdge[] = []
  const library = await suite.mount(project, {
    focus: ACTION_SPRITE,
    bindings: { onOpenReference: (reference) => opened.push(reference) },
  })
  const entity = {
    id: 'pose-actor',
    pos: { col: 2, row: 2, height: 0 },
    sprite: ACTION_SPRITE,
    initialPage: 'default',
    pages: [
      { id: 'default', label: '默认', animation: idleBinding },
      { id: 'alternate', label: '替代', animation: waveBinding },
    ],
  } satisfies AuthorSceneDef['entities'][number]
  await act(async () => {
    expect(library.session.dispatch(new AddEntityCommand('start', entity))).toBe(true)
  })
  assertProjectSaveValid(library.session.getState())
  const editor = await openActionEditor(library)
  expect(buttonByText(editor, '删除预制动作：待机').disabled).toBe(true)
  const name = editor.querySelector<HTMLInputElement>('[name="sprite-action-name"]')!
  await fillAndBlur(name, ' ')
  await clickButtonByText(editor, '查看引用')
  expect(editor.open).toBe(true)
  expect(editor.querySelector('[role="alert"]')?.textContent).toContain('无效字段')
  expect(library.session.getHistoryVersion()).toBe(1)
  await fillAndBlur(name, '待机')
  await clickButtonByText(editor, '查看引用')
  const refs = library.host.querySelector<HTMLElement>('#world-sprite-inspector-panel-references')!
  expect(refs.hidden).toBe(false)
  expect(library.host.querySelector('dialog.sprite-action-dialog[open]')).toBeNull()
  const actionGroup = refs
    .querySelector('[aria-label="选择动作查看引用"]')!
    .closest('.ds-reference-group')!
  expect(actionGroup.querySelector('.ds-reference-row')?.textContent).toContain(
    'pages[0].animation.action',
  )
  const wave = [...actionGroup.querySelectorAll<HTMLButtonElement>('.ds-catalog-row')].find(
    (option) => option.querySelector('.ds-catalog-row__meta')?.textContent === 'wave',
  )!
  await act(async () => wave.click())
  expect(refs.hidden).toBe(false)
  expect(library.host.querySelector('dialog.sprite-action-dialog[open]')).toBeNull()
  const actualRow = actionGroup.querySelector<HTMLButtonElement>(
    'button.ds-reference-row[data-actionable="true"]',
  )!
  expect(actualRow.textContent).toContain('pages[1].animation.action')
  await act(async () => actualRow.click())
  expect(opened).toEqual([
    expect.objectContaining({
      target: { kind: 'world-sprite-action', spriteId: ACTION_SPRITE, actionId: 'wave' },
      locator: {
        kind: 'scene-page',
        sceneId: 'start',
        entityId: 'pose-actor',
        pageId: 'alternate',
      },
    }),
  ])
  expect(await applyHistoryAction(library.session, 'undo')).toBe(true)
  const reopened = await openActionEditor(library)
  expect(buttonByText(reopened, '删除预制动作：待机').disabled).toBe(false)
})

test('运行态的主角覆写和编外跟随分别显示依据，保留只读定位', async () => {
  const project = await loadActionProject('world-sprite-runtime-reference')
  const hero = project.state.actors.find((actor) => actor.id === 'hero')!
  const actor = { ...instantiate(hero), appearance: { spriteId: ACTION_SPRITE } }
  project.state.worlds = [
    {
      party: [actor],
      money: 0,
      learnedSkills: {},
      inventory: [],
      script: { ...emptyWorldScriptState(), followers: [ACTION_SPRITE] },
    },
  ]
  const library = await suite.mount(project, { focus: ACTION_SPRITE })
  const refs = await openReferences(library.host)
  const rows = [...refs.querySelectorAll('.ds-reference-row')]
  const appearance = rows.find((row) => row.textContent?.includes('运行态角色世界精灵覆写'))
  const follower = rows.find((row) => row.textContent?.includes('运行态编外跟随精灵'))
  expect(appearance?.textContent).toContain('运行态外观')
  expect(follower?.textContent).toContain('运行态/存档')
  expect(appearance).not.toBe(follower)
  expect(appearance?.getAttribute('data-actionable')).not.toBe('true')
  expect(follower?.getAttribute('data-actionable')).not.toBe('true')
})
