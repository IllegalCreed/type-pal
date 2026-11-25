// @vitest-environment jsdom
import type { SkillData } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import {
  wfEnemy,
  wfHealItem,
  wfIdleEnemy,
  wfPlayer,
  wfSkill,
} from '../__tests__/battle-workflows/catalog.js'
import { stubGlyphs } from '../__tests__/battle-workflows/controlled-io.js'
import { palSkill } from '../__tests__/battle-workflows/pal-skill-driver.js'
import { battleCanvas, poseRed, poseSprite } from '../__tests__/battle-workflows/render-io.js'
import { makeWfSession } from '../__tests__/battle-workflows/session-driver.js'
import { expectDefined } from '../defined.js'
import { DialogBox } from '../dialog/dialog-box.js'

test('successful Ghost Descent leaves the enemy still until the last FIRE frame ends', () => {
  const hex = palSkill('305')
  const target = wfEnemy(
    'lantern',
    { health: 500 },
    {
      ai: { resistanceToSorcery: 0, rules: [{ at: 'act', do: { kind: 'pass' } }] },
    },
  )
  const h = makeWfSession({
    players: [wfPlayer('zhao-linger', { skills: [hex.id], mp: 50, maxMp: 50, baseDexterity: 500 })],
    enemies: [target],
    extraOpts: { skills: { [hex.id]: hex } },
  })
  const enemyArt = poseSprite(expectDefined(h.assets.battleSprites.get(target.battleSprite)))
  h.assets.battleSprites = new Map(h.assets.battleSprites).set(target.battleSprite, enemyArt)
  h.assets.palette = {
    colors: Array.from({ length: 256 }, (_, index): [number, number, number] =>
      index === 255 ? [0, 255, 0] : [poseRed(index - 1), 0, 0],
    ),
    cycles: [],
  }
  h.assets.fireSprites = {
    [hex.animation.effectSprite]: {
      frames: [{ width: 1, height: 1, pixels: Uint8Array.of(255), opaque: Uint8Array.of(1) }],
      anchorX: 0,
      anchorY: 1,
    },
  }
  const ctx = battleCanvas()
  const paintNext = () => {
    h.idle(1)
    h.session.render(ctx, 1)
    const pixels = ctx.getImageData(65, 90, 72, 36).data
    return pixels.some((value, index) => index % 4 === 1 && value === 255)
  }
  const enemyAt = (x: number) => ctx.getImageData(x, 102, 1, 1).data[0]
  const random = vi.spyOn(Math, 'random').mockReturnValue(0.99)
  try {
    h.press(['ArrowLeft'])
    h.press(['Enter'])
    h.press(['Enter'])
    h.press(['Enter'])
    let fireVisible = false
    for (let i = 0; i < 1_000 && !fireVisible; i++) fireVisible = paintNext()
    expect(fireVisible).toBe(true)
    expect(enemyAt(100)).toBeGreaterThan(0)
    expect(enemyAt(101)).toBe(0)

    for (let i = 0; i < 200 && fireVisible; i++) fireVisible = paintNext()
    expect(fireVisible).toBe(false)
    expect(enemyAt(100)).toBe(0)
    expect(enemyAt(101)).toBeGreaterThan(0)
    expect(h.readParty()[0]?.mp).toBe(25)
  } finally {
    random.mockRestore()
  }
})

test('a terminal poison tick opens its authored narration before handing off victory', async () => {
  const seed: SkillData = {
    ...wfSkill('venom', 5),
    effects: [{ kind: 'applyPoison', poisonId: '555' }],
  }
  const reward = wfHealItem('venom-reward')
  const ctx = battleCanvas()
  const box = new DialogBox(ctx, stubGlyphs, [])
  const text = '蛊毒化作药引。'
  const h = makeWfSession({
    players: [wfPlayer('hero', { skills: [seed.id], baseDexterity: 500 })],
    enemies: [wfIdleEnemy('target', { health: 10 })],
    rng: () => 0.9,
    extraOpts: {
      skills: { [seed.id]: seed },
      items: { [reward.id]: reward },
      locale: { 'poison.reward': text },
      poisonDefs: {
        555: {
          id: 555,
          name: 'Venom',
          color: 16,
          curability: 'severe',
          enemyTicks: [
            {},
            { hpDelta: -10, grantItem: reward.id, grantNarration: 'poison.reward', selfCure: true },
          ],
        },
      },
    },
    assetOverrides: { dialogBox: box },
  })
  // The target must be susceptible to the spell. Using a .9 draw also makes the
  // desired effect independent of a roll of 0 on the enemy's resistance of 5.
  let resolved = false
  const finish = h.session.done.then((result) => {
    resolved = true
    return result
  })
  h.press(['ArrowLeft'])
  h.press(['Enter'])
  h.press(['Enter'])
  h.press(['Enter'])
  for (let i = 0; i < 100 && !box.active; i++) h.idle(40)
  expect(box.observe()).toMatchObject({ slot: 'narration', pageText: text })
  const received: { itemId: string; count: number }[] = []
  h.session.writeBackInventory(received)
  expect(received).toEqual([{ itemId: reward.id, count: 1 }])
  expect(h.session.debugLog()).toContain('胜利')
  h.idle(800)
  await Promise.resolve()
  expect(resolved).toBe(false)

  h.press(['Enter'])
  expect(box.active).toBe(false)
  for (let i = 0; i < 20; i++) {
    h.idle(350)
    h.press(['Enter'])
  }
  await expect(finish).resolves.toBe('victory')
})
