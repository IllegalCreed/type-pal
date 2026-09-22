/** D01: composite owner/target identity and snapshot boundary validation, not old script persistence. */
import { expect, test } from 'vitest'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceSource,
  defaultProjectReferenceSourceLabel,
  type ProjectReferenceEdgeInput,
  ProjectReferenceIndex,
  type ProjectReferenceSourceOwner,
  type ProjectReferenceTarget,
  projectReferenceSourceSceneId,
  projectReferenceTargetKey,
} from './project-reference.js'

const owners: ProjectReferenceSourceOwner[] = [
  { kind: 'world-sprite-action', spriteId: 'same', actionId: 'idle' },
  {
    kind: 'script-owner',
    owner: { kind: 'item-private-script', itemId: 'item', ability: 'use', scriptId: 'use' },
  },
  {
    kind: 'script-owner',
    owner: { kind: 'entity-hostile-on-lose', sceneId: 'scene', entityId: 'enemy' },
  },
  {
    kind: 'script-owner',
    owner: { kind: 'scene-hook', sceneId: 'scene', slot: 'onTeleport', hookId: 'entry' },
  },
]
const targets: ProjectReferenceTarget[] = [
  {
    kind: 'entity-behavior',
    sceneId: 'scene',
    entityId: 'enemy',
    channel: 'auto',
    behaviorId: 'same',
  },
  { kind: 'scene-hook', sceneId: 'scene', slot: 'onTeleport', hookId: 'same' },
  { kind: 'world-sprite-action', spriteId: 'same', actionId: 'idle' },
]
function edges(): ProjectReferenceEdgeInput[] {
  return owners.map((owner, index) => ({
    target: targets[index % targets.length]!,
    source: createProjectReferenceSource(owner, defaultProjectReferenceSourceLabel(owner)),
    relation: { kind: 'entity-address' },
    where: `owner.${index}.target`,
    locator: { kind: 'unavailable', reason: 'static reference' },
    deletePolicy: 'block',
  }))
}
test('composite script and sprite owners round-trip independently despite reused display IDs', () => {
  const input = edges(),
    before = structuredClone(input)
  const index = new ProjectReferenceIndex(buildProjectReferenceSnapshot(input))
  expect(index.allReferences().map(({ id: _id, ...edge }) => edge)).toEqual(input)
  expect(owners.map(projectReferenceSourceSceneId)).toEqual([
    undefined,
    undefined,
    'scene',
    'scene',
  ])
  expect(new Set(targets.map(projectReferenceTargetKey)).size).toBe(3)
  expect(input).toEqual(before)
})
test.each([
  'length',
  'tail',
] as const)('invalid snapshot target offset %s fails at the public index boundary', (axis) => {
  const snapshot = buildProjectReferenceSnapshot(edges()),
    before = structuredClone(snapshot)
  expect(new ProjectReferenceIndex(snapshot).allReferences()).toHaveLength(4)
  const invalid = {
    ...snapshot,
    targetOffsets:
      axis === 'length'
        ? snapshot.targetOffsets.slice(1)
        : [...snapshot.targetOffsets.slice(0, -1), snapshot.targetEdgeIds.length + 1],
  }
  expect(() => new ProjectReferenceIndex(invalid)).toThrow(
    axis === 'length' ? 'targetOffsets 长度不匹配' : 'targetOffsets 尾界不匹配',
  )
  expect(snapshot).toEqual(before)
})
test('custom deletedWith order is canonicalized without mutating the supplied source or losing section identity', () => {
  const input = edges()
  const first = input[0]!
  const keys = [
    projectReferenceTargetKey({ kind: 'scene', id: 'z' }),
    projectReferenceTargetKey({ kind: 'scene', id: 'a' }),
  ]
  first.source = { ...first.source, deletedWith: keys }
  const before = structuredClone(input)
  const index = new ProjectReferenceIndex(buildProjectReferenceSnapshot(input))
  expect(index.allReferences()[0]!.source.deletedWith).toEqual([...keys].sort())
  expect(
    index.deletionScopeFor([{ kind: 'scene', id: 'a' }]).removedSourceKeys.has(first.source.key),
  ).toBe(true)
  expect(input).toEqual(before)
})
