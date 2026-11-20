import { describe, expect, test } from 'vitest'
import { createReferenceProject } from './__tests__/reference-project.js'
import type { AuthorSceneDef } from './author-scene.js'
import { validateBattleSprites } from './battle-sprite.js'
import { buildWorld } from './character.js'
import { validateActors, validateSkills, validateSprites } from './validate.js'
import {
  validateAuthorItems,
  validateAuthorScenes,
  validateAuthorSharedScripts,
} from './validate-author.js'
import {
  type ContentBundle,
  collectBattleSpriteDefinitionReferences,
  collectSpriteActionReferences,
  commandSpriteTaggedReferencesAtNode,
  type Issue,
  validateReferences,
} from './validate-refs.js'

describe('sprite definitions', () => {
  test('ignores unrelated tagged nodes even when their fields use sprite names', () => {
    expect(
      commandSpriteTaggedReferencesAtNode(
        { kind: 'unrelated', sprite: 'world-asset', battleSprite: 'battle-asset' },
        'cursor',
      ),
    ).toEqual([])
  })

  test('reports world sprites of a prop and an actor at their distinct paths', () => {
    const { bundle, scene, entity, actor } = createReferenceProject()
    const scenes = [
      { ...scene, entities: [entity, { id: 'prop', pos: entity.pos, sprite: 'missing-prop' }] },
    ]
    validateAuthorScenes(scenes)
    bundle.scenes = scenes
    bundle.actors = validateActors([{ ...actor, spriteId: 'missing-actor' }])
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'actors[0](hero).spriteId',
        message: '精灵 "missing-actor" 不在 sprites 注册表',
      },
      {
        severity: 'error',
        where: 'scenes[0].entities[1].sprite',
        message: '精灵 "missing-prop" 不在 sprites 注册表',
      },
    ])
  })

  test('checks costumes, followers and battle portraits in real script roots', () => {
    const { bundle } = createReferenceProject()
    bundle.sharedScripts = validateAuthorSharedScripts({
      'scene:equip:entry': {
        name: '更衣',
        self: 'none',
        body: [
          {
            kind: 'branch',
            cond: { kind: 'currentScene', scene: 'hall' },
            then: [
              { kind: 'setActorSprite', actor: 'hero', sprite: 'missing-costume' },
              { kind: 'setFollowers', sprites: ['missing-follower'] },
            ],
          },
          { kind: 'setActorAppearance', actor: 'hero', battleSprite: 'missing-shared-battle' },
        ],
      },
    })
    bundle.items = validateAuthorItems([
      {
        id: 'private',
        name: '私有演出',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: false,
          effects: [
            {
              kind: 'itemPrivateScript',
              script: {
                id: 'use',
                label: '私有正文',
                body: [
                  {
                    kind: 'setActorAppearance',
                    actor: 'hero',
                    spriteId: 'missing-item-world',
                    battleSprite: 'missing-item-battle',
                  },
                ],
              },
            },
          ],
        },
      },
    ])
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'items[0](private).use.effects[0].script.body[0].spriteId',
        message: '精灵 "missing-item-world" 不在 sprites 注册表',
      },
      {
        severity: 'error',
        where: 'sharedScripts["scene:equip:entry"].body[0].then[0].sprite',
        message: '精灵 "missing-costume" 不在 sprites 注册表',
      },
      {
        severity: 'error',
        where: 'sharedScripts["scene:equip:entry"].body[0].then[1].sprites[0]',
        message: '精灵 "missing-follower" 不在 sprites 注册表',
      },
      {
        severity: 'error',
        where: 'items[0](private).use.effects[0].script.body[0].battleSprite',
        message: '战斗精灵 "missing-item-battle" 不在 battleSprites 注册表',
      },
      {
        severity: 'error',
        where: 'sharedScripts["scene:equip:entry"].body[1].battleSprite',
        message: '战斗精灵 "missing-shared-battle" 不在 battleSprites 注册表',
      },
    ])
  })

  test('checks a real world snapshot for appearance and followers', () => {
    const { bundle, actor, entry } = createReferenceProject()
    const world = buildWorld(entry.startWorld, { hero: actor })
    if (!world.script) throw new Error('Expected script state from buildWorld')
    bundle.worlds = [
      {
        ...world,
        party: world.party.map((member) => ({
          ...member,
          appearance: { spriteId: 'missing-appearance' },
        })),
        script: { ...world.script, followers: ['missing-follower'] },
      },
    ]
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'worlds[0].party[0].appearance.spriteId',
        message: '精灵 "missing-appearance" 不在 sprites 注册表',
      },
      {
        severity: 'error',
        where: 'worlds[0].script.followers[0]',
        message: '精灵 "missing-follower" 不在 sprites 注册表',
      },
    ])
  })
})

