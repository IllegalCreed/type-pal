// @vitest-environment jsdom
import type { SkillData } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  realFrame,
  wfEnemy,
  wfIdleEnemy,
  wfPlayer,
  wfSkill,
} from '../__tests__/battle-workflows/catalog.js'
import { fixedDraws, recordingSfx } from '../__tests__/battle-workflows/controlled-io.js'
import { battleCanvas, bitmap, infoBoxAssets } from '../__tests__/battle-workflows/render-io.js'
import { makeWfSession } from '../__tests__/battle-workflows/session-driver.js'

test('a confused enemy strikes the live slot beyond a gap and presents the full overkill damage', () => {
  const confusion: SkillData = {
    ...wfSkill('confusion', 5),
    effects: [{ kind: 'applyStatus', status: 'confused', turns: 4 }],
    animation: { effectSprite: 65535 },
  }
  const sfx = recordingSfx()
  const ui = infoBoxAssets()
  ui.numsBlue = Array.from({ length: 10 }, (_, digit) =>
    bitmap(6, 8, `rgb(0,0,${(digit + 1) * 16})`),
  )
  const h = makeWfSession({
    players: [wfPlayer('hero', { baseDexterity: 999, skills: [confusion.id] })],
    enemies: [
      wfEnemy(
        'source',
        { health: 500, attackStrength: 100, dexterity: 500 },
        {
          ai: { resistanceToSorcery: 0 },
        },
      ),
      null,
      wfIdleEnemy('mate', { health: 30, defense: 10, dexterity: 0, physicalResistance: 2 }),
    ],
    // Three initiative draws, spell status/growth, then the full-slot enemy target draw.
    rng: fixedDraws([0, 0, 0, 0, 0, 0.9]),
    extraOpts: { skills: { [confusion.id]: confusion } },
    assetOverrides: {
      sfx: sfx.player,
      ui,
      palette: {
        colors: Array.from({ length: 256 }, (_, index): [number, number, number] =>
          index === 2 ? [0, 255, 0] : [0, 0, 0],
        ),
        cycles: [],
      },
      effectSprite: {
        frames: Array.from({ length: 12 }, (_, index) => ({
          ...realFrame(),
          pixels: Uint8Array.of(2),
          opaque: Uint8Array.of(index >= 9 ? 1 : 0),
        })),
        anchorX: 0,
        anchorY: 1,
      },
    },
  })
  const ctx = battleCanvas()
  const green = () => ctx.getImageData(154, 109, 1, 1).data[1]
  const digits = () => [140, 146, 152].map((x) => ctx.getImageData(x, 10, 1, 1).data[2])
  for (const key of ['ArrowLeft', 'Enter', 'Enter', 'Enter']) h.press([key])
  for (let frame = 0; frame < 100 && green() !== 255; frame++) {
    h.idle(16)
    h.session.render(ctx, 1)
  }
  expect(green()).toBe(255)
  h.idle(120)
  h.session.render(ctx, 1)
  expect(digits()).toEqual([48, 48, 64])
  expect(h.readParty()[0]?.hp).toBe(100)
  expect(sfx.plays).toEqual([])
})
