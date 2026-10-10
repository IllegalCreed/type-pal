import { resolveAuthorDialogueTree, validateActors, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import roomsJson from '../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import { compileRuntimeScriptFlow } from './runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'

async function openingCommands() {
  const scene = validateAuthorScenes([roomsJson])[0]
  const flow = scene?.hooks?.onEnter?.variants.default?.flow
  if (!flow) throw new Error('missing canonical bedroom opening')
  const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
  const commands: Parameters<ScriptRuntimeHost['execute']>[0][] = []
  const unexpected = (): never => {
    throw new Error('unexpected control branch in the canonical opening')
  }
  // Observe real compiled/expanded effects, including explicit wait leaves.
  // This tests authored ordering, not elapsed time or actual rendered frames;
  // the browser NPC trace verifies those independently.
  const host: ScriptRuntimeHost = {
    execute(command) {
      commands.push(command)
    },
    wait: async () => unexpected(),
    waitWorldTick: async () => unexpected(),
    yieldMacroTask: async () => unexpected(),
    evalCondition: unexpected,
    confirm: async () => unexpected(),
    startBattle: async () => unexpected(),
    teleportOut: async () => unexpected(),
    revealSceneEntry: async () => {},
  }
  const runner = new RuntimeScriptRunner(host, new AbortController().signal)
  await runner.runFlow(
    compileRuntimeScriptFlow(resolveAuthorDialogueTree(flow, actors), {
      canonicalContentDigest: 'a'.repeat(64),
      timing: 'interactive',
      allowSceneEntry: true,
    }),
    {
      allowSceneEntry: true,
      runSceneEntry: true,
      cursorController: { reachSafePoint: () => 'continue' },
    },
  )
  return commands
}

test('the waking aunt retains the original exploration beats between her four poses', async () => {
  const commands = await openingCommands()
  const first = commands.findIndex(
    (command) =>
      command.kind === 'setEntityFrame' && command.target.entity === 'e11' && command.frame === 1,
  )
  expect(first).toBeGreaterThanOrEqual(0)
  const nextDialogue = commands.findIndex(
    (command, index) => index > first && command.kind === 'dialog',
  )
  const action = commands.slice(first, nextDialogue)
  expect(
    action.filter((command) => command.kind === 'setEntityFrame').map((command) => command.frame),
  ).toEqual([1, 2, 3, 0])
  // Original scene-001 0x09[3,0,0,0,2,3]: even zero means one 100ms exploration beat.
  expect(action.filter((command) => command.kind === 'wait').map((command) => command.ms)).toEqual([
    300, 100, 100, 100, 200, 300,
  ])
})

test('the opening passage prop emits an explicit beat after every outward and return step', async () => {
  const commands = await openingCommands()
  const steps = commands.flatMap((command, index) =>
    command.kind === 'nudgeEntity' &&
    command.target.scene === 's001' &&
    command.target.entity === 'e8'
      ? [{ command, index }]
      : [],
  )
  expect(steps.map(({ command: { dx, dy } }) => [dx, dy])).toEqual([
    [4, 2],
    [4, 2],
    [4, 2],
    [4, 2],
    [-4, -2],
    [-4, -2],
    [-4, -2],
    [-4, -2],
  ])
  for (const [step, { index }] of steps.entries()) {
    const next = commands.slice(index + 1, index + 4)
    expect(next[0]).toEqual({ kind: 'animEntity', target: { scene: 's001', entity: 'e8' } })
    if (step >= 4 && step < 7) expect(next[1]).toEqual({ kind: 'clearDialog' })
    expect(next[step >= 4 && step < 7 ? 2 : 1]).toEqual({
      kind: 'wait',
      ms: step === 7 ? 300 : 100,
    })
  }
})

test('fixed opening pauses retain exploration timing outside the concurrent aunt walk', async () => {
  const commands = await openingCommands()
  for (const [line, before, ms] of [
    ['dlg.1325', false, 300],
    ['dlg.1327', true, 400],
    ['dlg.1358', true, 200],
    ['dlg.1379', false, 500],
  ] as const) {
    const index = commands.findIndex(
      (command) => command.kind === 'dialog' && command.cue.rows.some((row) => row.text === line),
    )
    expect(index, line).toBeGreaterThanOrEqual(0)
    const side = before ? commands.slice(0, index).reverse() : commands.slice(index + 1)
    expect(
      side.find((command) => command.kind === 'wait'),
      line,
    ).toEqual({ kind: 'wait', ms })
  }
  const crawling = commands.findIndex(
    (command) => command.kind === 'setActorSprite' && command.sprite === 'sprite-193',
  )
  expect(crawling).toBeGreaterThan(0)
  expect(commands[crawling - 1]).toEqual({ kind: 'wait', ms: 200 })
  const protest = commands.findIndex(
    (command) =>
      command.kind === 'dialog' && command.cue.rows.some((row) => row.text === 'dlg.1381'),
  )
  expect(commands.slice(protest + 1, protest + 6)).toEqual([
    { kind: 'clearDialog' },
    { kind: 'setPartyFacing', facing: 'right' },
    { kind: 'wait', ms: 100 },
    { kind: 'setPartyFacing', facing: 'up' },
    { kind: 'wait', ms: 1000 },
  ])
})
