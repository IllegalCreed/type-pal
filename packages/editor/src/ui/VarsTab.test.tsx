// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type EditorState, EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ScriptEditorState } from '../core/script-editor.js'
import {
  type WorldVariableReferenceIndexV1,
  worldVariableScriptStateFromEditorStateV1,
} from '../core/world-variable-references.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { VarsTab } from './VarsTab.js'

const references: WorldVariableReferenceIndexV1 = {
  all: [
    {
      id: 'quest.started',
      kind: 'flag',
      access: 'write',
      detail: '= true',
      path: 'sharedScripts.quest.body[0].flag',
      owner: { kind: 'shared-script', scriptId: 'quest' },
      ownerLabel: '可复用脚本 · 开始任务',
      sourceLabel: 'quest',
    },
    {
      id: 'score.total',
      kind: 'number',
      access: 'read',
      detail: '>= 1',
      path: 'scenes.s002.hooks.onEnter.cond',
      owner: { kind: 'scene-hook', sceneId: 's002', slot: 'onEnter', hookId: 'main' },
      ownerLabel: '场景 s002 · 进入场景',
      sourceLabel: 's002/onEnter/main',
    },
    {
      id: 'missing.value',
      kind: 'number',
      access: 'write',
      detail: '= 2',
      path: 'sharedScripts.quest.body[1].var',
      owner: { kind: 'shared-script', scriptId: 'quest' },
      ownerLabel: '可复用脚本 · 开始任务',
      sourceLabel: 'quest',
    },
  ],
  byId: new Map(),
}
;(references.byId as Map<string, typeof references.all>).set('quest.started', [references.all[0]!])
;(references.byId as Map<string, typeof references.all>).set('score.total', [references.all[1]!])
;(references.byId as Map<string, typeof references.all>).set('missing.value', [references.all[2]!])

function state(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'test',
      contentVersion: 18,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: { worldVariables: 'content/world-variables.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    worldVariables: {
      'quest.started': {
        kind: 'flag',
        name: '任务已开始',
        description: '主线任务',
        initial: false,
      },
      'score.total': {
        kind: 'number',
        name: '总分',
        description: '累计分数',
        initial: 0,
      },
      unused: { kind: 'flag', name: '未使用', description: '', initial: true },
    },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    stamps: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  }
}

let root: Root
let host: HTMLDivElement
let session: EditSession

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  session = new EditSession(state())
  vi.stubGlobal(
    'confirm',
    vi.fn(() => true),
  )
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

async function render(
  focusObjectId?: string,
  referenceStatus: EditorDerivedStatus = 'current',
  getCurrentScriptState: () => ScriptEditorState | undefined = () =>
    worldVariableScriptStateFromEditorStateV1(session.getState()),
): Promise<void> {
  await act(async () =>
    root.render(
      <VarsTab
        variables={session.getState().worldVariables ?? {}}
        references={references}
        referenceStatus={referenceStatus}
        getCurrentScriptState={getCurrentScriptState}
        session={session}
        focusObjectId={focusObjectId}
      />,
    ),
  )
}

describe('VarsTab world variable workbench', () => {
  test('引用快照过期时禁删，current canonical 新引用仍在命令边界阻断', async () => {
    await render('unused', 'stale')
    const deleteButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '删除变量',
    )!
    expect(deleteButton.disabled).toBe(true)
    expect(deleteButton.title).toContain('引用仍在检查')

    const canonical: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        live: {
          name: '当前变量写入',
          self: 'none',
          body: [{ kind: 'setFlag', flag: 'unused', value: true }],
        },
      },
    }
    await render('unused', 'current', () => canonical)
    const currentDelete = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '删除变量',
    )!
    expect(currentDelete.disabled).toBe(false)
    await act(async () => currentDelete.click())
    expect(session.getState().worldVariables).toHaveProperty('unused')
    expect(host.textContent).toContain('仍有 1 处引用')
  })

  test('groups definitions by type, searches metadata and exposes undeclared diagnostics', async () => {
    await render()
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('3 项')
    expect(host.textContent).toContain('开关')
    expect(host.textContent).toContain('数值')
    expect(host.textContent).toContain('未登记引用')
    expect(host.textContent).toContain('missing.value')
    const variableRows = [...host.querySelectorAll<HTMLElement>('.world-variable-catalog .ds-catalog-row')]
    const rowByTitle = (title: string) =>
      variableRows.find(
        (row) => row.querySelector('.ds-catalog-row__title')?.textContent === title,
      )!
    expect(rowByTitle('任务已开始').dataset.leading).toBe('none')
    expect(rowByTitle('missing.value').dataset.leading).toBe('none')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索变量"]')!
    await setCatalogSearch(search, '累计分数')
    expect(host.querySelector('.world-variable-catalog')?.textContent).toContain('总分')
    expect(host.querySelector('.world-variable-catalog')?.textContent).not.toContain('任务已开始')
  })

  test('renders identity once in the hero, edits metadata through a command and groups references', async () => {
    await render('quest.started')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('任务已开始')
    expect(host.querySelectorAll('.ds-object-hero__id')).toHaveLength(1)
    const hero = host.querySelector<HTMLElement>('.ds-object-hero')!
    expect(hero.dataset.hasMedia).toBe('false')
    expect(hero.querySelector('.ds-object-hero__media')).toBeNull()
    expect(hero.textContent).not.toMatch(/[⚑№]/u)
    expect(host.querySelector('.world-variable-reference-panel')?.textContent).toContain('写入')
    const name = [...host.querySelectorAll<HTMLInputElement>('.ds-input')].find(
      (input) => input.value === '任务已开始',
    )!
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(name, '任务开始状态')
      name.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      name.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(session.getState().worldVariables?.['quest.started']?.name).toBe('任务开始状态')
    session.undo()
    expect(session.getState().worldVariables?.['quest.started']?.name).toBe('任务已开始')
  })

  test('moves focus between unchanged metadata fields without creating a history entry', async () => {
    await render('quest.started')
    const name = [...host.querySelectorAll<HTMLInputElement>('.ds-input')].find(
      (input) => input.value === '任务已开始',
    )!
    const description = host.querySelector<HTMLTextAreaElement>('.ds-textarea')!
    const historyVersion = session.getHistoryVersion()

    await act(async () => {
      name.focus()
      description.focus()
    })

    expect(document.activeElement).toBe(description)
    expect(session.getHistoryVersion()).toBe(historyVersion)
    expect(session.isDirty()).toBe(false)
  })

  test('deletes only a zero-reference definition and can undo it', async () => {
    await render('unused')
    const deleteButton = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('删除变量'),
    )!
    expect(deleteButton.disabled).toBe(false)
    await act(async () => deleteButton.click())
    expect(session.getState().worldVariables).not.toHaveProperty('unused')
    session.undo()
    expect(session.getState().worldVariables).toHaveProperty('unused')
  })

  test('falls back from a stale deep link instead of showing the empty-registry prompt', async () => {
    await render('missing.variable')
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('任务已开始')
    expect(host.textContent).not.toContain('建立第一条变量定义')
  })
})
