import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import { actors, room } from './battle-weapon-world-scenarios.mjs'

const statNames = ['attack', 'magicAttack', 'defense', 'speed', 'luck']
const resistanceNames = ['poison', 'wind', 'thunder', 'water', 'fire', 'earth']
const skillBeads = new Map([
  ['260', '351'],
  ['263', '315'],
  ['264', '320'],
  ['265', '325'],
  ['266', '389'],
  ['267', '336'],
  ['274', '383'],
])
const normalizedRole = (id) => (typeof id === 'number' ? id : actors.indexOf(id))
const spriteNumber = (id) => Number(id.split('-').at(-1))
const sortedStock = (entries) =>
  [...entries].filter(([, count]) => count > 0).sort(([a], [b]) => a.localeCompare(b))
const signedWord = (word) => (word >= 0x8000 ? word - 0x10000 : word)
const legacyRegen = new Map([
  [563, 0],
  [564, 1],
])

function baseRole(inputs, id, engine) {
  const raw = inputs.gameRoles.roles[id]
  const { battler } = inputs.palActors.find((actor) => actor.id === actors[id])
  if (engine === 'game')
    return {
      id,
      stats: [raw.attackStrength, raw.magicStrength, raw.defense, raw.dexterity, raw.fleeRate],
      res: [
        raw.poisonResistance,
        ...resistanceNames.slice(1).map((element) => raw.elemResistance[element]),
      ],
      hp: raw.hp,
      mp: raw.mp,
      attackAll: Boolean(raw.attackAll),
      sprite: raw.spriteNumInBattle,
      cooperative: String(raw.cooperativeMagic || ''),
      skills: raw.magic.filter(Boolean).map(String).sort(),
      dual: false,
      regen: [],
    }
  const { baseStats } = battler
  return {
    id,
    stats: statNames.map((name) => baseStats[name]),
    res: [0, 0, 0, 0, 0, 0],
    hp: baseStats.hp,
    mp: baseStats.mp,
    attackAll: false,
    sprite: spriteNumber(battler.battleSprite),
    cooperative: battler.cooperativeMagicSkillId ?? '',
    skills: [...(battler.initialMagic ?? [])].sort(),
    dual: false,
    regen: [0, 0],
  }
}

function applyRaw(role, entry, slot) {
  for (const effect of entry.effects) {
    const [op, a, b, c] = effect
    if (op === 0x17) {
      assert.equal(a, slot + 11)
      if (b >= 17 && b <= 21) role.stats[b - 17] += signedWord(c)
      else if (b >= 22 && b <= 27) role.res[b - 22] += signedWord(c)
      else assert.fail(`unknown equipment attribute ${b}`)
    } else if (op === 0x1a) {
      assert.equal(c, 0)
      if (a === 1) role.sprite = b
      else if (a === 4) role.attackAll = b !== 0
      else if (a === 65) {
        assert.equal(String(b), skillBeads.get(entry.id))
        role.cooperative = String(b)
      } else assert.fail(`unknown equipment override ${a}`)
    } else if (op === 0x2d) {
      assert.deepEqual([a, b, c], [8, 32760, 0])
      role.dual = true
    } else if (op === 0x29) {
      assert(a === 0 && c === 0 && legacyRegen.has(b))
      role.regen.push(b)
    } else assert.fail(`unknown equipment opcode ${op} on ${entry.id}`)
  }
}

function applyAuthored(role, entry) {
  for (const effect of entry.authored) {
    switch (effect.kind) {
      case 'statBonus':
        assert(statNames.includes(effect.stat))
        role.stats[statNames.indexOf(effect.stat)] += effect.delta
        break
      case 'resistance':
        assert(resistanceNames.includes(effect.element))
        role.res[resistanceNames.indexOf(effect.element)] += effect.percent
        break
      case 'attackAll':
        role.attackAll = true
        break
      case 'battleSprite':
        role.sprite = spriteNumber(effect.byActor[actors[role.id]])
        break
      case 'grantStatus':
        assert.equal(effect.status, 'dualAttack')
        role.dual = true
        break
      case 'grantSkill':
        // The authored beads grant castable skills. The raw row 65 instead
        // changes the cooperative spell, and leaves Game's learned list alone.
        assert.equal(effect.skillId, skillBeads.get(entry.id))
        assert(
          !role.skills.includes(effect.skillId),
          'choose a wearer who does not know this grant',
        )
        role.skills.push(effect.skillId)
        break
      case 'regenHp':
        role.regen[0] += effect.amount
        break
      case 'regenMp':
        role.regen[1] += effect.amount
        break
      default:
        assert.fail(`unknown author equipment effect ${effect.kind}`)
    }
  }
}

