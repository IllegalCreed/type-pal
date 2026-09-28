// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
} from '../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { VarsTab } from './VarsTab.js'

const referenceIndex = createProjectReferenceIndex(buildProjectReferenceSnapshot([]))

function state(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'test',
      contentVersion: 20,
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
    sceneIndex: {
      version: 1,
      scenes: [{ id: 's', name: '场景', path: 'content/scenes/s.json' }],
    },
    worldVariables: {
      'quest.started': {
        kind: 'flag',
        name: '任务已开始',
        description: '主线任务',
        initial: false,
      },
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
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

function Harness(props: { referenceStatus?: EditorDerivedStatus }) {
  const current = session.getState()
  return (
    <VarsTab
      variables={current.worldVariables ?? {}}
      referenceIndex={referenceIndex}
      referenceStatus={props.referenceStatus ?? 'current'}
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
      session={session}
    />
  )
}

async function render(referenceStatus?: EditorDerivedStatus): Promise<void> {
  await act(async () => root.render(<Harness referenceStatus={referenceStatus} />))
}

function button(text: string): HTMLButtonElement {
  const button =
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === text,
    ) ?? host.querySelector<HTMLButtonElement>(`button[aria-label="${text}"]`)
  expect(button).not.toBeNull()
  return button!
}

async function type(input: HTMLInputElement | HTMLTextAreaElement, value: string): Promise<void> {
  const setter =
    input instanceof HTMLTextAreaElement
      ? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
      : Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function chooseCombobox(label: string, optionText: string): Promise<void> {
  const labelElement = [...host.querySelectorAll('label')].find((candidate) =>
    candidate.textContent?.includes(label),
  )
  const trigger = labelElement
    ? (document.getElementById(labelElement.htmlFor) as HTMLButtonElement)
    : null
  expect(trigger).not.toBeNull()
  await act(async () => trigger!.click())
  const option = [...document.querySelectorAll<HTMLElement>('.ds-select-option')].find(
    (candidate) => candidate.textContent?.includes(optionText),
  )
  expect(option).not.toBeNull()
  await act(async () => option!.click())
}

describe('VarsTab 剩余合同', () => {
  test('creating a number variable commits kind, name and zero initial through the session', async () => {
    await render()
    const historyBefore = session.getHistoryVersion()
    await act(async () => button('新建变量').click())

    const idInput = host.querySelector<HTMLInputElement>('.world-variable-create-card input')!
    await type(idInput, 'score.bonus')
    await chooseCombobox('类型', '数值（number）')
    const nameInput = [
      ...host.querySelectorAll<HTMLInputElement>('.world-variable-create-card input'),
    ][1]!
    await type(nameInput, '奖励分')
    await act(async () => button('创建变量').click())

    const created = session.getState().worldVariables?.['score.bonus']
    expect(created).toEqual({ kind: 'number', name: '奖励分', description: '', initial: 0 })
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)
    await render()
    expect(host.textContent).toContain('数值')
    expect(host.textContent).toContain('奖励分')
  })

  test('duplicate ids are a silent no-op and reserved sys: ids surface the guard copy', async () => {
    await render()
    await act(async () => button('新建变量').click())
    const inputs = host.querySelectorAll<HTMLInputElement>('.world-variable-create-card input')
    await type(inputs[0]!, 'quest.started')
    await type(inputs[1]!, '重复名')
    await act(async () => button('创建变量').click())
    // 重复 id：AddWorldVariableCommand.apply 静默返回原 state，目录仍 1 项且不产生历史。
    expect(session.getState().worldVariables?.['quest.started']?.name).toBe('任务已开始')
    expect(Object.keys(session.getState().worldVariables ?? {})).toEqual(['quest.started'])
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => button('新建变量').click())
    await type(
      host.querySelector<HTMLInputElement>('.world-variable-create-card input')!,
      'sys:engine',
    )
    await act(async () => button('创建变量').click())
    await render()
    expect(host.textContent).toContain('sys:')
    expect(session.getState().worldVariables?.['sys:engine']).toBeUndefined()
  })

  test('flag initial toggles and number initial edit stay in their own domains', async () => {
    await render()
    // flag: initial=false → 勾选提交 true。
    await act(async () => {
      const checkbox = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!
      checkbox.click()
    })
    expect(session.getState().worldVariables?.['quest.started']).toMatchObject({ initial: true })

    // number 变量的 initial 是数字输入，不出现在 flag 视图。
    expect(host.querySelector('input[type="number"]')).toBeNull()

    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().worldVariables?.['quest.started']).toMatchObject({ initial: false })
  })
})
