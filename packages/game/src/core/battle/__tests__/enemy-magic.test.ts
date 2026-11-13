/** Enemy magic dispatch, pre-script defence, and animation feedback. */
import type { Command, Magic, PlayerRole } from '@type-pal/shared'
import { describe, expect, it, test } from 'vitest'
import { recordingRng } from '../../../__tests__/scripted-rng.js'
import { runScript } from '../../event-system.js'
import { performMagic, type RunScriptFn } from '../actions/magic.js'
import { advanceBattleAnimFrames } from '../battle-anim-driver.js'
import type { BattleAnimFrame, BattleState } from '../battle-state.js'
import {
  makeMagic,
  makePartyMagicState,
  makeSpell,
  makeState,
} from './magic-action.test-fixtures.js'

const commands: Command[] = [{ op: 'end' }]

function enemyFixture(roles: Partial<PlayerRole>[]) {
  const fixture = makePartyMagicState(
    roles.map((role) => ({ hp: 500, maxHP: 500, defense: 30, ...role })),
    [{ health: 100, level: 0, magicStrength: 28, idleFrames: 1, magicFrames: 0, attackFrames: 4 }],
  )
  for (const [idx, player] of fixture.state.players.entries()) {
    player.pos = { x: 200 + idx * 40, y: 170 }
    player.posOriginal = { ...player.pos }
  }
  fixture.state.enemies[0]!.pos = { x: 160, y: 80 }
  fixture.state.enemies[0]!.posOriginal = { x: 160, y: 80 }
  fixture.state.rng = recordingRng([1, 1, 1])
  return fixture
}

function castEnemy(
  fixture: ReturnType<typeof enemyFixture>,
  magic: Magic,
  targetIdx: number | 'all',
  spriteFrameCounts?: Map<number, number>,
): void {
  performMagic({
    ...fixture,
    casterIsEnemy: true,
    casterIdx: 0,
    spellId: 7,
    targetIsEnemy: false,
    targetIdx,
    spells: [makeSpell()],
    magics: [magic],
    commands,
    runScript,
    magicSpriteFrameCounts: spriteFrameCounts,
  })
}

