// @vitest-environment jsdom
/**
 * TEST-GLM-WAVE-M-1 M03（CasualtyEditor.glm-m）：伤亡分支效果链当前合同。
 * 去重：CasualtyEditor.test.tsx（10 例）已证槽位渲染/选中/删除回退/台词增删/移除槽键/
 * 概率 blur/occurrence 选择/重排；glm-leaf-wave 已证槽位隔离与概率 undo。
 * 本文件只补未被任何旧断言触达的效果轴：添加效果默认 heal、恢复对象 hp→mp、
 * 改类 tempStatBuff 默认 attack+10、提升比例 blur 提交，全部 UpdateActorCommand 单命令
 * 可撤销；并补台词样式切换（style 三档）与预览回退文案。
 */
import type { ActorDef, CasualtyScript } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  blurField,
  buttonByText,
  fillAndBlur,
  pickCombobox,
  stubNodeTestHost,
  typeDraft,
} from '../__tests__/glm-m/kit.js'
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

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const actor = current.actors[0]!
  return (
    <CasualtyEditor
      actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
      session={props.session}
      locale={current.locale}
      onClose={() => undefined}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const friendDeath: CasualtyScript = {
  gates: [],
  fallback: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] },
}

function actorCasualty(session: EditSession): CasualtyScript | undefined {
  return session.getState().actors[0]!.battler?.casualty?.friendDeath
}

describe('M03 CasualtyEditor 效果链当前合同', () => {
  test('添加效果默认 heal hp；恢复对象切真气；改类 tempStatBuff 默认 attack+10；undo 逐步还原', async () => {
    const session = new EditSession(state(battlerActor({ friendDeath })))
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()

    await act(async () => buttonByText(host, '＋ 效果').click())
    expect(actorCasualty(session)!.fallback.effects).toEqual([{ kind: 'heal', resource: 'hp' }])
    expect(session.getHistoryVersion()).toBe(before + 1)

    await pickCombobox(
      host.querySelector<HTMLButtonElement>('[aria-label="第 1 个效果恢复资源"]')!,
      '真气',
    )
    expect(actorCasualty(session)!.fallback.effects).toEqual([{ kind: 'heal', resource: 'mp' }])

    await pickCombobox(
      host.querySelector<HTMLButtonElement>('[aria-label="第 1 个效果类型"]')!,
      '临时属性增益',
    )
    expect(actorCasualty(session)!.fallback.effects).toEqual([
      { kind: 'tempStatBuff', stat: 'attack', percent: 10 },
    ])
    expect(session.getHistoryVersion()).toBe(before + 3)

    expect(session.undo()).toBe(true)
    expect(actorCasualty(session)!.fallback.effects).toEqual([{ kind: 'heal', resource: 'mp' }])
    expect(session.undo()).toBe(true)
    expect(actorCasualty(session)!.fallback.effects).toEqual([{ kind: 'heal', resource: 'hp' }])
    expect(session.undo()).toBe(true)
    expect(actorCasualty(session)!.fallback.effects).toEqual([])
  })

  test('tempStatBuff 提升比例 blur 提交并下钳 1；台词样式切换为旁白', async () => {
    const session = new EditSession(
      state(
        battlerActor({
          friendDeath: {
            gates: [],
            fallback: {
              lines: [{ text: 'dlg.talk.0', style: 'bottom' }],
              effects: [{ kind: 'tempStatBuff', stat: 'attack', percent: 10 }],
            },
          },
        }),
      ),
    )
    await act(async () => {
      root.render(<Harness session={session} />)
      await Promise.resolve()
    })
    const before = session.getHistoryVersion()

    const percent = host.querySelector<HTMLInputElement>(
      'input[aria-label="提升比例"], .casualty-percent-input input',
    )
    expect(percent, '提升比例输入').not.toBeNull()
    await typeDraft(percent!, '25')
    await blurField(percent!)
    expect(actorCasualty(session)!.fallback.effects).toEqual([
      { kind: 'tempStatBuff', stat: 'attack', percent: 25 },
    ])
    expect(session.getHistoryVersion()).toBe(before + 1)

    // 下钳 1：0 → normalize 成 1，仍是一次业务提交。
    await fillAndBlur(percent!, '0')
    expect(actorCasualty(session)!.fallback.effects).toEqual([
      { kind: 'tempStatBuff', stat: 'attack', percent: 1 },
    ])

    await pickCombobox(
      host.querySelector<HTMLButtonElement>('[aria-label="第 1 条台词样式"]')!,
      '旁白',
    )
    expect(actorCasualty(session)!.fallback.lines).toEqual([
      { text: 'dlg.talk.0', style: 'narration' },
    ])
    // 预览解析 locale 文本。
    expect(host.textContent).toContain('你好')
  })
})