test('locates static animations, named behaviors, hook variants and shared actions', () => {
  const { bundle, scene, entity } = createReferenceProject()
  bundle.sprites = validateSprites(
    bundle.sprites.map((sprite) => ({
      ...sprite,
      poses: { idle: { label: '待机', steps: [{ frame: 0, durationMs: 100 }], loopFrom: 0 } },
    })),
  )
  const action = {
    kind: 'playEntityAction' as const,
    target: { scene: 'hall', entity: 'sentry' },
    sprite: 'sprite.hero',
    action: 'idle',
    loop: false,
  }
  const scenes = [
    {
      ...scene,
      entities: [
        {
          ...entity,
          initialPage: 'default',
          pages: [
            {
              id: 'default',
              label: '平常',
              animation: { sprite: 'sprite.hero', action: 'idle', loop: true },
            },
          ],
          behaviors: {
            trigger: {
              talk: {
                label: '交谈',
                order: 0,
                flow: {
                  kind: 'stages',
                  initial: 'talk',
                  stages: [
                    {
                      id: 'talk',
                      body: [{ kind: 'confirm', onYes: [], onNo: [action] }],
                    },
                  ],
                },
              },
            },
          },
        },
      ],
      hooks: {
        onEnter: {
          initial: 'arrive',
          variants: {
            arrive: {
              label: '入场',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'arrive',
                stages: [{ id: 'arrive', body: [action] }],
              },
            },
          },
        },
      },
    },
  ] satisfies AuthorSceneDef[]
  validateAuthorScenes(scenes)
  bundle.scenes = scenes
  bundle.sharedScripts = validateAuthorSharedScripts({
    greet: { name: '问候', self: 'none', body: [action] },
  })
  expect(collectSpriteActionReferences(bundle)).toEqual([
    {
      sprite: 'sprite.hero',
      action: 'idle',
      where: 'scenes[0].entities[0].pages[0].animation.action',
      site: 'scene:hall:entity:sentry:page:0',
    },
    {
      sprite: 'sprite.hero',
      action: 'idle',
      where: 'scenes[0].entities[0].behaviors.trigger.talk.flow.stages[0].body[0].onNo[0].action',
      site: 'scene:hall:entity:sentry:behaviors',
    },
    {
      sprite: 'sprite.hero',
      action: 'idle',
      where: 'scenes[0].hooks.onEnter.variants.arrive.flow.stages[0].body[0].action',
      site: 'scene:hall:hooks',
    },
    {
      sprite: 'sprite.hero',
      action: 'idle',
      where: 'sharedScripts["greet"].body[0].action',
      site: 'sharedScript:greet',
    },
  ])
  expect(validateReferences(bundle)).toEqual([])
})

