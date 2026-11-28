// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { loadBoundaryProject } from '../core/__tests__/cursor-command-boundary-fixtures.js'
import { type EditorState, EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectReferenceIndex,
} from '../core/project-reference-adapters.js'
import type { ScriptEditorState } from '../core/script-editor.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { verifyCanonicalObjectWorkspace } from './object-workspace-test-utils.js'
import { VarsTab } from './VarsTab.js'

const canonicalReferences: ScriptEditorState = {
  scenes: [],
  items: [],
  sharedScripts: {
    quest: {
      name: '开始任务',
      self: 'none',
      body: [
        { kind: 'setFlag', flag: 'quest.started', value: true },
        { kind: 'setVar', var: 'missing.value', value: 2 },
        { kind: 'setFlag', flag: 'constructor', value: true },
        {
          kind: 'branch',
          cond: { kind: 'var', var: 'score.total', op: '>=', value: 1 },
          then: [{ kind: 'wait', ms: 20 }],
        },
      ],
    },
  },
}
let blank: EditorState

function state(): EditorState {
  return {
    ...blank,
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
  }
}

let root: Root
let host: HTMLDivElement
let session: EditSession

beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('Blob', (await new Response().blob()).constructor)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  blank = (await loadBoundaryProject('world-variables-panel')).state
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
  getCurrentReferenceIndex: CurrentProjectReferenceIndexProvider = collectCurrentProjectReferenceIndex,
): Promise<void> {
  await act(async () =>
    root.render(
      <VarsTab
        variables={session.getState().worldVariables ?? {}}
        referenceIndex={collectCurrentProjectReferenceIndex(
          session.getState(),
          canonicalReferences,
        )}
        referenceStatus={referenceStatus}
        getCurrentReferenceIndex={getCurrentReferenceIndex}
        session={session}
        focusObjectId={focusObjectId}
      />,
    ),
  )
}

describe('VarsTab world variable workbench', () => {
  test('selected、creating 与 empty 共用唯一 canonical main owner', async () => {
    await render()
    const selected = verifyCanonicalObjectWorkspace(host, '世界变量工作区')
    expect(selected.content.querySelector('.world-variable-readonly-grid')).not.toBeNull()

    const createTrigger = host.querySelector<HTMLButtonElement>('button[aria-label="新建变量"]')!
    await act(async () => {
      createTrigger.focus()
      createTrigger.click()
    })
    const creating = verifyCanonicalObjectWorkspace(host, '世界变量工作区', { hero: false })
    expect(creating.content).toBe(selected.content)
    expect(creating.content.querySelector('.world-variable-create-card')).not.toBeNull()
    expect(document.activeElement).toBe(creating.content.querySelector('input'))

    await act(async () => root.unmount())
    root = createRoot(host)
    session = new EditSession({ ...state(), worldVariables: {} })
    await render()
    const empty = verifyCanonicalObjectWorkspace(host, '世界变量工作区', { hero: false })
    expect(empty.content.textContent).toContain('建立第一条变量定义')
  })

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
    await render('unused', 'current', (state) =>
      collectCurrentProjectReferenceIndex(state, canonical),
    )
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
    const variableRows = [
      ...host.querySelectorAll<HTMLElement>('.world-variable-catalog .ds-catalog-row'),
    ]
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

  test('a missing declared key remains a usable undeclared reference before creation and after undo', async () => {
    await render('constructor')
    const title = () => host.querySelector('.ds-object-hero__title')?.textContent
    expect(title()).toBe('任务已开始')
    const row = [...host.querySelectorAll<HTMLButtonElement>('button.ds-catalog-row')].find(
      (item) => item.querySelector('.ds-catalog-row__title')?.textContent === 'constructor',
    )
    expect(row?.textContent).toContain('创建定义')
    await act(async () => row!.click())
    const create = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '创建变量',
    )
    await act(async () => create!.click())
    expect(Object.hasOwn(session.getState().worldVariables ?? {}, 'constructor')).toBe(true)
    await render('constructor')
    expect(title()).toBe('constructor')

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    await render('constructor')
    expect(title()).toBe('任务已开始')
  })
})
