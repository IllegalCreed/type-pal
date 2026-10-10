import type { AuthorScriptFlow, FlowCursor, WorldState } from '@type-pal/content'
import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import sourceObjects from '../../../data/extracted/data/event-objects.json' with { type: 'json' }
import sourceEvents from '../../../data/extracted/events/all.json' with { type: 'json' }
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import locale from '../../../projects/pal/content/locale.json' with { type: 'json' }
import roomsJson from '../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import sickroomJson from '../../../projects/pal/content/scenes/s002.json' with { type: 'json' }
import innJson from '../../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import villageJson from '../../../projects/pal/content/scenes/s004.json' with { type: 'json' }
import marketJson from '../../../projects/pal/content/scenes/s005.json' with { type: 'json' }
import doctorJson from '../../../projects/pal/content/scenes/s010.json' with { type: 'json' }
import { compileRuntimeScriptFlow, type RuntimeLeafCommand } from './runtime-script-compiler.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'

const scenes = validateAuthorScenes([
  roomsJson,
  sickroomJson,
  innJson,
  villageJson,
  marketJson,
  doctorJson,
])
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))

function entity(sceneId: string, entityId: string) {
  const value = scenes
    .find((scene) => scene.id === sceneId)
    ?.entities.find((candidate) => candidate.id === entityId)
  if (!value) throw new Error(`missing canonical ${sceneId}/${entityId}`)
  return value
}

function flow(sceneId: string, entityId: string, behavior: string) {
  const value = entity(sceneId, entityId).behaviors?.trigger?.[behavior]?.flow
  if (!value || value.kind !== 'stages')
    throw new Error(`expected canonical steps ${sceneId}/${entityId}/${behavior}`)
  return value
}

async function activate(
  source: AuthorScriptFlow,
  cursor?: FlowCursor,
  timing: 'interactive' | 'auto' = 'interactive',
) {
  const commands: RuntimeLeafCommand[] = []
  const host: ScriptRuntimeHost = {
    execute: (command) => {
      commands.push(command)
    },
    evalCondition: () => false,
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  }
  let committed: FlowCursor | undefined
  await new RuntimeScriptRunner(host, new AbortController().signal).runFlow(
    compileRuntimeScriptFlow(resolveAuthorDialogueTree(source, actors), {
      timing,
      canonicalContentDigest: 'b'.repeat(64),
    }),
    {
      cursor,
      cursorController: {
        reachSafePoint(next) {
          expect(committed).toBeUndefined()
          committed = next
          return 'continue'
        },
      },
    },
  )
  return { commands, cursor: committed }
}

function rows(commands: RuntimeLeafCommand[]) {
  return commands.flatMap((command) =>
    command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
  )
}

test('the sickroom doctor faces the live party before speaking, then hides without a late fixed turn', async () => {
  const { commands } = await activate(flow('s002', 'e35', 'default'))
  const firstDialogue = commands.findIndex((command) => command.kind === 'dialog')
  expect(firstDialogue).toBeGreaterThan(0)
  expect(commands.slice(0, firstDialogue)).toEqual([
    { kind: 'faceEntityToParty', target: { scene: 's002', entity: 'e35' } },
    { kind: 'setEntityFrame', target: { scene: 's002', entity: 'e35' }, frame: 0 },
  ])
  const hidden = commands.findIndex(
    (command) =>
      command.kind === 'setEntityState' && command.target.entity === 'e35' && command.state === 0,
  )
  expect(hidden).toBeGreaterThan(firstDialogue)
  expect(
    commands
      .slice(firstDialogue, hidden)
      .filter((command) => command.kind === 'setEntityFacing' && command.target.entity === 'e35'),
  ).toEqual([])
})

test('every sickroom Xiaohu activation faces the party before its dialogue, including both repeat steps', async () => {
  const source = flow('s002', 'e36', 'default')
  let cursor: FlowCursor | undefined
  for (const firstLine of ['dlg.307', 'dlg.336', 'dlg.339']) {
    const result = await activate(source, cursor)
    const firstDialogue = result.commands.findIndex((command) => command.kind === 'dialog')
    expect(rows(result.commands)[0]).toBe(firstLine)
    expect(result.commands.slice(0, 2)).toEqual([
      { kind: 'faceEntityToParty', target: { scene: 's002', entity: 'e36' } },
      { kind: 'setEntityFrame', target: { scene: 's002', entity: 'e36' }, frame: 0 },
    ])
    expect(firstDialogue).toBeGreaterThan(1)
    cursor = result.cursor
  }
})