test('retains layer identity and required profile for summons and trances', () => {
  const { bundle } = createReferenceProject()
  bundle.skills.push({
    id: 'shape',
    name: '变形',
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'self',
    effects: [],
    execution: {
      player: {
        effects: [
          { kind: 'summon', battleSprite: 'summon-shape' },
          { kind: 'trance', battleSprite: 'trance-shape' },
        ],
      },
    },
    animation: { effectSprite: 1 },
  })
  validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
  expect(collectBattleSpriteDefinitionReferences(bundle)).toEqual([
    {
      battleSprite: 'bs-hero',
      expectedProfile: 'player-fighter',
      where: 'actors[0](hero).battler.battleSprite',
      site: 'actor:hero:battler',
    },
    {
      battleSprite: 'summon-shape',
      expectedProfile: 'summon',
      where: 'skills[0](shape).execution.player.effects[0].battleSprite',
      site: 'skill:shape:execution:player:effects',
    },
    {
      battleSprite: 'trance-shape',
      expectedProfile: 'player-fighter',
      where: 'skills[0](shape).execution.player.effects[1].battleSprite',
      site: 'skill:shape:execution:player:effects',
    },
  ])
})

function withEquipmentSprite(
  actorId: string,
  battleSprite: string,
  equipableBy: string[] = [actorId],
): ContentBundle {
  const { bundle, actor } = createReferenceProject()
  bundle.actors = validateActors([
    actor,
    { id: 'villager', name: actor.name, spriteId: actor.spriteId },
  ])
  bundle.battleSprites = validateBattleSprites([
    ...bundle.battleSprites,
    {
      id: 'enemy-shape',
      label: '敌人',
      asset: 'battle.enemy',
      profile: {
        kind: 'enemy',
        idle: { start: 0, count: 1 },
        magic: { start: 1, count: 0 },
        attack: { start: 1, count: 0 },
        idleTicksPerFrame: 1,
        actTicksPerFrame: 0,
      },
    },
  ])
  bundle.items = validateAuthorItems([
    {
      id: 'weapon',
      name: '剑',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      equip: {
        slot: 'weapon',
        equipableBy,
        effects: [{ kind: 'battleSprite', byActor: { [actorId]: battleSprite } }],
      },
    },
  ])
  return bundle
}

test('enforces actor, eligibility and profile at the individual equipment override', () => {
  expect(validateReferences(withEquipmentSprite('hero', 'bs-hero'))).toEqual([])
  const override = 'items[0](weapon).equip.effects[0].byActor'
  const invalid: { fixture: ContentBundle; problems: Issue[] }[] = [
    {
      fixture: withEquipmentSprite('missing', 'bs-hero'),
      problems: [
        {
          severity: 'error',
          where: `${override}.missing`,
          message: '战斗形象覆写角色 "missing" 不在 actors',
        },
        {
          severity: 'warn',
          where: 'items[0](weapon).equip.equipableBy[0]',
          message: '可装备角色 "missing" 不在 actors',
        },
      ],
    },
    {
      fixture: withEquipmentSprite('villager', 'bs-hero'),
      problems: [
        {
          severity: 'error',
          where: `${override}.villager`,
          message: '战斗形象覆写角色 "villager" 不是可战斗角色',
        },
      ],
    },
    {
      fixture: withEquipmentSprite('hero', 'bs-hero', ['villager']),
      problems: [
        {
          severity: 'error',
          where: `${override}.hero`,
          message: '战斗形象覆写角色 "hero" 不在本物品 equipableBy',
        },
      ],
    },
    {
      fixture: withEquipmentSprite('hero', 'missing'),
      problems: [
        {
          severity: 'error',
          where: `${override}.hero`,
          message: '战斗精灵 "missing" 不在 battleSprites 注册表',
        },
      ],
    },
    {
      fixture: withEquipmentSprite('hero', 'enemy-shape'),
      problems: [
        {
          severity: 'error',
          where: `${override}.hero`,
          message: '战斗精灵 "enemy-shape" profile 期望 player-fighter，实际 enemy',
        },
      ],
    },
  ]
  for (const { fixture, problems } of invalid) expect(validateReferences(fixture)).toEqual(problems)
})
