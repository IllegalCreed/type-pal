// @vitest-environment jsdom
import type { SceneDef } from '@type-pal/content'
import { validateScenes } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { loadBoundaryProject } from '../core/__tests__/cursor-command-boundary-fixtures.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { createScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { CommandForm, type CommandFormProps } from './CommandForm.js'
import type { CommandFormCommand } from './command-form-contract.js'

let host: HTMLDivElement
let root: Root
beforeEach(async () => {
  vi.stubGlobal('Blob', (await new Response().blob()).constructor)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})
afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

async function fixture(cmd: CommandFormCommand): Promise<CommandFormProps> {
  const { source, state } = await loadBoundaryProject('command-form-entity-labels')
  const hero = state.actors[0]!
  const locale = { ...state.locale, [hero.name]: '李大娘' }
  const scene: SceneDef = {
    ...state.scenes[0]!,
    entities: [
      { id: 'e56', actor: hero.id, label: '大厅李大娘', pos: { col: 1, row: 1, height: 0 } },
      { id: 'e59', sprite: hero.spriteId, label: '苗人随从', pos: { col: 1, row: 2, height: 0 } },
      { id: 'e60', sprite: hero.spriteId, label: '苗人随从', pos: { col: 1, row: 3, height: 0 } },
      { id: 'e61', actor: hero.id, pos: { col: 1, row: 4, height: 0 } },
      { id: 'e62', sprite: hero.spriteId, pos: { col: 1, row: 5, height: 0 } },
    ],
  }
  validateScenes([scene])
  const reader = createEditorAssetReader(source, () => state)
  return {
    cmd,
    scene,
    locale,
    actors: Object.fromEntries(state.actors.map((actor) => [actor.id, actor])),
    assetCatalog: state.assetCatalog,
    assetReader: reader,
    audioResolver: reader,
    battleSprites: state.battleSprites,
    sprites: state.sprites,
    references: createScriptReferenceCatalog({
      locale,
      items: state.items,
      skills: state.skills,
      actors: state.actors,
      poisons: state.poisons ?? [],
      sprites: state.sprites,
      battleSprites: state.battleSprites,
      ambiences: state.ambiences ?? [],
      mapIndex: state.mapIndex,
      assetCatalog: state.assetCatalog,
    }),
    onChange: vi.fn(),
  }
}

test.each([
  { kind: 'takeEntity', entity: 'e56' },
  { kind: 'releaseEntity', entity: 'e56' },
  { kind: 'mountParty', entity: 'e56' },
  { kind: 'ride', entity: 'e56', to: { col: 3, row: 4, height: 0 }, speed: 'normal' },
] satisfies CommandFormCommand[])('parent resolves $kind entity names while family selection keeps IDs', async (cmd) => {
  const props = await fixture(cmd)
  const before = structuredClone({ scene: props.scene, actors: props.actors, cmd })
  await act(async () => root.render(<CommandForm {...props} />))
  const picker = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
  expect(picker.textContent).toContain('大厅李大娘 · e56')
  await act(async () => picker.click())
  const options = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
  expect(options.map((option) => option.textContent)).toEqual([
    ...(cmd.kind === 'releaseEntity' ? ['(全部)'] : []),
    '大厅李大娘 · e56',
    '苗人随从 · e59',
    '苗人随从 · e60',
    '李大娘 · e61',
    'e62',
  ])
  await act(async () => options.find((option) => option.textContent === '苗人随从 · e60')!.click())
  expect(props.onChange).toHaveBeenCalledExactlyOnceWith({ ...cmd, entity: 'e60' })
  expect({ scene: props.scene, actors: props.actors, cmd }).toEqual(before)
})

test('parent updates entity display callback for unsaved renames, clearing and locale changes', async () => {
  const props = await fixture({ kind: 'takeEntity', entity: 'e56' })
  const render = async (scene: SceneDef, locale = props.locale) => {
    await act(async () => root.render(<CommandForm {...props} scene={scene} locale={locale} />))
    return host.querySelector<HTMLButtonElement>('[role="combobox"]')!.textContent
  }
  expect(await render(props.scene)).toContain('大厅李大娘 · e56')
  const renamed = {
    ...props.scene,
    entities: props.scene.entities.map((entity) =>
      entity.id === 'e56' ? { ...entity, label: '厨房李大娘' } : entity,
    ),
  }
  expect(await render(renamed)).toContain('厨房李大娘 · e56')
  const cleared = {
    ...props.scene,
    entities: props.scene.entities.map((entity) =>
      entity.id === 'e56' ? { ...entity, label: undefined } : entity,
    ),
  }
  expect(await render(cleared)).toContain('李大娘 · e56')
  const hero = Object.values(props.actors!)[0]!
  expect(await render(cleared, { ...props.locale, [hero.name]: '婶婶' })).toContain('婶婶 · e56')
})