test('the doctor restores Zhang Si to his exact original blocker state before the boarding caller is used', async () => {
  const source = sourceObjects.eventObjects.find((object) => object.id === 123)
  expect(source?.sState).toBe(2)
  const { commands } = await activate(flow('s002', 'e35', 'default'))
  expect(
    commands.filter(
      (command) =>
        command.kind === 'setEntityState' &&
        command.target.scene === 's005' &&
        command.target.entity === 'e123',
    ),
  ).toEqual([
    { kind: 'setEntityState', target: { scene: 's005', entity: 'e123' }, state: source?.sState },
  ])
})

test('Zhang Si faces the party before the boarding counsel, then retains both authored walking legs', async () => {
  const { commands } = await activate(flow('s005', 'e123', 'legacy-002'))
  const target = { scene: 's005', entity: 'e123' }
  expect(commands.slice(0, 2)).toEqual([
    { kind: 'faceEntityToParty', target },
    { kind: 'setEntityFrame', target, frame: 0 },
  ])
  expect(rows(commands)[0]).toBe('dlg.533')
  expect(
    commands.flatMap((command) =>
      command.kind === 'stepEntity' && command.target.entity === 'e123' ? [command.dir] : [],
    ),
  ).toEqual(['right', 'right', 'right', 'right', 'down', 'down', 'down', 'down'])
})

test('boarding retains the primary down pose through both ride legs; opposite authored facing is rejected', async () => {
  const primary = sourceEvents.segments[0]?.commands
  expect(primary?.[1511]).toMatchObject({ opcode: 0x15, operands: [0, 0, 1] })
  expect(primary?.[1513]).toMatchObject({ opcode: 0x15, operands: [0, 0, 0] })
  const source = flow('s005', 'e116', 'legacy-001')
  const verify = async (candidate: AuthorScriptFlow) => {
    const { commands } = await activate(candidate)
    const firstRide = commands.findIndex((command) => command.kind === 'ride')
    expect(firstRide).toBeGreaterThan(0)
    expect(
      commands.slice(0, firstRide).filter((command) => command.kind === 'setPartyFacing'),
    ).toEqual([
      { kind: 'setPartyFacing', facing: 'down', member: 1 },
      { kind: 'setPartyFacing', facing: 'down' },
    ])
    const lastRide = commands.reduce(
      (last, command, index) => (command.kind === 'ride' ? index : last),
      -1,
    )
    expect(
      commands.slice(firstRide, lastRide + 1).some((command) => command.kind === 'setPartyFacing'),
    ).toBe(false)
  }
  await verify(source)
  const opposite = structuredClone(source)
  for (const command of opposite.stages[0]!.body) {
    if (command.kind === 'setPartyFacing') command.facing = 'up'
    if (command.kind === 'ride') break
  }
  await expect(verify(opposite)).rejects.toThrow()
})

test('one canonical rowing cycle pairs each source nudge/animate within its single actual automatic wait', async () => {
  const source = entity('s005', 'e117').behaviors?.auto?.['legacy-001']?.flow
  if (source?.kind !== 'stages') throw new Error('canonical rowing flow missing')
  const loop = source.stages[0]?.body[0]
  if (loop?.kind !== 'loop') throw new Error('canonical rowing cycle missing')
  const { commands } = await activate(
    {
      kind: 'stages',
      initial: 'cycle',
      stages: [{ id: 'cycle', body: loop.body, next: { kind: 'complete' } }],
    },
    undefined,
    'auto',
  )
  const actual: { effects: { kind: string; dx?: number; dy?: number }[]; ms: number }[] = []
  let effects: { kind: string; dx?: number; dy?: number }[] = []
  for (const command of commands) {
    if (command.kind === 'wait') {
      actual.push({ effects, ms: command.ms })
      effects = []
    } else if (command.kind === 'nudgeEntity')
      effects.push({ kind: 'nudge', dx: command.dx, dy: command.dy })
    else if (command.kind === 'animEntity') effects.push({ kind: 'animate' })
    else throw new Error('unclassified canonical rowing effect')
  }
  const expected = sourceEvents.segments[0]?.commands.slice(36147, 36163).map((command) => {
    if (command.op !== 'raw' || !('opcode' in command) || !('operands' in command))
      throw new Error('unclassified actual primary rowing command')
    expect([0x6c, 0x7d]).toContain(command.opcode)
    expect(command.operands).toEqual([65535, 4, 65534])
    return {
      effects: [
        { kind: 'nudge', dx: 4, dy: -2 },
        ...(command.opcode === 0x6c ? [{ kind: 'animate' }] : []),
      ],
      ms: 100,
    }
  })
  expect(actual).toEqual(expected)
  expect(effects).toEqual([])
})