function guardPoseEntries(frame: BattleAnimFrame) {
  return (frame.fighters ?? [])
    .filter((fighter) => fighter.side === 'player' && fighter.currentFrame === 3)
    .map(({ side, idx, currentFrame }) => ({ side, idx, currentFrame }))
}
describe('enemy magic animation', () => {
  function withFighterPos(
    state: BattleState,
    playerPos: { x: number; y: number },
    enemyPos: { x: number; y: number },
  ): void {
    for (const p of state.players) {
      p.pos = { ...playerPos }
      p.posOriginal = { ...playerPos }
      p.currentFrame = 0
    }
    for (const e of state.enemies) {
      e.pos = { ...enemyPos }
      e.posOriginal = { ...enemyPos }
    }
  }

  const frameCounts = new Map<number, number>([[12, 8]])

  it('normal magic connects cast motion, target effect, hurt reaction, and reset', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 100,
        defense: 30,
        level: 5,
        idleFrames: 4,
        magicFrames: 2,
        attackFrames: 3,
        actWaitFrames: 2,
        magicSound: 374,
      },
    ])
    withFighterPos(state, { x: 240, y: 170 }, { x: 160, y: 80 })
    const caster = state.enemies[0]!
    caster.pos = { x: 164, y: 82 }
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0, // 打队员 idx0
      spells: [makeSpell()],
      magics: [
        makeMagic({
          effect: 12,
          type: 'normal',
          baseDamage: 45,
          fireDelay: 2,
          effectTimes: 1,
          shake: 0,
          speed: 2,
          xOffset: 4,
          yOffset: -6,
        }),
      ],
      playerRoles,
      bus,
      commands,
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeDefined()
    const f = state.battleAnim!.frames
    // 两步前移和施法手势后接 14 帧特效，再播五拍受击。
    //   特效段从第一个带 overlays 的帧起(起手段无 overlays)。
    const effStart = f.findIndex((fr) => (fr.overlays?.length ?? 0) > 0)
    expect(effStart).toBeGreaterThan(0)
    const eff = f.slice(effStart)
    // 落点特效 14 帧(都带 overlays)+ 受击 5 帧(fight.c:4861-4899,无 overlays)
    expect(eff.filter((fr) => (fr.overlays?.length ?? 0) > 0).length).toBe((8 - 2) * 1 + 8) // l=14
    // Two reset frames follow the five hurt frames (PAL_BattleEnemyPerformAction).
    expect(eff.length).toBe(14 + 5 + 2)
    // 落点 = player.posOriginal + (xOff,yOff) = (244,164)
    expect(eff[0]!.overlays?.[0]).toMatchObject({ kind: 'magic', spriteChunk: 12, x: 244, y: 164 })
    // 特效内敌施法帧 i=2(fireDelay)→ currentFrame = 2-2+4+2 = 6
    expect(eff[2]!.fighters).toEqual([{ side: 'enemy', idx: 0, currentFrame: 6 }])
    // Check the visible positions and emitted sound at the actual action-clock boundaries.
    const playSounds = () =>
      bus
        .drain()
        .map(({ cmd }) => cmd)
        .filter(({ op }) => op === 'playSound')
    expect(caster.pos).toEqual({ x: 176, y: 88 })
    advanceBattleAnimFrames(state, bus, 40)
    expect(caster.pos).toEqual({ x: 180, y: 90 })
    expect(playSounds()).toEqual([])
    advanceBattleAnimFrames(state, bus, 40)
    expect(caster.currentFrame).toBe(4)
    expect(playSounds()).toEqual([{ op: 'playSound', soundId: 374 }])
    advanceBattleAnimFrames(state, bus, 160)
    expect(caster.pos).toEqual({ x: 180, y: 90 })
    advanceBattleAnimFrames(state, bus, 14 * 70 + 4 * 40)
    expect(caster.pos).toEqual({ x: 180, y: 90 })
    advanceBattleAnimFrames(state, bus, 40)
    expect(caster).toMatchObject({ pos: { x: 160, y: 80 }, currentFrame: 0 })
    // 受击动画(倒数 7..3;末尾另有敌复位帧 + 复位停顿帧):受伤队员 idx0 frame4 + 红闪;i=0 不位移
    const hurt = f.slice(f.length - 7, f.length - 2)
    expect(hurt[0]!.fighters).toEqual([
      { side: 'player', idx: 0, currentFrame: 4, iColorShift: 6, pos: { x: 240, y: 170 } },
    ])
    expect(hurt[4]!.fighters?.[0]).toMatchObject({
      side: 'player',
      idx: 0,
      currentFrame: 4,
      iColorShift: 0,
    })
    // Enemy casting must not apply the player-to-enemy damage path.
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('attackAll uses the enemy-magic three-effect layout', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5, idleFrames: 4 },
    ])
    withFighterPos(state, { x: 240, y: 170 }, { x: 160, y: 80 })
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 'all',
      spells: [makeSpell()],
      magics: [
        makeMagic({ effect: 12, type: 'attackAll', fireDelay: 0, effectTimes: 1, shake: 0 }),
      ],
      playerRoles,
      bus,
      commands,
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    const f = state.battleAnim!.frames
    // 特效段从第一个带 overlays 的帧起(前置施法起手段无 overlays)
    const eff0 = f.find((fr) => (fr.overlays?.length ?? 0) > 0)!
    expect(eff0.overlays).toHaveLength(3)
    // 敌方 attackAll 第一落点 {180,180}(异于 OffMagic 的 {70,140})
    expect(eff0.overlays?.[0]).toMatchObject({ x: 180, y: 180 })
  })

  it('a target without its original position cannot start an animation chain', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5, idleFrames: 4 },
    ])
    // Explicit missing target position.
    delete state.players[0]!.posOriginal
    state.enemies[0]!.pos = { x: 160, y: 80 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ effect: 12, type: 'normal', fireDelay: 2 })],
      playerRoles,
      bus,
      commands,
      runScript,
      magicSpriteFrameCounts: frameCounts,
    })
    expect(state.battleAnim).toBeUndefined()
  })
})

