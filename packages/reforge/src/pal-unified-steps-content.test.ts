import type {
  AuthorCondition,
  FlowCursor,
  RuntimeCommand,
  RuntimeScriptFlow,
} from '@type-pal/content'
import {
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
  validateAuthorSharedScripts,
  validateSceneIndex,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import indexJson from '../../../projects/pal/content/scenes/index.json' with { type: 'json' }
import sharedJson from '../../../projects/pal/content/shared-scripts.json' with { type: 'json' }
import { sha256Bytes } from './hash.js'
import ledger from './pal-unified-steps-acceptance-ledger.json' with { type: 'json' }
import ambientOracle from './pal-unified-steps-ambient-oracle.json' with { type: 'json' }
import oracle from './pal-unified-steps-auto-oracle.json' with { type: 'json' }
import { compileRuntimeScriptFlow, RuntimeSharedScriptResolver } from './runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'

const modules = import.meta.glob<unknown>('../../../projects/pal/content/scenes/*.json', {
  eager: true,
  import: 'default',
})
const index = validateSceneIndex(indexJson)
const scenes = validateAuthorScenes(
  index.scenes.map((entry) => {
    const scene = modules[`../../../projects/pal/${entry.path}`]
    if (!scene) throw new Error(`missing canonical scene ${entry.path}`)
    return scene
  }),
)
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
const library = resolveAuthorDialogueTree(validateAuthorSharedScripts(sharedJson), actors)
const digest = 'f'.repeat(64)
const shared = new RuntimeSharedScriptResolver(library, digest)
const autos = new Map<string, RuntimeScriptFlow>()
for (const scene of scenes)
  for (const entity of scene.entities)
    for (const [behavior, definition] of Object.entries(entity.behaviors?.auto ?? {}))
      autos.set(
        `${scene.id}/${entity.id}/auto/${behavior}`,
        resolveAuthorDialogueTree(definition.flow, actors),
      )

const hash = (value: unknown): Promise<string> =>
  sha256Bytes(new TextEncoder().encode(JSON.stringify(value)))

function walkCommands(
  body: RuntimeCommand[],
  visit: (
    command: RuntimeCommand,
    siblings: RuntimeCommand[],
    index: number,
    path: (string | number)[],
  ) => void,
  path: (string | number)[] = [],
): void {
  for (const [index, command] of body.entries()) {
    const current = [...path, index]
    visit(command, body, index, current)
    switch (command.kind) {
      case 'branch':
        walkCommands(command.then, visit, [...current, 'then'])
        if (command.else) walkCommands(command.else, visit, [...current, 'else'])
        break
      case 'confirm':
        walkCommands(command.onYes, visit, [...current, 'onYes'])
        walkCommands(command.onNo, visit, [...current, 'onNo'])
        break
      case 'loop':
      case 'repeat':
        walkCommands(command.body, visit, [...current, 'body'])
        break
      case 'startBattle':
        if (command.onLose) walkCommands(command.onLose, visit, [...current, 'onLose'])
        if (command.onFlee) walkCommands(command.onFlee, visit, [...current, 'onFlee'])
        break
      case 'teleportOut':
        if (command.onFail) walkCommands(command.onFail, visit, [...current, 'onFail'])
        break
    }
  }
}

async function observe(
  flow: RuntimeScriptFlow,
  options: { seed: number; environment: boolean; effects?: number; milliseconds?: number },
) {
  let now = 0,
    random = options.seed,
    effects = 0,
    cursor: FlowCursor | undefined,
    bounded = false
  const controller = new AbortController()
  const trace: Record<string, unknown>[] = []
  const stop = () => {
    bounded = true
    controller.abort()
  }
  const advance = (milliseconds: number) => {
    now += milliseconds
    if (now >= (options.milliseconds ?? 30000)) stop()
  }
  const evaluate = (condition: AuthorCondition): boolean => {
    if (condition.kind === 'not') return !evaluate(condition.cond)
    if (condition.kind === 'all') return condition.of.every(evaluate)
    if (condition.kind === 'any') return condition.of.some(evaluate)
    if (condition.kind === 'chance') {
      random ^= random << 13
      random ^= random >>> 17
      random ^= random << 5
      const result = ((random >>> 0) / 2 ** 32) * 100 < condition.percent
      trace.push({ at: now, chance: condition.percent, result })
      return result
    }
    trace.push({ at: now, condition, result: options.environment })
    return options.environment
  }
  const host: ScriptRuntimeHost = {
    execute(command) {
      if (command.kind === 'wait') {
        advance(command.ms)
        return
      }
      trace.push({ at: now, command: structuredClone(command) })
      if (['moveEntity', 'stepEntity', 'chasePlayer'].includes(command.kind)) advance(100)
      if (++effects >= (options.effects ?? 90)) stop()
    },
    evalCondition: evaluate,
    gameplayNow: () => now,
    confirm: async () => false,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async (milliseconds) => advance(milliseconds),
    waitWorldTick: async () => advance(100),
    yieldMacroTask: async () => {},
  }
  const executable = compileRuntimeScriptFlow(flow, {
    timing: 'auto',
    canonicalContentDigest: digest,
  })
  for (let activation = 0; activation < 2000 && !bounded; activation++) {
    try {
      await new RuntimeScriptRunner(host, controller.signal, shared).runFlow(executable, {
        ...(cursor ? { cursor } : {}),
        cursorController: {
          checkpointEnabled: true,
          reachSafePoint(value) {
            cursor = value
            return 'continue'
          },
        },
      })
    } catch (error) {
      if (!bounded) throw error
    }
    if (cursor?.kind === 'completed') break
  }
  return { trace, hash: await hash(trace), now, cursor }
}

test('all current scene scripts use steps; automatic phases are inside one step', () => {
  expect(scenes).toHaveLength(294)
  expect(autos.size).toBe(1329)
  let flows = 0
  for (const scene of scenes) {
    for (const entity of scene.entities)
      for (const group of Object.values(entity.behaviors ?? {}))
        for (const behavior of Object.values(group)) {
          flows++
          expect(behavior.flow.kind).toBe('stages')
        }
    for (const group of Object.values(scene.hooks ?? {}))
      for (const hook of Object.values(group.variants)) {
        flows++
        expect(hook.flow.kind).toBe('stages')
      }
  }
  expect(flows).toBe(4663)
  for (const flow of autos.values()) expect(flow.stages).toHaveLength(1)
  const text = JSON.stringify(scenes)
  for (const retired of ['stateMachine', 'cursorHandoff', 'stopScript', 'commandOutcome'])
    expect(text).not.toContain(`"${retired}"`)
  expect(text).not.toContain('maxIterations')
})

test('the batch preserves all 294 non-script scene definitions', async () => {
  const sourceHashes = new Map(Object.entries(ledger.nonScriptSceneHashes))
  for (const scene of scenes) {
    const withoutScripts = {
      ...scene,
      hooks: undefined,
      entities: scene.entities.map(({ behaviors: _behaviors, ...entity }) => entity),
    }
    expect(await hash(withoutScripts)).toBe(sourceHashes.get(scene.id))
  }
})

test('shared sound routines are self-free and use only sound and local control', async () => {
  expect(Object.keys(library).sort()).toEqual(ledger.sharedSources.map((row) => row.id).sort())
  for (const row of ledger.sharedSources) {
    const definition = library[row.id]
    if (!definition) throw new Error(row.id)
    expect(definition.self).toBe('none')
    expect(await hash(definition.body)).toBe(row.bodyHash)
    const kinds = new Set<string>()
    walkCommands(definition.body, (command) => kinds.add(command.kind))
    expect([...kinds].sort()).toEqual(row.kinds)
    expect(
      [...kinds].every((kind) =>
        ['playSound', 'wait', 'branch', 'loop', 'repeat', 'continueLoop', 'breakLoop'].includes(
          kind,
        ),
      ),
    ).toBe(true)
    const callers: string[] = []
    for (const [key, flow] of autos) {
      let invokes = false
      for (const stage of flow.stages)
        walkCommands(stage.body, (command) => {
          if (command.kind === 'callScript' && command.script === row.id) invokes = true
        })
      if (invokes) callers.push(key)
    }
    expect(callers.sort()).toEqual(row.sourceCallers.map((caller) => caller.key).sort())
    expect(new Set(row.sourceCallers.map((caller) => caller.flowHash)).size).toBe(1)
  }
})

test.each(
  ledger.removedTerminalWaits,
)('settles directly after self state 0 at the generated completion tail: $key', (row) => {
  const flow = autos.get(row.key)
  const stage = flow?.stages.find((value) => value.id === row.stage)
  if (!stage) throw new Error(row.key)
  let found = false
  walkCommands(stage.body, (command, siblings, index, path) => {
    if (JSON.stringify(path) !== JSON.stringify(row.path)) return
    found = true
    expect(command).toMatchObject({ kind: 'setEntityState', state: 0 })
    expect(siblings[index + 1]?.kind).toBe('finishStep')
    expect(row.removedMilliseconds).toBe(100)
  })
  expect(found).toBe(true)
})

const cases = oracle.cases.flatMap((row) =>
  oracle.scenarios.map((scenario, i) => ({ ...scenario, key: row.key, expected: row.hashes[i] })),
)

test.each(
  cases,
)('preserves bounded auto effects, RNG and time: $key seed=$seed env=$environment', async (entry) => {
  const flow = autos.get(entry.key)
  if (!flow || !entry.expected) throw new Error(`missing oracle case ${entry.key}`)
  const actual = await observe(flow, entry)
  expect(actual.hash).toBe(entry.expected)
})

test.each(
  ambientOracle.cases,
)('preserves long sound sequences and RNG: $key seed=$seed', async (entry) => {
  const flow = autos.get(entry.key)
  if (!flow) throw new Error(entry.key)
  const actual = await observe(flow, { ...entry, effects: 180, milliseconds: 180000 })
  expect(actual.hash).toBe(entry.expected)
})

test.each(
  ledger.primarySource.s231.firstMovement,
)('celebration departure $entity starts its complete source-defined wait', async (row) => {
  const key = `s231/${row.entity}/auto/${row.entity === 'e4168' ? 'legacy-004' : 'legacy-001'}`
  const flow = autos.get(key)
  if (!flow) throw new Error(key)
  const result = await observe(flow, {
    seed: 1,
    environment: false,
    effects: 20,
    milliseconds: 10000,
  })
  expect(
    result.trace.find((event) => {
      return (
        event.command &&
        typeof event.command === 'object' &&
        'kind' in event.command &&
        event.command.kind === 'moveEntity'
      )
    })?.at,
  ).toBe(row.firstMovementMilliseconds)
  expect(result.cursor).toEqual({ kind: 'completed' })
})

test.each([
  ['s021/e405/auto/legacy-001', 140],
  ['s273/e4723/auto/c8-3278127a7af6', 320],
  ['s273/e4726/auto/c8-119ab4af0281', 320],
  ['s273/e4727/auto/c8-0c47a1f79fad', 320],
  ['s273/e4728/auto/c8-900c5edf30b3', 320],
] as const)('source-defined departure %s starts at its beginning and performs %i increments', async (key, count) => {
  const flow = autos.get(key)
  if (!flow) throw new Error(key)
  const result = await observe(flow, {
    seed: 1,
    environment: false,
    effects: 1000,
    milliseconds: 100000,
  })
  const nudges = result.trace.filter(
    (event) =>
      typeof event.command === 'object' &&
      event.command !== null &&
      'kind' in event.command &&
      event.command.kind === 'nudgeEntity',
  )
  expect(nudges).toHaveLength(count)
  const hide = result.trace.find(
    (event) =>
      event.command &&
      typeof event.command === 'object' &&
      'kind' in event.command &&
      event.command.kind === 'setEntityState',
  )
  expect(hide?.at).toBe(key.startsWith('s021') ? 14100 : 32100)
  expect(result.now).toBe(hide?.at)
  expect(result.cursor).toEqual({ kind: 'completed' })
})

test.each([
  's250/e4409',
  's252/e4440',
])('%s has four complete reaction cycles before restoring touch and pursuit', async (address) => {
  const flow = autos.get(`${address}/auto/legacy-001`)
  if (!flow) throw new Error(address)
  const result = await observe(flow, {
    seed: 1,
    environment: false,
    effects: 100,
    milliseconds: 20000,
  })
  const effects = result.trace.flatMap((event) => {
    if (!event.command || typeof event.command !== 'object' || !('kind' in event.command)) return []
    return [{ at: event.at, command: event.command }]
  })
  expect(effects.filter((event) => event.command.kind === 'nudgeEntity')).toHaveLength(32)
  expect(effects.find((event) => event.command.kind === 'setEntityTriggerActivation')?.at).toBe(
    9200,
  )
  expect(effects.at(-1)?.at).toBe(9300)
  expect(effects.at(-1)?.command).toMatchObject({
    kind: 'selectEntityBehavior',
    selection: {
      kind: 'use',
      value: address.startsWith('s252') ? 'post-collision-pursuit' : 'default',
    },
  })
})

test('water maze preserves the distinct slow initial and faster post-collision pursuit', async () => {
  for (const [behavior, speed] of [
    ['default', 2],
    ['post-collision-pursuit', 4],
  ] as const) {
    const flow = autos.get(`s252/e4440/auto/${behavior}`)
    if (!flow) throw new Error(behavior)
    const result = await observe(flow, { seed: 1, environment: false, effects: 1 })
    expect(result.trace[0]?.command).toMatchObject({ kind: 'chasePlayer', speed })
  }
})
