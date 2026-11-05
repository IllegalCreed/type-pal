/** Real throw script execution, deferred presentation, and post-script inventory ownership. */
import type { Command, Item, Magic, ObjectMagicView, ObjectPoisonView } from '@type-pal/shared'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { runScript } from '../../event-system.js'
import { performThrowItem } from '../actions/throw-item.js'
import { createBattleLifecycleFixture } from '../battle-lifecycle.test-fixtures.js'
import { tickBattle } from '../battle-system.js'

function makeItem(opts: Partial<Item> = {}): Item {
  return {
    id: 66,
    _name: '天师符',
    bitmap: 0,
    price: 0,
    scriptOnUse: 0,
    scriptOnEquip: 0,
    scriptOnThrow: 1,
    scriptDesc: 0,
    flags: {
      usable: false,
      equipable: false,
      throwable: true,
      consuming: true,
      applyToAll: false,
      sellable: true,
      equipableBy: [false, false, false, false, false, false],
    },
    ...opts,
  }
}

function throwFixture(commands: Command[], item = makeItem(), count = 2) {
  const fx = createBattleLifecycleFixture({ commands, role: { magicSound: 88 } })
  fx.gs.inventory = [{ itemId: item.id, count }]
  fx.state.enemies[0]!.e.health = 200
  fx.state.enemies[0]!.prevHp = 200
  fx.state.enemies[0]!.e.defense = 30
  // Invoke the action at its normal phase; resources and positioned fighters
  // still come from real hydrate/startBattle rather than a partial state cast.
  fx.state.phase = 'performAction'
  const magics: Magic[] = []
  const objectMagics: ObjectMagicView[] = []
  const objectPoisons: ObjectPoisonView[] = []
  return {
    ...fx,
    itemId: item.id,
    items: [item],
    commands,
    runScript,
    casterIsEnemy: false,
    casterIdx: 0,
    targetIdx: 0,
    magics,
    objectMagics,
    objectPoisons,
  }
}

const DAMAGE_SCRIPT: Command[] = [
  { op: 'end', label: 'L_0' },
  { op: 'raw', opcode: 0x42, operands: [349, 0, 0], label: 'L_1' },
  { op: 'end' },
]

function damageFixture(count = 2) {
  const input = throwFixture(DAMAGE_SCRIPT, makeItem(), count)
  input.magics.push({
    id: 54,
    effect: 7,
    type: 'normal',
    speed: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    xOffset: 0,
    yOffset: 0,
    special: 0,
    wave: 0,
    keepEffect: 0,
    unknown: 0,
    costMP: 0,
    baseDamage: 140,
    elemental: 0,
    sound: 170,
  })
  input.objectMagics.push({
    id: 349,
    magicNumber: 54,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
  })
  return { ...input, magicSpriteFrameCounts: new Map([[7, 8]]) }
}

describe('performThrowItem', () => {
  it('applies simulated damage and consumes once; emits the number only after the throw animation', () => {
    const input = damageFixture()
    performThrowItem(input)
    const { state, gs, bus } = input
    expect(state.enemies[0]!.e.health).toBe(60)
    expect(gs.inventory).toEqual([{ itemId: 66, count: 1 }])
    expect(state.battleAnim).toBeDefined()
    const frames = state.battleAnim!.frames
    const windup = frames.findIndex(
      (f) => f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 5) && f.sound === 88,
    )
    const release = frames.findIndex((f) =>
      f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 6),
    )
    const effect = frames.findIndex((f) =>
      f.overlays?.some((o) => o.kind === 'magic' && o.spriteChunk === 7),
    )
    expect(windup).toBeGreaterThanOrEqual(0)
    expect(release).toBeGreaterThan(windup)
    expect(effect).toBeGreaterThan(release)
    expect(bus.drain().filter((c) => c.cmd.op === 'showDamageNum')).toEqual([])
    expect(state.battleAnim!.pendingDamageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: 140, color: 'blue' },
    ])
    for (let tick = 0; tick < 200 && state.battleAnim; tick++) {
      tickBattle(gs, { held: new Set(), pressed: new Set(), frameNum: tick }, bus)
    }
    expect(state.battleAnim).toBeUndefined()
    expect(
      bus
        .drain()
        .map((e) => e.cmd)
        .filter((c) => c.op === 'showDamageNum'),
    ).toEqual([
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 140, color: 'blue' },
    ])
  })

  it('defers immediate poison-script damage until the throw animation completes', () => {
    const commands: Command[] = [
      { op: 'end', label: 'L_0' },
      { op: 'raw', opcode: 0x28, operands: [0, 5, 0], label: 'L_1' },
      { op: 'end' },
      { op: 'raw', opcode: 0x21, operands: [0, 50, 0], label: 'L_3' },
      { op: 'end' },
    ]
    const input = throwFixture(commands, makeItem({ id: 116 }), 1)
    input.state.enemies[0]!.resistanceToSorcery = 0
    // The object view is indexed by poison ID, like the extracted OBJECT table.
    input.objectPoisons[5] = { id: 5, level: 1, color: 0, playerScript: 0, enemyScript: 3 }
    performThrowItem(input)
    expect(input.state.enemies[0]!.e.health).toBe(150)
    expect(input.bus.drain().filter((c) => c.cmd.op === 'showDamageNum')).toEqual([])
    expect(input.state.battleAnim?.pendingDamageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: 50, color: 'blue' },
    ])
  })

  it('a zero script entry is a no-op but still consumes the last item, retaining its zero row', () => {
    // If entry zero were executed, this legal script would change inventory.
    const commands: Command[] = [{ op: 'giveItem', itemId: 66, count: 5 }, { op: 'end' }]
    const input = throwFixture(commands, makeItem({ scriptOnThrow: 0 }), 1)
    performThrowItem(input)
    expect(input.gs.inventory).toEqual([{ itemId: 66, count: 0 }])
    expect(input.state.enemies[0]!.e.health).toBe(200)
  })

  it.each([
    { name: 'missing entry', inventory: [] },
    { name: 'zero-count entry', inventory: [{ itemId: 66, count: 0 }] },
  ])('rejects $name without running damage or starting an animation', ({ inventory }) => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
    onTestFinished(() => warning.mockRestore())
    const input = damageFixture(0)
    input.gs.inventory = inventory.map((entry) => ({ ...entry }))
    performThrowItem(input)
    expect(warning.mock.calls).toEqual([['[throw-item] no inventory for item 66']])
    expect(input.state.enemies[0]!.e.health).toBe(200)
    expect(input.gs.inventory).toEqual(inventory)
    expect(input.state.battleAnim).toBeUndefined()
    expect(input.bus.drain()).toEqual([])
  })
})

describe('throw item inventory ownership', () => {
  it('consumes the current entry after the throw script removes and recreates the item', () => {
    const input = throwFixture(
      [
        { op: 'end', label: 'L_0' },
        { op: 'raw', opcode: 0x20, operands: [66, 1, 0], label: 'L_1' },
        { op: 'giveItem', itemId: 66, count: 2 },
        { op: 'end' },
      ],
      makeItem(),
      1,
    )
    performThrowItem(input)
    expect(input.gs.inventory).toEqual([{ itemId: 66, count: 1 }])
  })

  it('leaves inventory empty when the script consumes the last item', () => {
    const input = throwFixture(
      [
        { op: 'end', label: 'L_0' },
        { op: 'raw', opcode: 0x20, operands: [66, 1, 0], label: 'L_1' },
        { op: 'end' },
      ],
      makeItem(),
      1,
    )
    performThrowItem(input)
    expect(input.gs.inventory).toEqual([])
  })
})
