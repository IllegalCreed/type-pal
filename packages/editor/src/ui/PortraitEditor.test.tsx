// @vitest-environment jsdom

import type { PortraitSet } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { installReactActEnvironment, waitForReact } from '../__tests__/react-io-wait.js'
import { UpdateActorCommand } from '../core/actor-commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  buttonByLabel,
  chooseComboboxOption,
  loadLegalUiProject,
} from './__tests__/glm-ui-wave-kit.js'
import {
  type ImageDomPort,
  installImageDomPorts,
  restoreImageDomPorts,
} from './__tests__/image-preview-ports.js'
import {
  installBrowserHardwarePorts,
  pngRgba,
  solidRgba,
} from './__tests__/kimi-editor-workflows/kit.js'
import { decodePngPixels, seedImage } from './__tests__/static-image-fixtures.js'
import { PortraitEditor } from './PortraitEditor.js'

let host: HTMLDivElement
let root: Root
let restoreAct: () => void
let imageDom: ImageDomPort

const red = [220, 40, 40, 255] as const
const blue = [40, 80, 220, 255] as const
const defaultPortraits: PortraitSet = {
  default: 'portrait.test.001',
  expressions: { 微笑: 'portrait.test.001' },
}

function Harness(props: { session: EditSession; reader: EditorAssetReader }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  const actor = state.actors.find((candidate) => candidate.id === 'hero')
  if (!actor) throw new Error('Missing starter actor')
  return (
    <PortraitEditor
      actor={actor}
      session={props.session}
      catalog={state.assetCatalog}
      reader={props.reader}
    />
  )
}

beforeEach(() => {
  restoreAct = installReactActEnvironment()
  installBrowserHardwarePorts()
  imageDom = installImageDomPorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    restoreImageDomPorts()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    restoreAct()
  }
})

function button(label: string, scope: ParentNode = host) {
  return buttonByLabel(scope, label)
}

async function mount(options: { portraits?: PortraitSet; empty?: boolean } = {}) {
  const legal = await loadLegalUiProject('portrait-editor')
  const seed = new EditSession(legal.state)
  if (!options.empty) {
    await seedImage(seed, {
      id: 'portrait.test.001',
      kind: 'portrait',
      label: '测试立绘一',
      png: pngRgba(2, 2, solidRgba(2, 2, red)),
    })
    await seedImage(seed, {
      id: 'portrait.test.002',
      kind: 'portrait',
      label: '测试立绘二',
      png: pngRgba(2, 2, solidRgba(2, 2, blue)),
    })
  }
  if (options.portraits) {
    seed.dispatch(new UpdateActorCommand('hero', { portraits: options.portraits }))
  }
  assertProjectSaveValid(seed.getState())
  const session = new EditSession(seed.getState())
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  await act(async () => root.render(<Harness session={session} reader={reader} />))
  return { session }
}

function portraitField(label: string): HTMLElement {
  const trigger = host.querySelector(`button[aria-label="${label}"]`)
  const field = trigger?.closest<HTMLElement>('.ds-control-group')
  if (!field) throw new Error(`Missing portrait selection ${label}`)
  return field
}

async function selectBlue(label: string) {
  await chooseComboboxOption(
    buttonByLabel(portraitField(label), label),
    '测试立绘二 (portrait.test.002)',
  )
}

