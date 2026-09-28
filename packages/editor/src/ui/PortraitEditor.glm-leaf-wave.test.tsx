// @vitest-environment jsdom

import type { AssetRecordV1 } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpsertAssetCommand } from '../core/asset-commands.js'
import { UpdateActorCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { PortraitEditor } from './PortraitEditor.js'

let host: HTMLDivElement
let root: Root

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  await stubNodeTestHost()
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0))
    return 1
  })
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:glm-leaf-portrait'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
  vi.restoreAllMocks()
})

const portraitRecord = (id: string, label: string): AssetRecordV1 => ({
  kind: 'portrait',
  path: `assets/runtime/${id}.png`,
  mediaType: 'image/png',
  bytes: 8,
  sha256: `sha-${id}`,
  label,
  origin: { kind: 'authored' },
})

async function sessionWithPortraits() {
  const legal = await loadLegalUiProject('glm-leaf-portrait-editor')
  const session = new EditSession(legal.state)
  session.dispatch(
    new UpsertAssetCommand(
      'portrait.lab.001',
      portraitRecord('portrait.lab.001', '实验立绘甲'),
      new ArrayBuffer(4),
    ),
  )
  session.dispatch(
    new UpsertAssetCommand(
      'portrait.lab.002',
      portraitRecord('portrait.lab.002', '实验立绘乙'),
      new ArrayBuffer(4),
    ),
  )
  return {
    session,
    reader: createEditorAssetReader(legal.source, () => session.getState()),
    actorId: session.getState().actors[0]!.id,
  }
}

function Harness(props: {
  session: EditSession
  reader: ReturnType<typeof createEditorAssetReader>
  actorId: string
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const actor = current.actors.find((candidate) => candidate.id === props.actorId)!
  return (
    <PortraitEditor
      actor={actor}
      session={props.session}
      catalog={current.assetCatalog}
      reader={props.reader}
    />
  )
}

async function clickOption(trigger: HTMLElement, text: string): Promise<void> {
  await act(async () => trigger.click())
  const option = [...document.querySelectorAll<HTMLElement>('.ds-select-option')].find(
    (candidate) => candidate.textContent?.includes(text),
  )
  expect(option).not.toBeNull()
  await act(async () => option!.click())
}

function triggerByLabel(label: string): HTMLButtonElement {
  const trigger = host.querySelector<HTMLButtonElement>(`button.ds-select[aria-label="${label}"]`)
  expect(trigger).not.toBeNull()
  return trigger!
}

describe('PortraitEditor 剩余合同', () => {
  test('keeps the picker locked and explains the empty state without portrait assets', async () => {
    const legal = await loadLegalUiProject('glm-leaf-portrait-empty')
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(legal.source, () => session.getState())
    const actorId = session.getState().actors[0]!.id
    await act(async () =>
      root.render(<Harness session={session} reader={reader} actorId={actorId} />),
    )
    expect(host.querySelector('button')?.textContent).toContain('设置主立绘')
    expect(host.querySelector('button')?.disabled).toBe(true)
    expect(host.textContent).toContain('请先在图片库导入 portrait 资源。')
  })

  test('passes swapped expression assets into the real session and deletes rows and the set', async () => {
    const { session, reader, actorId } = await sessionWithPortraits()
    session.dispatch(
      new UpdateActorCommand(actorId, {
        portraits: {
          default: 'portrait.lab.001',
          expressions: { 微笑: 'portrait.lab.001' },
        },
      }),
    )
    await act(async () =>
      root.render(<Harness session={session} reader={reader} actorId={actorId} />),
    )
    await clickOption(triggerByLabel('微笑立绘图片'), '实验立绘乙')
    expect(session.getState().actors[0]?.portraits?.expressions?.微笑).toBe('portrait.lab.002')
    expect(session.getState().actors[0]?.portraits?.default).toBe('portrait.lab.001')

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="删除表情“微笑”"]')!.click(),
    )
    expect(session.getState().actors[0]?.portraits?.expressions?.微笑).toBeUndefined()
    expect(session.getState().actors[0]?.portraits?.default).toBe('portrait.lab.001')

    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="删除整个对话立绘组"]')!.click(),
    )
    expect(session.getState().actors[0]?.portraits).toBeUndefined()
    expect(host.textContent).toContain('点击右上角“设置主立绘”选择图片。')
  })

  test('marks a non-portrait expression value and still applies valid sibling edits', async () => {
    const { session, reader, actorId } = await sessionWithPortraits()
    session.dispatch(
      new UpsertAssetCommand(
        'portrait.lab.003',
        portraitRecord('portrait.lab.003', '实验立绘丙'),
        new ArrayBuffer(4),
      ),
    )
    session.dispatch(
      new UpdateActorCommand(actorId, {
        portraits: {
          default: 'portrait.lab.001',
          expressions: { 微笑: 'portrait.lab.001', 异常: 'portrait.lab.002' },
        },
      }),
    )
    session.dispatch(
      new UpsertAssetCommand(
        'portrait.lab.002',
        { ...portraitRecord('portrait.lab.002', '实验立绘乙'), kind: 'item-icon' },
        new ArrayBuffer(4),
      ),
    )
    await act(async () =>
      root.render(<Harness session={session} reader={reader} actorId={actorId} />),
    )
    const invalidTrigger = triggerByLabel('异常立绘图片')
    expect(invalidTrigger.textContent).toContain('⚠ portrait.lab.002（缺失或类型错误）')
    expect(invalidTrigger.getAttribute('aria-invalid')).toBe('true')

    await clickOption(triggerByLabel('微笑立绘图片'), '实验立绘丙')
    expect(session.getState().actors[0]?.portraits?.expressions?.微笑).toBe('portrait.lab.003')
    expect(session.getState().actors[0]?.portraits?.expressions?.异常).toBe('portrait.lab.002')
  })
})
