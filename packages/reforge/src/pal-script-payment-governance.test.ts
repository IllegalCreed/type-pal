import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeCommand,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
  validateCurrentManifestStartup,
  type WorldState,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import suzhouJson from '../../../projects/pal/content/scenes/s023.json' with { type: 'json' }
import riceShopJson from '../../../projects/pal/content/scenes/s050.json' with { type: 'json' }
import courtJson from '../../../projects/pal/content/scenes/s081.json' with { type: 'json' }
import prisonGateJson from '../../../projects/pal/content/scenes/s084.json' with { type: 'json' }
import prisonJson from '../../../projects/pal/content/scenes/s091.json' with { type: 'json' }
import capitalJson from '../../../projects/pal/content/scenes/s100.json' with { type: 'json' }
import capitalVendorJson from '../../../projects/pal/content/scenes/s111.json' with { type: 'json' }
import gardenJson from '../../../projects/pal/content/scenes/s118.json' with { type: 'json' }
import tavernJson from '../../../projects/pal/content/scenes/s127.json' with { type: 'json' }
import xiaolianJson from '../../../projects/pal/content/scenes/s132.json' with { type: 'json' }
import manifestJson from '../../../projects/pal/manifest.json' with { type: 'json' }
import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { normalizeCurrentSave, preflightCurrentSave } from './save/current-codec.js'
import { buildCurrentSavePayload, buildMeta } from './save/ops.js'
import { MemorySaveStore } from './save/store.js'
import { makeTestWorld } from './test-fixtures.js'

const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
const scenes = resolveAuthorDialogueTree(
  validateAuthorScenes([
    suzhouJson,
    riceShopJson,
    courtJson,
    prisonGateJson,
    prisonJson,
    capitalJson,
    capitalVendorJson,
    gardenJson,
    tavernJson,
    xiaolianJson,
  ]),
  actors,
)
const references = buildEntityLifecycleReferenceIndex(scenes)
const manifest = validateCurrentManifestStartup(manifestJson).manifest
const signal = new AbortController().signal

interface PaymentCase {
  sceneId: string
  entityId: string
  kind: 'item' | 'gate' | 'information' | 'admission'
  cost: number
  itemId?: string
}

const payments: PaymentCase[] = [
  { sceneId: 's023', entityId: 'e437', kind: 'item', cost: 20, itemId: '80' },
  { sceneId: 's050', entityId: 'e845', kind: 'item', cost: 100, itemId: '75' },
  { sceneId: 's050', entityId: 'e846', kind: 'item', cost: 100, itemId: '75' },
  { sceneId: 's084', entityId: 'e1583', kind: 'gate', cost: 100 },
  { sceneId: 's084', entityId: 'e1584', kind: 'gate', cost: 100 },
  { sceneId: 's111', entityId: 'e2085', kind: 'item', cost: 30, itemId: '80' },
  { sceneId: 's127', entityId: 'e2224', kind: 'item', cost: 100, itemId: '86' },
  { sceneId: 's100', entityId: 'e1825', kind: 'information', cost: 100 },
]

function scene(id: string) {
  const value = scenes.find((candidate) => candidate.id === id)
  if (!value) throw new Error(`missing canonical scene ${id}`)
  return value
}

function harness(entry: PaymentCase, world: WorldState) {
  const effects: RuntimeLeafCommand[] = []
  const order: string[] = []
  const answers: boolean[] = []
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'c'.repeat(64), {
    lifecycleReferences: references,
    currentSceneId: () => entry.sceneId,
    currentSceneSessionId: () => `payment-${entry.sceneId}`,
    scene,
    executeEffect(command) {
      effects.push(command)
      order.push(command.kind)
      // Host resource effects match the main shell. The actual compiler/runtime owns
      // conditions, cancellation branches, behavior changes and activation cursors.
      if (command.kind === 'giveMoney') world.money = Math.max(0, world.money + command.delta)
      if (command.kind === 'halveMoney') world.money = Math.floor(world.money / 2)
      if (command.kind === 'giveItem') {
        const existing = world.inventory.find((item) => item.itemId === command.itemId)
        if (existing) existing.count += command.count ?? 1
        else world.inventory.push({ itemId: command.itemId, count: command.count ?? 1 })
      }
    },
    query: {
      hasItem: (id) => world.inventory.some((item) => item.itemId === id && item.count > 0),
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => true,
      money: () => world.money,
      inParty: () => false,
      entityInScene: () => true,
      entitiesNear: () => false,
      facingEntity: () => true,
    },
    confirm: async () => {
      order.push('confirm')
      const answer = answers.shift()
      if (answer === undefined) throw new Error('unexpected additional payment confirmation')
      return answer
    },
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    startBattle: async () => 'victory',
    teleportOut: async () => false,
  })
  return {
    world,
    effects,
    order,
    runtime,
    async activate(...choices: boolean[]) {
      effects.length = 0
      order.length = 0
      answers.push(...choices)
      expect(
        await runtime.runEntityBehavior(scene(entry.sceneId), entry.entityId, 'trigger', {
          signal,
        }),
      ).toBe(true)
      expect(answers).toEqual([])
      return [...effects]
    },
    cursor() {
      return (
        world.script?.behaviors.entities?.[entry.sceneId]?.[entry.entityId]?.trigger?.cursor
          ?.at ?? { kind: 'stage', stage: 'initial' }
      )
    },
  }
}