test('the aunt gives the shrimp money once, then retains only her busy reminder', async () => {
  const source = flow('s001', 'e19', 'c8-74bc98f07f8e')
  const first = await activate(source)
  expect(first.commands.filter((command) => command.kind === 'giveMoney')).toEqual([
    { kind: 'giveMoney', delta: 50 },
  ])
  expect(first.cursor).toEqual({ kind: 'stage', stage: 'stage-2' })
  for (let attempt = 0; attempt < 3; attempt++) {
    const repeat = await activate(source, first.cursor)
    expect(rows(repeat.commands)).toEqual(['dlg.129', 'dlg.130'])
    expect(repeat.commands.filter((command) => command.kind === 'giveMoney')).toEqual([])
    expect(repeat.cursor).toEqual(first.cursor)
  }
})

test('Shuisheng introduces Zhang Si once; the fish vendor never arms the village report', async () => {
  const source = flow('s005', 'e124', 'default')
  const first = await activate(source)
  expect(first.commands[0]).toEqual({
    kind: 'faceEntityToParty',
    target: { scene: 's005', entity: 'e124' },
  })
  expect(first.commands).toContainEqual({
    kind: 'selectEntityBehavior',
    target: { scene: 's005', entity: 'e123' },
    channel: 'trigger',
    selection: { kind: 'use', value: 'legacy-001' },
  })
  expect(first.commands.filter((command) => command.kind === 'selectSceneHooks')).toEqual([])
  const repeat = await activate(source, first.cursor)
  expect(rows(repeat.commands)).toEqual(['dlg.567', 'dlg.568', 'dlg.569'])
  expect(repeat.commands.filter((command) => command.kind === 'selectEntityBehavior')).toEqual([])
  const vendor = flow('s005', 'e127', 'default')
  const noShrimp = await activate(vendor)
  expect(noShrimp.commands[0]).toEqual({
    kind: 'faceEntityToParty',
    target: { scene: 's005', entity: 'e127' },
  })
  const offerFish = await activate(vendor, noShrimp.cursor)
  expect(rows(noShrimp.commands)).toEqual(['dlg.603', 'dlg.604', 'dlg.605', 'dlg.606'])
  expect(rows(offerFish.commands)).toEqual(['dlg.607', 'dlg.608'])
  expect(
    [...noShrimp.commands, ...offerFish.commands].every(
      (command) => command.kind === 'dialog' || command.kind === 'faceEntityToParty',
    ),
  ).toBe(true)
})

test('Zhang Si advances from island response to return-to-inn reminder to a stable fishing prayer', async () => {
  // Original L_1436 has two end/advance boundaries after the island and inn passages.
  const source = flow('s005', 'e123', 'legacy-001')
  const island = await activate(source)
  expect(rows(island.commands)).toEqual([
    'dlg.515',
    'dlg.516',
    'dlg.517',
    'dlg.518',
    'dlg.519',
    'dlg.521',
    'dlg.522',
  ])
  expect(island.commands.at(-1)).toEqual({
    kind: 'selectSceneHooks',
    scene: 's004',
    selection: { onEnter: { kind: 'use', value: 'legacy-003' } },
  })
  expect(island.cursor).toEqual({ kind: 'stage', stage: 'return-to-inn' })
  const reminder = await activate(source, island.cursor)
  expect(rows(reminder.commands)).toEqual(['dlg.524', 'dlg.525', 'dlg.526', 'dlg.527'])
  expect(reminder.cursor).toEqual({ kind: 'stage', stage: 'pray-for-catch' })
  const prayer = await activate(source, reminder.cursor)
  const repeat = await activate(source, prayer.cursor)
  expect(rows(prayer.commands)).toEqual(['dlg.529', 'dlg.530', 'dlg.531'])
  expect(repeat.commands).toEqual(prayer.commands)
  expect(repeat.cursor).toEqual(prayer.cursor)
  expect(
    [...reminder.commands, ...prayer.commands, ...repeat.commands].every(
      (command) => command.kind === 'dialog',
    ),
  ).toBe(true)
  expect(
    (await activate(flow('s005', 'e123', 'default'))).commands.every(
      (command) => command.kind === 'dialog',
    ),
  ).toBe(true)
})