describe('enemy magic targets and damage', () => {
  test('attackAll + 数字 targetIdx=1 → 仍结算全体队员（type!=normal 强制 all，fight.c:4719）', () => {
    const fixture = enemyFixture([{}, {}, {}])
    const { playerRoles, bus } = fixture
    castEnemy(fixture, makeMagic({ type: 'attackAll' }), 1)
    // 三名队员各吃 65（手算锚：calcBase(64,30)=80;/4=20;+45=65;wind*5/5=65;rngFactor 1.0、无自卫）
    expect(playerRoles.roles.map((r) => r.hp)).toEqual([435, 435, 435])
    const nums = bus
      .drain()
      .map((e) => e.cmd)
      .filter((c) => c.op === 'showDamageNum')
    expect(nums).toEqual([
      { op: 'showDamageNum', target: { kind: 'player', idx: 0 }, value: 65, color: 'blue' },
      { op: 'showDamageNum', target: { kind: 'player', idx: 1 }, value: 65, color: 'blue' },
      { op: 'showDamageNum', target: { kind: 'player', idx: 2 }, value: 65, color: 'blue' },
    ])
  })

  test('对照：normal + 同 targetIdx=1 → 仅目标队员结算，其余原样', () => {
    const fixture = enemyFixture([{}, {}, {}])
    const { playerRoles, bus } = fixture
    castEnemy(fixture, makeMagic(), 1)
    expect(playerRoles.roles.map((r) => r.hp)).toEqual([500, 435, 500])
    const nums = bus
      .drain()
      .map((e) => e.cmd)
      .filter((c) => c.op === 'showDamageNum')
    expect(nums).toEqual([
      { op: 'showDamageNum', target: { kind: 'player', idx: 1 }, value: 65, color: 'blue' },
    ])
  })

  test('超杀：伤害钳到剩余 HP，数字=钳后 delta（30 非 65），HP 落 0 不为负', () => {
    const fixture = enemyFixture([{ hp: 30, maxHP: 30 }])
    const { playerRoles, bus } = fixture
    castEnemy(fixture, makeMagic(), 0)
    expect(playerRoles.roles[0]!.hp).toBe(0)
    // E2 超杀数字 = 整段剩余 HP（钳后真实 delta；对照 E1 超杀显示完整算出伤害）。
    const nums = bus
      .drain()
      .map((e) => e.cmd)
      .filter((c) => c.op === 'showDamageNum')
    expect(nums).toEqual([
      { op: 'showDamageNum', target: { kind: 'player', idx: 0 }, value: 30, color: 'blue' },
    ])
  })
})

