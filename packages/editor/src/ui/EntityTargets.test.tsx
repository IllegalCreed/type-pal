// @vitest-environment jsdom
import type { AuthorCommand, AuthorSceneDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { CanonicalScriptBodyEditor, type CanonicalScriptEditorContext } from './ScriptEditor.js'

const reader: EditorAssetReader = {
  projectId: 'entity-targets',
  record: () => {
    throw new Error('target picker must not read assets')
  },
  readBytes: async () => {
    throw new Error('target picker must not read assets')
  },
  readRoleBytes: async () => {
    throw new Error('target picker must not read assets')
  },
  urlFor: async () => {
    throw new Error('target picker must not read assets')
  },
}
const scene: AuthorSceneDef = {
  id: 's003',
  mapId: 'inn',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [
    { id: 'e59', label: '旧名称一', sprite: 'npc', pos: { col: 1, row: 2, height: 0 } },
    { id: 'e60', label: '旧名称二', sprite: 'npc', pos: { col: 1, row: 3, height: 0 } },
  ],
}
const context: CanonicalScriptEditorContext = {
  state: { scenes: [scene], items: [], sharedScripts: {} },
  currentSceneId: 's003',
  shellScenes: [
    {
      ...scene,
      entities: scene.entities.map((entity) => ({
        id: entity.id,
        sprite: 'npc',
        pos: entity.pos,
        label: '苗人随从',
      })),
    },
  ],
  locale: {},
  assetCatalog: { version: 1, assets: {} },
  audioResolver: reader,
  assetReader: reader,
  references: { choices: () => [], has: () => false, label: (_kind, id) => id },
  battleSprites: [],
}
let host: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

test('unsaved equal names remain separately selectable and commit the stable target ID', async () => {
  const changed = vi.fn()
  const body: AuthorCommand[] = [
    {
      kind: 'moveEntity',
      target: { scene: 's003', entity: 'e59' },
      to: { col: 2, row: 2, height: 0 },
      speed: 'normal',
    },
  ]
  await act(async () =>
    root.render(<CanonicalScriptBodyEditor body={body} context={context} onChange={changed} />),
  )
  const row = host.querySelector('.cmd-row')!
  expect(row.textContent).toContain('苗人随从 · e59')
  expect(row.textContent).not.toContain('旧名称一')
  await act(async () => row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  const picker = document.querySelector<HTMLButtonElement>(
    'button[role="combobox"][aria-label="实体"]',
  )!
  expect(picker.textContent).toContain('苗人随从 · e59')
  await act(async () => picker.click())
  const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
  expect(options.map((option) => option.textContent)).toEqual(['苗人随从 · e59', '苗人随从 · e60'])
  await act(async () => options[1]!.click())
  expect(changed).not.toHaveBeenCalled()
  await act(async () =>
    [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent === '完成')!
      .click(),
  )
  expect(changed).toHaveBeenCalledOnce()
  expect(changed.mock.calls[0]![0][0]).toEqual({
    ...body[0],
    target: { scene: 's003', entity: 'e60' },
  })
  expect(body[0]).toMatchObject({ target: { scene: 's003', entity: 'e59' } })
})
