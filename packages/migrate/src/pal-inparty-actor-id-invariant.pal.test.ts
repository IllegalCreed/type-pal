import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type AuthorSceneDef,
  validateActors,
  validateAuthorEnemies,
  validateAuthorItems,
  validateAuthorScenes,
  validateAuthorSharedScripts,
  validateSceneIndex,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { assertPalInPartyActorIdInvariant } from './pal-inparty-actor-id-invariant.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const currentRoot = resolve(repo, 'projects/pal')
const baselineRoot = resolve(repo, 'packages/migrate/baselines/pal')

function readJson(root: string, path: string): unknown {
  return JSON.parse(readFileSync(resolve(root, path), 'utf8'))
}

function loadSurface(root: string) {
  const sceneIndex = validateSceneIndex(readJson(root, 'content/scenes/index.json'))
  const scenes = validateAuthorScenes(sceneIndex.scenes.map(({ path }) => readJson(root, path)))
  const actors = validateActors(readJson(root, 'content/actors.json'))
  return {
    actors,
    scenes,
    commandRoots: [
      scenes,
      validateAuthorItems(readJson(root, 'content/items.json')),
      validateAuthorEnemies(readJson(root, 'content/enemies.json')),
      validateAuthorSharedScripts(readJson(root, 'content/shared-scripts.json')),
    ],
  }
}

function targetBranches(scenes: readonly AuthorSceneDef[]) {
  const byId = new Map(scenes.map((scene) => [scene.id, scene]))
  const flowOf = (sceneId: string, entityId: string) => {
    const flow = byId.get(sceneId)?.entities.find(({ id }) => id === entityId)?.behaviors?.trigger
      ?.default?.flow
    if (!flow || flow.kind !== 'stages')
      throw new Error(`expected ordinary target flow ${sceneId}/${entityId}`)
    return flow
  }
  const stageBranch = (sceneId: string, entityId: string, stageId: string, index: number) => {
    const flow = flowOf(sceneId, entityId)
    const command = flow.stages.find(({ id }) => id === stageId)?.body[index]
    if (!command || command.kind !== 'branch')
      throw new Error(`${sceneId}/${entityId}/${stageId}[${index}] expected branch`)
    return command
  }
  return [
    stageBranch('s023', 'e433', 'initial', 0),
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