test('the restored Zhang Si rows have original text, speaker and portrait instead of missing locale keys', () => {
  const restored = {
    'dlg.524': '逍遥老弟，店里没事吗？',
    'dlg.525': '你不回去帮忙，还在这闲逛',
    'dlg.526': '要是给李大娘知道了，你一',
    'dlg.527': '定挨骂的',
    'dlg.529': '老天保佑．．保佑我今天出海',
    'dlg.530': '能打到鱼，再这么下去，一家',
    'dlg.531': '老小都要喝西北风了．．',
  }
  for (const [key, text] of Object.entries(restored)) expect(locale).toHaveProperty([key], text)
  const restoredSteps = flow('s005', 'e123', 'legacy-001').stages.slice(1)
  expect(
    restoredSteps.flatMap((stage) =>
      stage.body.flatMap((command) =>
        command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
      ),
    ),
  ).toEqual(Object.keys(restored))
  for (const step of restoredSteps) {
    expect(step.body).toHaveLength(1)
    expect(step.body[0]).toMatchObject({
      kind: 'dialog',
      cue: {
        identity: {
          kind: 'unbound',
          speaker: 'spk.张四',
          portrait: { asset: 'portrait.pal.039', side: 'left' },
        },
        slot: 'top',
      },
    })
  }
})

test('traversed errand entities, behaviors and steps have story names without replacing stable IDs', () => {
  for (const [sceneId, entityId, label] of [
    ['s003', 'e44', '客栈大门出口'],
    ['s003', 'e53', '厨房入口'],
    ['s004', 'e83', '丁香兰'],
    ['s004', 'e94', '客栈入口'],
    ['s004', 'e95', '码头市集入口'],
    ['s005', 'e115', '盛渔村出口'],
    ['s005', 'e123', '张四'],
    ['s005', 'e124', '水生叔'],
    ['s005', 'e127', '鱼嫂'],
  ] as const)
    expect(entity(sceneId, entityId).label).toBe(label)
  for (const [sceneId, entityId, behavior] of [
    ['s001', 'e19', 'c8-74bc98f07f8e'],
    ['s003', 'e44', 'default'],
    ['s003', 'e53', 'default'],
    ['s004', 'e94', 'default'],
    ['s004', 'e95', 'default'],
    ['s005', 'e115', 'default'],
    ['s005', 'e123', 'default'],
    ['s005', 'e123', 'legacy-001'],
    ['s005', 'e124', 'default'],
    ['s005', 'e127', 'default'],
  ] as const) {
    expect(entity(sceneId, entityId).behaviors!.trigger![behavior]!.label).not.toMatch(
      /默认触发行为|触发行为 \d/,
    )
    expect(
      flow(sceneId, entityId, behavior).stages.every((step) => Boolean(step.label?.trim())),
    ).toBe(true)
  }
})

const xianglan = { scene: 's004', entity: 'e83' }
const reportRows = [282, 283, 284, 286, 288, 289, 290, 292, 293].map((id) => `dlg.${id}`)

