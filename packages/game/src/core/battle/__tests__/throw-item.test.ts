/** Real throw script execution, deferred presentation, and post-script inventory ownership. */
import type {
  AbstractKey,
  Command,
  Item,
  Magic,
  ObjectMagicView,
  ObjectPoisonView,
} from '@type-pal/shared'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { makeEnemyRecord, makeRoleRecord } from '../../../__tests__/battle-records.js'
import { runScript } from '../../event-system.js'
import { performThrowItem } from '../actions/throw-item.js'
import { stepBattleAnimRender } from '../battle-anim-driver.js'
import { createBattleLifecycleFixture } from '../battle-lifecycle.test-fixtures.js'
import { getBattleResources } from '../battle-runtime-context.js'
import { battleInput, startTestBattle } from '../battle-start.test-fixtures.js'
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

function damageFixture(
  count = 2,
  fighters: Pick<
    NonNullable<Parameters<typeof startTestBattle>[0]>,
    'roles' | 'enemies' | 'teamSlots'
  > = {},
  commands = DAMAGE_SCRIPT,
) {
  const item = makeItem()
  const magics: Magic[] = [
    {
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
    },
  ]
  const objectMagics: ObjectMagicView[] = [
    {
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
    },
  ]
  const objectPoisons: ObjectPoisonView[] = []
  const { gs, bus, playerRoles } = startTestBattle({
    roles: [
      makeRoleRecord(0, { dexterity: 250, magicSound: 88 }),
      makeRoleRecord(1, { dexterity: 120 }),
    ],
    enemies: [makeEnemyRecord({ health: 200, defense: 30, dexterity: 0 })],
    ...fighters,
    items: [item],
    magics,
    objectMagics,
    objectPoisons,
    commands,
  })
  gs.inventory = [{ itemId: item.id, count }]
  const state = gs.battleState
  const resources = getBattleResources(gs)
  if (!state || !resources) throw new Error('throw test requires an active battle')
  const magicSpriteFrameCounts = new Map([[7, 8]])
  resources.magicSpriteFrameCounts = magicSpriteFrameCounts
  return {
    gs,
    bus,
    playerRoles,
    state,
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
    magicSpriteFrameCounts,
  }
}

