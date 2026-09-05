// @vitest-environment jsdom

import type { ActorDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { LevelingEditor } from './LevelingEditor.js'

let host: HTMLDivElement
let root: Root

function actor(id: string): ActorDef & { battler: NonNullable<ActorDef['battler']> } {
  return {
    id,
    name: `name.${id}`,
    spriteId: `${id}-sprite`,
    battler: {
      battleSprite: `${id}-battle`,
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
    },
  }
}

function editorState(): EditorState {
  const actors = [actor('a'), actor('b')]
  return {
    manifest: {
      id: 'test',
      name: 'test',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      entryPoints: [],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    actors,
    levelUp: {
      a: [{ level: 2, skillId: 'skill-a' }],
      b: [{ level: 7, skillId: 'skill-a' }],
    },
    skills: [{ id: 'skill-a', name: '技能 A' }],
    scenes: [],
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
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

function Harness(props: { session: EditSession; actorId: string }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  const current = state.actors.find((candidate) => candidate.id === props.actorId)!
  return (
    <LevelingEditor
      actor={current as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
      levelUpRows={state.levelUp[props.actorId] ?? []}
      skills={{ 'skill-a': { id: 'skill-a', name: '技能 A' } } as never}
      session={props.session}
      onEditCurve={() => undefined}
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

describe('LevelingEditor field commit boundary', () => {
  test('升级学技能使用与同排默认控件等高的危险删除图标按钮', async () => {
    const session = new EditSession(editorState())
    await act(async () => root.render(<Harness session={session} actorId="a" />))

    const remove = host.querySelector<HTMLButtonElement>(
      'button[aria-label="删除等级 2 的学技能行"]',
    )!
    expect(remove.classList).toContain('ds-icon-button')
    expect(remove.classList).toContain('ds-icon-button--danger')
    expect(remove.classList).not.toContain('ds-icon-button--compact')
    expect(remove.textContent).not.toContain('✕')

    await act(async () => remove.click())
    expect(session.getState().levelUp.a ?? []).toEqual([])
    expect(session.getHistoryVersion()).toBe(1)
  })

  test('连续输入只保留草稿，blur/Enter 各至多一条命令，Escape 不提交', async () => {
    const session = new EditSession(editorState())
    await act(async () => root.render(<Harness session={session} actorId="a" />))
    let input = host.querySelector<HTMLInputElement>('.entry-n input')!
    const initialHistory = session.getHistoryVersion()
    await act(async () => {
      input.focus()
      for (let index = 0; index < 100; index += 1) setInput(input, String(index + 3))
    })
    expect(session.getHistoryVersion()).toBe(initialHistory)
    expect(session.getState().levelUp.a![0]!.level).toBe(2)
    await act(async () => input.blur())
    expect(session.getHistoryVersion()).toBe(initialHistory + 1)
    expect(session.getState().levelUp.a![0]!.level).toBe(102)

    input = host.querySelector<HTMLInputElement>('.entry-n input')!
    const enterHistory = session.getHistoryVersion()
    await act(async () => {
      input.focus()
      setInput(input, '103')
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(enterHistory + 1)
    await act(async () => input.blur())
    expect(session.getHistoryVersion()).toBe(enterHistory + 1)

    input = host.querySelector<HTMLInputElement>('.entry-n input')!
    const escapeHistory = session.getHistoryVersion()
    await act(async () => {
      input.focus()
      setInput(input, '999')
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(session.getHistoryVersion()).toBe(escapeHistory)
    expect(session.getState().levelUp.a![0]!.level).toBe(103)
  })

  test('切换角色会丢弃旧对象草稿，不串到新对象或切回后的旧对象', async () => {
    const session = new EditSession(editorState())
    await act(async () => root.render(<Harness session={session} actorId="a" />))
    const input = host.querySelector<HTMLInputElement>('.entry-n input')!
    await act(async () => {
      input.focus()
      setInput(input, '88')
    })
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => root.render(<Harness session={session} actorId="b" />))
    expect(host.querySelector<HTMLInputElement>('.entry-n input')!.value).toBe('7')
    await act(async () => root.render(<Harness session={session} actorId="a" />))
    expect(host.querySelector<HTMLInputElement>('.entry-n input')!.value).toBe('2')
    expect(session.getHistoryVersion()).toBe(0)
  })
})
