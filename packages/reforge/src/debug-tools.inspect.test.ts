// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  button,
  cleanupDebug,
  command,
  debugHarness,
  element,
} from './__tests__/debug-tools-fixtures.js'

afterEach(cleanupDebug)
describe('Debug inspection projections', () => {
  test('state refresh projects statuses, poison and script counts from one actual world without mutation', async () => {
    const h = await debugHarness()
    h.world.party[0]!.extraStatuses = [{ status: 'protect', turns: 7 }]
    h.world.party[0]!.poisons = [{ poisonId: 3, tickIndex: 1 }]
    h.world.script!.flags.a = true
    h.world.script!.vars.visits = 2
    h.world.script!.entityState = { a: { zone: 3 } }
    h.world.collectValue = 9
    const before = structuredClone(h.world)
    command('state')
    const shown = JSON.parse(element('.tpd-inspector').textContent!)
    expect(shown).toEqual({
      money: 50,
      party: before.party.map((c) => ({
        id: c.id,
        level: c.level,
        hp: `${c.hp}/${c.maxHP}`,
        mp: `${c.mp}/${c.maxMP}`,
        equipment: c.equipment,
        ...(c.extraStatuses ? { statuses: ['protect:7'] } : {}),
        ...(c.poisons ? { poisons: [3] } : {}),
      })),
      inventory: [],
      learnedSkills: before.learnedSkills,
      collectValue: 9,
      flags: 1,
      vars: { visits: 2 },
      entityStates: 1,
    })
    expect(h.world).toEqual(before)
  })
  test('registered script movement renders exact ownerless metadata, fractional coordinates and all-closed gates', async () => {
    const h = await debugHarness()
    h.state.motion.entities = [
      {
        id: 'zone',
        pos: { col: 1.23456, row: -2.34567, height: 0 },
        facing: 'up',
        authority: { kind: 'world' },
        authorityEpoch: 3,
        gait: 0,
        scriptMotion: {
          source: 'script',
          kind: 'step',
          commandEpoch: 6,
          sceneSessionId: 'a:1',
          pausedByAuthority: false,
        },
        gates: {
          visible: false,
          collidable: false,
          manualInteractable: false,
          touchTriggerable: false,
          autoAllowed: false,
          hostileAllowed: false,
        },
      },
    ]
    const before = structuredClone(h.state.motion)
    button('刷新状态').click()
    const row = element('[data-motion-id="zone"]')
    expect(row.textContent).toContain('位置 1.235,-2.346,0')
    expect(row.textContent).toContain('已注册 script step#6')
    expect(row.textContent).toContain('gait 0 · gate 全部关闭')
    expect(row.textContent).not.toContain('owner')
    expect(h.state.motion).toEqual(before)
  })
  test('follower display omits redundant template and exposes ready extra sprite', async () => {
    const h = await debugHarness()
    h.state.motion.followers = [
      {
        partyIndex: 1,
        id: 'friend',
        template: 'friend',
        pos: { col: 1, row: 1, height: 0 },
        facing: 'down',
        authority: { kind: 'follow' },
      },
    ]
    h.state.motion.extraFollowers = [
      {
        runtimeSlot: 0,
        spriteId: 'walker',
        pos: { col: 0, row: 1, height: 0 },
        facing: 'right',
        authority: { kind: 'follow' },
        renderable: true,
      },
    ]
    button('刷新状态').click()
    expect(element('[data-motion-id="friend"]').textContent).not.toContain('角色')
    expect(element('[data-motion-id="walker"]').textContent).toContain('资源已就绪')
  })
})

const OPEN_GATES = {
  visible: true,
  collidable: true,
  manualInteractable: false,
  touchTriggerable: true,
  autoAllowed: true,
  hostileAllowed: false,
}

test('状态页按四类对象显示唯一快照，区分控制权、partyMove、epoch 与已注册 motion', async () => {
  const h = await debugHarness()
  h.state.motion = {
    ...h.state.motion,
    worldTick: 41,
    player: {
      id: 'party-leader',
      template: 'hero',
      pos: { col: 1, row: 2, height: 0 },
      facing: 'left',
      walking: true,
      authority: { kind: 'script' },
      authorityEpoch: 7,
      partyMove: { to: { col: 9, row: 8, height: 0 }, speed: 'fast' },
    },
    followers: [
      {
        partyIndex: 1,
        id: 'party-follower',
        template: 'friend',
        pos: { col: 0, row: 2, height: 0 },
        facing: 'left',
        authority: { kind: 'follow' },
      },
      {
        partyIndex: 2,
        id: 'mounted-follower',
        template: 'friend-2',
        pos: { col: 4, row: 5, height: 0 },
        facing: 'up',
        authority: { kind: 'mount', parent: 'raft', dx: 0, dy: -1 },
      },
    ],
    extraFollowers: [
      {
        runtimeSlot: 0,
        spriteId: 'missing-extra-sprite',
        pos: { col: 0, row: 1, height: 0 },
        facing: 'down',
        authority: { kind: 'follow' },
        renderable: false,
      },
    ],
    entities: [
      {
        id: 'e-scripted',
        pos: { col: 6.25, row: 7.5, height: 1 },
        facing: 'right',
        authority: { kind: 'script' },
        authorityEpoch: 4,
        autoMotion: {
          source: 'auto',
          kind: 'move',
          commandEpoch: 12,
          sceneSessionId: 's001:1',
          activationOwnerId: 'e-owner',
          activationEpoch: 3,
          authorityEpochAtEnqueue: 2,
          pausedByAuthority: true,
        },
        gait: 2,
        gates: OPEN_GATES,
      },
      {
        id: 'raft',
        pos: { col: 4, row: 6, height: 0 },
        facing: 'up',
        authority: { kind: 'world' },
        authorityEpoch: 0,
        gait: null,
        gates: { ...OPEN_GATES, autoAllowed: false, touchTriggerable: false },
      },
    ],
  }
  const readMotion = vi.spyOn(h.ctx, 'motionState')
  button('刷新状态').click()
  const rows = [...document.querySelectorAll<HTMLElement>('.tpd-motion-row')]
  expect(rows.map((row) => row.dataset.motionKind)).toEqual([
    'leader',
    'party-follower',
    'party-follower',
    'extra-follower',
    'entity',
    'entity',
  ])
  expect(rows.map((row) => row.dataset.motionId)).toEqual([
    'party-leader',
    'party-follower',
    'mounted-follower',
    'missing-extra-sprite',
    'e-scripted',
    'raft',
  ])
  expect(rows[0]!.textContent).toContain('partyMove → 9,8,0 fast')
  expect(rows[2]!.textContent).toContain('载具 raft (0,-1)')
  expect(rows[3]!.textContent).toContain('资源未就绪')
  expect(rows[4]!.textContent).toContain('authority@4')
  expect(rows[4]!.textContent).toContain('auto move#12 owner e-owner@3 authority@2（被控制权暂停）')
  expect(readMotion).toHaveBeenCalledOnce()

  h.state.motion = { ...h.state.motion, worldTick: 42 }
  ;[...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent === '刷新状态')!
    .click()
  expect(readMotion).toHaveBeenCalledTimes(2)
  expect(document.querySelector('.tpd-motion-row')?.textContent).toContain('tick 42')
  expect(h.state.motion.worldTick).toBe(42)
})
