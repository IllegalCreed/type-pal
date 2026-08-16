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
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
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
      levelUp={current.levelUp}
      startSkills={{}}
    />
  )
}

function button(text: string): HTMLButtonElement {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

function comboboxByLabel(label: string): HTMLButtonElement {
  const fieldLabel = [...document.querySelectorAll<HTMLLabelElement>('label')].find(
    (node) => node.textContent?.trim() === label,
  )
  expect(fieldLabel?.htmlFor, `label ${label}`).toBeTruthy()
  const control = document.getElementById(fieldLabel!.htmlFor)
  expect(control?.getAttribute('role'), `combobox for ${label}`).toBe('combobox')
  return control as HTMLButtonElement
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('ActorMode 战斗关系节 (E18-1)', () => {
  test('默认主工作区是角色总览；行走帧只在外观资源分区出现', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('总览')
    expect(host.querySelector('.actor-dashboard-grid')).not.toBeNull()
    expect(host.querySelector('.actor-frame-card')).toBeNull()
    const panels = [...host.querySelectorAll('.actor-card')]
    expect(panels.length).toBeGreaterThan(0)
    expect(panels.every((panel) => panel.classList.contains('ds-workbench-section'))).toBe(true)
    expect(host.querySelector('.actor-card-head')).toBeNull()

    await act(async () => button('外观资源').click())
    expect(host.querySelector('.actor-frame-card')).not.toBeNull()
    expect(host.textContent).toContain('行走图与动作帧')
  })

  test('三字段区域渲染:援护者/合体技下拉 + 伤亡脚本 chip 派生自 state', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('关系与脚本').click())
    expect(host.textContent).toContain('援护者')
    expect(host.textContent).toContain('合体技')
    expect(host.textContent).toContain('队友阵亡已配置')
    expect(host.textContent).toContain('自己濒死未配置')
  })

  test('援护者下拉选择 → 即时写回 session state', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('关系与脚本').click())
    const combobox = comboboxByLabel('援护者')
    await act(async () => combobox.click())
    const listbox = document.getElementById(combobox.getAttribute('aria-controls')!)
    expect(listbox?.getAttribute('role')).toBe('listbox')
    const guardOption = [...listbox!.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.trim() === '守护者 (guard)',
    )
    expect(guardOption).toBeDefined()
    await act(async () => guardOption!.click())
    expect(session.getState().actors[0]!.battler!.coveredBy).toBe('guard')
  })

  test('✎ 编辑伤亡脚本 → 中区展开 CasualtyEditor;编辑曲线 → 互斥切走(G1)', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('关系与脚本').click())
    await act(async () => button('编辑伤亡脚本').click())
    expect(host.textContent).toContain('伤亡脚本 · hero')
    expect(host.textContent).toContain('概率分支')
    await act(async () => button('战斗与成长').click())
    expect(button('📈 编辑曲线(中区拖点)')).toBeTruthy()
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
    await act(async () => button('关系与脚本').click())
    await act(async () => button('移除队友阵亡').click())
    expect(session.getState().actors[0]!.battler!.casualty?.friendDeath).toBeUndefined()
    expect(host.textContent).toContain('队友阵亡未配置')
    expect(session.getState().actors[0]!.battler!.casualty).toBeUndefined()
  })
})

describe('ActorMode 人物预制 CRUD', () => {
  test('空人物库可创建第一名 NPC，并以单次 undo 移除 Actor + locale', async () => {
    const current = state([])
    current.sprites = [
      {
        id: 'npc-sprite',
        label: 'NPC 精灵',
        asset: 'sprite.npc',
        layout: { kind: 'static' },
      },
    ]
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="新建人物"]')!.click())
    const id = host.querySelector<HTMLInputElement>('[aria-label="新人物 ID"]')!
    const name = host.querySelector<HTMLInputElement>('[aria-label="新人物显示名称"]')!
    await act(async () => {
      setInputValue(id, 'wine-sage')
      setInputValue(name, '酒剑仙')
    })
    await act(async () => button('创建').click())
    expect(session.getState().actors).toEqual([
      { id: 'wine-sage', name: 'name.wine-sage', spriteId: 'npc-sprite' },
    ])
    expect(session.getState().locale['name.wine-sage']).toBe('酒剑仙')
    await act(async () => session.undo())
    expect(session.getState().actors).toEqual([])
    expect(session.getState().locale['name.wine-sage']).toBeUndefined()
  })

  test('复制人物会复制 levelUp，删除无引用副本会联动清理', async () => {
    const current = state([{ id: 'hero', name: 'name.hero', spriteId: 'hero-sprite' }])
    current.sprites = [
      {
        id: 'hero-sprite',
        label: '主角精灵',
        asset: 'sprite.hero',
        layout: { kind: 'static' },
      },
    ]
    current.levelUp = { hero: [{ level: 8, skillId: '99' }] }
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="复制当前人物"]')!.click(),
    )
    await act(async () => button('复制').click())
    expect(session.getState().actors.some((entry) => entry.id === 'hero-copy')).toBe(true)
    expect(session.getState().levelUp['hero-copy']).toEqual([{ level: 8, skillId: '99' }])
    expect(button('删除人物').closest('.ds-object-hero__actions')).not.toBeNull()
    expect(button('删除人物').closest('.actor-reference-section')).toBeNull()
    await act(async () => button('删除人物').click())
    expect(session.getState().actors.some((entry) => entry.id === 'hero-copy')).toBe(false)
    expect(session.getState().levelUp['hero-copy']).toBeUndefined()
  })

  test('被场景预制实例引用时显示可定位引用并拒绝删除', async () => {
    const current = state(actors())
    current.scenes = [
      {
        id: 'scene-a',
        mapId: 'map-a',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'hero-instance', pos: { col: 1, row: 1, height: 0 }, actor: 'hero' }],
      },
    ]
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    expect(host.textContent).toContain('当前有 1 处外部引用')
    expect(host.textContent).toContain('scenes[0](scene-a).entities[0](hero-instance).actor')
    expect(button('删除人物').disabled).toBe(true)
    expect(button('删除人物').title).toBe('仍有 1 处引用，请先从右侧处理')
    await act(async () => button('删除人物').click())
    expect(session.getState().actors.some((entry) => entry.id === 'hero')).toBe(true)
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })
})