test('the village entry only calls Xianglan; reporting and the reminder are her two ordinary steps', () => {
  const village = scenes.find((scene) => scene.id === 's004')!
  const hook = village.hooks!.onEnter!.variants['legacy-003']!.flow
  expect(hook.kind).toBe('stages')
  if (hook.kind !== 'stages') throw new Error('village entry must use ordinary steps')
  expect(hook.stages).toHaveLength(1)
  expect(hook.stages[0]).toMatchObject({
    body: [
      {
        kind: 'selectEntityBehavior',
        target: xianglan,
        channel: 'trigger',
        selection: { kind: 'use', value: 'report-aunt-illness' },
      },
      { kind: 'runEntityTrigger', target: xianglan },
    ],
    next: { kind: 'complete' },
  })
  const source = flow('s004', 'e83', 'report-aunt-illness')
  expect(source.initial).toBe('report')
  expect(source.stages.map((stage) => [stage.id, stage.next])).toEqual([
    ['report', 'urge-return'],
    ['urge-return', undefined],
  ])
  expect(source.stages.every((stage) => Boolean(stage.label?.trim()))).toBe(true)
  const first = source.stages[0]!.body
  expect(first.slice(0, 8)).toEqual([
    {
      kind: 'selectEntityBehavior',
      target: xianglan,
      channel: 'auto',
      selection: { kind: 'disabled' },
    },
    { kind: 'setEntityPosRelParty', target: xianglan, dcol: -0.5, drow: 7.5 },
    { kind: 'setEntityFacing', target: xianglan, facing: 'up' },
    { kind: 'setEntityFrame', target: xianglan, frame: 0 },
    {
      kind: 'setEntityTriggerActivation',
      target: xianglan,
      selection: { kind: 'use', value: { on: 'interact', range: 3 } },
    },
    {
      kind: 'moveEntity',
      target: xianglan,
      to: { col: 139.5, row: 34, height: 0 },
      speed: 'normal',
    },
    { kind: 'setEntityFacing', target: xianglan, facing: 'up' },
    { kind: 'setEntityFrame', target: xianglan, frame: 0 },
  ])
  expect(first.some((command) => command.kind === 'wait')).toBe(false)
  expect(
    first.flatMap((command) =>
      command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
    ),
  ).toEqual(reportRows)
  expect(
    first.filter(
      (command) =>
        command.kind === 'selectEntityBehavior' &&
        command.target.entity === 'e83' &&
        command.channel === 'trigger',
    ),
  ).toEqual([])
  expect(entity('s004', 'e83').behaviors!.auto).not.toHaveProperty('legacy-001')
  expect(entity('s004', 'e83').behaviors!.trigger).not.toHaveProperty('legacy-002')
  expect(entity('s004', 'e83').behaviors!.trigger).toHaveProperty('legacy-001')
  expect(entity('s004', 'e83').behaviors!.trigger).toHaveProperty('legacy-003')
  const stroll = entity('s004', 'e83').behaviors!.auto!.default!
  expect(stroll.label).toBe('村中闲逛')
  if (stroll.flow.kind !== 'stages') throw new Error('village stroll keeps its existing steps')
  expect(stroll.flow.stages).toHaveLength(1)
  expect(stroll.flow.stages[0]!.body[0]).toMatchObject({ kind: 'loop', mode: 'forever' })
  expect(stroll.flow.stages[0]!.label).toBeTruthy()
})

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

