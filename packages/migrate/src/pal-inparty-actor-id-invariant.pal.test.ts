import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ActorDef, AuthorCondition, AuthorSceneDef, SceneIndexV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assertPalInPartyActorIdInvariant } from './pal-inparty-actor-id-invariant.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const currentRoot = resolve(repo, 'projects/pal/content')
const baselineRoot = resolve(repo, 'packages/migrate/baselines/pal/content')

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function loadSurface(root: string): {
  actors: ActorDef[]
  scenes: AuthorSceneDef[]
  commandRoots: unknown[]
} {
  const sceneIndex = readJson<SceneIndexV1>(resolve(root, 'scenes/index.json'))
  const scenes = sceneIndex.scenes.map((entry) =>
    readJson<AuthorSceneDef>(resolve(root, entry.path.replace(/^content\//, ''))),
  )
  const actors = readJson<ActorDef[]>(resolve(root, 'actors.json'))
  return {
    actors,
    scenes,
    commandRoots: [
      scenes,
      readJson(resolve(root, 'items.json')),
      readJson(resolve(root, 'enemies.json')),
      readJson(resolve(root, 'shared-scripts.json')),
    ],
  }
}

function targetConditions(scenes: readonly AuthorSceneDef[]): AuthorCondition[] {
  const byId = new Map(scenes.map((scene) => [scene.id, scene]))
  const flowOf = (sceneId: string, entityId: string) => {
    const flow = byId.get(sceneId)?.entities.find(({ id }) => id === entityId)?.behaviors?.trigger
      ?.default?.flow
    if (!flow) throw new Error(`missing target flow ${sceneId}/${entityId}`)
    return flow
  }
  const s023 = flowOf('s023', 'e433')
  if (s023.kind !== 'stateMachine') throw new Error('s023/e433 expected stateMachine')
  const s023Next = s023.machine.states.initial?.next
  if (!s023Next || s023Next.kind !== 'branch') throw new Error('s023/e433 expected branch next')

  const stageCondition = (sceneId: string, entityId: string, stageId: string, index: number) => {
    const flow = flowOf(sceneId, entityId)
    if (flow.kind !== 'stages') throw new Error(`${sceneId}/${entityId} expected stages`)
    const command = flow.stages.find(({ id }) => id === stageId)?.body[index]
    if (!command || command.kind !== 'branch')
      throw new Error(`${sceneId}/${entityId}/${stageId}[${index}] expected branch`)
    return command.cond
  }
  return [
    s023Next.cond,
    stageCondition('s202', 'e3392', 'initial', 0),
    stageCondition('s202', 'e3392', 'legacy-002', 0),
    stageCondition('s213', 'e3638', 'initial', 3),
  ]
}

describe('PAL current/baseline inParty ActorId publication', () => {
  test('两个表面四站点稳定、全作者根无数字/悬空引用且三个 scene 正文镜像', () => {
    const current = loadSurface(currentRoot)
    const baseline = loadSurface(baselineRoot)
    for (const surface of [current, baseline]) {
      const report = assertPalInPartyActorIdInvariant({
        actors: surface.actors,
        commandRoots: surface.commandRoots,
      })
      expect(targetConditions(surface.scenes).map((condition) => condition)).toEqual([
        { kind: 'inParty', actorId: 'zhao-linger' },
        { kind: 'inParty', actorId: 'anu' },
        { kind: 'inParty', actorId: 'anu' },
        { kind: 'inParty', actorId: 'zhao-linger' },
      ])
      expect(report.references).toHaveLength(4)
    }
    for (const sceneId of ['s023', 's202', 's213'])
      expect(readFileSync(resolve(currentRoot, `scenes/${sceneId}.json`))).toEqual(
        readFileSync(resolve(baselineRoot, `scenes/${sceneId}.json`)),
      )
  })
})