function expectedParty(inputs, catalogue, engine, party, equipment) {
  return party.map((id, position) => {
    const role = { ...baseRole(inputs, id, engine), equipment: [...equipment[position]] }
    for (const [slot, item] of role.equipment.entries()) {
      if (!item) continue
      const entry = catalogue.get(item)
      if (engine === 'game') applyRaw(role, entry, slot)
      else applyAuthored(role, entry)
    }
    role.res = role.res.map((value) => Math.min(100, value))
    role.skills.sort()
    role.regen.sort((a, b) => a - b)
    return role
  })
}

function pairedCore(observation, engine, inputs) {
  return {
    scene: observation.scene,
    grid: observation.grid,
    facing: observation.facing,
    music: observation.music,
    stock: sortedStock(observation.stock),
    party: observation.party.map(({ cooperative, skills, regen, ...role }) => ({
      ...role,
      regen:
        engine === 'game' ? [563, 564].map((symbol) => (regen.includes(symbol) ? 20 : 0)) : regen,
      // Skills and cooperative magic are compared against separate, source-derived
      // oracles. Both retain their actual values in the native run evidence.
      baseSkills: baseRole(inputs, role.id, engine).skills,
    })),
  }
}

function afterInput(record, input, timeOrigin) {
  return Number.isFinite(record.atMs) && timeOrigin + record.atMs >= input.atMs - 2
}

