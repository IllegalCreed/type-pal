// @vitest-environment jsdom
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { loadBoundaryProject } from '../core/__tests__/cursor-command-boundary-fixtures.js'
import { EditSession } from '../core/edit-session.js'
import { AddEntityCommand } from '../core/entity-commands.js'
import { entityDisplayLabel } from '../core/entity-display.js'
import { AddSceneCommand } from '../core/scene-commands.js'
import { DsInspectorHost, DsPropertyGrid } from './design-system/index.js'
import { EntityNameField } from './EntityNameField.js'

let host: HTMLDivElement
let root: Root
beforeEach(async () => {
  // jsdom Blob不提供Web Streams；真实seed资产压缩使用Node的标准Blob实现。
  vi.stubGlobal('Blob', (await new Response().blob()).constructor)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

function Harness(props: { session: EditSession; sceneId: string; entityId: string }) {
  const state = useSyncExternalStore(
    (changed) => props.session.subscribe(changed),
    () => props.session.getState(),
  )
  const entity = state.scenes
    .find((scene) => scene.id === props.sceneId)!
    .entities.find((candidate) => candidate.id === props.entityId)!
  return (
    <DsInspectorHost>
      <DsPropertyGrid>
        <EntityNameField sceneId={props.sceneId} entity={entity} session={props.session} />
        <output>{entityDisplayLabel(entity)}</output>
      </DsPropertyGrid>
    </DsInspectorHost>
  )
}

async function setup() {
  const { state } = await loadBoundaryProject('entity-name-field')
  const added = new AddEntityCommand('start', {
    id: 'e59',
    label: '苗人头领',
    sprite: 'hero',
    pos: { col: 1, row: 2, height: 0 },
  }).apply(state)
  return new EditSession(
    new AddEntityCommand('start', {
      id: 'e60',
      label: '苗人随从',
      zone: true,
      pos: { col: 1, row: 3, height: 0 },
    }).apply(added),
  )
}
async function type(value: string) {
  const input = host.querySelector('input')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return input
}

test('Enter commits once; Escape cancels; undo/redo restores name and whitespace clears it', async () => {
  const session = await setup()
  await act(async () => root.render(<Harness session={session} sceneId="start" entityId="e59" />))
  const initialVersion = session.getHistoryVersion()
  const input = await type('  苗人头领（门口）  ')
  expect(session.getHistoryVersion()).toBe(initialVersion)
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  )
  expect(session.getHistoryVersion()).toBe(initialVersion + 1)
  expect(host.querySelector('output')!.textContent).toBe('苗人头领（门口） · e59')
  await act(async () => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
  expect(session.getHistoryVersion()).toBe(initialVersion + 1)
  await act(async () => {
    session.undo()
  })
  expect(host.querySelector('input')!.value).toBe('苗人头领')
  await act(async () => {
    session.redo()
  })
  expect(host.querySelector('input')!.value).toBe('苗人头领（门口）')
  const cancelled = await type('不应保存')
  await act(async () =>
    cancelled.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
  )
  expect(host.querySelector('input')!.value).toBe('苗人头领（门口）')
  const blank = await type('   ')
  await act(async () => blank.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
  expect(session.getState().scenes[0]!.entities[0]!.label).toBeUndefined()
  expect(host.querySelector('output')!.textContent).toBe('e59')
})

test('switching entities cancels the previous draft, and trigger zones can be named', async () => {
  const session = await setup()
  await act(async () => root.render(<Harness session={session} sceneId="start" entityId="e59" />))
  await type('未提交的头领草稿')
  await act(async () => root.render(<Harness session={session} sceneId="start" entityId="e60" />))
  expect(host.querySelector('input')!.value).toBe('苗人随从')
  const zone = await type('剧情触发区')
  await act(async () =>
    zone.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  )
  expect(session.getState().scenes[0]!.entities.map((entity) => entity.label)).toEqual([
    '苗人头领',
    '剧情触发区',
  ])
})

test('the same entity ID in another scene never receives the previous scene draft', async () => {
  const session = await setup()
  const scene = session.getState().scenes[0]!
  session.dispatch(
    new AddSceneCommand(
      { id: 'kitchen', name: '厨房', path: 'content/scenes/kitchen.json' },
      {
        ...scene,
        id: 'kitchen',
        entities: [
          { id: 'e59', sprite: 'hero', label: '厨房李大娘', pos: { col: 1, row: 2, height: 0 } },
        ],
      },
    ),
  )
  await act(async () => root.render(<Harness session={session} sceneId="start" entityId="e59" />))
  await type('未提交的走廊名称')
  await act(async () => root.render(<Harness session={session} sceneId="kitchen" entityId="e59" />))
  expect(host.querySelector('input')!.value).toBe('厨房李大娘')
  const input = await type('厨房备菜的李大娘')
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  )
  expect(
    session.getState().scenes.find((candidate) => candidate.id === 'start')!.entities[0]!.label,
  ).toBe('苗人头领')
  expect(
    session.getState().scenes.find((candidate) => candidate.id === 'kitchen')!.entities[0]!.label,
  ).toBe('厨房备菜的李大娘')
})
