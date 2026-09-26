// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
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