export function auditEquipmentRun({ engine, scenario, row, trace, actions, inputs, catalogue }) {
  assert(trace && Number.isFinite(trace.timeOrigin))
  assert.deepEqual(trace.errors, [])
  assert.equal(trace.overflow, false)
  for (const kind of ['paints', 'equips', 'removals']) {
    assert(
      trace[kind].every(({ seq }, index) => seq === index),
      `invalid native ${kind} sequence`,
    )
    assert(
      trace[kind].every(
        ({ order, atMs }, index) =>
          !index || (order > trace[kind][index - 1].order && atMs >= trace[kind][index - 1].atMs),
      ),
    )
  }
  const events = [...trace.paints, ...trace.equips, ...trace.removals].sort(
    (a, b) => a.order - b.order,
  )
  assert(
    events.every(
      ({ order, atMs }, index) => order === index && (!index || atMs >= events[index - 1].atMs),
    ),
  )
  const findings = []
  const steps = []
  const expectedGear = scenario.starting.map((gear) => [...gear])
  const expectedStock = new Map(scenario.stock.map((item) => [item, 1]))
  const check = (step, rule, actual, expected) => {
    if (!same(actual, expected)) findings.push({ step, rule, actual, expected })
  }
  function checkState(step, state, label) {
    assert(state && Array.isArray(state.stock))
    assert.equal(new Set(state.stock.map(([id]) => id)).size, state.stock.length)
    assert(state.stock.every(([, count]) => Number.isSafeInteger(count) && count >= 0))
    check(
      step,
      `${label}-room`,
      [state.scene, state.grid, state.facing, state.music],
      [room.scene, room.grid, room.facing, room.music],
    )
    check(
      step,
      `${label}-slots-and-effective-effects`,
      state.party,
      expectedParty(inputs, catalogue, engine, scenario.party, expectedGear),
    )
    check(step, `${label}-inventory`, sortedStock(state.stock), sortedStock(expectedStock))
  }
  function checkRoleNames(step, draw, state, item) {
    const { roleNames } = draw
    const permitted = catalogue.get(item).roles
    const selected = normalizedRole(draw.role)
    check(
      step,
      'drawn-role-roster-and-eligibility',
      roleNames.map(({ role, allowed, selected: focused, x, y }) => [
        normalizedRole(role),
        allowed,
        focused,
        x,
        y,
      ]),
      state.party.map(({ id }, index) => [
        id,
        permitted.includes(id),
        id === selected,
        15,
        108 + index * 18,
      ]),
    )
    for (const entry of roleNames) {
      const { allowed, selected: focused, color } = entry
      if (engine === 'game') {
        const correct =
          allowed && focused
            ? color >= 0xf9 && color <= 0xfe
            : color === (allowed ? 0x4f : focused ? 0x1c : 0x18)
        check(step, 'drawn-role-color', correct, true)
      } else {
        const correct =
          allowed && focused
            ? [
                [247, 231, 109],
                [235, 211, 97],
                [227, 190, 89],
                [219, 174, 81],
                [231, 195, 93],
                [243, 219, 105],
              ].some((rgb) => same(rgb, color))
            : same(color, allowed ? [199, 186, 174] : focused ? [215, 109, 93] : [166, 40, 32])
        check(step, 'drawn-role-color', correct, true)
      }
    }
  }
  function confirmPaint(step, draw, state, item, action) {
    assert(
      trace.paints.some((candidate) => same(candidate, draw)),
      'missing native canvas draw',
    )
    assert(afterInput(draw, action, trace.timeOrigin), 'canvas draw predates its physical input')
    const role = state.party.find(({ id }) => id === normalizedRole(draw.role))
    check(
      step,
      'rendered-item-and-role',
      [draw.selected, normalizedRole(draw.role)],
      [item, state.menu.role],
    )
    assert(role, 'the painted wearer is absent from the observed party')
    check(
      step,
      'rendered-slots-and-stats',
      [draw.equipment, draw.stats],
      [role.equipment, role.stats],
    )
    const icon =
      engine === 'game'
        ? String(inputs.gameItems.find(({ id }) => id === Number(item)).bitmap)
        : inputs.palItems.find(({ id }) => id === item).icon
    checkRoleNames(step, draw, state, item)
    check(step, 'rendered-item-icon', draw.icon, icon)
    check(step, 'rendered-inventory-count', draw.quantity, {
      count: state.stock.find(([id]) => id === item)?.[1],
      x: engine === 'game' ? 51 : 62,
      y: engine === 'game' ? 57 : 52,
      color: 'cyan',
      alignment: 'right',
    })
    assert(
      draw.frame && draw.frame.width >= 320 && draw.frame.height >= 200 && draw.frame.colors > 1,
    )
    assert.match(draw.frame.digest, /^[a-f0-9]{8}$/u, 'canvas pixel digest absent')
  }
  checkState('start', row.initial, 'loaded')
  check('start', 'normal-field-control', [row.initial.menu, row.initial.ready], [null, true])
  assert.deepEqual(
    row.steps.map(({ id, kind, item, role, slot }) => ({ id, kind, item, role, slot })),
    scenario.plan,
  )
  let endOfPrevious,
    nativeOrder = -1,
    equips = 0,
    removals = 0
  for (const step of row.steps) {
    const { id, item, kind, role, slot, before, after } = step
    const [begin, end] = step.inputs
    assert(Number.isSafeInteger(begin) && Number.isSafeInteger(end) && end > begin)
    if (endOfPrevious !== undefined)
      assert.equal(begin, endOfPrevious, 'gap between physical equipment steps')
    endOfPrevious = end
    const keys = actions.slice(begin, end)
    assert.equal(keys.length, end - begin)
    assert(
      keys.every(
        (key) => key.phase === 'world-equip' && key.step === id && key.context === row.runId,
      ),
    )
    checkState(id, before, 'before')
    if (step.absentFromMenu) {
      assert.equal(scenario.id, 'party')
      check(id, 'party-wide-available-item', step.absentFromMenu.includes(item), true)
      continue
    }
    const firstFinding = findings.length
    const position = scenario.party.indexOf(role)
    const present = expectedGear[position][slot]
    const lastKey = keys.at(-1)
    assert.equal(lastKey.key, 'Enter')
    if (kind === 'equip') {
      equips++
      const itemPress = keys.find(({ operation }) => operation === 'select-item')
      const navigate = keys.find(({ operation }) => operation === 'next-party-member')
      assert.equal(itemPress?.key, 'Enter', 'missing physical item selection')
      assert.equal(lastKey.operation, 'confirm-role', 'missing physical role confirmation')
      if (scenario.id === 'party' && item === '164') {
        const denied = keys.find(({ operation }) => operation === 'confirm-ineligible-role')
        assert.equal(denied?.key, 'Enter')
        assert(step.denied && afterInput(step.first, itemPress, trace.timeOrigin))
        assert(itemPress.atMs <= denied.atMs && denied.atMs <= lastKey.atMs)
        check(id, 'ineligible-confirm-keeps-menu', step.denied.state.menu, step.selected.menu)
        check(id, 'ineligible-confirm-never-committed', step.denied.after, step.denied.before)
        checkState(id, step.denied.state, 'ineligible-confirm')
      }
      checkState(id, step.selected, 'item-select')
      checkState(id, step.navigated, 'role-select')
      confirmPaint(id, step.first, step.selected, item, itemPress)
      confirmPaint(id, step.preview, step.navigated, item, itemPress)
      if (step.first.order !== step.preview.order) {
        assert.equal(navigate?.key, 'ArrowDown')
        assert(
          afterInput(step.preview, navigate, trace.timeOrigin),
          'role render preceded navigation',
        )
      }
      check(id, 'role-cursor-consumed-navigation', step.navigated.menu.role, role)
      assert(
        trace.equips.some((event) => same(event, step.equip)),
        'missing actual equip commit',
      )
      const { role: wearer, item: nativeItem, source, entry, order } = step.equip
      assert(order > Math.max(step.first.order, step.preview.order, nativeOrder))
      assert(
        afterInput(step.equip, lastKey, trace.timeOrigin),
        'equip commit preceded physical confirm',
      )
      nativeOrder = order
      check(
        id,
        'native-equip-committed-to-chosen-role',
        [normalizedRole(wearer), nativeItem],
        [role, item],
      )
      check(
        id,
        'native-equip-owner',
        source,
        engine === 'game' ? 'Game:runEquipScript' : 'Reforge:equipApply',
      )
      if (engine === 'game')
        check(id, 'original-on-equip-script', entry, catalogue.get(item).scriptOnEquip)
      assert((expectedStock.get(item) ?? 0) > 0, 'proposal contains no legal copy')
      expectedStock.set(item, expectedStock.get(item) - 1)
      if (present) expectedStock.set(present, (expectedStock.get(present) ?? 0) + 1)
      expectedGear[position][slot] = item
      check(
        id,
        'swap-continuation',
        [after.menu?.kind, after.menu?.phase, after.menu?.selected],
        ['equip', present ? 'pick-role' : 'list', present || null],
      )
      if (present) {
        assert(step.swapped && step.swapped.order > order, 'swapped-out item was never presented')
        confirmPaint(id, step.swapped, after, after.menu.selected, lastKey)
      } else assert.equal(step.swapped, null)
    } else {
      removals++
      assert.equal(lastKey.operation, 'interact-unequip')
      assert.equal(present, item)
      assert(keys.slice(0, -1).every(({ key }) => key === 'Escape'))
      assert(
        trace.removals.some((event) => same(event, step.removal)),
        'missing native room script',
      )
      assert(
        step.removal.order > nativeOrder && afterInput(step.removal, lastKey, trace.timeOrigin),
      )
      nativeOrder = step.removal.order
      check(
        id,
        'real-room-unequip-addresses-role-and-slot',
        [step.removal.role, step.removal.slot, step.removal.owner, step.removal.source],
        [
          role,
          slot,
          engine === 'game' ? room.entityId : room.entity,
          engine === 'game' ? 'Game:OP_REMOVE_EQUIPMENT' : 'Reforge:unequipRole',
        ],
      )
      expectedStock.set(item, (expectedStock.get(item) ?? 0) + 1)
      expectedGear[position][slot] = ''
      check(id, 'normal-field-control-after-unequip', [after.menu, after.ready], [null, true])
    }
    checkState(id, after, 'after')
    steps.push({
      id,
      kind,
      slot,
      role,
      item,
      previous: present,
      verified: findings.length === firstFinding,
      state: pairedCore(after, engine, inputs),
    })
  }
  checkState('end', row.final, 'final')
  assert.equal(trace.equips.length, equips)
  assert.equal(trace.removals.length, removals)
  return { findings, steps }
}

export const authoredBeadSemantics = [...skillBeads].map(([item, skill]) => ({
  item,
  skill,
  game: 'cooperative-magic-override',
  reforge: 'granted-castable-skill',
}))
