/** Direct magic-action contracts; controller scheduling and browser presentation are separate. */
import type { Command, Magic, ObjectMagicView, Spell } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { recordingRng } from '../../../__tests__/scripted-rng.js'
import { runScript } from '../../event-system.js'
import { performMagic, type RunScriptFn } from '../actions/magic.js'
import { makeActionFixture } from './action.test-fixtures.js'

const SUMMON_FADE_STEPS = 72 // PAL_BattleFadeScene: 12 × 6 steps.

afterEach(() => vi.restoreAllMocks())

function makeSpell(opts: Partial<Spell> = {}): Spell {
  return {
    id: 1,
    _name: 'TestSpell',
    magicNumber: 1,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    scriptDesc: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: true,
      applyToAll: false,
    },
    ...opts,
  }
}

function makeMagic(opts: Partial<Magic> = {}): Magic {
  return {
    id: 1,
    effect: 0,
    type: 'normal',
    xOffset: 0,
    yOffset: 0,
    special: 0,
    speed: 0,
    keepEffect: 0,
    fireDelay: 0,
    effectTimes: 0,
    shake: 0,
    wave: 0,
    unknown: 0,
    costMP: 5,
    baseDamage: 50,
    elemental: 0,
    sound: 0,
    ...opts,
  }
}

function makeObjectMagic(opts: Partial<ObjectMagicView> = {}): ObjectMagicView {
  return {
    id: 295,
    magicNumber: 47,
    scriptOnSuccess: 0,
    scriptOnUse: 0,
    flags: {
      usableOutsideBattle: false,
      usableInBattle: true,
      usableToEnemy: false,
      applyToAll: true,
    },
    ...opts,
  }
}

