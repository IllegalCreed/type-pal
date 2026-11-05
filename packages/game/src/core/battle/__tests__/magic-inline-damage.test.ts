/** Player-to-enemy magic damage, target dispatch, and number timing through the real action. */
import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { runScript } from '../../event-system.js'
import { performMagic } from '../actions/magic.js'
import { makeMagic, makeSpell, makeState } from './magic-action.test-fixtures.js'

const commands: Command[] = [{ op: 'end' }]

describe('player magic damage', () => {
  it('单体攻击法术 → enemy 落血(手算 50)+ emit showDamageNum', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 1 })],
      playerRoles,
      bus,
      commands,
      runScript,
    })
    // def=30+44=74; calcBase(64,74)=20; /4=5; +45=50; elem1 windRes5: *5 /5=50; field0: *10/10=50
    expect(state.enemies[0]!.e.health).toBe(50)
    const cmds = bus.drain()
    // D17b:敌人掉血 → blue,target={kind:'enemy',idx:0},value=完整伤害50
    const dmgCmd = cmds.find((c) => c.cmd.op === 'showDamageNum')
    expect(dmgCmd).toBeDefined()
    expect(dmgCmd!.cmd).toMatchObject({
      op: 'showDamageNum',
      color: 'blue',
      target: { kind: 'enemy', idx: 0 },
      value: 50,
    })
  })

  it('超杀:单体攻击法术击杀敌显示完整伤害而非剩余血(fight.c:638)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 30, // < 伤害 50 → 超杀
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 1 })],
      playerRoles,
      bus,
      commands,
      runScript,
    })
    expect(state.enemies[0]!.e.health).toBe(0) // 50 > 30 → 击杀
    const cmds = bus.drain()
    const dmgCmd = cmds.find((c) => c.cmd.op === 'showDamageNum')
    expect(dmgCmd!.cmd).toMatchObject({
      op: 'showDamageNum',
      color: 'blue',
      target: { kind: 'enemy', idx: 0 },
      value: 50, // 完整伤害 50,非剩余血 30
    })
  })

  it('applyToAll 法术 → 全体敌人落血', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      // AoE 判定按 magic.type(sdlpal FIGHT_DetectMagicTargetChange),非 flags.applyToAll
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 1, type: 'attackAll' })],
      playerRoles,
      bus,
      commands,
      runScript,
    })
    expect(state.enemies[0]!.e.health).toBe(50)
    expect(state.enemies[1]!.e.health).toBe(50)
    // D17b:E1 群攻每敌各 emit 一条 showDamageNum,target idx 各异(blue)。
    const dmgs = bus
      .drain()
      .map((c) => c.cmd)
      .filter((c) => c.op === 'showDamageNum')
    expect(dmgs).toHaveLength(2)
    expect(dmgs.map((d) => d.target.idx).sort()).toEqual([0, 1])
    for (const d of dmgs)
      expect(d).toMatchObject({ color: 'blue', target: { kind: 'enemy' }, value: 50 })
  })

  it('血魔神功式(attackWhole + applyToAll=False)+ 单体 targetIdx → 仍打全体(修 bug)', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 5, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0, // 给单体目标,但 type=attackWhole → 应全体
      spells: [
        makeSpell({
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: true,
            applyToAll: false,
          },
        }),
      ],
      magics: [makeMagic({ baseDamage: 45, elemental: 1, type: 'attackWhole' })],
      playerRoles,
      bus,
      commands,
      runScript,
    })
    expect(state.enemies[0]!.e.health).toBe(50)
    expect(state.enemies[1]!.e.health).toBe(50) // 第二个也被打(type-based AoE)
  })

  it('防御类法术(applyToPlayer)→ 不对敌人结算伤害', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ type: 'applyToPlayer', baseDamage: 45 })],
      playerRoles,
      bus,
      commands,
      runScript,
    })
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('负 baseDamage 法术((SHORT)≤0)→ inline guard 不触发,不结算', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 64537, elemental: 0 })], // SHORT −999
      playerRoles,
      bus,
      commands,
      runScript,
    })
    expect(state.enemies[0]!.e.health).toBe(100)
  })

  it('乾坤一掷:scriptOnUse 0x88 set baseDamage by cash → E1 全体伤害(全链)', () => {
    const { state, playerRoles, bus, gs } = makeState({ mp: 30, magicStrength: 0 }, [
      { health: 500, defense: 30, level: 5 },
      { health: 500, defense: 30, level: 5 },
    ])
    gs.dwCash = 1000
    // ip1 = 0x88[394,0,0]
    const cmds: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x88, operands: [394, 0, 0] },
      { op: 'end' },
    ]
    const spell = makeSpell({
      id: 394,
      magicNumber: 100,
      scriptOnUse: 1,
      flags: {
        usableOutsideBattle: false,
        usableInBattle: true,
        usableToEnemy: true,
        applyToAll: true,
      },
    })
    const magic = makeMagic({ id: 100, baseDamage: 0, elemental: 0, type: 'attackAll', costMP: 0 })
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 394,
      targetIsEnemy: true,
      targetIdx: 'all',
      spells: [spell],
      magics: [magic],
      playerRoles,
      bus,
      commands: cmds,
      runScript,
      objectMagics: [
        {
          id: 394,
          magicNumber: 100,
          scriptOnSuccess: 0,
          scriptOnUse: 0,
          flags: {
            usableOutsideBattle: false,
            usableInBattle: true,
            usableToEnemy: true,
            applyToAll: true,
          },
        },
      ],
      gs,
    })
    // 0x88:cash 1000 → baseDamage floor(1000*2/5)=400,cash 0;
    // E1:magStr0 → calcBase(0,74)=0 /4=0 +400=400(applyToAll → 全体)
    expect(state.enemies[0]!.e.health).toBe(100) // 500-400
    expect(state.enemies[1]!.e.health).toBe(100)
    expect(gs.dwCash).toBe(0)
  })

  it('敌人施法 → 不走 inline path(player-only),enemy 不被自己打', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      { health: 100, defense: 30, level: 5 },
    ])
    performMagic({
      state,
      casterIsEnemy: true,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: false,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 1 })],
      playerRoles,
      bus,
      commands,
      runScript,
    })
    expect(state.enemies[0]!.e.health).toBe(100)
  })
})