async function prepare(entry: PaymentCase, money: number) {
  const world: WorldState = {
    ...makeTestWorld(),
    money: entry.kind === 'information' ? money * 2 : money,
    inventory: [],
    script: emptyWorldScriptState(),
  }
  const run = harness(entry, world)
  if (entry.kind === 'gate') {
    const hook = scene('s081').hooks!.onEnter!.variants.default!.flow
    for (const id of ['e1583', 'e1584']) {
      // Source 14541/14542 installs L_14581 in two alternate continuations.
      const installers = hook.stages.flatMap((step) =>
        nestedCommands(step.body).filter(
          (command) =>
            command.kind === 'selectEntityBehavior' &&
            command.channel === 'trigger' &&
            command.target.scene === 's084' &&
            command.target.entity === id &&
            command.selection.kind === 'use' &&
            command.selection.value === 'legacy-001',
        ),
      )
      expect(installers).toHaveLength(2)
      expect(installers[1]).toEqual(installers[0])
      await run.runtime.runCommands([installers[0]!], { signal })
    }
  }
  if (entry.kind === 'information') {
    // Enter the paid follow-up by really completing the two-confirmation first step.
    // Do not forge a cursor or install the later behavior directly.
    await run.activate(true, true)
    expect(world.money).toBe(money)
    expect(run.cursor()).toEqual({ kind: 'stage', stage: 'legacy-002' })
  }
  return run
}

function nestedCommands(commands: readonly RuntimeCommand[]): RuntimeCommand[] {
  return commands.flatMap((command): RuntimeCommand[] => {
    let children: RuntimeCommand[] = []
    switch (command.kind) {
      case 'branch':
        children = [...command.then, ...(command.else ?? [])]
        break
      case 'loop':
      case 'repeat':
        children = command.body
        break
      case 'confirm':
        children = [...command.onYes, ...command.onNo]
        break
      case 'startBattle':
        children = [...(command.onLose ?? []), ...(command.onFlee ?? [])]
        break
      case 'teleportOut':
        children = command.onFail ?? []
        break
    }
    return [command, ...nestedCommands(children)]
  })
}

async function restore(entry: PaymentCase, world: WorldState) {
  const store = new MemorySaveStore({ kind: 'project', projectId: manifest.id })
  const payload = buildCurrentSavePayload(
    world,
    { sceneId: entry.sceneId, pos: scene(entry.sceneId).entry.pos, facing: 'down' },
    manifest.id,
  )
  await store.putSlot(
    buildMeta('m01', world, entry.sceneId, (member) => member.id, 1),
    payload,
    new Blob(),
  )
  const stored = await store.getPayload('m01')
  if (!stored) throw new Error('missing saved payment world')
  const resolver = await preflightCurrentSave({ manifest, payload: stored })
  const normalized = normalizeCurrentSave(stored, resolver, references)
  expect(normalized.world.script).toEqual(world.script)
  return harness(entry, normalized.world)
}

function gateSelections(world: WorldState) {
  return ['e1583', 'e1584'].map((entityId) => {
    const binding = world.script?.behaviors.entities?.s084?.[entityId]
    return { trigger: binding?.trigger?.selection, auto: binding?.auto?.selection }
  })
}

function assertNoPurchase(entry: PaymentCase, run: ReturnType<typeof harness>, money: number) {
  expect(run.world.money).toBe(money)
  expect(run.world.inventory).toEqual([])
  expect(
    run.effects.every((command) => command.kind === 'dialog' || command.kind === 'clearDialog'),
  ).toBe(true)
  expect(run.cursor()).toEqual({
    kind: 'stage',
    stage: entry.kind === 'information' ? 'legacy-002' : 'initial',
  })
  if (entry.kind === 'gate')
    expect(gateSelections(run.world)).toEqual([
      { trigger: { kind: 'use', value: 'legacy-001' }, auto: undefined },
      { trigger: { kind: 'use', value: 'legacy-001' }, auto: undefined },
    ])
  if (entry.kind === 'information')
    expect(run.world.script?.behaviors.entities?.s132?.e2313?.trigger).toBeUndefined()
}