async function typeName(input: HTMLInputElement, value: string) {
  const write = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  if (!write) throw new Error('Missing input value setter')
  await act(async () => {
    input.focus()
    write.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function expectSwatch(label: string, expected: readonly number[]) {
  const field = portraitField(label)
  await waitForReact(() => expect(field.querySelector('img')).not.toBeNull())
  const url = field.querySelector('img')?.getAttribute('src')
  const blob = url ? imageDom.objectUrlBlob(url) : undefined
  if (!blob) throw new Error(`Missing thumbnail bytes for ${label}`)
  const image = await decodePngPixels(await blob.arrayBuffer())
  expect(Array.from(image.rgba.slice(0, 4))).toEqual(expected)
}

describe('PortraitEditor', () => {
  test('[add-picker:actor/portrait] 标题动作弹窗明确确认后才添加表情且只写一条历史', async () => {
    const { session } = await mount({ portraits: defaultPortraits })

    const section = host.querySelector('.portrait-editor.ds-workbench-section')!
    const trigger = button('添加表情', section.querySelector('.ds-workbench-section__actions')!)
    expect(
      trigger.closest('[data-ds-add-picker-adoption]')?.getAttribute('data-ds-add-picker-adoption'),
    ).toBe('actor/portrait')
    expect(section.querySelectorAll('.portrait-entry')).toHaveLength(2)
    expect(section.querySelector('.ds-workbench-section__content > .ds-button')).toBeNull()

    await act(async () => trigger.click())
    let dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    let option = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('测试立绘二'),
    )!
    await act(async () => option.click())
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => button('取消', dialog).click())
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => trigger.click())
    dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    option = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('测试立绘二'),
    )!
    await act(async () => option.click())
    await act(async () => button('添加表情', dialog).click())

    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().actors[0]?.portraits?.expressions).toEqual({
      微笑: 'portrait.test.001',
      表情1: 'portrait.test.002',
    })
    expect(host.querySelectorAll('.portrait-entry')).toHaveLength(3)
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().actors[0]?.portraits?.expressions).toEqual({
      微笑: 'portrait.test.001',
    })
  })

  test('没有立绘组时从标题动作选择主立绘，不再静默采用目录第一项', async () => {
    const { session } = await mount()

    expect(host.textContent).toContain('暂无对话立绘')
    const trigger = button('设置主立绘')
    await act(async () => trigger.click())
    const dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    const option = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('测试立绘二'),
    )!
    await act(async () => option.click())
    await act(async () => button('设置主立绘', dialog).click())

    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().actors[0]?.portraits).toEqual({ default: 'portrait.test.002' })
  })

  test('表情名称走共享草稿边界，Enter 与随后 blur 只提交一次', async () => {
    const { session } = await mount({ portraits: defaultPortraits })
    const input = host.querySelector<HTMLInputElement>('[name="actor-portrait-expression-name"]')!

    await typeName(input, '开心')
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    await act(async () => input.blur())

    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().actors[0]?.portraits?.expressions).toEqual({
      开心: 'portrait.test.001',
    })
    assertProjectSaveValid(session.getState())
  })

  test('explains why the default picker is unavailable without portrait assets', async () => {
    const { session } = await mount({ empty: true })
    expect(button('设置主立绘').disabled).toBe(true)
    expect(host.textContent).toContain('请先在图片库导入 portrait 资源。')
    expect(session.getHistoryVersion()).toBe(0)
  })

  test('switches the default thumbnail bytes with its resource and restores them on undo', async () => {
    const { session } = await mount({ portraits: defaultPortraits })
    const label = '默认对话立绘图片'
    await expectSwatch(label, red)
    await selectBlue(label)
    expect(session.getState().actors[0]?.portraits).toEqual({
      default: 'portrait.test.002',
      expressions: { 微笑: 'portrait.test.001' },
    })
    expect(session.getHistoryVersion()).toBe(1)
    await expectSwatch(label, blue)
    await act(async () => expect(session.undo()).toBe(true))
    await expectSwatch(label, red)
  })

  test('changes only the selected expression and removes it before removing the group', async () => {
    const { session } = await mount({ portraits: defaultPortraits })
    await selectBlue('微笑立绘图片')
    expect(session.getState().actors[0]?.portraits?.expressions).toEqual({
      微笑: 'portrait.test.002',
    })
    await expectSwatch('微笑立绘图片', blue)
    await expectSwatch('默认对话立绘图片', red)
    await act(async () => button('删除表情“微笑”').click())
    expect(session.getState().actors[0]?.portraits).toEqual({ default: 'portrait.test.001' })
    await act(async () => button('删除整个对话立绘组').click())
    expect(session.getState().actors[0]?.portraits).toBeUndefined()
    expect(session.getHistoryVersion()).toBe(3)
    expect(host.textContent).toContain('点击右上角“设置主立绘”选择图片。')
  })

  test('rejects a duplicate expression name without changing either binding', async () => {
    const portraits = {
      ...defaultPortraits,
      expressions: { 微笑: 'portrait.test.001', 开心: 'portrait.test.002' },
    }
    const { session } = await mount({ portraits })
    const input = [
      ...host.querySelectorAll<HTMLInputElement>('input[name="actor-portrait-expression-name"]'),
    ].find((candidate) => candidate.value === '微笑')
    if (!input) throw new Error('Missing expression name')
    await typeName(input, '开心')
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(session.getHistoryVersion()).toBe(0)
    expect(session.getState().actors[0]?.portraits).toEqual(portraits)
  })
})
