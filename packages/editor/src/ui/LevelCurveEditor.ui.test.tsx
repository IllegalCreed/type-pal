// @vitest-environment jsdom

import type { ActorDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { LevelCurveEditor } from './LevelCurveEditor.js'

let host: HTMLDivElement
let root: Root

function testActor(): ActorDef & { battler: NonNullable<ActorDef['battler']> } {
  return {
    id: 'hero',
    name: 'name.hero',
    spriteId: 'hero-sprite',
    battler: {
      battleSprite: 'hero-battle',
      baseStats: {
        level: 1,
        hp: 10,
        maxHP: 10,
        mp: 5,
        maxMP: 5,
        attack: 1,
        defense: 1,
        magicAttack: 1,
        speed: 1,
        luck: 1,
      },
      initialEquipment: {},
      initialMagic: [],
      leveling: { expTable: [0, 15, 55] },
    },
  }
}

function editorState(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'test',
      contentVersion: 19,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      entryPoints: [],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    actors: [testActor()],
    levelUp: {},
    skills: [],
    scenes: [],
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
    shops: [],
    poisons: [],
  } as unknown as EditorState
}

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  return (
    <LevelCurveEditor
      actor={state.actors[0] as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
      levelUpRows={[]}
      skills={{} as never}
      session={props.session}
      onClose={() => undefined}
    />
  )
}

function setInput(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('LevelCurveEditor field commit boundary', () => {
  test('级数连续输入不改 canonical，blur 一次提交，undo/redo 回显 canonical', async () => {
    const session = new EditSession(editorState())
    await act(async () => root.render(<Harness session={session} />))
    let input = host.querySelector<HTMLInputElement>(
      '[data-field-id="level-curve-count"] input[data-ds-draft-commit="number"]',
    )!
    const history = session.getHistoryVersion()
    await act(async () => {
      input.focus()
      for (let index = 0; index < 100; index += 1) setInput(input, String((index % 20) + 4))
    })
    expect(session.getHistoryVersion()).toBe(history)
    expect(session.getState().actors[0]!.battler!.leveling!.expTable).toHaveLength(3)
    await act(async () => input.blur())
    expect(session.getHistoryVersion()).toBe(history + 1)
    expect(session.getState().actors[0]!.battler!.leveling!.expTable).toHaveLength(23)

    await act(async () => session.undo())
    input = host.querySelector<HTMLInputElement>(
      '[data-field-id="level-curve-count"] input[data-ds-draft-commit="number"]',
    )!
    expect(input.value).toBe('3')
    await act(async () => session.redo())
    input = host.querySelector<HTMLInputElement>(
      '[data-field-id="level-curve-count"] input[data-ds-draft-commit="number"]',
    )!
    expect(input.value).toBe('23')
  })
})
