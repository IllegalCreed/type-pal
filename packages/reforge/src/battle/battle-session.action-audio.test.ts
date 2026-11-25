import { describe, expect, test } from 'vitest'
import { realFrame, wfEnemy, wfHealItem } from '../__tests__/battle-workflows/catalog.js'
import { makeSoloSession } from '../__tests__/battle-workflows/session-driver.js'
import type { LoadedSprite } from '../assets.js'
import type { BattleSession } from './battle-session.js'

function fireSprite(): LoadedSprite {
  return { frames: [realFrame()], anchorX: 0, anchorY: 1 }
}

function driveOneRound(session: BattleSession, ticks = 12): void {
  session.tick(16, new Set([' ']))
  session.tick(16, new Set([' ']))
  for (let i = 0; i < ticks; i++) session.tick(500, new Set())
}

describe('行动时间线的音效', () => {
  test('敌人物攻 → 时间线播 action(接近)+ call(命中)音', () => {
    // 玩家打不死敌(高防高血),敌必反击
    const { session, plays } = makeSoloSession(
      wfEnemy('tank', { health: 999, defense: 999, attackStrength: 10 }),
      { attackStrength: 1 },
    )
    driveOneRound(session)
    expect(plays).toContain('sound.pal.300') // action(fixture)
    expect(plays).toContain('sound.pal.002') // call
  })

  test('击杀敌人 → 播 sounds.death', () => {
    const { session, plays } = makeSoloSession(wfEnemy('slime', { health: 10, defense: 0 }), {
      attackStrength: 400,
    })
    driveOneRound(session)
    expect(plays).toContain('sound.pal.030')
  })

  test('遭遇 choreography playSound → 直接播(encounter 绑定,非敌种)', () => {
    const enemy = wfEnemy('bard', { health: 999, defense: 999 })
    const { session, plays } = makeSoloSession(
      enemy,
      { attackStrength: 1 },
      {
        encounterChoreo: [
          { at: 'battleStart', body: [{ kind: 'playSound', asset: 'sound.pal.077' }] },
        ],
      },
    )
    session.tick(16, new Set()) // battleStart 演出:collect + pump(playSound 无横幅,直接消费)
    expect(plays).toContain('sound.pal.077')
  })

  test.each([
    {
      label: '负 magic',
      sounds: { magic: 'sound.enemy-cast', suppressMagicEffectSound: true },
      enemyCast: true,
      skillEffect: false,
    },
    {
      label: '正 magic',
      sounds: { magic: 'sound.enemy-cast' },
      enemyCast: true,
      skillEffect: true,
    },
    { label: '零 magic', sounds: {}, enemyCast: false, skillEffect: true },
  ])('$label 语义显式区分敌吟唱音与技能特效音', ({ sounds, enemyCast, skillEffect }) => {
    const magic = {
      id: 'enemy-magic',
      name: '敌法',
      desc: '',
      cost: {},
      usableOutsideBattle: false,
      target: 'oneEnemy' as const,
      effects: [{ kind: 'damage' as const, power: 1, elemental: 0 }],
      animation: {
        effectSprite: 1,
        effectTimes: 1,
        sound: 'sound.skill-effect',
      },
    }
    const caster = wfEnemy(
      'caster',
      { health: 999, defense: 999, dexterity: 999 },
      {
        ai: {
          resistanceToSorcery: 5,
          rules: [{ at: 'act', do: { kind: 'cast', skillId: magic.id } }],
        },
        battleSprite: 'battle-sprite.enemy.magic',
        sounds,
      },
    )
    const { session, plays } = makeSoloSession(
      caster,
      { attackStrength: 1, defense: 999 },
      { skills: { [magic.id]: magic } },
      { fireSprites: { 1: fireSprite() } },
    )
    driveOneRound(session, 30)
    expect(plays.includes('sound.enemy-cast')).toBe(enemyCast)
    expect(plays.includes('sound.skill-effect')).toBe(skillEffect)
  })

  test('玩家物品门熄火：保留 PreMagic 吟唱音，但不播技能效果音或结算伤害', () => {
    const magic = {
      id: 'gu-fizzle',
      name: '蛊术',
      desc: '',
      cost: { mp: 5, items: [{ itemId: '148', amount: 1 }] },
      usableOutsideBattle: false,
      target: 'allEnemies' as const,
      effects: [{ kind: 'damage' as const, power: 999, elemental: 0 }],
      animation: {
        effectSprite: 1,
        effectTimes: 1,
        sound: 'sound.skill-effect',
      },
    }
    const enemy = wfEnemy('fizzle-target', {
      health: 999,
      defense: 999,
      attackStrength: 0,
    })
    const { session, plays } = makeSoloSession(
      enemy,
      { attackStrength: 0, skills: [magic.id] },
      {
        skills: { [magic.id]: magic },
        items: { '148': wfHealItem('148') },
        inventory: [],
        playerSounds: [{ magic: 'sound.player-cast' }],
      },
      { fireSprites: { 1: fireSprite() } },
    )
    session.tick(16, new Set(['ArrowLeft']))
    session.tick(16, new Set(['Enter']))
    session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 40; i++) session.tick(500, new Set())

    const party = [{ id: 'li', hp: 0, mp: 0 }]
    session.writeBackHp(party)
    expect(party[0]?.mp).toBe(25)
    expect(session.debugReadiness().phase).toBe('menu')
    expect(plays.filter((sound) => sound === 'sound.player-cast')).toEqual(['sound.player-cast'])
    expect(plays).not.toContain('sound.skill-effect')
    const log = session.debugLog()
    expect(log).toContain('li 物品不足,蛊术 施放失败')
    expect(log.some((line) => line.startsWith('li 施展 蛊术 对'))).toBe(false)
  })

  test('用品显式声音优先于 role；投掷链消费自己的声音', () => {
    const item = {
      id: 'sound-item',
      name: '响铃',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'self' as const,
        consuming: true,
        effects: [{ kind: 'healHp' as const, amount: 1 }],
        sound: 'sound.item-explicit',
      },
      throw: {
        target: 'oneEnemy' as const,
        effects: [
          {
            kind: 'currentHpDamage' as const,
            numerator: 1,
            denominator: 2,
            bonus: 1,
            cap: 1000,
          },
        ],
        sound: 'sound.item-throw',
        presentation: {
          kind: 'magic' as const,
          animation: {
            effectSprite: 24,
            placement: 'normal' as const,
            xOffset: -12,
            layerOffset: 1,
            speed: -1,
            effectTimes: 0,
            sound: 'sound.item-fire',
          },
        },
      },
    }
    const opts = {
      items: { [item.id]: item },
      inventory: [{ itemId: item.id, count: 2 }],
      soundRoles: { 'audio.battleItemUseSound': 'sound.item-role' } as const,
    }
    const using = makeSoloSession(
      wfEnemy('use-target', { health: 999, defense: 999, attackStrength: 0 }),
      { hp: 50, attackStrength: 1 },
      opts,
    )
    using.session.tick(16, new Set())
    using.session.tick(16, new Set(['e']))
    using.session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 30; i++) using.session.tick(500, new Set())
    expect(using.plays).toContain('sound.item-explicit')
    expect(using.plays).not.toContain('sound.item-role')

    const { sound: _explicitSound, ...useWithoutSound } = item.use
    const roleOnlyItem = { ...item, use: useWithoutSound }
    const roleOnly = makeSoloSession(
      wfEnemy('role-target', { health: 999, defense: 999, attackStrength: 0 }),
      { hp: 50, attackStrength: 1 },
      {
        items: { [roleOnlyItem.id]: roleOnlyItem },
        inventory: [{ itemId: roleOnlyItem.id, count: 1 }],
        soundRoles: { 'audio.battleItemUseSound': 'sound.item-role' },
      },
    )
    roleOnly.session.tick(16, new Set())
    roleOnly.session.tick(16, new Set(['e']))
    roleOnly.session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 30; i++) roleOnly.session.tick(500, new Set())
    expect(roleOnly.plays).toContain('sound.item-role')

    const throwing = makeSoloSession(
      wfEnemy('throw-target', { health: 999, defense: 999, attackStrength: 0 }),
      { attackStrength: 1 },
      opts,
      {
        fireSprites: {
          24: fireSprite(),
        },
      },
    )
    throwing.session.tick(16, new Set())
    throwing.session.tick(16, new Set(['w']))
    throwing.session.tick(16, new Set(['Enter']))
    throwing.session.tick(16, new Set(['Enter']))
    for (let i = 0; i < 30; i++) throwing.session.tick(500, new Set())
    expect(throwing.plays).toContain('sound.item-throw')
    expect(throwing.plays).toContain('sound.item-fire')
  })
})
