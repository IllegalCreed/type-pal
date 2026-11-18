import { describe, expect, test } from 'vitest'
import { createEnemyReferenceProject } from './__tests__/reference-project.js'
import type { AuthorSceneDef } from './author-scene.js'
import type { AuthorCondition } from './author-script-core.js'
import type { EnemyTeamDef } from './enemy.js'
import type { EnemyHookCommand } from './enemy-script.js'
import { validateSkills } from './validate.js'
import { validateAuthorEnemies, validateAuthorScenes } from './validate-author.js'
import { type Issue, validateReferences } from './validate-refs.js'

function createEnemyScriptProject() {
  const { bundle, enemy } = createEnemyReferenceProject({
    ai: {
      resistanceToSorcery: 0,
      rules: [
        {
          at: 'act',
          when: { kind: 'playerInParty', role: 'hero' },
          do: { kind: 'cast', skillId: 'bolt' },
        },
      ],
      fallback: {
        action: { kind: 'cast', skillId: 'bolt' },
        chancePercent: 25,
      },
      hooks: {
        ready: {
          initial: 'ready',
          states: {
            ready: {
              body: [
                {
                  kind: 'setFallback',
                  fallback: {
                    action: { kind: 'cast', skillId: 'bolt' },
                    chancePercent: 50,
                  },
                },
                {
                  kind: 'effect',
                  id: 'transform',
                  effect: { kind: 'transform', enemyId: 'slime-form' },
                },
                {
                  kind: 'applyActorGrowth',
                  actor: 'hero',
                  delta: {
                    level: 0,
                    maxHP: 1,
                    maxMP: 1,
                    attack: 1,
                    magicAttack: 1,
                    defense: 1,
                    speed: 1,
                    luck: 1,
                  },
                },
              ],
              next: {
                kind: 'random',
                choices: [
                  {
                    weight: 1,
                    then: {
                      kind: 'branch',
                      cond: {
                        kind: 'not',
                        cond: { kind: 'playerInParty', role: 'hero' },
                      },
                      then: { kind: 'restart' },
                      else: { kind: 'stay' },
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    choreography: [
      {
        at: 'turnStart',
        when: { kind: 'playerInParty', role: 'hero' },
        body: [
          {
            kind: 'playActorCastEffect',
            actor: 'hero',
            effect: 'pre-magic-white-flash',
          },
        ],
      },
    ],
    onDefeated: [
      {
        kind: 'branch',
        cond: {
          kind: 'all',
          of: [
            { kind: 'hasItem', itemId: 'herb' },
            { kind: 'inParty', actorId: 'hero' },
            { kind: 'currentScene', scene: 'hall' },
            { kind: 'entityInScene', target: { scene: 'hall', entity: 'sentry' } },
          ],
        },
        then: [{ kind: 'giveItem', itemId: 'herb', count: 1 }],
        else: [{ kind: 'loseItem', itemId: 'herb', count: 1 }],
      },
    ],
  })
  bundle.enemies = [
    enemy,
    {
      ...enemy,
      id: 'slime-form',
      ai: { resistanceToSorcery: 0 },
      choreography: undefined,
      onDefeated: undefined,
    },
  ]
  bundle.skills.push({
    id: 'bolt',
    name: '闪电',
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [{ kind: 'damage', power: 1, elemental: 0 }],
    animation: { effectSprite: 1 },
  })
  validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
  return { bundle, enemy }
}

describe('enemy script references', () => {
  test('reports the missing scene in a defeated branch condition at its authored location', () => {
    const condition = {
      kind: 'currentScene',
      scene: 'missing-scene',
    } satisfies AuthorCondition
    const { bundle } = createEnemyReferenceProject({
      onDefeated: [
        {
          kind: 'branch',
          cond: condition,
          then: [{ kind: 'giveItem', itemId: 'herb', count: 1 }],
        },
      ],
    })
    expect(validateReferences(bundle)).toContainEqual({
      severity: 'error',
      where: 'enemies[0](slime).onDefeated[0].cond.scene',
      message: '场景 "missing-scene" 不在 scenes',
    })
    condition.scene = 'hall'
    expect(validateReferences(bundle)).toEqual([])
  })

  test('checks the actor under nested all, any and not conditions', () => {
    const { bundle } = createEnemyReferenceProject({
      ai: {
        resistanceToSorcery: 0,
        rules: [
          {
            at: 'act',
            when: {
              kind: 'all',
              of: [
                {
                  kind: 'any',
                  of: [{ kind: 'not', cond: { kind: 'playerInParty', role: 'missing' } }],
                },
              ],
            },
            do: { kind: 'attack' },
          },
        ],
      },
    })
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'enemies[0](slime).ai.rules[0].when.of[0].of[0].cond.role',
        message: '战斗角色 "missing" 不在 actors',
      },
    ])
  })

  test('checks a fallback spell against the registered enemy execution', () => {
    const { bundle } = createEnemyReferenceProject({
      ai: {
        resistanceToSorcery: 0,
        fallback: { action: { kind: 'cast', skillId: 'bolt' }, chancePercent: 10 },
      },
    })
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'enemies[0](slime).ai.fallback.action.skillId',
        message: '施法技能 "bolt" 不在 skills',
      },
    ])
    bundle.skills.push({
      id: 'bolt',
      name: '闪电',
      desc: '',
      cost: {},
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [],
      execution: { enemy: { effects: [{ kind: 'damage', power: 1, elemental: 0 }] } },
      animation: { effectSprite: 1 },
    })
    validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
    expect(validateReferences(bundle)).toEqual([])
  })

  test.each([
    {
      command: { kind: 'effect', id: 'change', effect: { kind: 'transform', enemyId: 'missing' } },
      message: '变身目标 "missing" 不在 enemies',
    },
    {
      command: {
        kind: 'effect',
        id: 'summon',
        effect: { kind: 'summon', enemyId: 'missing', count: 1 },
      },
      message: '召唤目标 "missing" 不在 enemies',
    },
  ] satisfies {
    command: EnemyHookCommand
    message: string
  }[])('checks the enemy ID in a $command.effect.kind hook', ({ command, message }) => {
    const { bundle } = createEnemyReferenceProject({
      ai: {
        resistanceToSorcery: 0,
        hooks: {
          ready: {
            initial: 'entrance',
            states: { entrance: { body: [command], next: { kind: 'stay' } } },
          },
        },
      },
    })
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'enemies[0](slime).ai.hooks.ready.states["entrance"].body[0].effect.enemyId',
        message,
      },
    ])
  })

  test('warns about steal stock and rejects a missing attack-equivalent item', () => {
    const { bundle } = createEnemyReferenceProject({
      steal: { itemId: 'missing', count: 1 },
      attackEquivItem: { itemId: 'missing', rate: 30 },
    })
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'warn',
        where: 'enemies[0](slime).steal',
        message: '可偷物品 "missing" 不在 items',
      },
      {
        severity: 'error',
        where: 'enemies[0](slime).attackEquivItem.itemId',
        message: '普攻附带物品 "missing" 不在 items',
      },
    ])
  })
  test('敌 hook/fallback/演出/战后脚本的逻辑引用完整时无 issue', () => {
    expect(validateReferences(createEnemyScriptProject().bundle)).toEqual([])
  })
  test('敌方可达 cast 对有效 execution fail-closed，override 可隔离玩家专属公共效果', () => {
    const { bundle } = createEnemyScriptProject()
    bundle.skills[0]!.effects = [{ kind: 'healMp', amount: 1 }]
    validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
    expect(validateReferences(bundle)).toEqual(
      [
        'ai.rules[0].do.skillId',
        'ai.fallback.action.skillId',
        'ai.hooks.ready.states["ready"].body[0].fallback.action.skillId',
      ].map((path) => ({
        severity: 'error',
        where: `enemies[0](slime).${path}`,
        message: '敌方施法技能 "bolt" 的有效效果[0] "healMp" 不受 runtime 支持',
      })),
    )

    bundle.skills[0]!.execution = {
      enemy: { effects: [{ kind: 'damage', power: 1, elemental: 0 }] },
    }
    validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
    expect(validateReferences(bundle)).toEqual([])
  })
  test('敌脚本逻辑引用递归保留精确路径并拒绝非战斗角色', () => {
    const { bundle, enemy: source } = createEnemyScriptProject()
    bundle.actors.push({ id: 'villager', name: 'name.hero', spriteId: 'sprite.hero' })
    source.ai.fallback = {
      action: { kind: 'cast', skillId: 'missing-fallback-skill' },
      chancePercent: 25,
    }
    source.ai.rules![0]!.when = { kind: 'playerInParty', role: 'missing-rule-actor' }
    const ready = source.ai.hooks!.ready!.states.ready!
    ready.body = [
      {
        kind: 'setFallback',
        fallback: {
          action: { kind: 'cast', skillId: 'missing-hook-skill' },
          chancePercent: 50,
        },
      },
      {
        kind: 'effect',
        id: 'transform',
        effect: { kind: 'transform', enemyId: 'missing-hook-enemy' },
      },
      {
        kind: 'playActorCastEffect',
        actor: 'villager',
        effect: 'pre-magic-white-flash',
      },
    ]
    ready.next = {
      kind: 'random',
      choices: [
        {
          weight: 1,
          then: {
            kind: 'branch',
            cond: {
              kind: 'not',
              cond: { kind: 'playerInParty', role: 'villager' },
            },
            then: { kind: 'stay' },
            else: { kind: 'stay' },
          },
        },
      ],
    }
    source.choreography![0]!.body = [
      {
        kind: 'applyActorGrowth',
        actor: 'missing-choreography-actor',
        delta: {
          level: 0,
          maxHP: 0,
          maxMP: 0,
          attack: 0,
          magicAttack: 0,
          defense: 0,
          speed: 0,
          luck: 0,
        },
      },
    ]
    source.onDefeated = [
      {
        kind: 'branch',
        cond: {
          kind: 'all',
          of: [
            { kind: 'hasItem', itemId: 'missing-condition-item' },
            { kind: 'inParty', actorId: 'missing-on-defeated-actor' },
          ],
        },
        then: [{ kind: 'giveItem', itemId: 'missing-give-item', count: 1 }],
      },
    ]

    validateAuthorEnemies(bundle.enemies)
    expect(validateReferences(bundle)).toEqual(
      [
        ['ai.rules[0].when.role', '战斗角色 "missing-rule-actor" 不在 actors'],
        ['ai.fallback.action.skillId', '施法技能 "missing-fallback-skill" 不在 skills'],
        ['choreography[0].body[0].actor', '战斗角色 "missing-choreography-actor" 不在 actors'],
        [
          'ai.hooks.ready.states["ready"].body[0].fallback.action.skillId',
          '施法技能 "missing-hook-skill" 不在 skills',
        ],
        [
          'ai.hooks.ready.states["ready"].body[1].effect.enemyId',
          '变身目标 "missing-hook-enemy" 不在 enemies',
        ],
        ['ai.hooks.ready.states["ready"].body[2].actor', '战斗角色 "villager" 不是可战斗角色'],
        [
          'ai.hooks.ready.states["ready"].next.choices[0].then.cond.cond.role',
          '战斗角色 "villager" 不是可战斗角色',
        ],
        ['onDefeated[0].cond.of[0].itemId', '物品 "missing-condition-item" 不在 items'],
        ['onDefeated[0].cond.of[1].actorId', '角色 "missing-on-defeated-actor" 不在 actors'],
        ['onDefeated[0].then[0].itemId', '物品 "missing-give-item" 不在 items'],
      ].map(([path, message]) => ({
        severity: 'error',
        where: `enemies[0](slime).${path}`,
        message,
      })),
    )
  })
})