describe('damage number timing', () => {
  it('建了攻击法术动画链 → 不立即 emit,数字挂 PostMagic 第一帧', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    // 建动画链前置:caster + target posOriginal + magicSpriteFrameCounts 有该 effect
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 0, effect: 1, type: 'normal' })],
      playerRoles,
      bus,
      commands,
      runScript,
      magicSpriteFrameCounts: new Map([[1, 5]]),
    })
    // 伤害已结算(HP 落),但数字**未立即 emit**
    expect(state.enemies[0]!.e.health).toBe(50)
    const cmds = bus.drain()
    expect(cmds.find((c) => c.cmd.op === 'showDamageNum')).toBeUndefined()
    // 数字挂到 PostMagic 第一帧:OffMagic 结束后、敌人受击开始时 emit。
    expect(state.battleAnim).toBeDefined()
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
    const numIdx = state.battleAnim!.frames.findIndex((f) => (f.damageNums?.length ?? 0) > 0)
    const firstPostIdx = state.battleAnim!.frames.findIndex((f) =>
      f.fighters?.some((d) => d.side === 'enemy' && d.idx === 0),
    )
    expect(numIdx).toBeGreaterThan(0)
    expect(numIdx).toBe(firstPostIdx)
    expect(state.battleAnim!.frames[numIdx]!.damageNums).toEqual([
      { target: { kind: 'enemy', idx: 0 }, value: 50, color: 'blue' },
    ])
  })

  it('未建动画链(无 magicSpriteFrameCounts)→ 立即 emit', () => {
    const { state, playerRoles, bus } = makeState({ mp: 30, magicStrength: 64 }, [
      {
        health: 100,
        defense: 30,
        level: 5,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      },
    ])
    performMagic({
      state,
      casterIsEnemy: false,
      casterIdx: 0,
      spellId: 7,
      targetIsEnemy: true,
      targetIdx: 0,
      spells: [makeSpell()],
      magics: [makeMagic({ baseDamage: 45, elemental: 0, effect: 1, type: 'normal' })],
      playerRoles,
      bus,
      commands,
      runScript,
    })
    const cmds = bus.drain()
    expect(cmds.map(({ cmd }) => cmd)).toEqual([
      { op: 'showDamageNum', target: { kind: 'enemy', idx: 0 }, value: 50, color: 'blue' },
    ])
    expect(state.battleAnim).toBeUndefined()
  })
})
