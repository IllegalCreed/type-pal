// @vitest-environment jsdom
import { validateBattleSprites } from '@type-pal/content'
import { expect, test } from 'vitest'
import palBattleSprites from '../../../../projects/pal/content/battle-sprites.json' with {
  type: 'json',
}
import { PLAYER_PROFILE, wfIdleEnemy, wfPlayer } from '../__tests__/battle-workflows/catalog.js'
import { palSkill } from '../__tests__/battle-workflows/pal-skill-driver.js'
import { battleCanvas } from '../__tests__/battle-workflows/render-io.js'
import {
  makeWfSession,
  wfLoadedBattleSprite,
} from '../__tests__/battle-workflows/session-driver.js'
import { expectDefined } from '../defined.js'

test('Dream Snake retains its sprite through collapse and revival, and a fresh battle starts in the base form', () => {
  const spell = palSkill('295')
  const form = expectDefined(
    validateBattleSprites(palBattleSprites).find(({ id }) => id === 'player-fighter-5'),
  )
  const transformed = { ...wfLoadedBattleSprite(form.id, form.profile), definition: form }
  for (const [index, frame] of transformed.sprite.frames.entries()) frame.pixels[0] = 0x50 + index
  const makeBattle = () => {
    const h = makeWfSession({
      players: [
        wfPlayer('zhao-linger', {
          mp: 100,
          maxMp: 100,
          baseDexterity: 500,
          skills: [spell.id],
          poisons: [{ poisonId: 555, tickIndex: 0 }],
        }),
        wfPlayer('li-xiaoyao'),
      ],
      enemies: [wfIdleEnemy('target', { health: 999 })],
      extraOpts: {
        skills: { [spell.id]: spell },
        poisonDefs: {
          555: {
            id: 555,
            name: '毒',
            color: 0,
            curability: 'severe',
            playerTicks: [{ hpDelta: -100 }],
          },
        },
        encounterChoreo: [
          {
            at: 'turnStart',
            once: true,
            when: { kind: 'turn', op: '==', value: 2 },
            body: [
              { kind: 'wait', ms: 80 },
              { kind: 'revivePartyAll', tenths: 10 },
            ],
          },
        ],
      },
    })
    const baseId = expectDefined(h.assets.playerBaseDefinitionIds[0])
    const base = wfLoadedBattleSprite(baseId, PLAYER_PROFILE)
    for (const [index, frame] of base.sprite.frames.entries()) frame.pixels[0] = 0x20 + index
    h.assets.battleSprites = new Map(h.assets.battleSprites)
      .set(baseId, base)
      .set(form.id, transformed)
    h.assets.palette = {
      colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 0, 0]),
      cycles: [],
    }
    return h
  }

  const h = makeBattle()
  const ctx = battleCanvas()
  const pose = (session: typeof h.session) => {
    session.render(ctx, 1)
    return ctx.getImageData(200, 175, 1, 1).data[0]
  }
  expect(pose(h.session)).toBe(0x20)
  for (const key of ['ArrowLeft', 'Enter', 'Enter', 'd']) h.press([key])
  let sawDownedForm = false
  for (let frame = 0; frame < 320; frame++) {
    h.idle(16)
    const hp = h.readParty()[0]?.hp
    if (hp === 0 && pose(h.session) === 0x52) sawDownedForm = true
    if (sawDownedForm && hp === 100) break
  }
  // The poison and authored revival select actual downed and resting poses from the transformed art.
  expect(sawDownedForm).toBe(true)
  expect(h.readParty()[0]?.hp).toBe(100)
  expect(pose(h.session)).toBe(0x50)
  expect(pose(makeBattle().session)).toBe(0x20)
})
