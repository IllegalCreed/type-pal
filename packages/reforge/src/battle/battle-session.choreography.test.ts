import { type BattleChoreography, checkBattleChoreography, validateActors } from '@type-pal/content'
import { expect, test } from 'vitest'
import { wfActorDef, wfEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { recordingSfx } from '../__tests__/battle-workflows/controlled-io.js'
import {
  makeWfSession,
  makeWfSessionFromWorld,
} from '../__tests__/battle-workflows/session-driver.js'

function battleOpening(body: BattleChoreography['body']): BattleChoreography[] {
  const choreography: BattleChoreography[] = [{ at: 'battleStart', body }]
  checkBattleChoreography(choreography, 'encounter.choreography')
  return choreography
}

test.each([
  undefined,
  300,
])('forwards a score stop on the current tick with fade %s', async (fadeMs) => {
  const stops: (number | undefined)[] = []
  const h = makeWfSession({
    players: [wfPlayer('li')],
    enemies: [wfEnemy('boss')],
    extraOpts: {
      encounterChoreo: battleOpening([
        fadeMs === undefined ? { kind: 'stopMusic' } : { kind: 'stopMusic', fadeMs },
      ]),
      stopMusic: (duration) => stops.push(duration),
    },
  })
  try {
    expect(stops).toEqual([])
    h.idle()
    expect(stops).toEqual([fadeMs])
  } finally {
    const closed = h.session.done.catch(() => undefined)
    h.session.cancel()
    await closed
  }
})

test('canceling a battle while its foreground hold is active never reaches the pending score stop', async () => {
  const makeHeldBattle = () => {
    const stops: (number | undefined)[] = []
    const sfx = recordingSfx()
    const h = makeWfSession({
      players: [wfPlayer('li')],
      enemies: [wfEnemy('boss')],
      extraOpts: {
        encounterChoreo: battleOpening([
          { kind: 'wait', ms: 400 },
          { kind: 'stopMusic', fadeMs: 300 },
          { kind: 'playSound', asset: 'sound.pal.077' },
        ]),
        stopMusic: (duration) => stops.push(duration),
      },
    })
    h.assets.sfx = sfx.player
    return { h, stops, plays: sfx.plays }
  }
  const continuing = makeHeldBattle()
  const canceled = makeHeldBattle()

  try {
    for (const { h } of [continuing, canceled]) {
      h.idle()
      h.idle(399)
    }
    expect([continuing.stops, canceled.stops]).toEqual([[], []])
    expect([continuing.plays, canceled.plays]).toEqual([[], []])
    const lastLog = [...canceled.h.session.debugLog()]
    const cancelledDone = expect(canceled.h.session.done).rejects.toMatchObject({
      name: 'AbortError',
    })
    canceled.h.session.cancel()
    await cancelledDone

    for (const { h } of [continuing, canceled]) {
      h.idle(1)
      h.idle()
    }
    expect([continuing.stops, canceled.stops]).toEqual([[300], []])
    expect([continuing.plays, canceled.plays]).toEqual([['sound.pal.077'], []])
    expect(canceled.h.session.debugLog()).toEqual(lastLog)
  } finally {
    const closed = Promise.allSettled([continuing.h.session.done, canceled.h.session.done])
    continuing.h.session.cancel()
    canceled.h.session.cancel()
    await closed
  }
})

test('rejects scripted growth for a known actor outside the battle party', async () => {
  const actorsById = { li: wfActorDef('li'), 'zhao-linger': wfActorDef('zhao-linger') }
  validateActors(Object.values(actorsById))
  const { harness: h } = makeWfSessionFromWorld({
    actorIds: ['li'],
    enemies: [wfEnemy('boss')],
    extraOpts: {
      actorsById,
      worldPartyIdentities: [{ id: 'li', template: 'li' }],
      encounterChoreo: battleOpening([
        {
          kind: 'applyActorGrowth',
          actor: 'zhao-linger',
          delta: {
            level: 1,
            maxHP: 10,
            maxMP: 5,
            attack: 2,
            magicAttack: 2,
            defense: 2,
            speed: 1,
            luck: 1,
          },
        },
      ]),
    },
  })
  try {
    const before = h.session.debugPlayers()
    expect(() => h.idle()).toThrow(
      'battle choreography actor "zhao-linger" 在战斗队伍中期望恰好 1 个实例，实际 0',
    )
    expect(h.session.debugPlayers()).toEqual(before)
  } finally {
    const closed = h.session.done.catch(() => undefined)
    h.session.cancel()
    await closed
  }
})

test('rejects a second terminal request in one encounter script', async () => {
  const h = makeWfSession({
    players: [wfPlayer('li')],
    enemies: [wfEnemy('boss')],
    extraOpts: {
      // The content validator checks the shape of each encounter command.
      encounterChoreo: battleOpening([
        { kind: 'endBattle', result: 'terminate' },
        { kind: 'endBattle', result: 'won' },
      ]),
    },
  })
  try {
    h.idle()
    expect(h.session.debugLog()).toEqual(['战斗结束(terminate)'])
    expect(() => h.idle()).toThrow('battle choreography 同一执行路径重复登记 terminal request')
    expect(h.session.debugLog()).toEqual(['战斗结束(terminate)'])
  } finally {
    const closed = h.session.done.catch(() => undefined)
    h.session.cancel()
    await closed
  }
})
