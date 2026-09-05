import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  collectCommandTargetReferences,
  type CommandTargetReference,
  rewriteExplicitSceneReferences,
  type SceneDef,
  validateSceneIndex,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'

const repo = resolve(import.meta.dirname, '../../..')
const read = (path: string): unknown =>
  JSON.parse(readFileSync(resolve(repo, 'projects/pal', path), 'utf8')) as unknown
const index = validateSceneIndex(read('content/scenes/index.json'))
const scenes = index.scenes.map((entry) => read(entry.path) as SceneDef)

function targetSceneId(reference: CommandTargetReference): string | undefined {
  switch (reference.target.kind) {
    case 'scene':
      return reference.target.id
    case 'scene-entry':
    case 'scene-hook':
    case 'entity':
      return reference.target.sceneId
    default:
      return undefined
  }
}

function targetWithScene(reference: CommandTargetReference, sceneId: string): unknown {
  switch (reference.target.kind) {
    case 'scene':
      return { ...reference, target: { ...reference.target, id: sceneId } }
    case 'scene-entry':
    case 'scene-hook':
    case 'entity':
      return { ...reference, target: { ...reference.target, sceneId } }
    default:
      return reference
  }
}

describe('PAL full-tree scene copy differential', () => {
  test('294 场景逐一 self 全改、external 多重集不变且输入不 mutate', () => {
    const selfCounts: Array<{ id: string; count: number }> = []
    for (const scene of scenes) {
      const beforeBytes = JSON.stringify(scene)
      const before = collectCommandTargetReferences(scene, `scene:${scene.id}`)
      const self = before.filter((reference) => targetSceneId(reference) === scene.id)
      const external = before.filter((reference) => targetSceneId(reference) !== scene.id)
      const copyId = `${scene.id}-copy`
      const copied = rewriteExplicitSceneReferences(scene, scene.id, copyId)
      const after = collectCommandTargetReferences(copied, `scene:${scene.id}`)

      expect(JSON.stringify(scene), `${scene.id}: input mutated`).toBe(beforeBytes)
      expect(
        after.filter((reference) => targetSceneId(reference) === scene.id),
        `${scene.id}: source SceneId remains`,
      ).toEqual([])
      expect(
        after.filter((reference) => targetSceneId(reference) === copyId),
        `${scene.id}: rewritten self multiset`,
      ).toEqual(self.map((reference) => targetWithScene(reference, copyId)))
      expect(
        after.filter((reference) => targetSceneId(reference) !== copyId),
        `${scene.id}: external multiset`,
      ).toEqual(external)
      selfCounts.push({ id: scene.id, count: self.length })
    }

    const withSelf = selfCounts.filter(({ count }) => count > 0)
    expect(withSelf).toHaveLength(245)
    expect([...selfCounts].sort((left, right) => right.count - left.count).slice(0, 5)).toEqual([
      { id: 's108', count: 6897 },
      { id: 's019', count: 5368 },
      { id: 's176', count: 2562 },
      { id: 's052', count: 1672 },
      { id: 's186', count: 1575 },
    ])
  })
})
