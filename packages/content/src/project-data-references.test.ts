import { describe, expect, test } from 'vitest'
import { createReferenceProject } from './__tests__/reference-project.js'
import type { ActorDef } from './actor.js'
import { validateActors, validateAuthorSharedScripts } from './index.js'
import { type ContentBundle, validateReferences } from './validate-refs.js'

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
