// @vitest-environment jsdom
import type { ActorDef, CasualtyScript } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { CasualtyEditor } from './CasualtyEditor.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  root?.unmount()
  host.remove()
})

function battlerActor(
  casualty?: { friendDeath?: CasualtyScript; dying?: CasualtyScript },
): ActorDef {
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
      contentVersion: 1,
      engineVersion: 'test',
      entryScene: 'scene-a',
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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

function Harness(props: { session: EditSession; actor: ActorDef }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const actor = current.actors.find((a) => a.id === props.actor.id)!
  return (
    <CasualtyEditor
      actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
      session={props.session}
      locale={current.locale}
      onClose={() => undefined}
    />
  )
}

function button(text: string): HTMLButtonElement {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

function gateRow(value: string): HTMLElement {
  return [...host.querySelectorAll<HTMLElement>('.arow')].find((n) =>
    (n.querySelector('input[type="number"]') as HTMLInputElement | null)?.value === value,
  )!
}

const script: CasualtyScript = {
  gates: [
    { chance: 75, branch: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] } },
  ],
  fallback: { lines: [], effects: [{ kind: 'heal', resource: 'hp' }] },
}

describe('CasualtyEditor (E18-1)', () => {
  test('渲染槽位数据:gates 概率 + fallback 分支', async () => {
    const session = new EditSession(state(battlerActor({ friendDeath: script })))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} actor={session.getState().actors[0]!} />)
    })
    expect(gateRow('75').textContent).toContain('%')
    expect(host.textContent).toContain('兜底分支')
  })

  test('选中概率门 → 右列显示该分支台词;台词预览解析 locale', async () => {
    const session = new EditSession(state(battlerActor({ friendDeath: script })))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} actor={session.getState().actors[0]!} />)
    })
    const row = gateRow('75')
    await act(async () => row.click())
    const textInput = host.querySelector<HTMLInputElement>('input[placeholder^="文本 id"]')!
    expect(textInput.value).toBe('dlg.talk.0')
    expect(host.textContent).toContain('你好')
  })

  test('删除概率门 → 选中态回退 fallback(K1)', async () => {
    const session = new EditSession(state(battlerActor({ friendDeath: script })))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} actor={session.getState().actors[0]!} />)
    })
    const row = gateRow('75')
    await act(async () => row.click())
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent === '✕',
    )!
    await act(async () => remove.click())
    const after = session.getState().actors[0]!.battler!.casualty!.friendDeath!
    expect(after.gates).toEqual([])
    // 右列应显示 fallback 分支(回血效果)。
    expect(host.textContent).toContain('回血 / 回蓝')
  })

  test('＋台词 → 即时写回 session;移除本槽 → 键删除;两槽全移除 → casualty undefined(K4)', async () => {
    const session = new EditSession(state(battlerActor({ friendDeath: script, dying: script })))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} actor={session.getState().actors[0]!} />)
    })
    await act(async () => button('＋ 台词').click())
    const addLine = session.getState().actors[0]!.battler!.casualty!.friendDeath!.fallback
    expect(addLine.lines.length).toBe(1)
    await act(async () => button('移除本槽').click())
    expect(session.getState().actors[0]!.battler!.casualty!.friendDeath).toBeUndefined()
    expect(session.getState().actors[0]!.battler!.casualty!.dying).toBeDefined()
    await act(async () => button('自己濒死时 (dying)').click())
    await act(async () => button('移除本槽').click())
    expect(session.getState().actors[0]!.battler!.casualty).toBeUndefined()
  })

  test('未配置槽 → ＋配置 创建默认空脚本(G3)', async () => {
    const session = new EditSession(state(battlerActor()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} actor={session.getState().actors[0]!} />)
    })
    expect(host.textContent).toContain('本槽未配置')
    await act(async () => button('＋ 配置').click())
    const created = session.getState().actors[0]!.battler!.casualty!.friendDeath!
    expect(created.gates).toEqual([])
    expect(created.fallback).toEqual({ lines: [], effects: [] })
  })
})
