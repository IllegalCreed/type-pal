// @vitest-environment jsdom
import type { ActorDef, CasualtyScript } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { ActorMode } from './ActorMode.js'

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

const script: CasualtyScript = {
  gates: [
    { chance: 75, branch: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] } },
  ],
  fallback: { lines: [], effects: [] },
}

function actors(): ActorDef[] {
  return [
    {
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
        coveredBy: undefined,
        cooperativeMagicSkillId: undefined,
        casualty: { friendDeath: script },
      },
    },
    {
      id: 'guard',
      name: 'name.guard',
      spriteId: 'guard-sprite',
      battler: {
        battleSprite: 'guard-battle-sprite',
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
      },
    },
  ]
}

function state(actorsList: ActorDef[]): EditorState {
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
    actors: actorsList,
    skills: [{ id: '99', name: '合体技', effects: [] } as never],
    levelUp: {},
    items: [],
    locale: { 'dlg.talk.0': '你好', 'name.hero': '主角', 'name.guard': '守护者' },
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

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <ActorMode
      actors={current.actors}
      sprites={current.sprites}
      battleSprites={current.battleSprites}
      items={Object.fromEntries(current.items.map((i) => [i.id, i]))}
      skills={Object.fromEntries(current.skills.map((sk) => [sk.id, sk]))}
      locale={current.locale}
      assetBase={{} as never}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={{} as EditorAssetReader}
      levelUp={{}}
      startSkills={{}}
    />
  )
}

function button(text: string): HTMLButtonElement {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

function selectByLabel(label: string): HTMLSelectElement {
  const field = [...document.querySelectorAll<HTMLElement>('.field')].find((node) =>
    node.textContent?.includes(label),
  )!
  return field.querySelector('select')!
}

describe('ActorMode 战斗关系节 (E18-1)', () => {
  test('三字段区域渲染:援护者/合体技下拉 + 伤亡脚本 chip 派生自 state', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    expect(host.textContent).toContain('战斗关系')
    expect(host.textContent).toContain('援护者')
    expect(host.textContent).toContain('合体技')
    expect(host.textContent).toContain('队友阵亡：已配置')
    expect(host.textContent).toContain('自己濒死：未配置')
  })

  test('援护者下拉选择 → 即时写回 session state', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    const select = selectByLabel('援护者')
    await act(async () => {
      select.value = 'guard'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(session.getState().actors[0]!.battler!.coveredBy).toBe('guard')
  })

  test('✎ 编辑伤亡脚本 → 中区展开 CasualtyEditor;编辑曲线 → 互斥切走(G1)', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('✎ 编辑伤亡脚本').click())
    expect(host.textContent).toContain('伤亡脚本 · hero')
    expect(host.textContent).toContain('概率门')
    await act(async () => button('▸ 升级').click())
    await act(async () => button('📈 编辑曲线(中区拖点)').click())
    // 中区互斥:曲线编辑器展开后,伤亡脚本编辑器不再渲染。
    expect(host.textContent).not.toContain('概率门')
    expect(host.textContent).toContain('按增量生成')
  })

  test('移除队友阵亡槽 → chip 变未配置 + 键删除;两槽全移除 → casualty undefined(K4)', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('移除队友阵亡').click())
    expect(session.getState().actors[0]!.battler!.casualty?.friendDeath).toBeUndefined()
    expect(host.textContent).toContain('队友阵亡：未配置')
    expect(session.getState().actors[0]!.battler!.casualty).toBeUndefined()
  })
})