describe('auto-defend poses and hurt feedback', () => {
  test('全员自卫掷命中 → 除数+1 各落 32 + 首帧特效三人防御姿 + 受击动画全员 + 数字挂 hurt 首帧', () => {
    const fixture = enemyFixture([{}, {}, {}])
    const { state, playerRoles, bus } = fixture
    state.rng = recordingRng([0, 0, 0]) // RandomLong(0,2)==0 for each eligible player.
    castEnemy(
      fixture,
      makeMagic({ effect: 12, type: 'attackAll', effectTimes: 1 }),
      1,
      new Map([[12, 8]]),
    )
    // 65 → trunc(65/(1+1)) = 32/人（除数 (defending?2:1)*protect + autoDefend?1:0）
    expect(playerRoles.roles.map((r) => r.hp)).toEqual([468, 468, 468])
    const frames = state.battleAnim?.frames ?? []
    // The first FIRE draw shows all three guard poses.
    const guardFrames = frames.filter((fr) => guardPoseEntries(fr).length > 0)
    expect(guardFrames).toEqual([frames.find((frame) => frame.overlays?.length)])
    expect(guardPoseEntries(guardFrames[0]!)).toEqual([
      { side: 'player', idx: 0, currentFrame: 3 },
      { side: 'player', idx: 1, currentFrame: 3 },
      { side: 'player', idx: 2, currentFrame: 3 },
    ])
    // 多队员受击：5 帧 frame4 + 红闪（i<3 → 6），i=0 无击退位移
    const hurtFrames = frames.filter(
      (fr) =>
        (fr.fighters ?? []).length > 0 &&
        fr.fighters!.every((f) => f.side === 'player' && f.currentFrame === 4),
    )
    expect(hurtFrames).toHaveLength(5)
    expect(hurtFrames[0]!.fighters).toEqual(
      [0, 1, 2].map((i) => ({
        side: 'player',
        idx: i,
        currentFrame: 4,
        iColorShift: 6,
        pos: { x: 200 + i * 40, y: 170 },
      })),
    )
    // 数字不即时 emit，挂 hurt 首帧（value=钳后 delta 32）
    expect(bus.drain().filter((e) => e.cmd.op === 'showDamageNum')).toEqual([])
    expect(hurtFrames[0]!.damageNums).toEqual([
      { target: { kind: 'player', idx: 0 }, value: 32, color: 'blue' },
      { target: { kind: 'player', idx: 1 }, value: 32, color: 'blue' },
      { target: { kind: 'player', idx: 2 }, value: 32, color: 'blue' },
    ])
  })

  test('睡眠队员无自卫资格 → 满伤 65 且无防御姿；清醒队友 32 + 防御姿（fight.c:4727-4735）', () => {
    const fixture = enemyFixture([{}, {}, {}])
    const { state, playerRoles, bus } = fixture
    state.players[1]!.status.sleep = 2
    state.rng = recordingRng([0, 0, 0])
    castEnemy(
      fixture,
      makeMagic({ effect: 12, type: 'attackAll', effectTimes: 1 }),
      1,
      new Map([[12, 8]]),
    )
    // 睡眠：canAutoDefend=false → 除数 1 → 满伤 65；清醒：除数 2 → 32
    expect(playerRoles.roles.map((r) => r.hp)).toEqual([468, 435, 468])
    expect(bus.drain()).toEqual([])
    const frames = state.battleAnim?.frames ?? []
    const guardFrames = frames.filter((fr) => guardPoseEntries(fr).length > 0)
    expect(guardFrames).toHaveLength(1)
    expect(guardPoseEntries(guardFrames[0]!)).toEqual([
      { side: 'player', idx: 0, currentFrame: 3 },
      { side: 'player', idx: 2, currentFrame: 3 },
    ])
    const hurtFrames = frames.filter(
      (fr) =>
        (fr.fighters ?? []).length > 0 &&
        fr.fighters!.every((f) => f.side === 'player' && f.currentFrame === 4),
    )
    expect(hurtFrames).toHaveLength(5)
    expect(hurtFrames[0]!.damageNums).toEqual([
      { target: { kind: 'player', idx: 0 }, value: 32, color: 'blue' },
      { target: { kind: 'player', idx: 1 }, value: 65, color: 'blue' },
      { target: { kind: 'player', idx: 2 }, value: 32, color: 'blue' },
    ])
  })
})

// PAL_BattleEnemyPerformAction rolls defence before RunTriggerScript. The real
// status opcode below also proves that this is not merely callback ordering.
describe('auto-defend is rolled before use scripts', () => {
  test.each([
    { name: 'hit', roll: 0, hp: 468 },
    { name: 'miss', roll: 1, hp: 435 },
  ])('$name retains its result after the real script puts the target to sleep', ({ roll, hp }) => {
    const fixture = enemyFixture([{}])
    const trace: string[] = []
    fixture.state.rng = recordingRng([roll], [], trace)
    const runObserved: RunScriptFn = (options) => {
      trace.push(`script:${options.ip}`)
      return runScript(options)
    }
    performMagic({
      ...fixture,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell({ scriptOnUse: 1 })],
      magics: [makeMagic()],
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x2d, operands: [2, 2, 0] }, { op: 'end' }],
      runScript: runObserved,
    })
    expect(fixture.state.players[0]!.status.sleep).toBe(2)
    expect(fixture.playerRoles.roles[0]!.hp).toBe(hp)
    expect(trace).toEqual(['rng:range(0,3)', 'script:1', 'rng:next'])
  })
})
