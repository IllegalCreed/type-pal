import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { beePostWin, beeWorldInput } from './battle-world-bee-scenario.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { withRecordedKey } from './input-ledger.mjs'

const inRectangle = ([x, y]) => x >= 0 && y >= 0 && x <= 320 && y <= 320
const inCanvas = ([x, y]) => x >= 0 && y >= 0 && x < 320 && y < 200
const inside = [97, 34]
const outside = [97, 33]

function installObserver(makeRecorder) {
  const ticks = [],
    paints = [],
    contacts = [],
    menus = [],
    spells = [],
    errors = []
  let overflow = false
  let paintedAt
  const beeSprites = new WeakSet()
  const { append } = makeRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const paint = (row) => {
    const location = JSON.stringify(row.foot)
    if (location === paintedAt) return
    paintedAt = location
    append(paints, row, 64)
  }
  window.__q2BeePostWin = {
    tick: (row) => append(ticks, row, 900),
    paint,
    markSprite: (sprite) => beeSprites.add(sprite),
    blit: (sprite, x, y) => {
      if (beeSprites.has(sprite))
        paint({
          foot: [x + sprite.anchorX, y + sprite.anchorY - 7],
          size: [sprite.frame.width, sprite.frame.height],
        })
    },
    contact: (row) => append(contacts, row, 4),
    menu: (index, team) => {
      if (menus.at(-1)?.index !== index) append(menus, { index, team }, 8)
    },
    spell: (row) => {
      if (!spells.some(({ selected }) => selected === row.selected)) append(spells, row, 4)
    },
    state: () => ({
      tick: ticks.at(-1),
      contact: contacts.at(-1),
      menu: menus.at(-1),
      spell: spells.at(-1),
    }),
    read: () => ({
      ticks,
      paints,
      contacts,
      menus,
      spells,
      errors,
      overflow,
      timeOrigin: performance.timeOrigin,
    }),
  }
}

export async function installRespawnWitness(page) {
  await page.evaluate(`(${installObserver})(${createEvidenceRecorder})`)
}

export function inspectBeeRespawn(raw, savedTicks) {
  assert.equal(raw.overflow, false)
  assert.deepEqual(raw.errors, [])
  const { ticks, contacts, paints, menus, spells } = raw
  assert(Number.isSafeInteger(savedTicks) && savedTicks > 0 && savedTicks <= 800)
  assert.deepEqual(ticks[0]?.before, [true, savedTicks], 'read restores the exact saved timer')
  for (const [index, sample] of ticks.entries()) {
    if (index === 0) continue
    assert(sample.clock > ticks[index - 1].clock, 'one observation per eligible world tick')
    assert.deepEqual(sample.before, ticks[index - 1].after, 'missing lifecycle step')
  }
  const countdown = ticks.slice(0, savedTicks)
  assert.equal(countdown.length, savedTicks)
  for (const [index, { before, after, grid }] of countdown.entries()) {
    assert.deepEqual(
      before,
      [true, savedTicks - index],
      'countdown skipped an effective world tick',
    )
    assert.deepEqual(
      after,
      [true, savedTicks - index - 1],
      'countdown must decrement by exactly one',
    )
    assert.deepEqual(grid, beeWorldInput.stop, 'no input while waiting for the saved countdown')
  }
  const expired = countdown.at(-1)
  const revived = ticks.find(({ before, after }) => before[0] && !after[0])
  assert(revived, 'hidden enemy never reappeared')
  const held = ticks.filter(({ order }) => order > expired.order && order < revived.order)
  assert(
    held.filter(({ grid }) => grid[0] === 97 && grid[1] === 45).length >= 3,
    'in-view enemy must remain hidden after the timer reaches zero',
  )
  assert(
    held.every(({ after, foot }) => after[0] && after[1] === 0 && inRectangle(foot)),
    'enemy became visible inside the original respawn rectangle',
  )
  assert(
    held.some(({ grid, foot }) => grid[0] === inside[0] && grid[1] === inside[1] && foot[1] > 200),
    'route must show that the respawn rectangle extends below the 200px display',
  )
  assert.deepEqual(revived.grid, outside)
  assert(!inRectangle(revived.foot), 'respawn did not cross the original rectangle')

  assert.equal(contacts.length, 1, 'one new contact with the respawned enemy')
  const [contact] = contacts
  assert.equal(contact.entity, beeWorldInput.enemy)
  if (contact.entry !== undefined) assert.equal(contact.entry, 41142)
  assert.equal(contact.team ?? menus[0]?.team, 'team-4')
  assert(revived.order < contact.order)
  assert(
    paints.every(({ order }) => order > revived.order),
    'defeated sprite drew before it respawned',
  )
  const visible = paints.find(({ order, foot }) => order < contact.order && inCanvas(foot))
  assert(
    visible?.size.every((n) => n > 0),
    'no returned sprite blit before contact',
  )
  assert.deepEqual(
    menus.map(({ index }) => index),
    [0, 1],
  )
  const [spell] = spells
  assert(
    spell && spell.order > menus.at(-1).order,
    'no learned spell drawn after entering the menu',
  )
  assert.deepEqual(
    [spell.id, spell.label, spell.mp, spell.enabled],
    [beePostWin.skill.id, beePostWin.skill.label, beePostWin.skill.mp, true],
    'the native battle spell menu must draw the restored skill as usable',
  )
  return { savedTicks, expired, inView: held.at(-1), revived, visible, contact, spell }
}

