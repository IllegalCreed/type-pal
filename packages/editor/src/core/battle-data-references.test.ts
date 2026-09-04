import { describe, expect, test } from 'vitest'
import { collectBattleDataReferences } from './battle-data-references.js'
import type { EditorState } from './edit-session.js'

function fixture(): EditorState {
  return {
    actors: [
      {
        id: 'hero',
        name: 'name.hero',
        spriteId: 'sprite.hero',
        battler: {
          battleSprite: 'battle.hero',
          baseStats: {
            level: 1,
            maxHP: 10,
            maxMP: 10,
            attackStrength: 1,
            magicStrength: 1,
            defense: 1,
            dexterity: 1,
            fleeRate: 1,
          },
          initialEquipment: {},
          initialMagic: ['skill-a'],
          cooperativeMagicSkillId: 'skill-a',
        },
      },
    ],
    levelUp: { hero: [{ level: 2, skillId: 'skill-a' }] },
    skills: [
      {
        id: 'skill-a',
        name: '技能甲',
        desc: '',
        cost: {},
        usableOutsideBattle: false,
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '9' }],
        animation: {
          effectSprite: 0,
          placement: 'normal',
          xOffset: 0,
          yOffset: 0,
          speed: 0,
          fireDelay: 0,
          effectTimes: 0,
          shake: 0,
        },
      },
    ],
    items: [],
    enemies: [
      {
        id: 'enemy-a',
        name: 'name.enemy-a',
        battleSprite: 'battle.enemy',
        yPosOffset: 0,
        stats: {
          health: 1,
          level: 1,
          exp: 0,
          cash: 0,
          attackStrength: 1,
          magicStrength: 1,
          defense: 1,
          dexterity: 1,
          fleeRate: 1,
          physicalResistance: 0,
          poisonResistance: 0,
          elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
          dualMove: false,
          collectValue: 0,
        },
        ai: {
          resistanceToSorcery: 0,
          rules: [
            { at: 'act', do: { kind: 'cast', skillId: 'skill-a' } },
            { at: 'act', do: { kind: 'transform', enemyId: 'enemy-b' } },
          ],
        },
        sounds: {},
      },
      {
        id: 'enemy-b',
        name: 'name.enemy-b',
        battleSprite: 'battle.enemy',
        yPosOffset: 0,
        stats: {
          health: 1,
          level: 1,
          exp: 0,
          cash: 0,
          attackStrength: 1,
          magicStrength: 1,
          defense: 1,
          dexterity: 1,
          fleeRate: 1,
          physicalResistance: 0,
          poisonResistance: 0,
          elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
          dualMove: false,
          collectValue: 0,
        },
        ai: { resistanceToSorcery: 0 },
        sounds: {},
      },
    ],
    enemyTeams: [{ id: 'team-1', slots: ['enemy-b'] }],
    poisons: [
      { id: 9, name: '九号毒', curability: 'common', color: 0, counters: 10 },
      { id: 10, name: '十号毒', curability: 'common', color: 0, lethalWith: 9 },
    ],
    manifest: {
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: {
            party: ['hero'],
            money: 0,
            seedConditions: { hero: { poisonIds: [9] } },
            inventory: [],
          },
        },
      ],
    },
    scenes: [
      {
        id: 's',
        mapId: 'map-s',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [
          {
            body: [
              {
                kind: 'applyActorCondition',
                actor: 'hero',
                condition: { kind: 'poison', poisonId: 9 },
              },
            ],
          },
        ],
      },
    ],
    sharedScripts: {
      cleanse: {
        name: '清毒',
        self: 'none',
        body: [
          {
            kind: 'clearActorCondition',
            actor: 'hero',
            condition: { kind: 'poison', poisonId: 9 },
          },
        ],
      },
    },
  } as unknown as EditorState
}

describe('battle data deletion references', () => {
  const referencesTo = (state: EditorState, target: 'skill' | 'enemy' | 'poison', id: string) =>
    collectBattleDataReferences(state, target).filter((reference) => reference.targetId === id)

  test('collects every typed skill owner without guessing ordinary string fields', () => {
    const references = referencesTo(fixture(), 'skill', 'skill-a')
    expect(references.map((entry) => entry.kind)).toEqual([
      'actor-cooperative-magic',
      'actor-initial-magic',
      'enemy-cast',
      'level-up',
    ])
  })

  test('collects enemy team, cross-enemy and owner-internal self references', () => {
    const state = fixture()
    state.enemies![1]!.ai.rules = [
      { at: 'act', do: { kind: 'summon', enemyId: 'enemy-b', count: 1 } },
    ]
    expect(referencesTo(state, 'enemy', 'enemy-b').map((entry) => entry.kind)).toEqual([
      'enemy-transform',
      'enemy-summon',
      'enemy-team-slot',
    ])
  })

  test('collects entry seed, story commands, skill effects and poison relations as blocking poison references', () => {
    expect(referencesTo(fixture(), 'poison', '9').map((entry) => entry.kind)).toEqual([
      'entry-point-seed-poison',
      'poison-lethal-pair',
      'command-actor-condition-poison',
      'command-actor-condition-poison',
      'skill-poison',
    ])
  })

  test('retains owner self-edges for the unified deletion scope to classify', () => {
    const state = fixture()
    state.poisons![0]!.counters = 9
    const references = referencesTo(state, 'poison', '9')
    expect(references.map((entry) => entry.kind)).toEqual([
      'entry-point-seed-poison',
      'poison-counter',
      'poison-lethal-pair',
      'command-actor-condition-poison',
      'command-actor-condition-poison',
      'skill-poison',
    ])
    expect(
      references.some((entry) => entry.locator?.kind === 'poison' && entry.locator.poisonId === 9),
    ).toBe(true)
  })
})
