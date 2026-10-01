import type { AuthorScriptFlow, BaseStateTransition, FlowCursor } from '@type-pal/content'
import {
  organizeFlowAsStages,
  resolveAuthorDialogueTree,
  validateAuthorScenes,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { compileRuntimeScriptFlow } from './runtime-script-compiler.js'
import type { ScriptRuntimeHost } from './runtime-script-runner.js'
import { RuntimeScriptRunner } from './runtime-script-runner.js'

const palScenes = validateAuthorScenes(
  Object.values(
    import.meta.glob('../../../projects/pal/content/scenes/s*.json', {
      eager: true,
      import: 'default',
    }),
  ),
)

test('PAL does not expose first/repeat-only flows as a second author state-machine structure', () => {
  const remaining: string[] = []
  for (const scene of palScenes) {
    for (const entity of scene.entities) {
      for (const channel of ['trigger', 'auto'] as const) {
        for (const [id, behavior] of Object.entries(entity.behaviors?.[channel] ?? {})) {
          if (organizeFlowAsStages(behavior.flow))
            remaining.push(`${scene.id}/${entity.id}/${channel}/${id}`)
        }
      }
    }
    for (const slot of ['onEnter', 'onTeleport'] as const) {
      for (const [id, hook] of Object.entries(scene.hooks?.[slot]?.variants ?? {})) {
        if (organizeFlowAsStages(hook.flow)) remaining.push(`${scene.id}/${slot}/${id}`)
      }
    }
  }
  expect(remaining).toEqual([])
})

test('PAL repeat steps use reachable order instead of former object property order', () => {
  const flow = palScenes.find((s) => s.id === 's005')!.entities.find((e) => e.id === 'e124')!
    .behaviors!.trigger!['legacy-001']!.flow
  expect(flow.kind).toBe('stages')
  if (flow.kind !== 'stages') throw new Error('expected author stages')
  expect(flow.stages.map((s) => s.id)).toEqual(['initial', 'phase-002', 'after-checkpoint'])
  expect(flow.stages.map((s) => s.next)).toEqual(['phase-002', 'after-checkpoint', undefined])
})

test.each([
  's188',
  's277',
])('PAL %s onEnter ends explicitly instead of retaining an empty repeat step', (sceneId) => {
  const flow = palScenes.find((s) => s.id === sceneId)!.hooks!.onEnter!.variants.default!.flow
  expect(flow.kind).toBe('stages')
  if (flow.kind !== 'stages') throw new Error('expected author stages')
  expect(flow.stages).toHaveLength(1)
  expect(flow.stages[0]?.body.length).toBeGreaterThan(0)
  expect(flow.stages[0]?.next).toEqual({ kind: 'complete' })
})

type MachineFlow = Extract<AuthorScriptFlow, { kind: 'stateMachine' }>
function source(next: BaseStateTransition = { kind: 'advance', state: 'repeat' }): MachineFlow {
  return {
    kind: 'stateMachine',
    machine: {
      id: 'talk',
      label: '交谈',
      initial: 'first',
      states: {
        repeat: { label: '复读', body: [{ kind: 'giveMoney', delta: 0 }], next: { kind: 'stay' } },
        first: { label: '首次', body: [{ kind: 'giveMoney', delta: 7 }], next },
      },
    },
  }
}

async function activate(
  flow: AuthorScriptFlow,
  timing: 'interactive' | 'auto',
  cursor?: FlowCursor,
  abortAfterExecute = false,
  confirm = true,
) {
  const calls: unknown[] = []
  const ac = new AbortController()
  const host: ScriptRuntimeHost = {
    execute(command) {
      calls.push(command)
      if (abortAfterExecute) ac.abort()
    },
    evalCondition: () => false,
    confirm: async () => {
      calls.push('confirm')
      return confirm
    },
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async (ms) => {
      calls.push(['wait', ms])
    },
    waitWorldTick: async () => {
      calls.push('worldTick')
    },
    yieldMacroTask: async () => {
      calls.push('macroTask')
    },
    revealSceneEntry: async (reveal) => {
      calls.push(['entry', reveal])
    },
  }
  let committed: FlowCursor | undefined
  let error: unknown
  try {
    await new RuntimeScriptRunner(host, ac.signal).runFlow(
      compileRuntimeScriptFlow(resolveAuthorDialogueTree(flow, {}), {
        timing,
        canonicalContentDigest: 'b'.repeat(64),
        allowSceneEntry: true,
      }),
      {
        cursor,
        runSceneEntry: true,
        allowSceneEntry: true,
        cursorController: {
          reachSafePoint(next) {
            expect(committed).toBeUndefined()
            committed = next
            return 'continue'
          },
        },
      },
    )
  } catch (caught) {
    error = caught
  }
  return { calls, committed, error }
}

test.each([
  'interactive',
  'auto',
] as const)('first/repeat %s activations retain commands, cadence and one save point', async (timing) => {
  const old = source()
  const organized = organizeFlowAsStages(old)!
  expect(organized.stages.map((s) => s.id)).toEqual(['first', 'repeat'])
  expect(organized.stages.map((s) => s.label)).toEqual(['首次', '复读'])
  let oldCursor: FlowCursor | undefined
  let newCursor: FlowCursor | undefined
  for (let invocation = 0; invocation < 3; invocation++) {
    const before = await activate(old, timing, oldCursor)
    const after = await activate(organized, timing, newCursor)
    expect(after.calls).toEqual(before.calls)
    expect(after.error).toBeUndefined()
    expect(before.committed).toEqual({ kind: 'state', machine: 'talk', state: 'repeat' })
    expect(after.committed).toEqual({ kind: 'stage', stage: 'repeat' })
    oldCursor = before.committed
    newCursor = after.committed
  }
})

test('step renaming is stripped from executable flow without changing commands or scheduling', () => {
  const flow = organizeFlowAsStages(source())!
  const compile = (input: AuthorScriptFlow) =>
    compileRuntimeScriptFlow(resolveAuthorDialogueTree(input, {}), {
      canonicalContentDigest: 'b'.repeat(64),
      timing: 'auto',
    })
  const original = compile(flow)
  const renamed = {
    ...flow,
    stages: flow.stages.map((stage) => ({ ...stage, label: '同名步骤' })),
  }
  expect(compile(renamed)).toEqual(original)
  const unnamed = {
    ...flow,
    stages: flow.stages.map(({ label: _label, ...stage }) => stage),
  }
  expect(compile(unnamed)).toEqual(original)
  if (original.flow.kind !== 'stages') throw new Error('expected executable stages')
  expect(original.flow.stages.every((stage) => !Object.hasOwn(stage, 'label'))).toBe(true)
})

test('entry, nested confirmation and stable command IDs survive an explicit organization', async () => {
  const old = source()
  old.machine.states.first!.entry = {
    prepare: [{ kind: 'playMusic', asset: 'music.pal.001' }],
    reveal: { kind: 'cut' },
  }
  old.machine.states.first!.body.unshift({
    kind: 'confirm',
    id: 'question',
    onNo: [{ kind: 'giveMoney', delta: 1 }],
  })
  const original = structuredClone(old)
  const organized = organizeFlowAsStages(old)!
  expect(old).toEqual(original)
  expect(organized.stages[0]?.entry).toEqual(old.machine.states.first!.entry)
  expect(organized.stages[0]?.body[0]).toMatchObject({ id: 'question' })
  for (const accepted of [false, true]) {
    const before = await activate(old, 'interactive', undefined, false, accepted)
    const after = await activate(organized, 'interactive', undefined, false, accepted)
    expect(after.calls).toEqual(before.calls)
    expect(after.error).toBeUndefined()
  }
  organized.stages[0]!.body.push({ kind: 'giveMoney', delta: 9 })
  organized.stages[0]!.entry!.prepare.push({ kind: 'wait', ms: 1 })
  const confirm = organized.stages[0]!.body[0]
  if (confirm?.kind !== 'confirm') throw new Error('confirmation was lost')
  confirm.onNo?.push({ kind: 'giveMoney', delta: 2 })
  expect(old).toEqual(original)
})

test.each([
  'restart',
  'complete',
] as const)('%s is preserved as an actual next-activation or completion edge', async (kind) => {
  const old = source({ kind })
  const organized = organizeFlowAsStages(old)!
  expect(organized.stages[0]?.next).toEqual(kind === 'restart' ? 'first' : { kind: 'complete' })
  const before = await activate(old, 'interactive')
  const after = await activate(organized, 'interactive')
  expect(after.calls).toEqual(before.calls)
  expect(after.committed).toEqual(
    kind === 'restart' ? { kind: 'stage', stage: 'first' } : { kind: 'completed' },
  )
  if (kind === 'complete') {
    expect(before.committed).toEqual({ kind: 'completed' })
    expect((await activate(organized, 'interactive', after.committed)).calls).toEqual([])
  }
})

test.each(['abort', 'stop'] as const)('%s does not commit a new author step', async (reason) => {
  const old = source()
  if (reason === 'stop') old.machine.states.first!.body.unshift({ kind: 'stopScript' })
  const organized = organizeFlowAsStages(old)!
  const before = await activate(old, 'interactive', undefined, reason === 'abort')
  const after = await activate(organized, 'interactive', undefined, reason === 'abort')
  expect(after.calls).toEqual(before.calls)
  expect(before.committed).toBeUndefined()
  expect(after.committed).toBeUndefined()
  if (reason === 'abort') expect(after.error).toMatchObject({ name: 'AbortError' })
})

test.each([
  { kind: 'continue', state: 'repeat' },
  { kind: 'to', state: 'repeat', yield: 'worldTick' },
  { kind: 'to', state: 'repeat', yield: 'macroTask' },
  {
    kind: 'branch',
    cond: { kind: 'flag', flag: 'f', is: true },
    then: { kind: 'stay' },
    else: { kind: 'stay' },
  },
  {
    kind: 'commandOutcome',
    commandId: 'question',
    command: 'confirm',
    outcome: 'no',
    then: { kind: 'stay' },
    else: { kind: 'stay' },
  },
] satisfies BaseStateTransition[])('refuses $kind scheduling instead of silently changing it', (next) => {
  expect(organizeFlowAsStages(source(next))).toBeUndefined()
})

test('refuses transition cadence, dangling targets and ordinary steps', () => {
  const old = source()
  old.machine.cadence = 'transition'
  expect(organizeFlowAsStages(old)).toBeUndefined()
  expect(organizeFlowAsStages(source({ kind: 'advance', state: 'missing' }))).toBeUndefined()
  const missingInitial = source()
  missingInitial.machine.initial = 'missing'
  expect(organizeFlowAsStages(missingInitial)).toBeUndefined()
  expect(
    organizeFlowAsStages({ kind: 'stages', initial: 'first', stages: [{ id: 'first', body: [] }] }),
  ).toBeUndefined()
})
