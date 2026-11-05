import type { Magic, ObjectMagicView } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createCommandBus } from '../../command-bus.js'
import { performCoopMagic } from '../actions/coop-magic.js'
import {
  COOP_MAGIC,
  makeCoopState,
  makeRole,
  OBJ_MAGICS,
  TEST_COOP_OBJ_ID,
} from './coop-magic.test-fixtures.js'

describe('cooperative magic animation wiring', () => {
  it('召唤型合击:二次法术效果 overlay 带二次 magic 的 special 作 layerOffset(special=99 不被敌人遮挡)', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles } = makeCoopState(roles)
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }

    // 召唤型合击 magic(special=8 → summonChunk 18;effect → 二次 attackAll magic 17,special=99)。
    const coopSummon: Magic = {
      ...COOP_MAGIC,
      id: 50,
      type: 'summon',
      special: 8,
      effect: 17,
    }
    const secondary: Magic = {
      ...COOP_MAGIC,
      id: 17,
      type: 'attackAll',
      effect: 12,
      special: 99,
      speed: 1,
    }

    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [coopSummon, secondary],
      objectMagics: OBJ_MAGICS,
      bus: createCommandBus(),
      magicSpriteFrameCounts: new Map([[12, 8]]),
      summonSpriteFrameCounts: new Map([[18, 4]]),
    })

    const frames = state.battleAnim?.frames ?? []
    const magicOverlays = frames.flatMap((f) =>
      (f.overlays ?? []).filter((o) => o.kind === 'magic'),
    )
    expect(magicOverlays.length).toBeGreaterThan(0)
    for (const ov of magicOverlays) expect(ov.layerOffset).toBe(99)
  })

  it('非召唤合击(首次施法):OffMagic overlay 带 magic 的 special 作 layerOffset(special=99 不被敌人遮挡)', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles } = makeCoopState(roles)
    state.players.forEach((p, i) => {
      p.posOriginal = { x: 240 - i * 20, y: 170 }
    })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [{ ...COOP_MAGIC, special: 99 }],
      objectMagics: OBJ_MAGICS,
      bus: createCommandBus(),
      magicSpriteFrameCounts: new Map([[0, 8]]),
    })
    const frames = state.battleAnim?.frames ?? []
    const magicOverlays = frames.flatMap((f) =>
      (f.overlays ?? []).filter((o) => o.kind === 'magic'),
    )
    expect(magicOverlays.length).toBeGreaterThan(0)
    for (const ov of magicOverlays) expect(ov.layerOffset).toBe(99)
  })

  it.each([
    { type: 'attackAll' as const, sounds: [29, 77] },
    { type: 'summon' as const, sounds: [9, 77] },
  ])('without animation resources, $type emits its cast sound followed by the effect sound', ({
    type,
    sounds,
  }) => {
    const { state, playerRoles, bus } = makeCoopState([
      makeRole(0, { attackStrength: 40, magicStrength: 60, magicSound: 9 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
    ])
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [{ ...COOP_MAGIC, type, sound: 77 }],
      objectMagics: OBJ_MAGICS,
      bus,
    })
    expect(
      bus
        .drain()
        .map((entry) => entry.cmd)
        .filter((command) => command.op === 'playSound')
        .map((command) => command.soundId),
    ).toEqual(sounds)
  })

  it('M9:有动画时效果音随 OffMagic 帧同步(派发只起手 29,效果音挂帧不即播)', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles } = makeCoopState(roles)
    state.players.forEach((p, i) => {
      p.posOriginal = {
        x: 240 - i * 20,
        y: 170,
      }
    })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const bus = createCommandBus()
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [{ ...COOP_MAGIC, sound: 77 }],
      objectMagics: OBJ_MAGICS,
      bus,
      magicSpriteFrameCounts: new Map([[0, 8]]),
    })
    const sounds = bus
      .drain()
      .map((entry) => entry.cmd)
      .filter((command) => command.op === 'playSound')
      .map((c) => c.soundId)
    expect(sounds).toEqual([29]) // 派发即时只起手音 29,效果音 77 不即播
    expect(state.battleAnim!.frames.some((f) => f.sound === 77)).toBe(true) // 77 挂 OffMagic 起手帧,随动画同步
  })

  it('有 magicSpriteFrameCounts + 底锚 → 建合击动画链(聚拢/施法/法术效果/滑回),伤害数字延迟到特效后', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1, { attackStrength: 20, magicStrength: 40 }),
    ]
    const { state, playerRoles } = makeCoopState(roles)
    // 补 posOriginal(动画前置:发起者 + 贡献者底锚)
    state.players.forEach((p, i) => {
      p.posOriginal = {
        x: 240 - i * 20,
        y: 170,
      }
    })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performCoopMagic({
      state,
      casterIdx: 0,
      coopObjId: TEST_COOP_OBJ_ID,
      targetIdx: 'all',
      playerRoles,
      magics: [COOP_MAGIC],
      objectMagics: OBJ_MAGICS,
      bus: createCommandBus(),
      magicSpriteFrameCounts: new Map([[0, 8]]),
    })
    // 建链:Phase1 聚拢 6 帧 + Phase2/3/4 + OffMagic(14 帧)+ PostMagic + 滑回 6 帧 → 远超 6。
    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.frames.length).toBeGreaterThan(6)
    // 第 6 帧发起者已插值移向 COOP_POS[0]=(208,157)(队形聚拢,验"站成一列"动起来)。
    const f6Caster = state.battleAnim!.frames[5]!.fighters!.find(
      (d) => d.side === 'player' && d.idx === 0,
    )!
    expect(f6Caster.pos).toEqual({ x: 208, y: 157 })
    // 伤害数字挂 PostMagic 第一帧 —— sdlpal PAL_BattleDisplayStatChange 在 OffMagic 后、滑回前。
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
    const numIdx = state.battleAnim!.frames.findIndex((f) => (f.damageNums?.length ?? 0) > 0)
    const firstPostIdx = state.battleAnim!.frames.findIndex((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.idx === 0),
    )
    expect(numIdx).toBeGreaterThan(0)
    expect(numIdx).toBe(firstPostIdx)
    expect(state.battleAnim!.frames[numIdx]!.damageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: 166, color: 'blue' },
    ])
  })

  it('巫后协力 355(天女散花)→ attackField effect18 建法术 overlay 动画', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1),
      makeRole(2),
      makeRole(3),
      makeRole(4, {
        _name: '巫后',
        attackStrength: 168,
        magicStrength: 220,
        cooperativeMagic: 355,
      }),
    ]
    const { state, playerRoles } = makeCoopState(roles, [], [0, 4])
    state.players.forEach((p, i) => {
      p.posOriginal = { x: 240 - i * 20, y: 170 }
    })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const tianNvSanHua: Magic = {
      id: 27,
      effect: 18,
      type: 'attackField',
      xOffset: 0,
      yOffset: 0,
      special: 99,
      speed: 0,
      keepEffect: 0,
      fireDelay: 0,
      effectTimes: 3,
      shake: 0,
      wave: 0,
      unknown: 0,
      costMP: 22,
      baseDamage: 109,
      elemental: 0,
      sound: 274,
    }
    const objectMagics: ObjectMagicView[] = [
      {
        id: 355,
        magicNumber: 27,
        scriptOnSuccess: 0,
        scriptOnUse: 0,
        flags: {
          applyToAll: true,
          usableToEnemy: true,
          usableInBattle: true,
          usableOutsideBattle: false,
        },
      },
    ]
    performCoopMagic({
      state,
      casterIdx: 1,
      coopObjId: 355,
      targetIdx: 'all',
      playerRoles,
      magics: [tianNvSanHua],
      objectMagics,
      bus: createCommandBus(),
      magicSpriteFrameCounts: new Map([[18, 12]]),
    })

    expect(state.battleAnim).toBeDefined()
    expect(
      state.battleAnim!.frames.some((f) =>
        f.overlays?.some((o) => o.kind === 'magic' && o.spriteChunk === 18),
      ),
    ).toBe(true)
    const offFrame = state.battleAnim!.frames.find((f) =>
      f.overlays?.some((o) => o.spriteChunk === 18),
    )!
    expect(offFrame.overlays).toMatchObject([
      { kind: 'magic', spriteChunk: 18, frameIdx: 0, x: 160, y: 200 },
    ])
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
    expect(state.battleAnim!.frames.some((f) => (f.damageNums?.length ?? 0) > 0)).toBe(true)
  })

  it('装备覆盖协力 351(武神 summon)→ 建召唤神 player-10 + 二次 FIRE13 动画,声音挂帧而非只即时播放', () => {
    const roles = [
      makeRole(0, { attackStrength: 40, magicStrength: 60 }),
      makeRole(1),
      makeRole(2),
      makeRole(3),
      makeRole(4, {
        _name: '巫后',
        attackStrength: 168,
        magicStrength: 220,
        magicSound: 12,
        cooperativeMagic: 351,
      }),
    ]
    const { state, playerRoles } = makeCoopState(roles, [], [0, 4])
    state.players.forEach((p, i) => {
      p.posOriginal = { x: 240 - i * 20, y: 170 }
    })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const wuShen: Magic = {
      id: 19,
      effect: 18,
      type: 'summon',
      xOffset: 65528, // SHORT -8
      yOffset: 22,
      special: 0, // F.MKF chunk 10
      speed: 2,
      keepEffect: 1,
      fireDelay: 1,
      effectTimes: 65534, // SHORT -2 背景染色
      shake: 0,
      wave: 0,
      unknown: 0,
      costMP: 88,
      baseDamage: 666,
      elemental: 0,
      sound: 303,
    }
    const wuShenSecondary: Magic = {
      id: 18,
      effect: 13,
      type: 'attackWhole',
      xOffset: 0,
      yOffset: 46,
      special: 10,
      speed: 0,
      keepEffect: 0,
      fireDelay: 0,
      effectTimes: 0,
      shake: 0,
      wave: 0,
      unknown: 0,
      costMP: 0,
      baseDamage: 0,
      elemental: 0,
      sound: 0,
    }
    const objectMagics: ObjectMagicView[] = [
      {
        id: 351,
        magicNumber: 19,
        scriptOnSuccess: 0,
        scriptOnUse: 0,
        flags: {
          applyToAll: true,
          usableToEnemy: true,
          usableInBattle: true,
          usableOutsideBattle: false,
        },
      },
    ]
    const bus = createCommandBus()
    performCoopMagic({
      state,
      casterIdx: 1,
      coopObjId: 351,
      targetIdx: 'all',
      playerRoles,
      magics: [wuShen, wuShenSecondary],
      objectMagics,
      bus,
      magicSpriteFrameCounts: new Map([[13, 8]]),
      summonSpriteFrameCounts: new Map([[10, 4]]),
    })

    expect(
      bus
        .drain()
        .map((entry) => entry.cmd)
        .filter((command) => command.op === 'playSound'),
    ).toEqual([])
    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.hasSummonFade).toBe(true)
    expect(state.battleAnim!.frames.some((f) => f.summon?.spriteKey === 'player-10')).toBe(true)
    const godFrame = state.battleAnim!.frames.find((f) => f.summon?.spriteKey === 'player-10')!
    expect(godFrame.summon).toMatchObject({ pos: { x: 232, y: 187 }, bgColorShift: -2 })
    expect(
      state.battleAnim!.frames.some((f) =>
        f.overlays?.some((o) => o.kind === 'magic' && o.spriteChunk === 13),
      ),
    ).toBe(true)
    expect(state.battleAnim!.frames.find((f) => f.sound === 12)).toBeDefined()
    expect(state.battleAnim!.frames.find((f) => f.sound === 303)).toBeDefined()
    expect(roles[0]!.hp).toBe(412)
    expect(roles[4]!.hp).toBe(412)
    expect(state.enemies[0]!.e.health).toBeLessThan(9000)
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
    const numIdx = state.battleAnim!.frames.findIndex((f) => (f.damageNums?.length ?? 0) > 0)
    const firstFadeOutIdx = state.battleAnim!.frames.findIndex((f) => f.summon?.fadeDir === 'out')
    expect(numIdx).toBeGreaterThan(0)
    expect(firstFadeOutIdx).toBeGreaterThan(numIdx)
    expect(state.battleAnim!.frames[numIdx]!.summon?.spriteKey).toBe('player-10')
    expect(
      state.battleAnim!.frames[numIdx]!.fighters?.some((d) => d.side === 'enemy' && d.idx === 0),
    ).toBe(true)
  })
})