describe('performThrowItem', () => {
  it('keeps the throw pose for four ticks after damage, then restores for four before the next actor', () => {
    const { state, gs, bus } = damageFixture()
    const step = (...keys: AbstractKey[]) => {
      tickBattle(gs, battleInput(keys), bus)
      return bus.drain().map(({ cmd }) => cmd)
    }
    step() // preBattle → selectAction
    step('ThrowItem')
    step('Confirm') // item confirmation auto-targets the sole enemy
    step('Confirm') // the other player attacks the sole enemy
    expect(state.pendingActions.get(0)).toMatchObject({ type: 'throw-item', target: 0 })
    expect(state.pendingActions.get(1)).toMatchObject({ type: 'attack', target: 0 })
    expect(state.actionQueue.slice(0, 2).map(({ isEnemy, idx }) => [isEnemy, idx])).toEqual([
      [false, 0],
      [false, 1],
    ])
    expect(step().filter(({ op }) => op === 'showDamageNum')).toEqual([])
    expect(state.enemies[0]!.e.health).toBe(60)
    expect(gs.inventory).toEqual([{ itemId: 66, count: 1 }])
    const animation = state.battleAnim
    const caster = state.players[0]
    const origin = caster?.posOriginal
    if (!animation || !caster || !origin) throw new Error('throw animation must start in place')
    const frames = animation.frames
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
    const releasePose = { pos: { x: origin.x - 10, y: origin.y - 4 }, currentFrame: 6 }
    const restPose = { pos: origin, currentFrame: 0 }
    let sawDamage = false
    for (let tick = 0; tick < 80 && !sawDamage; tick++) {
      const numbers = step().filter(({ op }) => op === 'showDamageNum')
      if (numbers.length === 0) continue
      expect(numbers).toEqual([
        { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 140, color: 'blue' },
      ])
      expect(caster).toMatchObject(releasePose)
      expect(state.battleAnim?.overlays).toBeUndefined()
      expect(state.currentActionIndex).toBe(0)
      sawDamage = true
    }
    expect(sawDamage).toBe(true)
    for (let tick = 1; tick <= 8; tick++) {
      expect(step().filter(({ op }) => op === 'showDamageNum')).toEqual([])
      expect(caster).toMatchObject(tick < 4 ? releasePose : restPose)
      expect(state.currentActionIndex).toBe(tick < 8 ? 0 : 1)
      expect(state.enemies[0]!.e.health).toBe(60)
    }
    expect(gs.inventory).toEqual([{ itemId: 66, count: 1 }])
    expect(state.battleAnim).toBeUndefined()
    step()
    expect(state.battleAnim).toBeDefined()
    expect(state.enemies[0]!.e.health).toBeLessThan(60)
  })

  it('keeps a defending ally and an already defeated enemy out of throw repositioning', () => {
    const { state, gs, bus } = damageFixture(1, {
      roles: [
        makeRoleRecord(0, { dexterity: 250 }),
        makeRoleRecord(1, { dexterity: 400, attackStrength: 200 }),
        makeRoleRecord(2, { dexterity: 200 }),
      ],
      enemies: [
        makeEnemyRecord({ health: 30, dexterity: 0 }),
        makeEnemyRecord({ id: 101, health: 200, defense: 30, dexterity: 0 }),
      ],
      teamSlots: [100, 101, 0xffff, 0xffff, 0xffff],
    })
    const step = (...keys: AbstractKey[]) => {
      tickBattle(gs, battleInput(keys), bus)
      return bus.drain().map(({ cmd }) => cmd)
    }
    step() // preBattle → selectAction
    step('ThrowItem')
    step('Confirm')
    step('Right')
    step('Confirm') // role 0 throws at slot 1
    step('Confirm')
    step('Confirm') // role 1 attacks slot 0
    step('Defend') // role 2 guards before either attack
    expect(state.pendingActions.get(0)).toMatchObject({ type: 'throw-item', target: 1 })
    expect(state.pendingActions.get(1)).toMatchObject({ type: 'attack', target: 0 })
    expect(state.actionQueue.slice(0, 3).map(({ isEnemy, idx }) => [isEnemy, idx])).toEqual([
      [false, 2],
      [false, 1],
      [false, 0],
    ])

    const caster = state.players[0]!
    const defender = state.players[2]!
    const defeatedEnemy = state.enemies[0]!
    const target = state.enemies[1]!
    for (let tick = 0; tick < 120 && target.e.health === 200; tick++) step()
    expect(defender).toMatchObject({ defending: true, currentFrame: 3 })
    expect(defeatedEnemy).toMatchObject({ defeated: true })
    expect(target.e.health).toBe(60)
    const animation = state.battleAnim
    if (!animation) throw new Error('the surviving enemy must receive the throw')
    const guardPosition = defender.pos
    const recovery = animation.frames.at(-1)
    // C fight.c:940–993,4369–4372: the recovery frame leaves the guarding
    // ally's position alone and never updates the cleared enemy slot.
    expect(recovery?.fighters).toContainEqual({
      side: 'player',
      idx: 2,
      currentFrame: 3,
      pos: undefined,
      iColorShift: 0,
    })
    expect(recovery?.fighters).not.toContainEqual(
      expect.objectContaining({ side: 'enemy', idx: 0 }),
    )
    expect(recovery?.fighters).toContainEqual({
      side: 'enemy',
      idx: 1,
      pos: target.posOriginal,
      iColorShift: 0,
    })

    for (let tick = 0; tick < 80 && animation.idx < animation.frames.length - 1; tick++) step()
    expect(state.battleAnim).toBe(animation)
    expect(animation.idx).toBe(animation.frames.length - 1)
    expect(caster).toMatchObject({ pos: caster.posOriginal, currentFrame: 0 })
    expect(defender.pos).toBe(guardPosition)
  })

  it('defers immediate poison-script damage to the throw recovery', () => {
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
    const { state, gs, bus } = input
    const animation = state.battleAnim
    if (!animation) throw new Error('poison throw must start an animation')
    const numbers = []
    for (let tick = 0; tick < 80 && state.battleAnim === animation; tick++) {
      tickBattle(gs, battleInput(), bus)
      numbers.push(
        ...bus
          .drain()
          .map(({ cmd }) => cmd)
          .filter(({ op }) => op === 'showDamageNum'),
      )
    }
    expect(state.battleAnim).toBeUndefined()
    expect(numbers).toEqual([
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 50, color: 'blue' },
    ])
  })

  it('shows one full damage number when a fixed hit follows lethal throw magic', () => {
    const commands: Command[] = [
      ...DAMAGE_SCRIPT.slice(0, -1),
      { op: 'raw', opcode: 0x21, operands: [0, 135, 0] },
      { op: 'end' },
    ]
    const { state, gs, bus } = damageFixture(
      1,
      { enemies: [makeEnemyRecord({ health: 130, defense: 30, dexterity: 0 })] },
      commands,
    )
    const step = (...keys: AbstractKey[]) => tickBattle(gs, battleInput(keys), bus)
    step() // preBattle → selectAction
    step('ThrowItem')
    step('Confirm') // item confirmation auto-targets the sole enemy
    step('Confirm') // the other player chooses an attack
    step()
    expect(state.enemies[0]!.e.health).toBe(0)
    expect(gs.inventory).toEqual([{ itemId: 66, count: 0 }])
    expect(state.battleAnim?.frames.at(-2)?.damageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: 275, color: 'blue' },
    ])
  })

  it('keeps the initial dying pose through a first-action drain throw until the arm lifts', () => {
    const drainLock = makeItem({ id: 158, _name: '吸星锁' })
    const { gs, bus, playerRoles } = startTestBattle({
      roles: [makeRoleRecord(0, { hp: 10, maxHP: 150, dexterity: 250 })],
      enemies: [makeEnemyRecord({ health: 310, dexterity: 0 })],
      items: [drainLock],
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x39, operands: [180, 0, 0] }, { op: 'end' }],
    })
    gs.inventory = [{ itemId: drainLock.id, count: 1 }]
    const state = gs.battleState!
    const caster = state.players[0]!
    const step = (...keys: AbstractKey[]) => tickBattle(gs, battleInput(keys), bus)

    step()
    step('ThrowItem')
    step('Confirm')
    expect(state.pendingActions.get(0)).toMatchObject({ type: 'throw-item', target: 0 })
    step()

    // The script commits HP synchronously. The pre-throw pose belongs to the
    // incoming fighter, so healing cannot make the four approach steps stand up.
    expect(playerRoles.roles[0]!.hp).toBe(150)
    expect(state.enemies[0]!.e.health).toBe(130)
    expect(caster.pos).not.toEqual(caster.posOriginal)
    const poses = [caster.currentFrame]
    for (let beat = 1; beat <= 6; beat++) {
      step()
      poses.push(caster.currentFrame)
    }
    expect(poses).toEqual([1, 1, 1, 1, 1, 1, 5])
  })

  it.each([
    { primed: 0, hp: [20, 420], after: [0, 420], failed: false },
    { primed: 1, hp: [420, 20], after: [420, 0], failed: false },
    { primed: 1, hp: [20, 420], after: [20, 420], failed: true },
    { primed: 0, hp: [20, 20], after: [0, 20], failed: false },
    { primed: 1, hp: [420, 420], after: [420, 420], failed: true },
  ])('uses the preceding trigger slot $primed for a whole-field threshold throw at $hp', ({
    primed,
    hp,
    after,
    failed,
  }) => {
    const emptyThrow = makeItem({ id: 75, scriptOnThrow: 0 })
    const corpseWater = makeItem({
      id: 134,
      _name: '化尸水',
      flags: { ...makeItem().flags, applyToAll: true },
    })
    const { gs, bus } = startTestBattle({
      roles: [makeRoleRecord(0, { dexterity: 900 }), makeRoleRecord(1, { dexterity: 500 })],
      enemies: [
        makeEnemyRecord({ health: 420, dexterity: 0 }),
        makeEnemyRecord({ id: 101, health: 420, dexterity: 0 }),
      ],
      teamSlots: [100, 101, 0xffff, 0xffff, 0xffff],
      items: [emptyThrow, corpseWater],
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x64, operands: [5, 4, 0] },
        { op: 'raw', opcode: 0x60, operands: [0, 0, 0] },
        { op: 'end' },
        { op: 'setDialogStyleNarration' },
        { op: 'showDialog', messageIndex: 12538, text: '无任何效果' },
        { op: 'end' },
      ],
    })
    gs.inventory = [emptyThrow, corpseWater].map(({ id }) => ({ itemId: id, count: 1 }))
    const state = gs.battleState!
    state.enemies.forEach((enemy, index) => {
      enemy.e.health = hp[index]!
    })
    const step = (...keys: AbstractKey[]) => tickBattle(gs, battleInput(keys), bus)
    step()
    step('ThrowItem')
    step('Confirm')
    if (primed === 1) step('Right')
    step('Confirm')
    step('ThrowItem')
    step('Right')
    step('Confirm')
    expect(state.pendingActions.get(0)).toMatchObject({ actionId: emptyThrow.id, target: primed })
    expect(state.pendingActions.get(1)).toMatchObject({ actionId: corpseWater.id, target: -1 })

    for (let beat = 0; beat < 120 && gs.inventory[1]?.count === 1; beat++) step()

    expect(state.enemies.map((enemy) => enemy.e.health)).toEqual(after)
    expect((state.battleDialogQueue ?? []).map((line) => [line.style, line.text])).toEqual(
      failed ? [['narration', '无任何效果']] : [],
    )
    expect(state.battleAnim?.frames.flatMap((frame) => frame.damageNums ?? [])).toEqual(
      failed ? [] : [{ target: { kind: 'enemy', idx: primed }, value: hp[primed], color: 'blue' }],
    )
    expect(gs.inventory.map(({ count }) => count)).toEqual([0, 0])
  })

  it('keeps the first-turn trigger slot scoped to each live battle', () => {
    const corpseWater = makeItem({
      id: 134,
      flags: { ...makeItem().flags, applyToAll: true },
    })
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x64, operands: [5, 4, 0] },
      { op: 'raw', opcode: 0x60, operands: [0, 0, 0] },
      { op: 'end' },
      { op: 'showDialog', messageIndex: 12538, text: '无任何效果' },
      { op: 'end' },
    ]
    const roles = [makeRoleRecord(0, { dexterity: 900 })]
    const weak = makeEnemyRecord({ health: 420, dexterity: 0 })
    const strong = makeEnemyRecord({ id: 101, health: 420, dexterity: 0 })
    const twoEnemies = startTestBattle({
      roles,
      commands,
      enemies: [weak, strong],
      teamSlots: [100, 101, 0xffff, 0xffff, 0xffff],
      items: [corpseWater],
    })
    twoEnemies.gs.inventory = [{ itemId: corpseWater.id, count: 1 }]
    const first = twoEnemies.gs.battleState!
    first.enemies[0]!.e.health = 20
    const tick = (fight: typeof twoEnemies, ...keys: AbstractKey[]) =>
      tickBattle(fight.gs, battleInput(keys), fight.bus)
    tick(twoEnemies)
    tick(twoEnemies)

    const oneEnemy = startTestBattle({
      roles: [makeRoleRecord(0, { dexterity: 900 })],
      commands,
      enemies: [weak],
      items: [corpseWater],
    })
    oneEnemy.gs.inventory = [{ itemId: corpseWater.id, count: 1 }]
    const second = oneEnemy.gs.battleState!
    second.enemies[0]!.e.health = 20
    tick(oneEnemy)
    tick(oneEnemy)

    for (const fight of [twoEnemies, oneEnemy]) {
      tick(fight, 'ThrowItem')
      tick(fight, 'Confirm')
      tick(fight)
      expect(fight.gs.inventory[0]?.count).toBe(0)
    }

    // The empty turn-start entry for slot 1 primed the first battle only.
    expect(first.enemies.map(({ e }) => e.health)).toEqual([20, 420])
    expect(first.battleDialogQueue?.map(({ text }) => text)).toEqual(['无任何效果'])
    expect(second.enemies[0]!.e.health).toBe(0)
    expect(second.battleDialogQueue).toBeUndefined()
  })

  it.each([
    { dismiss: 'confirmation', copies: 1 },
    { dismiss: 'timeout', copies: 2 },
  ])('holds the release through throw narration dismissed by $dismiss', ({ dismiss, copies }) => {
    const corpseWater = makeItem({
      id: 134,
      _name: '化尸水',
      flags: { ...makeItem().flags, applyToAll: true },
    })
    const failureText: Command[] = [
      { op: 'setDialogStyleNarration' },
      { op: 'showDialog', messageIndex: 12538, text: '无任何效果' },
    ]
    const { gs, bus } = startTestBattle({
      roles: [makeRoleRecord(0, { dexterity: 900, magicSound: 88 })],
      enemies: [makeEnemyRecord({ health: 420, dexterity: 0 })],
      items: [corpseWater],
      commands: [
        { op: 'end' },
        { op: 'raw', opcode: 0x64, operands: [5, 4, 0] },
        { op: 'raw', opcode: 0x60, operands: [0, 0, 0] },
        { op: 'end' },
        ...Array.from({ length: copies }, () => failureText).flat(),
        { op: 'end' },
      ],
    })
    gs.inventory = [{ itemId: corpseWater.id, count: 1 }]
    const state = gs.battleState!
    const caster = state.players[0]!
    const origin = caster.posOriginal!
    const released = { x: origin.x - 10, y: origin.y - 4 }
    const step = (...keys: AbstractKey[]) => tickBattle(gs, battleInput(keys), bus)

    step()
    step('ThrowItem')
    step('Confirm')
    step()
    expect(state.battleAnim).toBeDefined()
    stepBattleAnimRender(state, 1000)

    const soundStarts: number[] = []
    const captureSound = () => {
      for (const { cmd } of bus.drain()) if (cmd.op === 'playSound') soundStarts.push(cmd.soundId)
    }
    for (let beat = 0; beat < 4; beat++) step()
    captureSound()
    stepBattleAnimRender(state, 5000)
    expect(caster).toMatchObject({ pos: released, currentFrame: 6 })
    expect(gs.dialogBox).toBeUndefined()

    if (dismiss === 'confirmation') {
      // fight.c:4339–4362 waits four approach beats, two with the item name,
      // eight in the windup pose, and two in the release pose before running the script.
      for (let beat = 4; beat < 15; beat++) {
        step()
        captureSound()
      }
      expect(gs.dialogBox).toBeUndefined()
      step()
      captureSound()
    }

    for (let message = 0; message < copies; message++) {
      for (let beat = 0; dismiss === 'timeout' && beat < 25 && !gs.dialogBox; beat++) {
        step()
        captureSound()
      }
      expect(gs.dialogBox).toMatchObject({ style: 'narration', currentLineText: '无任何效果' })
      expect(caster).toMatchObject({ pos: released, currentFrame: 6 })
      expect(state.currentActionIndex).toBe(0)
      if (dismiss === 'confirmation') {
        step('Confirm')
      } else {
        for (let beat = 0; beat < 34; beat++) step()
        expect(gs.dialogBox?.style).toBe('narration')
        step()
      }
      expect(gs.dialogBox).toBeUndefined()
      expect(caster).toMatchObject({ pos: released, currentFrame: 6 })
    }

    for (let beat = 0; beat < 12 && state.currentActionIndex === 0; beat++) {
      step()
      captureSound()
    }
    expect(caster).toMatchObject({ pos: origin, currentFrame: 0 })
    expect(state.currentActionIndex).toBe(1)
    expect(soundStarts).toEqual([88])
    expect(gs.inventory[0]?.count).toBe(0)
  })

  it.each([
    { casterHp: 90, netHeal: 60 },
    { casterHp: 150, netHeal: 0 },
  ])('emits only net HP changes after a drain throw from $casterHp HP', ({ casterHp, netHeal }) => {
    const drainLock = makeItem({ id: 158, _name: '吸星锁' })
    const { gs, bus, playerRoles } = startTestBattle({
      roles: [
        makeRoleRecord(0, { hp: casterHp, maxHP: 150, dexterity: 250 }),
        makeRoleRecord(1, { hp: 130, maxHP: 150 }),
      ],
      enemies: [makeEnemyRecord({ health: 200, dexterity: 0 })],
      items: [drainLock],
      commands: [
        { op: 'end' },
        // A scripted group cost followed by the ordinary drain effect.
        { op: 'raw', opcode: 0x1b, operands: [1, 0xffe2, 0] },
        { op: 'raw', opcode: 0x39, operands: [180, 0, 0] },
        { op: 'end' },
      ],
    })
    gs.inventory = [{ itemId: drainLock.id, count: 1 }]
    const state = gs.battleState!
    const step = (...keys: AbstractKey[]) => {
      tickBattle(gs, battleInput(keys), bus)
      return bus
        .drain()
        .map(({ cmd }) => cmd)
        .filter(({ op }) => op === 'showDamageNum')
    }

    step()
    step('ThrowItem')
    step('Confirm')
    step('Confirm') // The slower ally picks a normal attack.
    expect(step()).toEqual([])
    expect(playerRoles.roles.map(({ hp }) => hp)).toEqual([150, 100])
    expect(state.enemies[0]!.e.health).toBe(20)

    const animation = state.battleAnim
    if (!animation) throw new Error('the drain throw must start its release animation')
    const numberFrames = []
    for (let tick = 0; tick < 80 && state.battleAnim === animation; tick++) {
      const numbers = step()
      if (numbers.length > 0) numberFrames.push(numbers)
    }

    // fight.c:626–688 reads one final HP difference per slot, enemies first.
    expect(numberFrames).toEqual([
      [
        { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 180, color: 'blue' },
        ...(netHeal
          ? [
              {
                op: 'showDamageNum',
                target: { kind: 'player', idx: 0 },
                value: netHeal,
                color: 'yellow',
              },
            ]
          : []),
        { op: 'showDamageNum', target: { kind: 'player', idx: 1 }, value: 30, color: 'blue' },
      ],
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
