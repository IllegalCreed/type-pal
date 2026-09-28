// @vitest-environment jsdom
import type { ActorDef, CasualtyScript } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpdateActorCommand } from '../core/commands.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { CasualtyEditor } from './CasualtyEditor.js'

function battlerActor(casualty?: {
  friendDeath?: CasualtyScript
  dying?: CasualtyScript
}): ActorDef {
  return {
    id: 'hero',
    name: 'name.hero',
    spriteId: 'hero-sprite',
    battler: {
      battleSprite: 'hero-battle-sprite',
      baseStats: {
        level: 1,
        hp: 100,
        maxHP: 100,
        mp: 10,
        maxMP: 10,
        attack: 5,
        defense: 5,
        magicAttack: 5,
        speed: 5,
        luck: 5,
      },
      initialEquipment: {},
      initialMagic: [],
      casualty,
    },
  }
}

function state(actor: ActorDef): EditorState {
  return {
    manifest: {
      id: 'test',
      name: '测试项目',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 'scene-a',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [],
    actors: [actor],
    skills: [],
    levelUp: {},
    items: [],
    locale: { 'dlg.talk.0': '你好', 'name.hero': '主角' },
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

let root: Root
let host: HTMLDivElement
let session: EditSession

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

function Harness(props: { actor: ActorDef }) {
  useSyncExternalStore(
    (callback) => session.subscribe(callback),
    () => session.getVersion(),
  )
  const current = session.getState()
  const actor = current.actors.find((candidate) => candidate.id === props.actor.id)!
  return (
    <CasualtyEditor
      actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
      session={session}
      locale={current.locale}
      onClose={() => undefined}
    />
  )
}

function render(props: { actor: ActorDef }): void {
  act(() => root.render(<Harness actor={props.actor} />))
}

function button(text: string): HTMLButtonElement {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )
  expect(button, text).not.toBeNull()
  return button!
}

const casualty: { friendDeath: CasualtyScript; dying: CasualtyScript } = {
  friendDeath: {
    gates: [
      { chance: 40, branch: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] } },
    ],
    fallback: { lines: [], effects: [] },
  },
  dying: {
    gates: [],
    fallback: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] },
  },
}

describe('CasualtyEditor 剩余合同', () => {
  test('slot switch keeps per-slot data separate and mirrors external undo', async () => {
    session = new EditSession(state(battlerActor(casualty)))
    render({ actor: battlerActor(casualty) })
    // friendDeath 槽有一门；dying 槽空。
    expect(host.querySelector<HTMLInputElement>('input[type="number"]')?.value).toBe('40')

    await act(async () => button('自己濒死时').click())
    // dying 槽只配了 fallback：无概率门输入，但兜底分支内容可见。
    expect(host.querySelector('input[type="number"]')).toBeNull()
    expect(host.textContent).toContain('兜底分支')
    expect(host.textContent).not.toContain('40')

    // 外部命令移除 friendDeath：组件外部 identity epoch 回显，不再显示 40 门。
    await act(async () => {
      session.dispatch(
        new UpdateActorCommand('hero', {
          battler: {
            ...session.getState().actors[0]!.battler!,
            casualty: { dying: casualty.dying },
          },
        }),
      )
    })
    render({ actor: session.getState().actors[0] as ActorDef })
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath).toBeUndefined()
    await act(async () => button('队友阵亡时').click())
    // friendDeath 槽已被外部命令清空：回显空槽而非残留 40 门。
    expect(host.querySelector('input[type="number"]')).toBeNull()
    expect(host.textContent).toContain('尚未配置')
  })

  test('chance gates write integers once per blur and undo restores the prior value', async () => {
    session = new EditSession(state(battlerActor(casualty)))
    render({ actor: battlerActor(casualty) })
    const chance = host.querySelector<HTMLInputElement>('input[type="number"]')!
    const historyBefore = session.getHistoryVersion()
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      setter.call(chance, '80.9')
      chance.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      chance.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    })
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates[0]?.chance).toBe(80)
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)

    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates[0]?.chance).toBe(40)
  })

  test('adding a gate then removing it returns to the previous script shape', async () => {
    session = new EditSession(state(battlerActor(casualty)))
    render({ actor: battlerActor(casualty) })
    await act(async () => button('添加概率分支').click())
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates).toHaveLength(2)
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates[1]).toMatchObject({
      chance: 50,
      branch: { lines: [], effects: [] },
    })

    await act(async () => expect(session.undo()).toBe(true))
    expect(session.getState().actors[0]?.battler?.casualty?.friendDeath?.gates).toHaveLength(1)
  })
})