test('actual village hook awaits the approach, commits the NPC cursor, and releases while her return is pending', async () => {
  const runtimeScenes = resolveAuthorDialogueTree(scenes, actors)
  const village = runtimeScenes.find((scene) => scene.id === 's004')!
  const world: WorldState = {
    party: [],
    inventory: [],
    learnedSkills: {},
    money: 550,
    script: emptyWorldScriptState(),
  }
  const approachEntered = deferred()
  const approachFinished = deferred()
  const returnEntered = deferred()
  const returnFinished = deferred()
  const executed: RuntimeLeafCommand[] = []
  const spokenAt: Array<{
    speaker: string | undefined
    rows: string[]
    col?: number
    row?: number
    facing: string
  }> = []
  let facing = 'down'
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'd'.repeat(64), {
    lifecycleReferences: buildEntityLifecycleReferenceIndex(runtimeScenes),
    currentSceneId: () => 's004',
    currentSceneSessionId: () => 'errand-test-village',
    scene: (id) => {
      const value = runtimeScenes.find((scene) => scene.id === id)
      if (!value) throw new Error(`missing canonical scene ${id}`)
      return value
    },
    entityPosRelativeToParty: (_target, dcol, drow) => ({
      col: 140 + dcol,
      row: 31 + drow,
      height: 0,
    }),
    executeEffect: async (command, context) => {
      executed.push(command)
      if (command.kind === 'moveEntity' && context.timing === 'interactive') {
        approachEntered.resolve()
        await approachFinished.promise
      }
      if (command.kind === 'moveEntity' && context.timing === 'auto') {
        returnEntered.resolve()
        await returnFinished.promise
      }
      if (command.kind === 'setEntityFacing' && command.target.entity === 'e83')
        facing = command.facing
      if (command.kind === 'dialog') {
        expect(context.self).toEqual(xianglan)
        const pos = world.script!.entityPos?.s004?.e83
        spokenAt.push({
          speaker: command.cue.speaker,
          rows: command.cue.rows.map((row) => row.text),
          col: pos?.col,
          row: pos?.row,
          facing,
        })
      }
    },
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => world.money,
      inParty: () => false,
      entityInScene: () => true,
      entitiesNear: () => false,
      facingEntity: () => true,
    },
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    confirm: async () => true,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
  })
  const signal = new AbortController().signal
  // Select through the same public command that Zhang Si's initial response executes.
  await runtime.runCommands(
    [
      {
        kind: 'selectSceneHooks',
        scene: 's004',
        selection: { onEnter: { kind: 'use', value: 'legacy-003' } },
      },
    ],
    { signal },
  )
  const entry = runtime.runSceneHook(village, 'onEnter', { signal })
  await Promise.race([
    approachEntered.promise,
    entry.then(() => {
      throw new Error('entry completed without awaiting the approach')
    }),
  ])
  expect(spokenAt).toEqual([])
  expect(world.script!.entityPos?.s004?.e83).toEqual({ col: 139.5, row: 38.5, height: 0 })
  expect(world.script!.behaviors.entities?.s004?.e83?.auto?.selection).toEqual({ kind: 'disabled' })
  approachFinished.resolve()
  expect(await entry).toBe(true)
  expect(spokenAt.flatMap((page) => page.rows)).toEqual(reportRows)
  expect(spokenAt.map((page) => page.speaker)).toEqual([
    'spk.香兰',
    'spk.李逍遥',
    'spk.香兰',
    'spk.李逍遥',
  ])
  expect(
    spokenAt.every((page) => page.col === 139.5 && page.row === 34 && page.facing === 'up'),
  ).toBe(true)
  expect(world.script!.behaviors.entities?.s004?.e83?.trigger?.cursor?.at).toEqual({
    kind: 'stage',
    stage: 'urge-return',
  })
  expect(world.script!.behaviors.scenes?.s004?.onEnter?.cursor?.at).toEqual({ kind: 'completed' })
  expect(await runtime.runSceneHook(village, 'onEnter', { signal })).toBe(false)
  expect(world.script!.entityState).toMatchObject({
    s004: { e76: 0 },
    s002: { e34: 1, e35: 2, e36: 2 },
    s010: { e191: 0 },
    s001: { e19: 0, e24: 0 },
  })
  for (const [sceneId, entityId, value] of [
    ['s004', 'e84', 'legacy-006'],
    ['s004', 'e86', 'legacy-003'],
    ['s001', 'e25', 'legacy-002'],
    ['s001', 'e26', 'legacy-002'],
  ] as const)
    expect(world.script!.behaviors.entities?.[sceneId]?.[entityId]?.trigger?.selection).toEqual({
      kind: 'use',
      value,
    })
  expect(
    executed.filter((command) => command.kind === 'stopMusic' || command.kind === 'playMusic'),
  ).toEqual([{ kind: 'stopMusic' }, { kind: 'playMusic', asset: 'music.pal.087' }])
  expect(world.money).toBe(550)
  expect(world.inventory).toEqual([])

  const returning = runtime.runEntityBehavior(village, 'e83', 'auto', { signal })
  await Promise.race([
    returnEntered.promise,
    returning.then(() => {
      throw new Error('return completed without moving')
    }),
  ])
  expect(
    runtime.coordinator.isOwnerActive({
      kind: 'entity-behavior',
      target: xianglan,
      channel: 'auto',
    }),
  ).toBe(true)
  expect(
    runtime.coordinator.isOwnerActive({
      kind: 'entity-behavior',
      target: xianglan,
      channel: 'trigger',
    }),
  ).toBe(false)
  const beforeRepeat = executed.length
  expect(await runtime.runEntityBehavior(village, 'e83', 'trigger', { signal })).toBe(true)
  expect(rows(executed.slice(beforeRepeat))).toEqual(['dlg.302', 'dlg.303'])
  expect(executed.slice(beforeRepeat).every((command) => command.kind === 'dialog')).toBe(true)
  returnFinished.resolve()
  expect(await returning).toBe(true)
  expect(world.script!.entityPos?.s004?.e83).toEqual({ col: 158, row: 61, height: 0 })
  expect(facing).toBe('down')
  expect(world.script!.behaviors.entities?.s004?.e83?.auto?.cursor?.at).toEqual({
    kind: 'completed',
  })
  expect(await runtime.runEntityBehavior(village, 'e83', 'auto', { signal })).toBe(false)
})