function assertPurchase(entry: PaymentCase, run: ReturnType<typeof harness>, money: number) {
  expect(run.world.money).toBe(money - entry.cost)
  expect(run.effects.filter((command) => command.kind === 'giveMoney')).toEqual([
    { kind: 'giveMoney', delta: -entry.cost },
  ])
  expect(run.order.indexOf('confirm')).toBeLessThan(run.order.indexOf('giveMoney'))
  if (entry.kind === 'item') {
    expect(run.world.inventory).toEqual([{ itemId: entry.itemId, count: 1 }])
    expect(run.cursor()).toEqual({ kind: 'stage', stage: 'initial' })
  }
  if (entry.kind === 'gate') {
    expect(gateSelections(run.world)).toEqual([
      { trigger: { kind: 'use', value: 'legacy-002' }, auto: { kind: 'use', value: 'legacy-001' } },
      { trigger: { kind: 'use', value: 'legacy-002' }, auto: { kind: 'use', value: 'legacy-001' } },
    ])
    expect(run.effects.filter((command) => command.kind === 'selectEntityBehavior')).toHaveLength(4)
  }
  if (entry.kind === 'information') {
    expect(run.world.script?.behaviors.entities?.s132?.e2313?.trigger?.selection).toEqual({
      kind: 'use',
      value: 'legacy-001',
    })
    expect(run.cursor()).toEqual({ kind: 'stage', stage: 'legacy-003' })
  }
}

const failureCases = payments.flatMap((entry) =>
  [
    { scenario: 'decline', money: entry.cost + 37, answer: false },
    { scenario: 'zero balance', money: 0, answer: true },
    { scenario: 'one short', money: entry.cost - 1, answer: true },
  ].map((scenario) => ({ ...entry, ...scenario })),
)

test.each(
  failureCases,
)('$sceneId/$entityId $scenario neither spends nor grants, and restore retains the payable step', async (entry) => {
  const run = await prepare(entry, entry.money)
  await run.activate(entry.answer)
  assertNoPurchase(entry, run, entry.money)
  const restored = await restore(entry, run.world)
  await restored.activate(entry.answer)
  assertNoPurchase(entry, restored, entry.money)
  // A later legitimate payment succeeds from the same retained step, not the
  // initial half-money rumor or a prematurely advanced finished interaction.
  restored.world.money = entry.cost
  await restored.activate(true)
  assertPurchase(entry, restored, entry.cost)
})

const successCases = payments.flatMap((entry) =>
  [entry.cost, entry.cost * 2 + 7].map((money) => ({ ...entry, money })),
)

test.each(
  successCases,
)('$sceneId/$entityId with $money spends exactly the agreed amount and restores the proper next activation', async (entry) => {
  const run = await prepare(entry, entry.money)
  await run.activate(true)
  assertPurchase(entry, run, entry.money)
  const restored = await restore(entry, run.world)
  const remaining = entry.money - entry.cost
  const repeat = await restored.activate(...(entry.kind === 'item' ? [true] : []))
  if (entry.kind === 'item') {
    const canBuyAgain = remaining >= entry.cost
    expect(restored.world.money).toBe(canBuyAgain ? remaining - entry.cost : remaining)
    expect(restored.world.inventory).toEqual([{ itemId: entry.itemId, count: canBuyAgain ? 2 : 1 }])
    expect(repeat.filter((command) => command.kind === 'giveMoney')).toHaveLength(
      canBuyAgain ? 1 : 0,
    )
  } else {
    expect(restored.world.money).toBe(remaining)
    expect(repeat.every((command) => command.kind === 'dialog')).toBe(true)
    expect(
      repeat.flatMap((command) =>
        command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
      ),
    ).toEqual(entry.kind === 'gate' ? ['dlg.4937'] : ['dlg.6327'])
  }
})

const admission: PaymentCase = { sceneId: 's091', entityId: 'e1682', kind: 'admission', cost: 300 }

test.each(
  [0, 299, 300, 301].flatMap((money) => [false, true].map((answer) => ({ money, answer }))),
)('prison admission with $money and confirmation $answer settles the correct repeat, including save/restore', async ({
  money,
  answer,
}) => {
  const run = await prepare(admission, money)
  await run.activate(answer)
  const paid = answer && money >= 300
  const stage = paid ? 'legacy-002' : 'recovered-001'
  expect(run.world.money).toBe(money - (paid ? 300 : 0))
  expect(run.world.inventory).toEqual([])
  expect(run.effects.filter((command) => command.kind === 'giveMoney')).toEqual(
    paid ? [{ kind: 'giveMoney', delta: -300 }] : [],
  )
  expect(run.cursor()).toEqual({ kind: 'stage', stage })
  const spoken = run.effects.flatMap((command) =>
    command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
  )
  expect(spoken).toEqual(
    paid
      ? ['dlg.5337', 'dlg.5338', 'dlg.5340']
      : ['dlg.5337', 'dlg.5338', 'dlg.5344', 'dlg.5346', 'dlg.5347', 'dlg.5348'],
  )
  if (paid) expect(run.order.indexOf('confirm')).toBeLessThan(run.order.indexOf('giveMoney'))

  for (const current of [run, await restore(admission, run.world)]) {
    const balance = current.world.money
    for (let attempt = 0; attempt < 2; attempt++) {
      const repeat = await current.activate()
      expect(repeat.every((command) => command.kind === 'dialog')).toBe(true)
      expect(
        repeat.flatMap((command) =>
          command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
        ),
      ).toEqual([paid ? 'dlg.5342' : 'dlg.5350'])
      expect(current.world.money).toBe(balance)
      expect(current.cursor()).toEqual({ kind: 'stage', stage })
    }
  }
})