describe('performMagic', () => {
  it('队员 cast,MP 足够 → 扣 MP 并向脚本传真实目标', () => {
    const { state, playerRoles, bus, gs } = makeActionFixture({
      role: { mp: 30, maxMP: 30 },
    })
    const spell = makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 1 })
    // baseDamage:0 —— 本测专注 MP/runScript 上下文,inline 伤害由 magic-inline-damage.test.ts 覆盖
    const magic = makeMagic({ id: 3, costMP: 8, baseDamage: 0 })
    const execute = vi.fn<RunScriptFn>(runScript)
    const commands: Command[] = [
      { op: 'end' },
      { op: 'giveItem', itemId: 99, count: 1 },
      { op: 'end' },
    ]
    performMagic({
      state,
      gs,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands,
      runScript: execute,
    })
    // 扣 MP
    expect(playerRoles.roles[0]!.mp).toBe(22) // 30 - 8
    // runScript 被调
    expect(execute).toHaveBeenCalledTimes(1)
    const opts = execute.mock.calls[0]![0]
    expect(opts.ip).toBe(1)
    expect(opts.runtimeMode).toBe('battle')
    expect(opts.commands).toBe(commands)
    expect(opts.battleCtx).toMatchObject({
      state,
      caster: { type: 'player', idx: 0 },
      target: { type: 'enemy', idx: 0 },
    })
    expect(gs.inventory).toEqual([{ itemId: 99, count: 1 }])
  })
  // M6 法术起手音 —— sdlpal PAL_BattleShowPlayerPreMagicAnim CLASSIC 分支(fight.c:2377,!fIsWIN95)播
  //   AUDIO_PlaySound(rgwMagicSound[role]) = **每角色自己的施法音**(非固定;李逍遥9/赵灵儿10/林月如11)。
  //   2026-06-03 user 实听 9/10/11 纠正:此前误用固定 28(实为物品演出音 PAL_BattleShowPlayerUseItemAnim)。
  it('法术音:队员施法 push 本角色 magicSound + 效果音;敌方施法播 enemy.magicSound', () => {
    // 队员施法 → [role.magicSound(9), 55(magic.sound 效果)]
    {
      const { state, playerRoles, gs, bus } = makeActionFixture({
        role: { mp: 30, maxMP: 30, magicSound: 9 },
      })
      performMagic({
        state,
        casterIsEnemy: false,
        casterIdx: 0,
        spellId: 7,
        targetIsEnemy: true,
        targetIdx: 0,
        spells: [makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 0 })],
        magics: [makeMagic({ id: 3, costMP: 8, baseDamage: 0, sound: 55 })],
        playerRoles,
        bus,
        commands: [{ op: 'end' }],
        runScript: vi.fn(),
        gs,
      })
      expect(gs.pendingSounds).toEqual([9, 55])
    }
    // 敌方施法 → 播敌人自身 cast 音 enemy.magicSound(62,sdlpal fight.c:4695)+ 效果音(走 enemy 分支,非 role)
    {
      const { state, playerRoles, gs, bus } = makeActionFixture({
        role: { mp: 30, maxMP: 30 },
        enemies: [{ magicSound: 62 }],
      })
      performMagic({
        state,
        casterIsEnemy: true,
        casterIdx: 0,
        spellId: 7,
        targetIsEnemy: false,
        targetIdx: 0,
        spells: [makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 0 })],
        magics: [makeMagic({ id: 3, costMP: 8, baseDamage: 0, sound: 55 })],
        playerRoles,
        bus,
        commands: [{ op: 'end' }],
        runScript: vi.fn(),
        gs,
      })
      expect(gs.pendingSounds ?? []).toEqual([62, 55]) // 敌 cast 音 62 + 效果音 55
    }
  })
  // 效果音声画同步(建链路径):sdlpal WIN95 在特效帧循环 i==0 播 magic.wSound(玩家 DefMagic
  //   fight.c:2497-2502 / 敌方 fight.c:2925-2930),不在演出 dispatch 时。之前 DefMagic/敌方即时
  //   push → 先闻其声后见前摇(user 2026-06-13 报草妖风咒/气疗术)。未建链(上个用例)仍即时播。
  it('玩家 DefMagic 建链:效果音挂特效首帧,不即时 push(气疗术类)', () => {
    const { state, playerRoles, gs, bus } = makeActionFixture({
      role: { mp: 30, maxMP: 30, magicSound: 9 },
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [
        makeSpell({
          id: 7,
          magicNumber: 3,
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: false,
            applyToAll: false,
          },
        }),
      ],
      magics: [
        makeMagic({
          id: 3,
          costMP: 8,
          baseDamage: 0,
          type: 'applyToPlayer',
          effect: 15,
          sound: 335,
        }),
      ],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript: vi.fn(),
      gs,
      magicSpriteFrameCounts: new Map([[15, 5]]), // effect 15 有帧 → 建 DefMagic 链
    })
    expect(gs.pendingSounds ?? []).not.toContain(335) // 不即时 push(防双响/提前)
    const frames = state.battleAnim?.frames ?? []
    const sndFrames = frames.filter((f) => f.sound === 335)
    expect(sndFrames).toHaveLength(1) // 恰一帧
    // 挂在特效首帧(带 magic overlay frameIdx=0),而非 PreMagic 前摇
    expect(sndFrames[0]!.overlays).toMatchObject([{ kind: 'magic', frameIdx: 0 }])
  })
  it('敌方施法建链:效果音挂特效首帧;enemy.magicSound<0 → 效果音静音(WIN95 gate),施法音 abs 照播', () => {
    // magicSound=62(>=0):效果音 55 挂特效首帧,施法音 62 挂 intro 帧
    {
      const { state, playerRoles, gs, bus } = makeActionFixture({
        role: { mp: 30, maxMP: 30 },
        enemies: [{ magicSound: 62 }],
      })
      state.enemies[0]!.posOriginal = { x: 160, y: 80 }
      state.players[0]!.posOriginal = { x: 240, y: 170 }
      performMagic({
        state,
        casterIsEnemy: true,
        casterIdx: 0,
        spellId: 7,
        targetIsEnemy: false,
        targetIdx: 0,
        spells: [makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 0 })],
        magics: [
          makeMagic({ id: 3, costMP: 8, baseDamage: 0, type: 'normal', effect: 12, sound: 55 }),
        ],
        playerRoles,
        bus,
        commands: [{ op: 'end' }],
        runScript: vi.fn(),
        gs,
        magicSpriteFrameCounts: new Map([[12, 8]]),
      })
      expect(gs.pendingSounds ?? []).not.toContain(55)
      const frames = state.battleAnim?.frames ?? []
      expect(frames.filter((f) => f.sound === 62)).toHaveLength(1) // 施法音挂 intro
      const sndFrames = frames.filter((f) => f.sound === 55)
      expect(sndFrames).toHaveLength(1)
      expect(sndFrames[0]!.overlays).toMatchObject([{ kind: 'magic', frameIdx: 0 }])
    }
    // magicSound=-62(<0):WIN95 fight.c:2928-2929 效果音不播;施法音 abs(-62)=62 照播(audio.c:529 abs)
    {
      const { state, playerRoles, gs, bus } = makeActionFixture({
        role: { mp: 30, maxMP: 30 },
        enemies: [{ magicSound: -62 }],
      })
      state.enemies[0]!.posOriginal = { x: 160, y: 80 }
      state.players[0]!.posOriginal = { x: 240, y: 170 }
      performMagic({
        state,
        casterIsEnemy: true,
        casterIdx: 0,
        spellId: 7,
        targetIsEnemy: false,
        targetIdx: 0,
        spells: [makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 0 })],
        magics: [
          makeMagic({ id: 3, costMP: 8, baseDamage: 0, type: 'normal', effect: 12, sound: 55 }),
        ],
        playerRoles,
        bus,
        commands: [{ op: 'end' }],
        runScript: vi.fn(),
        gs,
        magicSpriteFrameCounts: new Map([[12, 8]]),
      })
      const frames = state.battleAnim?.frames ?? []
      expect(frames.every((f) => f.sound !== 55)).toBe(true) // 效果音静音
      expect(gs.pendingSounds ?? []).not.toContain(55)
      expect(frames.filter((f) => f.sound === 62)).toHaveLength(1) // 施法音取 abs 照播
    }
  })
  // 敌法术收尾帧序(fight.c:4897-4908):受击 5 帧 → 敌复位+Delay(1) → **UpdateFighters 复位受击
  //   队员** → Delay(8)。旧版把 9 帧停顿整段放复位前 → 受击者保持后仰 frame4 + 击退位多 360ms
  //   (user 2026-06-13 报"风咒受击后仰停顿过长";原版后仰仅 ~240ms)。
  it('敌方法术致伤:受击队员复位帧在 320ms 收尾停顿帧上(复位先于停顿,非链终 reset 兜底)', () => {
    const { state, playerRoles, gs, bus } = makeActionFixture({
      // hp 高位:挨一发仍活且不濒死 → 复位帧应为站立 0(死亡/濒死帧值另由 playerRestFrame 同源覆盖)
      role: { mp: 30, maxMP: 30, hp: 1000, maxHP: 1000 },
      enemies: [{ magicSound: 62, magicStrength: 50, level: 5 }],
    })
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell({ id: 7, magicNumber: 3, scriptOnUse: 0 })],
      magics: [
        makeMagic({ id: 3, costMP: 8, baseDamage: 60, type: 'normal', effect: 12, sound: 55 }),
      ],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript: vi.fn(),
      gs,
      magicSpriteFrameCounts: new Map([[12, 8]]),
    })
    const frames = state.battleAnim?.frames ?? []
    expect(frames.length).toBeGreaterThan(0)
    // 链末帧 = Delay(8) 停顿,且**同帧**带受击队员复位(pos→posOriginal + 站姿 + 红闪清零)
    const last = frames[frames.length - 1]!
    expect(last.durationMs).toBe(8 * 40)
    expect(last.fighters).toMatchObject([
      { side: 'player', idx: 0, pos: { x: 240, y: 170 }, currentFrame: 0, iColorShift: 0 },
    ])
    // 倒数第二帧 = 敌复位 frame0 + posOriginal,Delay(1)(fight.c:4901-4903)
    const second = frames[frames.length - 2]!
    expect(second.durationMs).toBe(40)
    expect(second.fighters).toMatchObject([
      { side: 'enemy', idx: 0, currentFrame: 0, pos: { x: 160, y: 80 } },
    ])
    // 收尾停顿帧 = C Delay(8, 0, TRUE)(fight.c:4908):停顿期敌人 idle 呼吸恢复推进
    expect(last.updateGesture).toBe(true)
    expect(second.updateGesture).toBeUndefined() // 敌复位帧 Delay(1, 0, FALSE)(fight.c:4904)
  })
  // 顺序修:user 先后报"灵葫咒掉血在动画前"和"武神数字等整段动画结束才出"。
  //   SDLPal 是 OffMagic/Summon 主特效结束后 DisplayStatChange,随后 PostMagic 受击动画。
  it('scriptOnSuccess 秒杀(0x60)数字挂 PostMagic 第一帧,不等整条时间线结束(灵葫咒类,真 runScript)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { mp: 30, maxMP: 30 },
      enemies: [{ level: 5, health: 100 }],
    })
    // 时间线前置:caster + target 有 posOriginal + magicSpriteFrameCounts 有 effect → 建 OffMagic 链
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    // scriptOnSuccess @ip1 = 0x60 秒杀目标敌(ctx.target);baseDamage SHORT -999 哨兵 → 无 inline 伤害,只 KO 数字
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x60, operands: [0xffff, 0, 0] },
      { op: 'end' },
    ]
    const spell = makeSpell({ id: 9, magicNumber: 5, scriptOnUse: 0, scriptOnSuccess: 1 })
    const magic = makeMagic({ id: 5, effect: 7, type: 'normal', baseDamage: 64537 })
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 9,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands,
      runScript,
      magicSpriteFrameCounts: new Map([[7, 4]]), // effect 7 有 4 帧 → 建 OffMagic 时间线
    })
    expect(state.enemies[0]!.e.health).toBe(0) // 秒杀生效(逻辑同步)
    // 关键:秒杀数字不即时 emit,而挂到 PostMagic 第一帧(敌人开始受击时),不再等整条时间线播完。
    expect(bus.drain().filter((c) => c.cmd.op === 'showDamageNum')).toHaveLength(0)
    expect(state.battleAnim?.pendingDamageNums ?? []).toHaveLength(0)
    const frames = state.battleAnim?.frames ?? []
    const numIdx = frames.findIndex((f) => (f.damageNums?.length ?? 0) > 0)
    const firstPostIdx = frames.findIndex((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.idx === 0),
    )
    expect(numIdx).toBe(firstPostIdx)
    expect(frames[numIdx]!.damageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: 100, color: 'blue' },
    ])
  })
  it('武神/召唤法术:伤害数字在召唤神淡出前的 PostMagic 第一帧显示', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { mp: 120, maxMP: 120, magicStrength: 80 },
      enemies: [{ health: 9000, defense: 20, level: 5 }],
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const wuShen = makeMagic({
      id: 19,
      type: 'summon',
      special: 0,
      effect: 52,
      xOffset: -8,
      yOffset: 22,
      speed: 0,
      effectTimes: 0xfffe,
      baseDamage: 250,
      sound: 303,
    })
    const wuShenSecondary = makeMagic({
      id: 52,
      effect: 13,
      type: 'attackAll',
      speed: 0,
      fireDelay: 0,
      effectTimes: 1,
      baseDamage: 0,
    })
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 351,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [
        makeSpell({
          id: 351,
          magicNumber: 19,
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: true,
            applyToAll: true,
          },
        }),
      ],
      magics: [wuShen, wuShenSecondary],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
      magicSpriteFrameCounts: new Map([[13, 8]]),
      summonSpriteFrameCounts: new Map([[10, 4]]),
    })
    expect(bus.drain().filter((c) => c.cmd.op === 'showDamageNum')).toHaveLength(0)
    expect(state.battleAnim?.pendingDamageNums ?? []).toHaveLength(0)
    const frames = state.battleAnim?.frames ?? []
    const numIdx = frames.findIndex((f) => (f.damageNums?.length ?? 0) > 0)
    const firstFadeOutIdx = frames.findIndex((f) => f.summon?.fadeDir === 'out')
    expect(numIdx).toBeGreaterThan(0)
    expect(firstFadeOutIdx).toBeGreaterThan(numIdx)
    expect(frames[numIdx]!.summon?.spriteKey).toBe('player-10')
    expect(frames[numIdx]!.fighters?.some((d) => d.side === 'enemy' && d.idx === 0)).toBe(true)
    expect(frames[numIdx]!.damageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: 264, color: 'blue' },
    ])
  })
  // 火神等召唤法术:二次法术效果(OffMagic)须带二次 magic 的 sLayerOffset(MAGIC.special)做 z 排序,
  //   否则 layerOffset 落 0 → 法术精灵排进敌人堆被遮挡(user 2026-06-23 报"火神法术效果在敌人图层之后")。
  //   火神二次 magic 17 special=99(≈恒最上,animation/magic-effects.ts 的 layerOffset 合同);常规攻击魔法路径已透传 special,召唤分支此前漏传。
  it('召唤法术:二次法术效果 overlay 带二次 magic 的 special 作 layerOffset(火神 special=99 恒最上,不被敌人遮挡)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { mp: 120, maxMP: 120, magicStrength: 80 },
      enemies: [{ health: 9000, defense: 20, level: 5 }],
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const huoShen = makeMagic({
      id: 94,
      type: 'summon',
      special: 8,
      effect: 17,
      baseDamage: 250,
      sound: 304,
    })
    // 火神二次 magic 17:attackAll,special=99(sLayerOffset 恒最上)。
    const huoShenSecondary = makeMagic({
      id: 17,
      type: 'attackAll',
      effect: 12,
      special: 99,
      speed: 1,
    })
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 389,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [
        makeSpell({
          id: 389,
          magicNumber: 94,
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: true,
            applyToAll: true,
          },
        }),
      ],
      magics: [huoShen, huoShenSecondary],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript,
      magicSpriteFrameCounts: new Map([[12, 8]]),
      summonSpriteFrameCounts: new Map([[18, 4]]),
    })
    const frames = state.battleAnim?.frames ?? []
    const magicOverlays = frames.flatMap((f) =>
      (f.overlays ?? []).filter((o) => o.kind === 'magic'),
    )
    // 二次法术效果确实喷发(有 magic overlay),且每个都带 special=99(非默认 0)。
    expect(magicOverlays.length).toBeGreaterThan(0)
    for (const ov of magicOverlays) expect(ov.layerOffset).toBe(99)
  })
  it('金蝉脱壳 scriptOnUse(0x3A)→ 触发 PlayerEscape 动画,不直接结束战斗', () => {
    const { state, playerRoles, gs, bus } = makeActionFixture({ role: { mp: 99, maxMP: 99 } })
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x3a, operands: [43072, 0, 0] },
      { op: 'end' },
    ]
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 392,
      targetIsEnemy: false,
      targetIdx: 'all',
      spells: [
        makeSpell({
          id: 392,
          magicNumber: 99,
          scriptOnUse: 1,
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: false,
            applyToAll: true,
          },
        }),
      ],
      magics: [makeMagic({ id: 99, costMP: 33, baseDamage: 0, effect: 0xffff, sound: 0 })],
      playerRoles,
      bus,
      commands,
      runScript,
      gs,
    })
    expect(playerRoles.roles[0]!.mp).toBe(66)
    expect(state.fleeAnim).toEqual({ step: 0 })
    expect(state.phase).toBe('performAction')
    expect(gs.pendingSounds).toEqual([45])
  })
  it('0x2E 抵抗分支以战斗旁白显示「失败　没有效果」', () => {
    const { state, playerRoles, bus, gs } = makeActionFixture({ role: { mp: 99, maxMP: 99 } })
    state.enemies[0]!.resistanceToSorcery = 10 // 0x2E RandomLong(0,9) 永远不大于 10 → 失败跳转
    state.rng = recordingRng([0])
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x2e, operands: [0, 0, 3] },
      { op: 'end' },
      { op: 'setDialogStyleNarration' },
      { op: 'showDialog', messageIndex: 13364, text: '失败　没有效果' },
      { op: 'end' },
    ]
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 304,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ id: 304, magicNumber: 67, scriptOnSuccess: 1 })],
      magics: [makeMagic({ id: 67, costMP: 83, baseDamage: 64537, effect: 39, sound: 170 })],
      playerRoles,
      bus,
      commands,
      runScript,
      gs,
    })
    expect(state.battleDialogQueue?.[0]).toMatchObject({
      text: '失败　没有效果',
      style: 'narration',
    })
    expect(bus.drain().some((c) => c.cmd.op === 'showBattleMessage')).toBe(false)
  })
  // 本项目既定>=取舍，当前SDLPal原文是>；这是合法小脚本，不冒称原盘夺魂脚本。
  it('0x2E 项目既定零抗性边界：掷0施加4回合混乱', () => {
    const { state, playerRoles, gs, bus } = makeActionFixture({ role: { mp: 99, maxMP: 99 } })
    state.enemies[0]!.resistanceToSorcery = 0 // 巫抗0:旧 `>` 掷0 抵抗(上限90%);新 `>=` 掷0 命中(100%)
    state.rng = recordingRng([0]) // 掷出最小值 0
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x2e, operands: [0, 4, 3] }, // 命中→设status;抵抗→跳 ip3 失败分支
      { op: 'end' },
      { op: 'setDialogStyleNarration' },
      { op: 'showDialog', messageIndex: 13364, text: '失败　没有效果' },
      { op: 'end' },
    ]
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 304,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ id: 304, magicNumber: 67, scriptOnSuccess: 1 })],
      magics: [makeMagic({ id: 67, costMP: 83, baseDamage: 64537, effect: 39, sound: 170 })],
      playerRoles,
      bus,
      commands,
      runScript,
      gs,
    })
    // 巫抗0、掷0:`0 >= 0` 命中 → 不走"失败　没有效果"失败分支
    expect(state.battleDialogQueue?.[0]?.text).not.toBe('失败　没有效果')
    expect(state.enemies[0]!.status.confused).toBe(4)
  })
  it('队员 cast,MP 不足 → 不扣 + 不 emit + 不 runScript + console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeActionFixture({
      role: { mp: 3 },
    })
    const spell = makeSpell({ id: 1, magicNumber: 1, scriptOnUse: 10 })
    const magic = makeMagic({ id: 1, costMP: 10 })
    const execute = vi.fn<RunScriptFn>(runScript)
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 1,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript: execute,
    })
    expect(playerRoles.roles[0]!.mp).toBe(3) // 不扣
    expect(bus.drain()).toEqual([]) // 不 emit
    expect(execute).not.toHaveBeenCalled()
    expect(warnSpy.mock.calls).toEqual([['[magic] role 0 not enough MP (have 3, need 10)']])
    warnSpy.mockRestore()
  })
  it('敌人 cast → 不扣队员 MP，仍向脚本传敌方施法上下文', () => {
    const { state, playerRoles, bus, gs } = makeActionFixture({
      role: { mp: 30 },
    })
    const spell = makeSpell({ id: 5, magicNumber: 2, scriptOnUse: 1 })
    const magic = makeMagic({ id: 2, costMP: 999, baseDamage: 0 }) // costMP 巨大验证不扣;baseDamage=0 避开 E2 伤害(本例只测 MP/runScript)
    const execute = vi.fn<RunScriptFn>(runScript)
    performMagic({
      state,
      gs,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 5,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }, { op: 'giveItem', itemId: 99, count: 1 }, { op: 'end' }],
      runScript: execute,
    })
    // 队员 mp 不动
    expect(playerRoles.roles[0]!.mp).toBe(30)
    // 仍 runScript
    expect(execute).toHaveBeenCalledTimes(1)
    const opts = execute.mock.calls[0]![0]
    expect(opts.battleCtx?.caster).toEqual({ type: 'enemy', idx: 0 })
    expect(opts.battleCtx?.target).toEqual({ type: 'player', idx: 0 })
    expect(gs.inventory).toEqual([{ itemId: 99, count: 1 }])
  })
  it('敌人攻击魔法(baseDamage>0)→ 目标队员真掉血 + emit showDamageNum(E2 enemy→player 结算)', () => {
    // 之前敌方攻击魔法只播动画不结算伤害(纯演出)→ E2 补齐。
    const { state, playerRoles, bus } = makeActionFixture({
      role: { hp: 500, defense: 30, level: 5 },
      enemies: [{ magicStrength: 28, level: 0 }],
      rolls: [1], // range(0,3)=1：不格挡。next()=0：法术倍率固定1。
    })
    const spell = makeSpell({ id: 5, magicNumber: 2 })
    const magic = makeMagic({ id: 2, type: 'normal', baseDamage: 45, elemental: 1, costMP: 0 })
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 5,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript: (opts) => opts.ip,
    })
    // C：mag64/def30得base80；80/4+45=65，玩家抗性基线100/mult20后仍65。
    expect(playerRoles.roles[0]!.hp).toBe(435)
    const dmgCmd = bus.drain().find((c) => c.cmd.op === 'showDamageNum')
    expect(dmgCmd?.cmd).toMatchObject({
      op: 'showDamageNum',
      target: { kind: 'player', idx: 0 },
      color: 'blue',
      value: 65,
    })
  })
  it('敌人非攻击 type(summon)但 baseDamage>0 → 仍结算伤害(E2 gate type-agnostic,sdlpal fight.c:4772)', () => {
    // sdlpal 敌方魔法只看 baseDamage>0,不限 magic.type(summon 等也打)。验证不被 OFF_MAGIC_TYPES 漏掉。
    const { state, playerRoles, bus } = makeActionFixture({
      role: { hp: 500, defense: 30, level: 5 },
      enemies: [{ magicStrength: 28, level: 0 }],
      rolls: [1], // range(0,3)=1：不格挡。next()=0：法术倍率固定1。
    })
    const spell = makeSpell({ id: 5, magicNumber: 2 })
    const magic = makeMagic({ id: 2, type: 'summon', baseDamage: 45, elemental: 1, costMP: 0 })
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 5,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript: (opts) => opts.ip,
    })
    expect(playerRoles.roles[0]!.hp).toBe(435) // summon也消费同一合法伤害合同。
  })
  it('spell id 不存在 → warn + 不 emit + 不 runScript', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeActionFixture()
    const execute = vi.fn<RunScriptFn>(runScript)
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 999, // 不存在
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ id: 1 })],
      magics: [makeMagic()],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript: execute,
    })
    expect(bus.drain()).toEqual([])
    expect(execute).not.toHaveBeenCalled()
    expect(warnSpy.mock.calls).toEqual([['[magic] spell id 999 not found']])
    warnSpy.mockRestore()
  })
  it('magic id(spell.magicNumber)不在 magics 表 → warn + 不 emit + 不 runScript', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { state, playerRoles, bus } = makeActionFixture()
    const execute = vi.fn<RunScriptFn>(runScript)
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 1,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell({ id: 1, magicNumber: 99 })], // 指向不存在的 magic
      magics: [makeMagic({ id: 1 })],
      playerRoles,
      bus,
      commands: [{ op: 'end' }],
      runScript: execute,
    })
    expect(bus.drain()).toEqual([])
    expect(execute).not.toHaveBeenCalled()
    expect(warnSpy.mock.calls).toEqual([['[magic] magic 99 (spell 1) not found in Magic table']])
    warnSpy.mockRestore()
  })
  it('全体法术不设单体target，真实脚本、扣MP和三个伤害反馈均保留', () => {
    const { state, playerRoles, bus, gs } = makeActionFixture({
      role: { mp: 30 },
      enemies: [{}, {}, {}],
    })
    const spell = makeSpell({ id: 1, magicNumber: 1, scriptOnUse: 1 })
    const magic = makeMagic({ id: 1, costMP: 5, type: 'attackAll' })
    const execute = vi.fn<RunScriptFn>(runScript)
    performMagic({
      state,
      gs,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 1,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: [{ op: 'end' }, { op: 'giveItem', itemId: 99, count: 1 }, { op: 'end' }],
      runScript: execute,
    })
    // runScript 调用,battleCtx.target=undefined
    expect(execute).toHaveBeenCalledTimes(1)
    const opts = execute.mock.calls[0]![0]
    expect(opts.battleCtx?.target).toBeUndefined()
    expect(opts.battleCtx?.caster).toEqual({ type: 'player', idx: 0 })
    expect(gs.inventory).toEqual([{ itemId: 99, count: 1 }])
    expect(playerRoles.roles[0]!.mp).toBe(25)
    expect(state.enemies.filter((enemy) => !enemy.defeated).map((enemy) => enemy.e.health)).toEqual(
      [50, 50, 50],
    )
    expect(bus.drain().flatMap(({ cmd }) => (cmd.op === 'showDamageNum' ? [cmd] : []))).toEqual([
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 50, color: 'blue' },
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 1 }, value: 50, color: 'blue' },
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 2 }, value: 50, color: 'blue' },
    ])
  })
  it('梦蛇295:spells 缺项时从 object-magics 解析并在 Trance 闪色末帧切换 sprite', () => {
    const { state, playerRoles, gs, bus } = makeActionFixture({
      role: { mp: 120, maxMP: 120, spriteNumInBattle: 1, magicSound: 9 },
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.players[0]!.pos = { x: 240, y: 170 }
    state.players[0]!.spriteNumOverride = 1
    const execute = vi.fn<RunScriptFn>(runScript)
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 295,
      targetIsEnemy: false,
      targetIdx: 'all',
      spells: [],
      objectMagics: [makeObjectMagic({ id: 295, magicNumber: 47, scriptOnSuccess: 1 })],
      magics: [makeMagic({ id: 47, type: 'trance', costMP: 99, baseDamage: 0, sound: 335 })],
      playerRoles,
      bus,
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x31, operands: [295, 0, 0] }, { op: 'end' }],
      runScript: execute,
      gs,
    })
    expect(playerRoles.roles[0]!.mp).toBe(21)
    expect(execute).toHaveBeenCalledTimes(1)
    expect(execute.mock.calls[0]![0].ip).toBe(1)
    expect(state.players[0]!.spriteNumOverride).toBe(1) // 闪色阶段仍用旧 sprite
    expect(state.battleAnim?.frames.length).toBeGreaterThan(7)
    expect(state.battleAnim?.frames.some((f) => f.sound === 9)).toBe(true)
    expect(gs.pendingSounds ?? []).not.toContain(335) // trance:原版 DefMagicAnim effect=0xFFFF 早退,magic.sound 335 不播(fight.c:2480-2484/2501)
    // L19:闪色 6 帧(旧精灵 iColorShift 渐变)后,**不再硬切**,而是接 72 步 dither crossfade
    //   (fight.c:4234-4240 VIDEO_BackupScreen→LoadBattleSprites→iColorShift=0→MakeScene→FadeScene)。
    const fr = state.battleAnim!.frames
    const flashStart = fr.length - SUMMON_FADE_STEPS - 6
    expect(fr.slice(flashStart, flashStart + 6).map((f) => f.fighters?.[0]?.iColorShift)).toEqual([
      0, 2, 4, 6, 8, 10,
    ])
    // fade 段:72 帧,每帧已切到新精灵 295 + iColorShift=0,复用 summon crossfade 引擎(fadeDir='out' 不画神/不隐队员)。
    const fadeFrames = fr.slice(-SUMMON_FADE_STEPS)
    expect(fadeFrames.length).toBe(SUMMON_FADE_STEPS)
    expect(
      fadeFrames.every(
        (f) =>
          f.summon?.fadeDir === 'out' &&
          f.fighters?.[0]?.iColorShift === 0 &&
          f.fighters?.[0]?.spriteNumOverride === 295,
      ),
    ).toBe(true)
    expect(fadeFrames[0]!.summon?.fadeStep).toBe(0)
    expect(fadeFrames.at(-1)!.summon?.fadeStep).toBe(SUMMON_FADE_STEPS - 1)
    expect(state.battleAnim?.hasSummonFade).toBe(true) // present 据此在非 fade 帧(闪色)快照 from
    expect(state.battleAnim?.frames.at(-1)?.fighters?.[0]).toMatchObject({
      side: 'player',
      idx: 0,
      iColorShift: 0,
      spriteNumOverride: 295,
    })
  })
  it('斩龙诀式 scriptOnUse 0x35:振屏挂到 OffMagic 起始,不提前写全局 gs.shakeTime', () => {
    const { state, playerRoles, gs, bus } = makeActionFixture({
      role: { mp: 120, maxMP: 120, spriteNumInBattle: 1, magicStrength: 100 },
      enemies: [{ health: 500 }],
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const execute = vi.fn<RunScriptFn>(runScript)
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 342,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [
        makeSpell({
          id: 342,
          magicNumber: 16,
          scriptOnUse: 1,
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: true,
            applyToAll: true,
          },
        }),
      ],
      magics: [
        makeMagic({
          id: 16,
          effect: 11,
          type: 'attackWhole',
          xOffset: 0,
          yOffset: 44,
          speed: 0,
          fireDelay: 0,
          effectTimes: 0,
          shake: 0,
          baseDamage: 280,
        }),
      ],
      playerRoles,
      bus,
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x35, operands: [14, 0, 0] }, { op: 'end' }],
      runScript: execute,
      gs,
      magicSpriteFrameCounts: new Map([[11, 6]]),
    })
    expect(gs.shakeTime).toBe(0)
    const frames = state.battleAnim?.frames ?? []
    const firstMagicIdx = frames.findIndex((f) =>
      f.overlays?.some((o) => o.kind === 'magic' && o.spriteChunk === 11),
    )
    expect(firstMagicIdx).toBeGreaterThan(0)
    expect(frames.slice(0, firstMagicIdx).some((f) => f.shake)).toBe(false)
    expect(frames[firstMagicIdx]?.shake).toEqual({ time: 14, level: 4 })
  })
})
