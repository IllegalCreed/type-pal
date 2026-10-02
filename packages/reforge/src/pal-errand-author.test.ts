import type { AuthorScriptFlow, FlowCursor } from '@type-pal/content'
import { resolveAuthorDialogueTree, validateActors, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import locale from '../../../projects/pal/content/locale.json' with { type: 'json' }
import roomsJson from '../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import villageJson from '../../../projects/pal/content/scenes/s004.json' with { type: 'json' }
import marketJson from '../../../projects/pal/content/scenes/s005.json' with { type: 'json' }
import { compileRuntimeScriptFlow, type RuntimeLeafCommand } from './runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'

const scenes = validateAuthorScenes([roomsJson, villageJson, marketJson])
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

async function activate(source: AuthorScriptFlow, cursor?: FlowCursor) {
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
      timing: 'interactive',
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
  const offerFish = await activate(vendor, noShrimp.cursor)
  expect(rows(noShrimp.commands)).toEqual(['dlg.603', 'dlg.604', 'dlg.605', 'dlg.606'])
  expect(rows(offerFish.commands)).toEqual(['dlg.607', 'dlg.608'])
  expect([...noShrimp.commands, ...offerFish.commands].every((c) => c.kind === 'dialog')).toBe(true)
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