describe('enemy team references', () => {
  test.each([
    {
      teams: [
        { id: 'patrol', slots: ['slime', null] },
        { id: 'patrol', slots: [] },
      ],
      problems: [
        {
          severity: 'error',
          where: 'enemyTeams[1](patrol).id',
          message: '重复敌队 id "patrol"',
        },
      ],
    },
    {
      teams: [{ id: 'patrol', slots: ['slime', null, null, null, null, 'slime'] }],
      problems: [
        {
          severity: 'error',
          where: 'enemyTeams[0](patrol).slots',
          message: '敌队槽位数 6 超上限 5',
        },
      ],
    },
    {
      teams: [{ id: 'patrol', slots: ['slime', null, 'missing'] }],
      problems: [
        {
          severity: 'error',
          where: 'enemyTeams[0](patrol).slots[2]',
          message: '敌人 "missing" 不在 enemies',
        },
      ],
    },
  ] satisfies {
    teams: EnemyTeamDef[]
    problems: Issue[]
  }[])('keeps the precise team diagnostic at $problems.0.where', ({ teams, problems }) => {
    const { bundle } = createEnemyReferenceProject()
    bundle.enemyTeams = teams
    expect(validateReferences(bundle)).toEqual(problems)
  })

  test('accepts empty slots and checks the hostile team declared by a scene', () => {
    const { bundle, scene, entity } = createEnemyReferenceProject()
    const scenes = [
      {
        ...scene,
        entities: [
          {
            ...entity,
            hostile: {
              enemyTeamId: 'patrol',
              onVictory: { kind: 'remain' },
              onPlayerFlee: { kind: 'remain' },
            },
          },
        ],
      },
    ] satisfies AuthorSceneDef[]
    validateAuthorScenes(scenes)
    bundle.scenes = scenes
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'scenes[0].entities[0].hostile.enemyTeamId',
        message: '敌队 "patrol" 不在 enemyTeams',
      },
    ])
    bundle.enemyTeams = [{ id: 'patrol', slots: ['slime', null] }]
    expect(validateReferences(bundle)).toEqual([])
  })
})
