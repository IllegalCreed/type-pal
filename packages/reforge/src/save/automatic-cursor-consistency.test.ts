import {
  type BehaviorCursor,
  CONTENT_VERSION,
  CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  type CurrentManifest,
  validateRuntimeScenes,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { deferred } from '../__tests__/deferred.js'
import { fixture, stage } from '../__tests__/save-lineage-fixture.js'
import { normalizeCurrentSave, preflightCurrentSave } from './current-codec.js'
import { buildCurrentSavePayload } from './ops.js'
import type { CurrentSavePayload } from './types.js'

const owner = { scene: 's', entity: 'e' }
const position = {
  sceneId: owner.scene,
  pos: { col: 0, row: 0, height: 0 },
  facing: 'down',
} as const
const manifest: CurrentManifest = {
  id: 'demo',
  name: 'Demo',
  contentVersion: CONTENT_VERSION,
  minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
  defaultEntryId: 'new-game',
  entryPoints: [
    {
      id: 'new-game',
      label: 'Start',
      scene: owner.scene,
      startWorld: { party: ['hero'], money: 0, inventory: [] },
    },
  ],
  content: {},
  assets: { catalog: 'assets/index.json', roles: {} },
}

async function saveDuringAutomaticMove() {
  const entered = deferred()
  const release = deferred()
  const f = fixture({
    async executeEffect(command, context) {
      if (command.kind !== 'stepEntity') return
      if (!context.autoMotionCheckpoint) throw new Error('motion checkpoint missing')
      context.autoMotionCheckpoint.settle('continuation')
      entered.resolve()
      await release.promise
    },
  })
  const entity = f.scene.entities[0]!
  entity.pages![0]!.auto = 'patrol'
  entity.behaviors!.auto = {
    patrol: {
      label: 'Patrol',
      order: 0,
      flow: stage([
        { kind: 'repeat', count: 1, body: [{ kind: 'stepEntity', target: owner, dir: 'right' }] },
        { kind: 'finishStep', next: { kind: 'complete' } },
      ]),
    },
  }
  validateRuntimeScenes([f.scene])

  const running = f.runtime.runEntityBehavior(f.scene, owner.entity, 'auto', { signal: f.signal })
  try {
    await Promise.race([
      entered.promise,
      running.then(() => {
        throw new Error('patrol ended before reaching the motion checkpoint')
      }),
    ])
    const world = await f.runtime.withSaveBarrier(() => structuredClone(f.world))
    const cursor = world.script?.behaviors.entities?.s?.e?.auto?.cursor
    if (!cursor?.resume) throw new Error('patrol did not capture a resumable cursor')
    await f.runtime.validateAutomaticContinuations(world, f.signal, [], owner.scene)
    const raw = buildCurrentSavePayload(world, position, manifest.id, {
      s: {
        entities: {},
        automatic: { e: { cursor: structuredClone(cursor) } },
        actions: [],
        chaseClaims: [],
      },
    })
    const resolver = await preflightCurrentSave({ manifest, payload: raw })
    return {
      raw,
      canonical: cursor,
      sceneCopy: raw.sceneRuntime.s!.automatic.e!,
      normalize: () => normalizeCurrentSave(raw, resolver, f.options.lifecycleReferences),
      validateScene: async (payload: CurrentSavePayload) => {
        await f.runtime.validateSceneRuntimeContinuations(
          payload.world,
          f.signal,
          owner.scene,
          payload.sceneRuntime.s!,
        )
      },
    }
  } finally {
    release.resolve()
    await running
  }
}

function reorderedMembers({ behavior, at, resume }: BehaviorCursor): BehaviorCursor {
  if (at.kind !== 'stage' || !resume) throw new Error('patrol did not stop within a stage')
  const frames = resume.frames.map(({ index, control }) => {
    if (control?.kind === 'repeat')
      return { control: { iteration: control.iteration, kind: control.kind }, index }
    if (control?.kind === 'leaf')
      return {
        control: { phase: control.phase, command: control.command, kind: control.kind },
        index,
      }
    throw new Error('patrol did not capture its repeat and leaf frames')
  })
  return {
    resume: { frames, digest: resume.digest },
    at: { stage: at.stage, kind: at.kind },
    behavior,
  }
}

test('reads reordered object members in a saved automatic cursor and accepts the scene continuation', async () => {
  const saved = await saveDuringAutomaticMove()
  saved.sceneCopy.cursor = reorderedMembers(saved.canonical)
  expect(JSON.stringify(saved.sceneCopy.cursor)).not.toBe(JSON.stringify(saved.canonical))
  const before = structuredClone(saved.raw)
  let payload: CurrentSavePayload | undefined
  expect(() => {
    payload = saved.normalize()
  }).not.toThrow()
  if (!payload) throw new Error('normalization returned no payload')
  expect(payload.sceneRuntime.s?.automatic.e?.cursor).toEqual(saved.canonical)
  expect(payload.sceneRuntime.s?.automatic.e?.cursor).not.toBe(saved.sceneCopy.cursor)
  expect(saved.raw).toEqual(before)
  await saved.validateScene(payload)
})

const changes: [string, (cursor: BehaviorCursor) => void][] = [
  [
    'behavior',
    (cursor) => {
      cursor.behavior = 'other'
    },
  ],
  [
    'stage',
    (cursor) => {
      cursor.at = { kind: 'stage', stage: 'other' }
    },
  ],
  [
    'content digest',
    (cursor) => {
      cursor.resume!.digest = '1'.repeat(64)
    },
  ],
  [
    'frame order',
    (cursor) => {
      cursor.resume!.frames.reverse()
    },
  ],
  [
    'control phase',
    (cursor) => {
      const frame = cursor.resume!.frames.find((entry) => entry.control?.kind === 'leaf')
      if (frame?.control?.kind !== 'leaf' || frame.control.phase !== 'continuation')
        throw new Error('expected an in-flight automatic step')
      frame.control.phase = 'done'
    },
  ],
  [
    'extra member',
    (cursor) => {
      Object.assign(cursor, { extra: 'unexpected' })
    },
  ],
]

test.each(changes)('rejects a changed %s in the saved automatic cursor', async (_label, change) => {
  const saved = await saveDuringAutomaticMove()
  change(saved.sceneCopy.cursor)
  expect(saved.normalize).toThrow('payload.sceneRuntime.s.e: 自动脚本续跑身份不一致')
})
