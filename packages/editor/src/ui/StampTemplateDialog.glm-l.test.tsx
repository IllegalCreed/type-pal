// @vitest-environment jsdom

import {
  buildBlankProjectMap,
  buildProjectMapLayer,
  insertProjectMapLayer,
  paintProjectMapTiles,
} from '@type-pal/reforge'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import type { MapSelection } from '../core/map-selection.js'
import {
  canonicalizeStampDraft,
  createBlankStampDraft,
  setStampDraftVisual,
} from '../core/stamp-draft.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { StampTemplateDialog } from './StampTemplateDialog.js'

await stubNodeTestHost()

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  document.body.innerHTML = ''
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
    },
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

function fixture() {
  let map = buildBlankProjectMap(3, 2, 'tiles-a')
  map = paintProjectMapTiles(map, [
    { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: 'tiles-a', height: 0 },
  ])
  const objects = buildProjectMapLayer(map, 'objects', '物件')
  map = insertProjectMapLayer(map, objects)
  map = paintProjectMapTiles(map, [
    { layerId: 'objects', row: 1, col: 0, tileId: 2, tilesetId: 'tiles-a', height: 3 },
  ])
  map.collision[0]![0] = 0
  map.collision[1]![0] = 4
  const selection: Extract<MapSelection, { kind: 'cells' }> = {
    kind: 'cells',
    hitScope: 'visible-unlocked-layers',
    visualSlots: [
      { layerId: 'floor', row: 0, col: 0 },
      { layerId: 'objects', row: 1, col: 0 },
    ],
    gridPoints: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
    ],
  }
  return { map, selection }
}

function button(text: string): HTMLButtonElement {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  expect(button).not.toBeNull()
  return button!
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function renderDialog(props: Partial<ComponentProps<typeof StampTemplateDialog>> = {}): void {
  const { map, selection } = fixture()
  act(() =>
    root.render(
      <StampTemplateDialog
        map={map}
        selection={selection}
        stamps={[]}
        session={new EditSession(legalState)}
        onClose={() => undefined}
        onSaved={() => undefined}
        {...props}
      />,
    ),
  )
}

let legalState: Awaited<ReturnType<typeof loadLegalUiProject>>['state']

describe('TEST-GLM-WAVE-L-1 L05 stamp template dialog validation gates', () => {
  beforeEach(async () => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    legalState = (await loadLegalUiProject('glm-l-stamp-dialog')).state
  })

  test('create 重复 ID 与空名称都精确报错且不落任何模板', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    const session = new EditSession(legalState)
    const existing = canonicalizeStampDraft(
      setStampDraftVisual(
        createBlankStampDraft('dupe', '已有', 'tiles-a'),
        'base',
        { row: 8, col: 7 },
        1,
        'tiles-a',
        0,
      ),
    )
    renderDialog({ session, stamps: [existing], onClose, onSaved })
    await input(document.querySelector<HTMLInputElement>('input[name="stamp-id"]')!, 'dupe')
    await input(document.querySelector<HTMLInputElement>('input[name="stamp-name"]')!, '重名')
    await act(async () => button('创建组合')!.click())
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('ID “dupe” 已存在。')
    expect(onSaved).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
    expect(session.getState().stamps).toHaveLength(0)
    // 焦点被移到 id 字段。
    expect(document.activeElement).toBe(document.querySelector('input[name="stamp-id"]'))

    await input(document.querySelector<HTMLInputElement>('input[name="stamp-id"]')!, 'fresh')
    await input(document.querySelector<HTMLInputElement>('input[name="stamp-name"]')!, '   ')
    await act(async () => button('创建组合')!.click())
    expect(document.querySelector('[role="alert"]')?.textContent).toBe('名称不能为空。')
    expect(document.activeElement).toBe(document.querySelector('input[name="stamp-name"]'))
    expect(session.getState().stamps).toHaveLength(0)
  })

  test('不勾选碰撞快照时模板仅保留视觉成员', async () => {
    const onSaved = vi.fn<(templateId: string, mode: string) => void>()
    const session = new EditSession(legalState)
    renderDialog({ session, initialMode: 'create', onSaved })
    await input(document.querySelector<HTMLInputElement>('input[name="stamp-name"]')!, '无碰撞')
    await act(async () => button('创建组合')!.click())
    expect(onSaved).toHaveBeenCalledTimes(1)
    const savedId = onSaved.mock.calls[0]?.[0]
    expect(savedId).toBeTypeOf('string')
    const stored = session.getState().stamps.find((template) => template.id === savedId)
    expect(stored?.collision.flatMap((row) => row.filter((value) => value !== null))).toHaveLength(
      0,
    )
    expect(
      stored?.layers.flatMap((layer) => layer.tiles.flat()).filter((tile) => tile !== null),
    ).toHaveLength(2)
  })
})
