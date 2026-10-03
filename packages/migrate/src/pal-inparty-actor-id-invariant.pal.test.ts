import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ActorDef, AuthorCommand, AuthorSceneDef, SceneIndexV1 } from '@type-pal/content'
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

function targetBranches(scenes: readonly AuthorSceneDef[]) {
  const byId = new Map(scenes.map((scene) => [scene.id, scene]))
  const flowOf = (sceneId: string, entityId: string) => {
    const flow = byId.get(sceneId)?.entities.find(({ id }) => id === entityId)?.behaviors?.trigger
      ?.default?.flow
    if (!flow) throw new Error(`missing target flow ${sceneId}/${entityId}`)
    return flow
  }
  const s023 = flowOf('s023', 'e433')
  const inPartyBranches: Extract<AuthorCommand, { kind: 'branch' }>[] = []
  const collect = (commands: readonly AuthorCommand[]): void => {
    for (const command of commands) {
      if (command.kind === 'branch') {
        if (command.cond.kind === 'inParty') inPartyBranches.push(command)
        collect(command.then)
        collect(command.else ?? [])
      } else if (command.kind === 'loop' || command.kind === 'repeat') collect(command.body)
      else if (command.kind === 'confirm') {
        collect(command.onYes)
        collect(command.onNo)
      }
    }
  }
  for (const stage of s023.stages) collect(stage.body)
  if (inPartyBranches.length !== 1) throw new Error('s023/e433 expected one inParty branch')
  const s023Branch = inPartyBranches[0]!

  const stageBranch = (sceneId: string, entityId: string, stageId: string, index: number) => {
    const flow = flowOf(sceneId, entityId)
    const command = flow.stages.find(({ id }) => id === stageId)?.body[index]
    if (!command || command.kind !== 'branch')
      throw new Error(`${sceneId}/${entityId}/${stageId}[${index}] expected branch`)
    return command
  }
  return [
    s023Branch,
    stageBranch('s202', 'e3392', 'initial', 0),
    stageBranch('s202', 'e3392', 'legacy-002', 0),
    stageBranch('s213', 'e3638', 'initial', 3),
  ]
}

describe('PAL current/baseline inParty ActorId publication', () => {
  test('两个表面四站点稳定、全作者根无数字/悬空引用且四站点完整分支镜像', () => {
    const current = loadSurface(currentRoot)
    const baseline = loadSurface(baselineRoot)
    for (const surface of [current, baseline]) {
      const report = assertPalInPartyActorIdInvariant({
        actors: surface.actors,
        commandRoots: surface.commandRoots,
      })
      expect(targetBranches(surface.scenes).map((branch) => branch.cond)).toEqual([
        { kind: 'inParty', actorId: 'zhao-linger' },
        { kind: 'inParty', actorId: 'anu' },
        { kind: 'inParty', actorId: 'anu' },
        { kind: 'inParty', actorId: 'zhao-linger' },
      ])
      expect(report.references).toHaveLength(4)
    }
    // Author-owned flows may modernize independently of the current publication baseline.
    // Preserve the four complete inParty branches, including their bodies and step exits,
    // rather than freezing unrelated flow endings elsewhere in the same scenes.
    expect(targetBranches(current.scenes)).toEqual(targetBranches(baseline.scenes))
  })
})