test('Xianglan returns in one nonempty background step with the original route and pauses', () => {
  const source = entity('s004', 'e83').behaviors!.auto!['legacy-002']!.flow
  expect(source.kind).toBe('stages')
  if (source.kind !== 'stages') throw new Error('return must be one ordinary step')
  expect(source.stages).toHaveLength(1)
  expect(source.stages[0]!.label).toBeTruthy()
  expect(source.stages[0]!.next).toEqual({ kind: 'complete' })
  const body = source.stages[0]!.body
  const pose = (facing: 'right' | 'up' | 'down') => [
    { kind: 'setEntityFacing', target: xianglan, facing },
    { kind: 'setEntityFrame', target: xianglan, frame: 0 },
  ]
  const move = (col: number, row: number, speed: 'slow' | 'normal') => ({
    kind: 'moveEntity',
    target: xianglan,
    to: { col, row, height: 0 },
    speed,
  })
  expect(body).toEqual([
    { kind: 'wait', ms: 100 },
    ...pose('right'),
    move(140, 44, 'slow'),
    { kind: 'wait', ms: 100 },
    ...pose('right'),
    { kind: 'wait', ms: 100 },
    ...pose('up'),
    { kind: 'wait', ms: 3100 },
    ...pose('down'),
    { kind: 'wait', ms: 400 },
    move(157, 44, 'slow'),
    { kind: 'wait', ms: 100 },
    move(157, 49, 'slow'),
    { kind: 'wait', ms: 2200 },
    move(158, 49, 'normal'),
    move(158, 61, 'normal'),
    { kind: 'wait', ms: 200 },
    ...pose('down'),
    { kind: 'finishStep', next: { kind: 'complete' } },
  ])
})

test('village ambient routes keep slow cadence and do not duplicate the patrol loop', () => {
  const xiaohu = entity('s004', 'e76').behaviors!.auto!.default!.flow
  const xiaolan = entity('s004', 'e84').behaviors!.auto!.default!.flow
  expect(xiaohu.kind).toBe('stages')
  expect(xiaolan.kind).toBe('stages')
  if (xiaohu.kind !== 'stages' || xiaolan.kind !== 'stages') throw new Error('ambient flow missing')
  const patrol = xiaohu.stages[0]!.body
  expect(patrol).toHaveLength(1)
  expect(patrol[0]?.kind).toBe('loop')
  if (patrol[0]?.kind !== 'loop') throw new Error('patrol is not a loop')
  const patrolBody = patrol[0].body
  expect(patrolBody.filter((command) => command.kind === 'moveEntity')).toHaveLength(12)
  expect(patrolBody.filter((command) => command.kind === 'wait')).toEqual([
    { kind: 'wait', ms: 100 },
  ])
  const kitchen = xiaolan.stages[0]!.body
  expect(kitchen[0]?.kind).toBe('loop')
  if (kitchen[0]?.kind !== 'loop') throw new Error('kitchen route is not a loop')
  expect(kitchen[0].body.slice(0, 6)).toEqual([
    { kind: 'wait', ms: 1500 },
    {
      kind: 'setEntityFacing',
      target: { scene: 's004', entity: 'e84' },
      facing: 'right',
    },
    { kind: 'setEntityFrame', target: { scene: 's004', entity: 'e84' }, frame: 0 },
    { kind: 'wait', ms: 300 },
    {
      kind: 'setEntityFacing',
      target: { scene: 's004', entity: 'e84' },
      facing: 'down',
    },
    { kind: 'setEntityFrame', target: { scene: 's004', entity: 'e84' }, frame: 0 },
  ])
  expect(kitchen[0].body.filter((command) => command.kind === 'selectEntityBehavior')).toEqual([
    {
      kind: 'selectEntityBehavior',
      target: { scene: 's004', entity: 'e82' },
      channel: 'auto',
      selection: { kind: 'disabled' },
    },
    {
      kind: 'selectEntityBehavior',
      target: { scene: 's004', entity: 'e82' },
      channel: 'auto',
      selection: { kind: 'use', value: 'legacy-001' },
    },
  ])
})
