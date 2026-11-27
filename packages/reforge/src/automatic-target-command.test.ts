import { buildEntityLifecycleReferenceIndex, buildWorld } from '@type-pal/content'
import { expect, test } from 'vitest'
import { deferred, nextTestTask } from './__tests__/deferred.js'
import { shellActor } from './__tests__/runtime-shell/project.js'
import { fixture, stage } from './__tests__/save-lineage-fixture.js'
import { executeAutomaticTargetCommand } from './automatic-target-command.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { normalizeCurrentSave } from './save/current-codec.js'
import { buildCurrentSavePayload } from './save/ops.js'
import { ScriptWakeGate } from './script-wake-gate.js'

test('a target acquired after the checkpoint await keeps the same command until the next release', async () => {
  const controller = new AbortController()
  const wake = new ScriptWakeGate()
  const acquiringCheckpoint = deferred<void>()
  const grantCheckpoint = deferred<void>()
  const parked = deferred<void>()
  let held = false
  let visibleFrame = 0
  const pending = executeAutomaticTargetCommand(
    {
      signal: controller.signal,
      checkpoint: {
        ready: () => {},
        beginMutation: () => {
          acquiringCheckpoint.resolve()
          return grantCheckpoint.promise
        },
      },
      eligible: () => !held,
      wait: (eligible) => {
        const wait = wake.wait(controller.signal, eligible)
        if (held) parked.resolve()
        return wait
      },
    },
    async () => {
      visibleFrame = 3
    },
  )
  try {
    await acquiringCheckpoint.promise
    held = true
    grantCheckpoint.resolve()
    expect(
      await Promise.race([parked.promise.then(() => 'parked'), pending.then(() => 'ran')]),
    ).toBe('parked')
    expect(visibleFrame).toBe(0)
  } finally {
    held = false
    wake.notify()
    await pending
  }
  expect(visibleFrame).toBe(3)
})

test.each([
  'abort',
  'lost ownership',
] as const)('a pending target rejects %s without writing', async (invalidity) => {
  const controller = new AbortController()
  const wake = new ScriptWakeGate()
  const superseded = new DOMException('activation replaced', 'AbortError')
  let ownsTarget = true
  let visibleFrame = 0
  const pending = executeAutomaticTargetCommand(
    {
      signal: controller.signal,
      eligible: () => {
        if (!ownsTarget) throw superseded
        return false
      },
      wait: (eligible) => wake.wait(controller.signal, eligible),
    },
    async () => {
      visibleFrame = 3
    },
  )
  if (invalidity === 'abort') {
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  } else {
    ownsTarget = false
    wake.notify()
    await expect(pending).rejects.toBe(superseded)
  }
  expect(visibleFrame).toBe(0)
})

test('abort during the checkpoint acquisition cannot install a pose even after the target became eligible', async () => {
  const controller = new AbortController()
  let visibleFrame = 0
  const pending = executeAutomaticTargetCommand(
    {
      signal: controller.signal,
      eligible: () => true,
      wait: async () => {},
      checkpoint: {
        ready: () => {},
        beginMutation: async () => {
          controller.abort()
        },
      },
    },
    async () => {
      visibleFrame = 3
    },
  )
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(visibleFrame).toBe(0)
})

test.each([
  false,
  true,
])('a held automatic pose snapshots as legal SAVE12 without waiting or repeating its reward; retake during save=%s', async (retake) => {
  let held = true
  const wake = new ScriptWakeGate()
  const parked = deferred<void>()
  const poses: string[] = []
  const f = fixture({
    executeEffect: async (command, context, signal) => {
      if (command.kind === 'giveMoney') f.world.money += command.delta
      else if (command.kind === 'setEntityFrame')
        await executeAutomaticTargetCommand(
          {
            signal,
            checkpoint: context.autoCommandCheckpoint,
            eligible: () => !held,
            wait: (eligible) => {
              const wait = wake.wait(signal, eligible)
              parked.resolve()
              return wait
            },
          },
          async () => {
            poses.push(command.kind)
          },
        )
    },
  })
  const actor = shellActor('hero')
  const seeded = buildWorld({ party: ['hero'], money: 0, inventory: [] }, { hero: actor })
  f.world.party = seeded.party
  f.world.learnedSkills = seeded.learnedSkills
  const entity = f.scene.entities[0]
  if (!entity?.pages?.[0] || !entity.behaviors) throw new Error('fixture entity missing')
  entity.pages[0].auto = 'pose'
  entity.behaviors.auto = {
    pose: {
      label: 'Pose',
      order: 0,
      flow: {
        ...stage([
          { kind: 'giveMoney', delta: 7 },
          { kind: 'setEntityFrame', target: { scene: 's', entity: 'e' }, frame: 1 },
          { kind: 'giveMoney', delta: 9 },
          { kind: 'finishStep', next: { kind: 'complete' } },
        ]),
      },
    },
  }
  const active = f.runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: f.signal })
  const completion = active.catch((error: unknown) => error)
  let payload: ReturnType<typeof buildCurrentSavePayload>
  try {
    await parked.promise
    expect(f.world.money).toBe(7)
    expect(poses).toEqual([])
    const snapshot = f.runtime.withSaveBarrier(() => {
      if (retake) {
        held = false
        wake.notify()
        held = true
      }
      return buildCurrentSavePayload(
        structuredClone(f.world),
        { sceneId: 's', pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        'pose-project',
      )
    })
    expect(
      await Promise.race([snapshot.then(() => 'saved'), nextTestTask().then(() => 'blocked')]),
    ).toBe('saved')
    payload = await snapshot
  } finally {
    f.controller.abort()
    await completion
  }
  expect(await completion).toMatchObject({ name: 'AbortError' })
  expect(payload.version).toBe(12)
  expect(payload.world.money).toBe(7)
  expect(payload.world.script?.behaviors.entities?.s?.e?.auto?.cursor?.resume?.frames).toEqual([
    { index: 1 },
  ])
  expect(poses).toEqual([])
  const references = buildEntityLifecycleReferenceIndex([f.scene])
  const restored = normalizeCurrentSave(
    payload,
    {
      kind: 'current',
      projectId: 'pose-project',
      contentVersion: 23,
      saveVersion: 12,
    },
    references,
  )
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, restored.world, 'c'.repeat(64), {
    ...f.options,
    executeEffect: async (command, context, signal) => {
      if (command.kind === 'giveMoney') restored.world.money += command.delta
      else if (command.kind === 'setEntityFrame')
        await executeAutomaticTargetCommand(
          {
            signal,
            checkpoint: context.autoCommandCheckpoint,
            eligible: () => true,
            wait: async () => {},
          },
          async () => {
            poses.push(command.kind)
          },
        )
    },
  })
  await runtime.validateAutomaticContinuations(restored.world, new AbortController().signal)
  await runtime.runEntityBehavior(f.scene, 'e', 'auto', { signal: new AbortController().signal })
  expect(restored.world.money).toBe(16)
  expect(poses).toEqual(['setEntityFrame'])
  expect(f.world.money).toBe(7)
})
