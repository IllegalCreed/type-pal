import type { RuntimeCommand, RuntimeScriptFlow } from '@type-pal/content'
import { resolveAuthorDialogueTree, validateActors, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import locale from '../../../projects/pal/content/locale.json' with { type: 'json' }
import roomsJson from '../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import innJson from '../../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import { compileRuntimeScriptFlow } from './runtime-script-compiler.js'
import type { ScriptRuntimeHost } from './runtime-script-runner.js'
import { RuntimeScriptRunner } from './runtime-script-runner.js'

const scenes = validateAuthorScenes([roomsJson, innJson])
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
function entity(sceneId: string, id: string) {
  const found = scenes.find((scene) => scene.id === sceneId)?.entities.find((e) => e.id === id)
  if (!found) throw new Error(`missing canonical ${sceneId}/${id}`)
  return found
}
function flow(sceneId: string, id: string, channel: 'trigger' | 'auto', behavior: string) {
  const found = entity(sceneId, id).behaviors?.[channel]?.[behavior]?.flow
  if (!found) throw new Error(`missing canonical ${sceneId}/${id}/${channel}/${behavior}`)
  return resolveAuthorDialogueTree(found, actors)
}
async function run(source: RuntimeScriptFlow, stage?: string) {
  const commands: RuntimeCommand[] = []
  const cursors: unknown[] = []
  const unexpected = (): never => {
    throw new Error('unexpected kitchen control command')
  }
  const host: ScriptRuntimeHost = {
    execute: (command) => {
      commands.push(command)
    },
    wait: async (ms) => {
      commands.push({ kind: 'wait', ms })
    },
    waitWorldTick: async () => unexpected(),
    yieldMacroTask: async () => unexpected(),
    evalCondition: unexpected,
    confirm: async () => unexpected(),
    startBattle: async () => unexpected(),
    teleportOut: async () => unexpected(),
  }
  await new RuntimeScriptRunner(host, new AbortController().signal).runFlow(
    compileRuntimeScriptFlow(source, {
      canonicalContentDigest: 'a'.repeat(64),
      timing: 'interactive',
    }),
    {
      ...(stage ? { cursor: { kind: 'stage', stage } as const } : {}),
      cursorController: {
        reachSafePoint(cursor) {
          cursors.push(structuredClone(cursor))
          return 'continue'
        },
      },
    },
  )
  return {
    commands,
    cursors,
    rows: commands.flatMap((command) =>
      command.kind === 'dialog' ? command.cue.rows.map((r) => r.text) : [],
    ),
  }
}

test('kitchen arrival selects first-day greeting, without overwriting the later sword lesson', () => {
  const arrival = flow('s003', 'e56', 'auto', 'legacy-006')
  if (arrival.kind !== 'stateMachine') throw new Error('arrival machine missing')
  expect(arrival.machine.states['outro-05']?.body).toEqual([
    {
      kind: 'selectEntityBehavior',
      target: { scene: 's003', entity: 'e56' },
      channel: 'trigger',
      selection: { kind: 'use', value: 'greet-after-guests' },
    },
  ])
  expect(JSON.stringify(flow('s003', 'e56', 'trigger', 'legacy-001'))).toContain('dlg.824')
})

test('first-day greeting dispatches independent kitchen movement and first beggar talk, then advances', async () => {
  const first = await run(flow('s003', 'e56', 'trigger', 'greet-after-guests'))
  expect(first.rows).toEqual(['dlg.56', 'dlg.57', 'dlg.58'])
  expect(first.commands.filter((c) => c.kind === 'selectEntityBehavior')).toEqual([
    {
      kind: 'selectEntityBehavior',
      target: { scene: 's003', entity: 'e56' },
      channel: 'auto',
      selection: { kind: 'use', value: 'go-to-kitchen' },
    },
    {
      kind: 'selectEntityBehavior',
      target: { scene: 's003', entity: 'e62' },
      channel: 'trigger',
      selection: { kind: 'use', value: 'beggar-first-talk' },
    },
  ])
  expect(first.commands.filter((c) => c.kind === 'wait').map((c) => c.ms)).toEqual([240, 160, 80])
  expect(first.cursors.at(-1)).toEqual({ kind: 'stage', stage: 'remind-kitchen' })
  expect(
    (await run(flow('s003', 'e56', 'trigger', 'greet-after-guests'), 'remind-kitchen')).rows,
  ).toEqual(['dlg.59', 'dlg.60'])
})

test.each([
  { id: 'e46', sign: -1, facing: 'left' },
  { id: 'e47', sign: 1, facing: 'right' },
])('inn stair $id preserves twelve fragments at the actual first-phase 100ms world cadence', async ({
  id,
  sign,
  facing,
}) => {
  const result = await run(flow('s003', id, 'trigger', 'default'))
  expect(result.commands.filter((c) => c.kind === 'nudgeParty')).toEqual(
    Array.from({ length: 12 }, (_, i) => ({
      kind: 'nudgeParty',
      dx: sign * (i % 2 ? 6 : 10),
      dy: sign * (i % 2 ? 6 : 10),
    })),
  )
  expect(result.commands.filter((c) => c.kind === 'wait')).toEqual(
    Array.from({ length: 12 }, () => ({ kind: 'wait', ms: 100 })),
  )
  expect(result.commands.filter((c) => c.kind === 'setPartyFacing')).toEqual([
    { kind: 'setPartyFacing', facing },
    { kind: 'setPartyFacing', facing },
  ])
})

test('kitchen command sequence moves the hallway mother three times before showing its replacement and hiding the source', async () => {
  const result = await run(flow('s003', 'e56', 'auto', 'go-to-kitchen'))
  expect(result.commands).toEqual([
    ...[
      [129, 66],
      [129, 61],
      [124, 61],
    ].map(([col, row]) => ({
      kind: 'moveEntity',
      target: { scene: 's003', entity: 'e56' },
      to: { col, row, height: 0 },
      speed: 'normal',
    })),
    { kind: 'setEntityState', state: 2, target: { scene: 's001', entity: 'e19' } },
    { kind: 'setEntityState', state: 0, target: { scene: 's003', entity: 'e56' } },
  ])
})

test('first beggar conversation arms serving and dishes between refusal and final begging, exactly once', async () => {
  const source = flow('s003', 'e62', 'trigger', 'beggar-first-talk')
  const first = await run(source)
  expect(first.rows).toEqual([145, 146, 148, 149, 150, 152, 153, 155, 156].map((n) => `dlg.${n}`))
  const commands = first.commands
  const refusal = commands.findIndex(
    (c) => c.kind === 'dialog' && c.cue.rows.some((r) => r.text === 'dlg.153'),
  )
  const arm = commands.findIndex((c) => c.kind === 'selectEntityBehavior')
  const pleading = commands.findIndex(
    (c) => c.kind === 'dialog' && c.cue.rows.some((r) => r.text === 'dlg.155'),
  )
  expect(arm).toBeGreaterThan(refusal)
  expect(arm).toBeLessThan(pleading)
  expect(commands[arm]).toMatchObject({
    target: { scene: 's001', entity: 'e19' },
    selection: { value: 'serve-guests' },
  })
  expect(commands[arm + 1]).toEqual({
    kind: 'setEntityState',
    state: 1,
    target: { scene: 's001', entity: 'e20' },
  })
  const repeated = await run(source, 'ask-again')
  expect(repeated.rows).toEqual(['dlg.158', 'dlg.159'])
  expect(
    repeated.commands.some((c) => c.kind === 'setEntityState' || c.kind === 'selectEntityBehavior'),
  ).toBe(false)
})

test('003 serving instruction arms an executable 004 handoff, but never activates it or grants wine', async () => {
  const result = await run(flow('s001', 'e19', 'trigger', 'serve-guests'))
  expect(result.rows).toEqual(['dlg.126', 'dlg.127'])
  expect(result.commands.at(-1)).toEqual({
    kind: 'selectEntityBehavior',
    target: { scene: 's001', entity: 'e20' },
    channel: 'trigger',
    selection: { kind: 'use', value: 'take-dishes' },
  })
  expect(
    result.commands.some((c) => ['giveItem', 'setActorSprite', 'setEntityState'].includes(c.kind)),
  ).toBe(false)
  const take = await run(flow('s001', 'e20', 'trigger', 'take-dishes'))
  expect(take.rows).toEqual(['dlg.141', 'dlg.142'])
  expect(take.commands).toContainEqual({
    kind: 'setActorSprite',
    actor: 'li-xiaoyao',
    sprite: 'sprite-208',
  })
  for (const command of take.commands) {
    if (command.kind === 'selectEntityBehavior' && command.selection.kind === 'use')
      expect(
        entity(command.target.scene, command.target.entity).behaviors?.[command.channel]?.[
          command.selection.value
        ],
      ).toBeDefined()
  }
  for (const id of [56, 57, 58, 126, 127, 145, 146, 148, 149, 150, 152, 153, 155, 156])
    expect(Reflect.get(locale, `dlg.${id}`)).toEqual(expect.any(String))
})
