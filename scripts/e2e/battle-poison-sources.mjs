import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { six } from './battle-poison-scenarios.mjs'

const paths = {
  events: 'data/extracted/events/all.json',
  corrections: 'data/extracted/script-corrections.json',
  items: 'data/extracted/data/items.json',
  poisons: 'data/extracted/data/object-poisons.json',
  objectMagics: 'data/extracted/data/object-magics.json',
  magics: 'data/extracted/data/magic.json',
  teams: 'data/extracted/data/enemy-teams.json',
  enemyObjects: 'data/extracted/data/enemy-objects.json',
  enemies: 'data/extracted/data/enemies.json',
  authorItems: 'projects/pal/content/items.json',
  authorPoisons: 'projects/pal/content/poisons.json',
}
export const poisonSources = [
  ...Object.values(paths),
  'reference/sdlpal/fight.c',
  'reference/sdlpal/global.c',
  'reference/sdlpal/global.h',
  'reference/sdlpal/script.c',
]
const wordSigned = (word) => (word >= 0x8000 ? word - 0x10000 : word)

/** Check original script entry/operands and authored item routing before playing any browser case. */
export async function verifyPoisonSources(root) {
  const data = Object.fromEntries(
    await Promise.all(
      Object.entries(paths).map(async ([key, path]) => [
        key,
        JSON.parse(await readFile(resolve(root, path), 'utf8')),
      ]),
    ),
  )
  const commands = data.events.segments.find(({ name }) => name === 'all').commands
  const rawItem = (id) => data.items.find((item) => item.id === id)
  const authorItem = (id) => data.authorItems.find((item) => item.id === String(id))
  const rawPoison = (id) => data.poisons.find((poison) => poison.id === id)
  const nameAndItem = (id, name, use, toss, throwable = toss > 0) => {
    const { _name, flags, scriptOnUse, scriptOnThrow } = rawItem(id)
    assert.deepEqual([_name, scriptOnUse, scriptOnThrow], [name, use, toss])
    assert.deepEqual(
      [flags.usable, flags.throwable, flags.consuming, flags.applyToAll],
      [true, throwable, true, false],
    )
    assert.equal(authorItem(id).use.target, 'oneAlly')
    assert.equal(authorItem(id).use.consuming, true)
    assert.equal(authorItem(id).throw?.target, throwable ? 'oneEnemy' : undefined)
    return { id, name, scriptOnUse, scriptOnThrow, flags }
  }
  const raw = (ip, opcode, operands) => {
    const cmd = commands[ip]
    assert.deepEqual(
      [cmd.op, cmd.opcode, cmd.operands],
      ['raw', opcode, operands],
      `PAL script ${ip}`,
    )
  }
  const end = (ip, advance = false) => {
    const command = commands[ip]
    assert.deepEqual([command.op, command.advance ?? false], ['end', advance], `PAL script ${ip}`)
  }
  const poisonId = (itemId) => six.find(({ item }) => item === itemId).poison
  const fireObject = data.objectMagics.find(({ id }) => id === 24)
  const fire = data.magics.find(({ id }) => id === fireObject.magicNumber)
  assert.deepEqual(
    [fire.id, fire.effect, wordSigned(fire.baseDamage), fire.sound],
    [96, 24, -999, 157],
  )
  const { corrections } = data
  assert.equal(corrections.source.file, 'SSS.MKF')
  assert.equal(
    corrections.source.sha256,
    'ce448a90c9797648eea315fe589b2bd434139ffc423bf0a5954dae6f4c8b4756',
  )
  assert(corrections.rules.some(({ id }) => id === 'D14'))

  for (const { item, name, poison, counters, lethal, onUse, onThrow } of six) {
    nameAndItem(item, name, onUse, onThrow)
    const counterId = poisonId(counters)
    const lethalId = poisonId(lethal)
    const authoredPoison = data.authorPoisons.find(({ id }) => id === poison)
    assert.deepEqual([authoredPoison.counters, authoredPoison.lethalWith], [counterId, lethalId])
    assert.equal(rawPoison(poison).level, 3)
    raw(onUse, 0x5d, [counterId, onUse + 3, 0])
    raw(onUse + 1, 0x2b, [0, counterId, 0])
    end(onUse + 2)
    raw(onUse + 3, 0x5d, [lethalId, onUse + 6, 0])
    raw(onUse + 4, 0x5f, [0, 0, 0])
    end(onUse + 5)
    raw(onUse + 6, 0x29, [0, poison, 0])
    end(onUse + 7)
    raw(onThrow, 0x42, [24, 0, 0])
    raw(onThrow + 1, 0x28, [0, poison, 0])
    // D14 corrects the raw zero jump to this item's own terminator. Both skip the lethal branch.
    raw(onThrow + 2, 0x5e, [lethalId, onThrow + 4, 0])
    raw(onThrow + 3, 0x60, [0, 0, 0])
    end(onThrow + 4)
    const { playerScript, enemyScript } = rawPoison(poison)
    if (poison !== 555) {
      raw(playerScript, 0x1b, [0, 65486, 0])
      end(playerScript + 1)
      raw(enemyScript, 0x21, [0, 100, 0])
      end(enemyScript + 1)
    }
  }
  assert.deepEqual([rawPoison(555).playerScript, rawPoison(555).enemyScript], [40878, 40889])
  for (const ip of [40878, 40879, 40881, 40883, 40885, 40889, 40891, 40893]) end(ip, true)
  for (const [ip, amount] of [
    [40880, 1],
    [40882, 2],
    [40884, 3],
    [40886, 200],
  ])
    raw(ip, 0x1b, [0, 0x10000 - amount, 0])
  raw(40887, 0x2b, [0, 555, 0])
  end(40888)
  for (const [ip, amount] of [
    [40890, 111],
    [40892, 222],
    [40894, 333],
  ])
    raw(ip, 0x21, [0, amount, 0])
  raw(40895, 0x2a, [0, 555, 0])
  end(40896)

  const special = [
    nameAndItem(84, '大蒜', 39536, 0, true),
    nameAndItem(117, '毒蛇卵', 39335, 39337),
    nameAndItem(137, '无影毒', 39467, 39499),
    nameAndItem(278, '毒龙胆', 39765, 0),
  ]
  raw(39536, 0x17, [17, 22, 30])
  end(39537)
  raw(39335, 0x29, [0, 551, 0])
  end(39336)
  assert.deepEqual([rawPoison(551).level, rawPoison(551).playerScript], [0, 40862])
  raw(40862, 0x1b, [0, 65529, 0])
  end(40863)
  raw(39467, 0x5a, [0, 0, 0])
  end(39468)
  raw(39499, 0x42, [24, 0, 0])
  raw(39500, 0x5b, [1000, 0, 0])
  end(39501)
  raw(39765, 0x61, [39505, 0, 0])
  raw(39505, 0x5f, [0, 0, 0])
  end(39506)
  raw(39766, 0x2c, [0, 3, 0])
  end(39767)
  assert.deepEqual(
    commands.flatMap(({ op, opcode, operands }, ip) =>
      op === 'raw' && [0x28, 0x29].includes(opcode) && operands[1] === 137 ? [ip] : [],
    ),
    [],
    'no original script uses item 137 as a persistent poison',
  )
  const teams = [
    [69, [504], [330]],
    [106, [443, 443], [420, 420]],
    [203, [464], [3000]],
    [274, [461], [2250]],
  ]
  for (const [id, objects, hp] of teams) {
    const team = data.teams.find((team) => team.id === id)
    assert.deepEqual(
      team.enemyObjectIndexes.filter((enemy) => enemy !== 65535),
      objects,
    )
    assert.deepEqual(
      team.enemies
        .filter((enemy) => enemy !== 65535)
        .map((enemy) => data.enemies.find(({ id }) => id === enemy).health),
      hp,
    )
  }
  assert.equal(
    data.enemyObjects.find(({ objectIndex }) => objectIndex === 464).resistanceToSorcery,
    4,
  )
  return {
    items: six.map(({ item, name, poison, counters, lethal, onUse, onThrow }) => ({
      item,
      name,
      poison,
      counters,
      lethal,
      onUse,
      onThrow,
    })),
    special,
    source: corrections.source,
    throwTerminationCorrection: 'D14',
    teams: teams.map(([id, objects, hp]) => ({ id, objects, hp })),
    poisonFire: {
      object: fireObject.id,
      magic: fire.id,
      effect: fire.effect,
      baseDamage: wordSigned(fire.baseDamage),
      sound: fire.sound,
    },
  }
}
