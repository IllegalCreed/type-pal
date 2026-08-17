// @vitest-environment jsdom
import type { EnemyDef } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import { EnemyTeamTab } from './EnemyTeamTab.js'

function enemy(id: string, exp: number): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: 'battle.enemy',
    yPosOffset: 0,
    stats: {
      health: 1,
      level: 1,
      exp,
      cash: exp * 2,
      attackStrength: 1,
      magicStrength: 1,
      defense: 1,
      dexterity: 1,
      fleeRate: 1,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: exp * 3,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
}

function state(): EditorState {
  return {
    manifest: { id: 'demo', contentVersion: 15 },
    scenes: [
      {
        id: 's001',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e1',
            sprite: 'npc',
            pos: { col: 0, row: 0, height: 0 },
            hostile: { enemyTeamId: 'team-c1' },
          },
        ],
      },
    ],
    actors: [],
    skills: [],
    items: [],
    enemies: [enemy('enemy-a', 5)],
    enemyTeams: [{ id: 'team-c1', slots: ['enemy-a', null, 'enemy-a'] }],
    locale: { 'name.enemy-a': '赤鬼' },
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    stamps: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
  } as unknown as EditorState
}

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <EnemyTeamTab
      enemyTeams={current.enemyTeams ?? []}
      enemies={current.enemies ?? []}
      locale={current.locale}
      projectId="demo"
      session={props.session}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

describe('EnemyTeamTab authoring closure', () => {
  test('renders five semantic slots, duplicate-member totals, full stable trial id and blocking reference', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    expect(host.querySelectorAll('.enemy-team-slot')).toHaveLength(5)
    expect(host.textContent).toContain('10 经验')
    expect(host.textContent).toContain('20 金钱')
    expect(host.textContent).toContain('30 收妖值')
    expect(host.textContent).toContain('场景 s001 / 实体 e1 的敌队')
    expect(host.querySelector<HTMLAnchorElement>('a[href*="battle="]')?.getAttribute('href')).toBe(
      'play.html?project=demo&battle=team-c1',
    )
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
        button.textContent?.includes('删除敌队'),
      )?.disabled,
    ).toBe(true)
  })

  test('copies the current preset and creates an arbitrary stable id through the workbench', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="复制当前敌队"]')!.click(),
    )
    expect(session.getState().enemyTeams?.find((team) => team.id === 'team-c2')?.slots).toEqual([
      'enemy-a',
      null,
      'enemy-a',
    ])
    expect(host.querySelector('h1')?.textContent).toBe('team-c2')
    await act(async () => expect(session.undo()).toBe(true))

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="新建敌队"]')!.click(),
    )
    const idInput = host.querySelector<HTMLInputElement>('.enemy-team-create-card input')!
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    await act(async () => {
      valueSetter.call(idInput, 'boss.final')
      idInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const create = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === '创建敌队',
    )!
    await act(async () => create.click())
    expect(session.getState().enemyTeams?.at(-1)).toEqual({ id: 'boss.final', slots: [] })
    expect(host.querySelector('h1')?.textContent).toBe('boss.final')
  })
})
