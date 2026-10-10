import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
  validateCurrentManifestStartup,
  type WorldState,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import repairReceipt from '../../../docs/testing/script-governance/successor-repairs.json' with {
  type: 'json',
}
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import locale from '../../../projects/pal/content/locale.json' with { type: 'json' }
import roomsJson from '../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import sickroomJson from '../../../projects/pal/content/scenes/s002.json' with { type: 'json' }
import wangJson from '../../../projects/pal/content/scenes/s008.json' with { type: 'json' }
import doctorJson from '../../../projects/pal/content/scenes/s010.json' with { type: 'json' }
import islandReturnJson from '../../../projects/pal/content/scenes/s011.json' with { type: 'json' }
import palaceJson from '../../../projects/pal/content/scenes/s020.json' with { type: 'json' }
import linMaidJson from '../../../projects/pal/content/scenes/s035.json' with { type: 'json' }
import linHouseJson from '../../../projects/pal/content/scenes/s036.json' with { type: 'json' }
import baiheVillageJson from '../../../projects/pal/content/scenes/s049.json' with { type: 'json' }
import luoJson from '../../../projects/pal/content/scenes/s050.json' with { type: 'json' }
import baiheResidentJson from '../../../projects/pal/content/scenes/s051.json' with { type: 'json' }
import corpseVictoryJson from '../../../projects/pal/content/scenes/s059.json' with { type: 'json' }
import courtJson from '../../../projects/pal/content/scenes/s081.json' with { type: 'json' }
import gatesJson from '../../../projects/pal/content/scenes/s084.json' with { type: 'json' }
import thiefJson from '../../../projects/pal/content/scenes/s086.json' with { type: 'json' }
import yangzhouInnJson from '../../../projects/pal/content/scenes/s093.json' with { type: 'json' }
import antiqueJson from '../../../projects/pal/content/scenes/s097.json' with { type: 'json' }
import capitalJson from '../../../projects/pal/content/scenes/s100.json' with { type: 'json' }
import ministerHouseJson from '../../../projects/pal/content/scenes/s108.json' with { type: 'json' }
import xiaolianJson from '../../../projects/pal/content/scenes/s132.json' with { type: 'json' }
import grannyJson from '../../../projects/pal/content/scenes/s174.json' with { type: 'json' }
import anuReturnJson from '../../../projects/pal/content/scenes/s188.json' with { type: 'json' }
import templeEntryJson from '../../../projects/pal/content/scenes/s233.json' with { type: 'json' }
import templeJson from '../../../projects/pal/content/scenes/s234.json' with { type: 'json' }
import manifestJson from '../../../projects/pal/manifest.json' with { type: 'json' }
import { SupersedingFadeDriver } from './fade-driver.js'
import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { normalizeCurrentSave, preflightCurrentSave } from './save/current-codec.js'
import { buildCurrentSavePayload, buildMeta } from './save/ops.js'
import { MemorySaveStore } from './save/store.js'
import { makeTestWorld } from './test-fixtures.js'

const authorScenes = validateAuthorScenes([
  roomsJson,
  sickroomJson,
  wangJson,
  doctorJson,
  islandReturnJson,
  palaceJson,
  linMaidJson,
  linHouseJson,
  baiheVillageJson,
  luoJson,
  baiheResidentJson,
  corpseVictoryJson,
  courtJson,
  gatesJson,
  thiefJson,
  yangzhouInnJson,
  antiqueJson,
  capitalJson,
  ministerHouseJson,
  xiaolianJson,
  grannyJson,
  anuReturnJson,
  templeEntryJson,
  templeJson,
])
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
const scenes = resolveAuthorDialogueTree(authorScenes, actors)
const lifecycleReferences = buildEntityLifecycleReferenceIndex(scenes)
const manifest = validateCurrentManifestStartup(manifestJson).manifest
const signal = new AbortController().signal

function scene(id: string) {
  const value = scenes.find((candidate) => candidate.id === id)
  if (!value) throw new Error(`missing canonical scene ${id}`)
  return value
}

