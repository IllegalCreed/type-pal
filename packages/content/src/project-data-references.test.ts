import { describe, expect, test } from 'vitest'
import { createReferenceProject } from './__tests__/reference-project.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import type { ActorDef } from './actor.js'
import { buildWorld } from './character.js'
import {
  validateActors,
  validateAuthorScenes,
  validateAuthorSharedScripts,
  validateShops,
  validateSkills,
  validateStartWorld,
} from './index.js'
import { type ContentBundle, type Issue, validateReferences } from './validate-refs.js'

describe('project data references', () => {
  test('accepts a nonempty project with complete references and keeps the input intact', () => {
    const { bundle } = createReferenceProject()
    const snapshot = deepSnapshot(bundle)
    expect(validateReferences(bundle)).toEqual([])
    expect(bundle).toEqual(snapshot)
  })

  test('warns when an actor name lacks a translation and clears the warning when supplied', () => {
    const { bundle, actor } = createReferenceProject()
    actor.name = 'name.untranslated-hero'
    validateActors(bundle.actors)
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'warn',
        where: 'actors[0](hero).name',
        message: '角色名 id "name.untranslated-hero" 不在 locale',
      },
    ])
    bundle.locale['name.untranslated-hero'] = '主角'
    expect(validateReferences(bundle)).toEqual([])
  })

  test('reports a missing entity actor at its exact location and clears the issue when repaired', () => {
    const { bundle, entity } = createReferenceProject()
    entity.actor = 'unregistered-actor'
    validateAuthorScenes(bundle.scenes)
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'scenes[0].entities[0].actor',
        message: '角色 "unregistered-actor" 不在 actors 表',
      },
    ])
    entity.actor = 'hero'
    expect(validateReferences(bundle)).toEqual([])
  })

  test('reports a project entry whose scene is missing', () => {
    const { bundle, entry } = createReferenceProject()
    entry.scene = 'unregistered-scene'
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'entryPoints[0](main).scene',
        message: '场景 "unregistered-scene" 不在 scenes',
      },
    ])
  })

  test('reports a scene whose map ID is absent from the map index', () => {
    const { bundle, scene } = createReferenceProject()
    scene.mapId = 'unregistered-map'
    validateAuthorScenes(bundle.scenes)
    expect(validateReferences(bundle)).toEqual([
      {
        severity: 'error',
        where: 'scenes[0].mapId',
        message: '地图 "unregistered-map" 不在 map index',
      },
    ])
  })

  test('checks the party battle sprite override in an actual built world', () => {
    const { bundle, actor, entry } = createReferenceProject()
    const startWorld = {
      ...entry.startWorld,
      inventory: [{ itemId: 'herb', count: 2 }],
      seedStats: { hero: { hp: 8, mp: 4 } },
    }
    validateStartWorld(startWorld)
    const world = buildWorld(startWorld, { hero: actor })
    function worldWithBattleSprite(battleSprite: string) {
      return {
        ...world,
        party: world.party.map((character) => ({
          ...character,
          appearance: { spriteId: 'sprite.hero', battleSprite },
        })),
      }
    }
    const valid = { ...bundle, worlds: [worldWithBattleSprite('bs-hero')] }
    expect(validateReferences(valid)).toEqual([])

    const invalid = { ...bundle, worlds: [worldWithBattleSprite('unregistered-battle-sprite')] }
    const snapshot = deepSnapshot(invalid)
    expect(validateReferences(invalid)).toEqual([
      {
        severity: 'error',
        where: 'worlds[0].party[0].appearance.battleSprite',
        message: '战斗精灵 "unregistered-battle-sprite" 不在 battleSprites 注册表',
      },
    ])
    expect(invalid).toEqual(snapshot)
  })

  test('reports only the missing merchandise in a mixed shop stock list', () => {
    const { bundle } = createReferenceProject()
    const valid = { ...bundle, shops: [{ id: 1, items: ['herb'] }] }
    validateShops(valid.shops)
    expect(validateReferences(valid)).toEqual([])

    const invalid = { ...bundle, shops: [{ id: 1, items: ['herb', 'unregistered-item'] }] }
    validateShops(invalid.shops)
    const snapshot = deepSnapshot(invalid)
    expect(validateReferences(invalid)).toEqual([
      {
        severity: 'error',
        where: 'shops[0](1).items[1]',
        message: '商店物品 "unregistered-item" 不在 items',
      },
    ])
    expect(invalid).toEqual(snapshot)
  })
})

describe('level-up references', () => {
  const unknownOwner: Issue = {
    severity: 'warn',
    where: 'levelUp[unregistered-actor]',
    message: '升级习得伴随表角色 "unregistered-actor" 不在 actors',
  }
  const unknownSkill: Issue = {
    severity: 'warn',
    where: 'levelUp[hero][0].skillId',
    message: '升级习得 "unregistered-skill" 不在 skills',
  }

  test.each([
    { actorId: 'hero', skillId: 'mend', issues: [] },
    { actorId: 'unregistered-actor', skillId: 'mend', issues: [unknownOwner] },
    { actorId: 'hero', skillId: 'unregistered-skill', issues: [unknownSkill] },
    {
      actorId: 'unregistered-actor',
      skillId: 'unregistered-skill',
      issues: [unknownOwner, { ...unknownSkill, where: 'levelUp[unregistered-actor][0].skillId' }],
    },
  ])('checks actor $actorId and skill $skillId', ({ actorId, skillId, issues }) => {
    const { bundle } = createReferenceProject()
    bundle.skills = [
      {
        id: 'mend',
        name: '疗伤',
        desc: '',
        cost: { mp: 1 },
        usableOutsideBattle: true,
        target: 'oneAlly',
        effects: [],
        animation: { effectSprite: 0 },
      },
    ]
    bundle.levelUp = { [actorId]: [{ level: 2, skillId }] }
    validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
    const snapshot = deepSnapshot(bundle)
    expect(validateReferences(bundle)).toEqual(issues)
    expect(bundle).toEqual(snapshot)
  })
})

describe('actor registration', () => {
  function bundleWithActorReferences(actorId: string, registered: boolean): ContentBundle {
    const { bundle, actor } = createReferenceProject()
    const actors: ActorDef[] = [{ ...actor, battler: { ...actor.battler, coveredBy: actorId } }]
    if (registered) actors.push({ ...actor, id: actorId })
    bundle.actors = validateActors(actors)
    bundle.sharedScripts = validateAuthorSharedScripts({
      changeParty: {
        name: '更换队伍',
        self: 'none',
        body: [{ kind: 'setParty', members: [actorId] }],
      },
    })
    return bundle
  }

  test.each([
    'unregistered-actor',
    'constructor',
  ])('reports a missing actor named %s in both cover and party references', (actorId) => {
    expect(validateReferences(bundleWithActorReferences(actorId, false))).toEqual([
      {
        severity: 'error',
        where: 'actors[0](hero).battler.coveredBy',
        message: `战斗角色 "${actorId}" 不在 actors`,
      },
      {
        severity: 'error',
        where: 'sharedScripts["changeParty"].body[0].members[0]',
        message: `角色 "${actorId}" 不在 actors`,
      },
    ])
  })

  test('accepts an actor actually registered as constructor', () => {
    expect(validateReferences(bundleWithActorReferences('constructor', true))).toEqual([])
  })
})