export async function verifyBeeRespawn({ page, controls, until, health, out, label, savedTicks }) {
  const read = () => page.evaluate(() => window.__q2BeePostWin.state())
  const at = (grid, target) => grid.every((value, index) => value === target[index])
  let lastStage = 'waiting for timer'
  let receipt
  try {
    const expired = await until(
      read,
      ({ tick }) => tick?.after[0] && tick.after[1] === 0,
      'native hidden enemy reaches zero',
      105_000,
    )
    await until(
      read,
      ({ tick }) => tick.seq >= expired.tick.seq + 3 && tick.after[0],
      'expired enemy remains hidden in the same view',
    )
    controls.setChapter('post-battle-respawn')
    lastStage = 'inside original rectangle'
    await controls.walk(beeWorldInput.stop, inside, [['ArrowUp', 11]], 'post-battle-respawn')
    await until(
      read,
      ({ tick }) => tick?.after[0] && at(tick.grid, inside),
      'enemy remains hidden below the display but inside the original rectangle',
    )
    lastStage = 'cross original rectangle'
    await controls.walk(inside, outside, [['ArrowUp', 1]], 'post-battle-respawn')
    await until(read, ({ tick }) => tick && !tick.after[0], 'native enemy reappears offscreen')
    lastStage = 'return and actually contact'
    health()
    await withRecordedKey({
      keyboard: page.keyboard,
      key: 'ArrowDown',
      metadata: {
        phase: 'post-battle-respawn',
        scope: 'boundary',
        reason: 'return until the respawned bee contacts',
      },
      onInput: controls.record,
      body: () =>
        until(read, ({ contact }) => contact?.entity === beeWorldInput.enemy, 'renewed contact'),
    })
    await until(read, ({ menu }) => menu?.index === 0, 'renewed battle command actually draws')
    controls.setChapter('post-battle-learned-spell')
    lastStage = 'draw the usable restored spell'
    await controls.press('ArrowLeft', 'select the native magic action')
    await until(read, ({ menu }) => menu?.index === 1, 'native magic action selected')
    await controls.press('Enter', 'open the native battle magic grid')
    await until(read, ({ spell }) => spell?.id === beePostWin.skill.id, 'restored spell is drawn')

    const raw = await page.evaluate(() => window.__q2BeePostWin.read())
    const summary = inspectBeeRespawn(raw, savedTicks)
    const path = `${label}-learned-magic.png`
    const png = await page.locator('#screen').screenshot({ path: resolve(out, path) })
    const screen = {
      path,
      sha256: createHash('sha256').update(png).digest('hex'),
      byteLength: png.byteLength,
    }
    receipt = { summary, screen }
  } finally {
    const raw = await page.evaluate(() => window.__q2BeePostWin.read())
    const binding = await writeEvidenceArtifact(out, `${label}-respawn.json`, { ...raw, lastStage })
    if (receipt) receipt.raw = binding
  }
  return receipt
}
