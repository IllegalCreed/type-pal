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
      contentVersion: 17,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 'scene-a',
          startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
  return [...host.querySelectorAll<HTMLElement>('.arow')].find(
    (n) => (n.querySelector('input[type="number"]') as HTMLInputElement | null)?.value === value,
  )!
}

function gateSelect(value: string): HTMLButtonElement {
  return gateRow(value).querySelector<HTMLButtonElement>('button[data-gate-select="true"]')!
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
    expect(host.querySelector('[role="tablist"][aria-label="伤亡事件类型"]')).not.toBeNull()
    expect(host.querySelector('.casualty-branch-panel')).not.toBeNull()
    expect(host.querySelector('.casualty-branch-editor')).not.toBeNull()
  })

  test('选中概率门 → 右列显示该分支台词;台词预览解析 locale', async () => {
    const session = new EditSession(state(battlerActor({ friendDeath: script })))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} actor={session.getState().actors[0]!} />)
    })
    await act(async () => gateSelect('75').click())
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
    await act(async () => gateSelect('75').click())
    const remove = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (b) => b.textContent === '✕',
    )!
    await act(async () => remove.click())
    const after = session.getState().actors[0]!.battler!.casualty!.friendDeath!
    expect(after.gates).toEqual([])
    // 内容区应显示 fallback 分支的资源恢复效果。
    expect(host.textContent).toContain('恢复资源')
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
    await act(async () => button('移除当前事件').click())
    expect(session.getState().actors[0]!.battler!.casualty!.friendDeath).toBeUndefined()
    expect(session.getState().actors[0]!.battler!.casualty!.dying).toBeDefined()
    await act(async () => button('自己濒死时').click())
    await act(async () => button('移除当前事件').click())
    expect(session.getState().actors[0]!.battler!.casualty).toBeUndefined()
  })

  test('未配置槽 → ＋配置 创建默认空脚本(G3)', async () => {
    const session = new EditSession(state(battlerActor()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} actor={session.getState().actors[0]!} />)
    })
    expect(host.textContent).toContain('尚未配置')
    await act(async () => button('＋ 配置').click())
    const created = session.getState().actors[0]!.battler!.casualty!.friendDeath!
    expect(created.gates).toEqual([])
    expect(created.fallback).toEqual({ lines: [], effects: [] })
  })

  test('概率门可键盘选择，概率/增益输入只写入整数', async () => {
    const withBuff: CasualtyScript = {
      ...script,
      fallback: {
        lines: [],
        effects: [{ kind: 'tempStatBuff', stat: 'attack', percent: 10 }],
      },
    }
    const session = new EditSession(state(battlerActor({ friendDeath: withBuff })))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} actor={session.getState().actors[0]!} />)
    })
    const row = gateRow('75')
    const select = gateSelect('75')
    expect(select.tagName).toBe('BUTTON')
    expect(select.tabIndex).toBe(0)
    await act(async () => select.click())
    expect(select.getAttribute('aria-pressed')).toBe('true')
    expect(host.querySelector<HTMLButtonElement>('button.arow')?.textContent).toContain('兜底分支')

    const setNumber = async (input: HTMLInputElement, value: string): Promise<void> => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      await act(async () => {
        setter.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    }
    const chance = row.querySelector<HTMLInputElement>('input[type="number"]')!
    expect(chance.step).toBe('1')
    await setNumber(chance, '12.7')
    expect(session.getState().actors[0]!.battler!.casualty!.friendDeath!.gates[0]!.chance).toBe(12)

    await act(async () => host.querySelector<HTMLButtonElement>('button.arow')!.click())
    const percent = [
      ...host.querySelectorAll<HTMLInputElement>('input[type="number"][min="1"]'),
    ].at(-1)!
    expect(percent.step).toBe('1')
    await setNumber(percent, '7.9')
    const effect = session.getState().actors[0]!.battler!.casualty!.friendDeath!.fallback.effects[0]
    expect(effect).toMatchObject({ kind: 'tempStatBuff', percent: 7 })
  })
})
