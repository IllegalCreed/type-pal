import { buildEntityLifecycleReferenceIndex, buildWorld } from '@type-pal/content'
import { expect, test, vi } from 'vitest'
import { shellActor } from './__tests__/runtime-shell/project.js'
import { fixture, stage } from './__tests__/save-lineage-fixture.js'
import { executeAutomaticTargetCommand } from './automatic-target-command.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { normalizeCurrentSave } from './save/current-codec.js'
import { buildCurrentSavePayload } from './save/ops.js'
import { ScriptWakeGate } from './script-wake-gate.js'

async function drain() {
  for (let turn = 0; turn < 40; turn++) await Promise.resolve()
}

test('a target acquired after the checkpoint await keeps the same command until the next release', async () => {
  const controller = new AbortController()
  const wake = new ScriptWakeGate()
  let held = false
  const effect = vi.fn(async () => {})
  const ready = vi.fn()
  const beginMutation = vi.fn(async () => {
    if (beginMutation.mock.calls.length === 1) held = true
  })
  const pending = executeAutomaticTargetCommand(
    {
      signal: controller.signal,
      checkpoint: { ready, beginMutation },
      eligible: () => !held,
      wait: (eligible) => wake.wait(controller.signal, eligible),
    },
    effect,
  )
  await drain()
  expect(effect).not.toHaveBeenCalled()
  expect(ready).toHaveBeenCalledTimes(2)
  held = false
  wake.notify()
  await pending
  expect(beginMutation).toHaveBeenCalledTimes(2)
  expect(effect).toHaveBeenCalledTimes(1)
})

test.each([
  'abort',
  'scene',
  'activation',
] as const)('a pending target rejects late %s without writing', async (invalidity) => {
  const controller = new AbortController()
  const wake = new ScriptWakeGate()
  let valid = true
  const effect = vi.fn(async () => {})
  const pending = executeAutomaticTargetCommand(
    {
      signal: controller.signal,
      eligible: () => {
        if (!valid) throw new DOMException(`${invalidity} replaced`, 'AbortError')
        return false
      },
      wait: (eligible) => wake.wait(controller.signal, eligible),
    },
    effect,
  )
  const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  await drain()
  if (invalidity === 'abort') controller.abort()
  else {
    valid = false
    wake.notify()
  }
  await rejected
  expect(effect).not.toHaveBeenCalled()
})

test('abort during the checkpoint acquisition cannot install a pose even after the target became eligible', async () => {
  const controller = new AbortController()
  const effect = vi.fn(async () => {})
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
    effect,
  )
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  expect(effect).not.toHaveBeenCalled()
})

test.each([
  false,
  true,
])('a held automatic pose snapshots as legal SAVE11 without waiting or repeating its reward; retake during save=%s', async (retake) => {
  let held = true
  const wake = new ScriptWakeGate()
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
            wait: (eligible) => wake.wait(signal, eligible),
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
  await drain()
  expect(f.world.money).toBe(7)
  expect(poses).toEqual([])
  let saved = false
  const snapshot = f.runtime
    .withSaveBarrier(() => {
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
    .then((payload) => {
      saved = true
      return payload
    })
  await drain()
  expect(saved).toBe(true)
  const payload = await snapshot
  expect(payload.version).toBe(11)
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
      contentVersion: 22,
      saveVersion: 11,
    },
    references,
  )
  f.controller.abort()
  expect(await completion).toMatchObject({ name: 'AbortError' })
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