function installedBehavior(
  sourceScene: string,
  targetScene: string,
  targetEntity: string,
  behaviorId = 'legacy-001',
) {
  const source = scene(sourceScene)
  const behaviors = source.entities.flatMap((entity) =>
    Object.values(entity.behaviors?.trigger ?? {}),
  )
  const hooks = Object.values(source.hooks?.onEnter?.variants ?? {})
  const commands = [...behaviors, ...hooks].flatMap((behavior) =>
    behavior.flow.stages.flatMap((stage) => stage.body),
  )
  const matches = commands.filter(
    (command) =>
      command.kind === 'selectEntityBehavior' &&
      command.target.scene === targetScene &&
      command.target.entity === targetEntity &&
      command.channel === 'trigger' &&
      command.selection.kind === 'use' &&
      command.selection.value === behaviorId,
  )
  expect(matches).toHaveLength(1)
  return matches[0]!
}

function harness(
  sceneId: string,
  world: WorldState = {
    ...makeTestWorld(),
    inventory: [],
    script: emptyWorldScriptState(),
  },
  beforeEffect: (command: RuntimeLeafCommand, signal: AbortSignal) => void = () => {},
  onFadeStarted: (signal: AbortSignal) => void = () => {},
) {
  const effects: RuntimeLeafCommand[] = []
  const fade = new SupersedingFadeDriver()
  const dialogueOpacity: number[] = []
  let time = 0
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'a'.repeat(64), {
    lifecycleReferences,
    currentSceneId: () => sceneId,
    currentSceneSessionId: () => `successor-${sceneId}`,
    scene,
    async executeEffect(command, _context, effectSignal) {
      beforeEffect(command, effectSignal)
      effects.push(command)
      if (command.kind === 'dialog') dialogueOpacity.push(fade.value)
      if (command.kind === 'fade') {
        const duration = command.ms ?? 300
        const pending = fade.begin(command.dir === 'out' ? 1 : 0, time, duration, effectSignal)
        onFadeStarted(effectSignal)
        time += duration
        fade.advance(time)
        await pending
      }
      // Only leaf-side resource effects are supplied by the host. Branching, selections,
      // activation cursors and completion all run through the actual project runtime.
      if (command.kind === 'giveItem') {
        const existing = world.inventory.find((item) => item.itemId === command.itemId)
        if (existing) existing.count += command.count ?? 1
        else world.inventory.push({ itemId: command.itemId, count: command.count ?? 1 })
      }
      if (command.kind === 'increaseHpMp') {
        for (const member of world.party) {
          if (member.hp <= 0) continue
          if (command.pools !== 'mp') member.hp = Math.min(member.maxHP, member.hp + command.delta)
          if (command.pools !== 'hp') member.mp = Math.min(member.maxMP, member.mp + command.delta)
        }
      }
    },
    query: {
      hasItem: (itemId) => world.inventory.some((item) => item.itemId === itemId && item.count > 0),
      ownsItem: () => false,
      itemEquipped: () => false,
      allFullHp: () => world.party.every((member) => member.hp === member.maxHP),
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
  return {
    world,
    runtime,
    effects,
    fade,
    dialogueOpacity,
    async install(sourceScene: string, entityId: string, behaviorId = 'legacy-001') {
      await runtime.runCommands([installedBehavior(sourceScene, sceneId, entityId, behaviorId)], {
        signal,
      })
      effects.length = 0
    },
    async activate(entityId: string, activationSignal = signal) {
      effects.length = 0
      expect(
        await runtime.runEntityBehavior(scene(sceneId), entityId, 'trigger', {
          signal: activationSignal,
        }),
      ).toBe(true)
      return [...effects]
    },
    cursor(entityId: string) {
      return world.script?.behaviors.entities?.[sceneId]?.[entityId]?.trigger?.cursor?.at
    },
  }
}

function rows(commands: RuntimeLeafCommand[]) {
  return commands.flatMap((command) =>
    command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
  )
}

async function saveAndRestore(world: WorldState, sceneId: string) {
  const store = new MemorySaveStore({ kind: 'project', projectId: manifest.id })
  const payload = buildCurrentSavePayload(
    world,
    { sceneId, pos: scene(sceneId).entry.pos, facing: 'down' },
    manifest.id,
  )
  await store.putSlot(
    buildMeta('m01', world, sceneId, (member) => member.id, 1),
    payload,
    new Blob(),
  )
  const stored = await store.getPayload('m01')
  if (!stored) throw new Error('missing saved successor test world')
  const resolver = await preflightCurrentSave({ manifest, payload: stored })
  const restored = normalizeCurrentSave(stored, resolver, lifecycleReferences)
  expect(restored.world.script).toEqual(world.script)
  expect(restored.world).not.toBe(world)
  return restored.world
}

test('the installed doctor gift advances once into repeatable shop service, including after SAVE12 restore', async () => {
  // Original install entry 1062 -> L_2018; advance 2024 -> 2025, plain end 2030.
  const first = harness('s010')
  first.world.party[0]!.hp = first.world.party[0]!.maxHP
  await first.install('s002', 'e191')
  expect(rows(await first.activate('e191'))).toEqual(['dlg.714', 'dlg.715', 'dlg.716', 'dlg.717'])
  expect(first.world.inventory).toEqual([{ itemId: '107', count: 1 }])
  expect(first.cursor('e191')).toEqual({ kind: 'stage', stage: 'care-and-shop' })
  const restored = harness('s010', await saveAndRestore(first.world, 's010'))
  for (let attempt = 0; attempt < 3; attempt++) {
    const commands = await restored.activate('e191')
    expect(rows(commands)).toEqual(['dlg.719'])
    expect(commands.filter((command) => command.kind === 'openShop')).toEqual([
      { kind: 'openShop', mode: 'buy', shop: 1 },
    ])
    expect(commands.filter((command) => command.kind === 'giveItem')).toEqual([])
    expect(restored.world.inventory).toEqual([{ itemId: '107', count: 1 }])
    expect(restored.cursor('e191')).toEqual(first.cursor('e191'))
  }
})

test('the doctor successor heals injured visitors without falling through into the healthy shop branch', async () => {
  // Source 2025 jumps to 2008 when HP is not full; end 2017 returns from that branch.
  const run = harness('s010')
  await run.install('s002', 'e191')
  await run.activate('e191')
  const injured = await run.activate('e191')
  expect(rows(injured)).toEqual(['dlg.708', 'dlg.709', 'dlg.710', 'dlg.712'])
  expect(injured.filter((command) => command.kind === 'increaseHpMp')).toEqual([
    { kind: 'increaseHpMp', delta: 9999 },
  ])
  expect(injured.filter((command) => command.kind === 'openShop')).toEqual([])
  expect(run.world.party[0]!.hp).toBe(run.world.party[0]!.maxHP)
  expect(run.world.inventory).toEqual([{ itemId: '107', count: 1 }])
  expect(rows(await run.activate('e191'))).toEqual(['dlg.719'])
})

test.each([
  {
    behavior: 'default',
    injuredRows: [708, 709, 710, 712],
    healthyRows: [705, 706],
    shop: false,
  },
  {
    behavior: 'legacy-003',
    injuredRows: [1203, 1204, 1205, 1207, 1208],
    healthyRows: [1196, 1197, 1198, 1199, 1200, 1201],
    shop: true,
  },
])('doctor $behavior ends its injured branch before any healthy dialogue or shop', async (entry) => {
  // L_2003 -> L_2008/plain end 2017; L_3308 -> L_3320/plain end 3331.
  const run = harness('s010')
  if (entry.behavior !== 'default') await run.install('s001', 'e191', entry.behavior)
  const injured = await run.activate('e191')
  expect(rows(injured)).toEqual(entry.injuredRows.map((id) => `dlg.${id}`))
  expect(injured.some((command) => command.kind === 'openShop')).toBe(false)
  expect(injured.some((command) => command.kind === 'increaseHpMp')).toBe(true)
  const healthy = await run.activate('e191')
  expect(rows(healthy)).toEqual(entry.healthyRows.map((id) => `dlg.${id}`))
  expect(healthy.some((command) => command.kind === 'openShop')).toBe(entry.shop)
  expect(healthy.some((command) => command.kind === 'increaseHpMp')).toBe(false)
  expect(run.world.inventory).toEqual([])
})

test.each([
  'default',
  'legacy-001',
  'legacy-003',
])('doctor %s explicitly reveals the scene before the final treatment dialogue', async (behaviorId) => {
  const run = harness('s010')
  if (behaviorId !== 'default')
    await run.install(behaviorId === 'legacy-001' ? 's002' : 's001', 'e191', behaviorId)
  if (behaviorId === 'legacy-001') await run.activate('e191')
  const commands = await run.activate('e191')
  expect(commands.filter((command) => command.kind === 'fade')).toEqual([
    { kind: 'fade', dir: 'out', ms: 600 },
    { kind: 'fade', dir: 'in', ms: 600 },
  ])
  expect(run.dialogueOpacity.every((opacity) => opacity === 0)).toBe(true)
  expect(run.fade.value).toBe(0)
  expect(run.fade.active).toBe(false)
})

test('aborting a treatment fade releases the curtain and cannot replay the earlier medicine gift', async () => {
  const controller = new AbortController()
  const run = harness('s010', undefined, undefined, (effectSignal) => {
    if (effectSignal === controller.signal) controller.abort()
  })
  await run.install('s002', 'e191')
  await run.activate('e191')
  await expect(run.activate('e191', controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  expect(run.fade.value).toBe(0)
  expect(run.fade.active).toBe(false)
  expect(rows(run.effects)).toEqual(['dlg.708', 'dlg.709', 'dlg.710'])
  expect(run.world.inventory).toEqual([{ itemId: '107', count: 1 }])
  expect(run.cursor('e191')).toEqual({ kind: 'stage', stage: 'care-and-shop' })
  expect(rows(await run.activate('e191'))).toEqual(['dlg.719'])
  expect(run.world.inventory).toEqual([{ itemId: '107', count: 1 }])
})

test('Wang alternates the restored second line and the first greeting instead of replaying only the greeting', async () => {
  // Original install 2335 -> L_3383; 3386 advances, 3388 resets to 3383.
  let run = harness('s008')
  await run.install('s011', 'e180')
  for (let attempt = 0; attempt < 6; attempt++) {
    const commands = await run.activate('e180')
    expect(rows(commands)).toEqual(attempt % 2 === 0 ? ['dlg.1243', 'dlg.1244'] : ['dlg.1245'])
    expect(commands.every((command) => command.kind === 'dialog')).toBe(true)
    expect(run.cursor('e180')).toEqual({
      kind: 'stage',
      stage: attempt % 2 === 0 ? 'praise-filial-piety' : 'initial',
    })
    run = harness('s008', await saveAndRestore(run.world, 's008'))
  }
})

const dialogueSuccessors = [
  {
    sceneId: 's008',
    entityId: 'e177',
    sourceScene: 's008',
    behaviorId: 'legacy-001',
    firstRows: [757, 758, 760, 761, 762, 764, 765, 766, 768, 769, 771, 772, 774, 775],
    repeatRows: [776],
    next: 'pout',
  },
  {
    sceneId: 's008',
    entityId: 'e177',
    sourceScene: 's011',
    behaviorId: 'legacy-002',
    firstRows: [875],
    repeatRows: [877, 878],
    next: 'fathers-chronic-illness',
  },
  {
    sceneId: 's008',
    entityId: 'e176',
    sourceScene: 's002',
    behaviorId: 'legacy-004',
    firstRows: [1163, 1164],
    repeatRows: [1165],
    next: 'remember-me',
  },
  {
    sceneId: 's020',
    entityId: 'e342',
    sourceScene: 's020',
    behaviorId: 'legacy-001',
    firstRows: [1783],
    repeatRows: [1784],
    next: 'urge-departure',
  },
  {
    sceneId: 's035',
    entityId: 'e591',
    sourceScene: 's036',
    behaviorId: 'legacy-001',
    firstRows: [3242, 3243],
    repeatRows: [3245],
    next: 'polite-greeting',
  },
  {
    sceneId: 's050',
    entityId: 'e844',
    sourceScene: 's059',
    behaviorId: 'legacy-001',
    firstRows: [4015, 4016],
    repeatRows: [4018, 4019],
    next: 'unsold-rice',
  },
  {
    sceneId: 's049',
    entityId: 'e813',
    sourceScene: 's059',
    behaviorId: 'legacy-001',
    firstRows: [4021, 4023, 4025, 4026, 4027, 4029],
    repeatRows: [4031],
    next: 'holiday-relief',
  },
  {
    sceneId: 's049',
    entityId: 'e811',
    sourceScene: 's059',
    behaviorId: 'legacy-001',
    firstRows: [4033, 4034],
    repeatRows: [4036, 4037],
    next: 'village-at-peace',
  },
  {
    sceneId: 's051',
    entityId: 'e883',
    sourceScene: 's059',
    behaviorId: 'legacy-001',
    firstRows: [4039, 4040, 4041, 4042],
    repeatRows: [4044, 4045],
    next: 'boast-of-restraint',
  },
  {
    sceneId: 's093',
    entityId: 'e1740',
    sourceScene: 's086',
    behaviorId: 'legacy-001',
    firstRows: [4824],
    repeatRows: [4825, 4826, 4827, 4828],
    next: 'elusive-thief',
  },
  {
    sceneId: 's100',
    entityId: 'e1812',
    sourceScene: 's108',
    behaviorId: 'legacy-001',
    firstRows: [7196, 7197],
    repeatRows: [7199, 7200],
    next: 'guard-orders',
  },
  {
    sceneId: 's234',
    entityId: 'e4212',
    sourceScene: 's233',
    behaviorId: 'legacy-001',
    firstRows: [11175, 11176, 11178, 11179],
    repeatRows: [11181],
    next: 'ask-for-plan',
  },
  {
    sceneId: 's132',
    entityId: 'e2313',
    sourceScene: 's100',
    behaviorId: 'legacy-001',
    firstRows: [7283, 7284, 7286, 7288, 7290],
    repeatRows: [5438, 5439],
    next: 'ordinary-greeting',
  },
  {
    sceneId: 's174',
    entityId: 'e2875',
    sourceScene: 's188',
    behaviorId: 'legacy-003',
    firstRows: [
      10118, 10120, 10121, 10122, 10124, 10125, 10126, 10127, 10128, 10129, 10131, 10132, 10133,
      10134, 10135, 10137, 10138, 10140, 10141, 10142, 10143, 10144, 10145, 10147, 10148, 10149,
      10151, 10152,
    ],
    repeatRows: [10154, 10156],
    next: 'anu-farewell',
  },
]

test.each(
  dialogueSuccessors,
)('$sceneId/$entityId/$behaviorId advances to the complete follow-up and keeps it after restore', async (entry) => {
  let run = harness(entry.sceneId)
  await run.install(entry.sourceScene, entry.entityId, entry.behaviorId)
  expect(rows(await run.activate(entry.entityId))).toEqual(entry.firstRows.map((id) => `dlg.${id}`))
  expect(run.cursor(entry.entityId)).toEqual({ kind: 'stage', stage: entry.next })
  run = harness(entry.sceneId, await saveAndRestore(run.world, entry.sceneId))
  for (let attempt = 0; attempt < 3; attempt++) {
    const commands = await run.activate(entry.entityId)
    expect(rows(commands)).toEqual(entry.repeatRows.map((id) => `dlg.${id}`))
    expect(
      commands.every((command) => command.kind === 'dialog' || command.kind === 'clearDialog'),
    ).toBe(true)
    expect(run.cursor(entry.entityId)).toEqual({ kind: 'stage', stage: entry.next })
    expect(run.world.inventory).toEqual([])
  }
})

test('the antique merchant alternates both lamentations after each normal activation and restore', async () => {
  let run = harness('s097')
  await run.install('s097', 'e1782')
  for (let attempt = 0; attempt < 6; attempt++) {
    const commands = await run.activate('e1782')
    expect(rows(commands)).toEqual(
      (attempt % 2 === 0 ? [4702, 4703] : [4704, 4705]).map((id) => `dlg.${id}`),
    )
    expect(commands.every((command) => command.kind === 'dialog')).toBe(true)
    expect(run.cursor('e1782')).toEqual({
      kind: 'stage',
      stage: attempt % 2 === 0 ? 'lament-bankruptcy' : 'initial',
    })
    run = harness('s097', await saveAndRestore(run.world, 's097'))
  }
})

test('the minister household maid has two follow-ups, not only the first missing advance', async () => {
  let run = harness('s108')
  await run.install('s108', 'e1998')
  for (const expected of [
    { rows: [6954, 6955], next: 'defend-her-sincerity' },
    { rows: [6957, 6958, 6959], next: 'pity-young-madam' },
    { rows: [6961], next: 'pity-young-madam' },
    { rows: [6961], next: 'pity-young-madam' },
  ]) {
    const commands = await run.activate('e1998')
    expect(rows(commands)).toEqual(expected.rows.map((id) => `dlg.${id}`))
    expect(commands.every((command) => command.kind === 'dialog')).toBe(true)
    expect(run.cursor('e1998')).toEqual({ kind: 'stage', stage: expected.next })
    run = harness('s108', await saveAndRestore(run.world, 's108'))
  }
})

test.each([
  'e1599',
  'e1600',
  'e1601',
])('the $0 constable handoff already preserves the source successor without replaying the gate movement', async (firstSpeaker) => {
  const run = harness('s084')
  for (const entityId of ['e1599', 'e1600', 'e1601']) await run.install('s081', entityId)
  // L_14990 selects L_14999 for all three actors before its own advance boundary.
  const first = await run.activate(firstSpeaker)
  expect(rows(first)).toEqual(['dlg.5108'])
  expect(first.filter((command) => command.kind === 'nudgeEntity')).toHaveLength(1)
  const restored = harness('s084', await saveAndRestore(run.world, 's084'))
  for (const entityId of ['e1599', 'e1600', 'e1601']) {
    const repeat = await restored.activate(entityId)
    expect(rows(repeat)).toEqual(['dlg.5110', 'dlg.5111', 'dlg.5112'])
    expect(
      repeat.every((command) => command.kind === 'dialog' || command.kind === 'clearDialog'),
    ).toBe(true)
  }
})

test('cancelling the gift dialogue leaves neither a reward nor a committed successor', async () => {
  const controller = new AbortController()
  const run = harness('s010', undefined, (command, effectSignal) => {
    if (command.kind !== 'dialog' || effectSignal !== controller.signal) return
    controller.abort()
    effectSignal.throwIfAborted()
  })
  await run.install('s002', 'e191')
  await expect(run.activate('e191', controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  expect(run.world.inventory).toEqual([])
  expect(run.cursor('e191')).not.toEqual({ kind: 'stage', stage: 'care-and-shop' })
  await run.activate('e191')
  expect(run.world.inventory).toEqual([{ itemId: '107', count: 1 }])
  expect(run.cursor('e191')).toEqual({ kind: 'stage', stage: 'care-and-shop' })
})

test('restored rows retain their original text and NPC identity', () => {
  expect(locale).toHaveProperty(['dlg.719'], '还想要抓那些药方？')
  expect(locale).toHaveProperty(['dlg.1245'], '好～真是孝顺的好孩子啊．．')
  for (const [sceneId, entityId, speaker] of [
    ['s010', 'e191', 'spk.洪大夫'],
    ['s008', 'e180', 'spk.老王'],
  ] as const) {
    const behavior = scene(sceneId).entities.find((entity) => entity.id === entityId)?.behaviors
      ?.trigger?.['legacy-001']
    if (!behavior || behavior.flow.kind !== 'stages') throw new Error('expected ordinary steps')
    expect(behavior.label).not.toMatch(/^触发行为 /)
    expect(behavior.flow.stages).toHaveLength(2)
    expect(behavior.flow.stages.every((stage) => Boolean(stage.label?.trim()))).toBe(true)
    const check = (commands: (typeof behavior.flow.stages)[number]['body']): void => {
      for (const command of commands) {
        if (command.kind === 'dialog') expect(command.cue.speaker).toBe(speaker)
        if (command.kind === 'branch') {
          check(command.then)
          if (command.else) check(command.else)
        }
      }
    }
    for (const stage of behavior.flow.stages) check(stage.body)
  }
})

test('the entire approved batch preserves every original first body and all restored locale text', async () => {
  const sha256 = async (text: string) => {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('')
  }
  expect(repairReceipt.bindings).toHaveLength(18)
  for (const binding of repairReceipt.bindings) {
    const behavior = authorScenes
      .find((candidate) => candidate.id === binding.scene)
      ?.entities.find((candidate) => candidate.id === binding.entity)?.behaviors?.trigger?.[
      binding.behavior
    ]
    if (!behavior || behavior.flow.kind !== 'stages') throw new Error('missing repaired behavior')
    expect(behavior.flow.stages[0]?.id).toBe('initial')
    expect(await sha256(JSON.stringify(behavior.flow.stages[0]?.body))).toBe(
      binding.firstBodySha256,
    )
    expect(behavior.label).toBe(binding.behaviorLabel)
    expect(behavior.flow.stages.every((stage) => Boolean(stage.label?.trim()))).toBe(true)
  }
  for (const entry of repairReceipt.localeAdditions) {
    const text = Object.entries(locale).find(([key]) => key === entry.key)?.[1]
    if (text === undefined) throw new Error(`missing restored locale ${entry.key}`)
    expect(await sha256(text)).toBe(entry.textSha256)
  }
})
