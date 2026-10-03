import {
  type FlowCursor,
  type RuntimeCommand,
  type RuntimeScriptFlow,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import scene009 from '../../../projects/pal/content/scenes/s009.json' with { type: 'json' }
import scene023 from '../../../projects/pal/content/scenes/s023.json' with { type: 'json' }
import scene050 from '../../../projects/pal/content/scenes/s050.json' with { type: 'json' }
import scene084 from '../../../projects/pal/content/scenes/s084.json' with { type: 'json' }
import scene091 from '../../../projects/pal/content/scenes/s091.json' with { type: 'json' }
import scene100 from '../../../projects/pal/content/scenes/s100.json' with { type: 'json' }
import scene111 from '../../../projects/pal/content/scenes/s111.json' with { type: 'json' }
import scene127 from '../../../projects/pal/content/scenes/s127.json' with { type: 'json' }
import scene148 from '../../../projects/pal/content/scenes/s148.json' with { type: 'json' }
import oracle from './__tests__/pal-interactive-governance-oracle.json' with { type: 'json' }
import { interactiveGovernanceTrace } from './__tests__/pal-interactive-governance-trace.js'
import { sha256Bytes } from './hash.js'
import { compileRuntimeScriptFlow, RuntimeSharedScriptResolver } from './runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'

// Historical machine structure lives in Git; current behavior is protected by captured traces.
const candidates = [
  ['s023/e437/default', 1],
  ['s050/e845/default', 1],
  ['s050/e846/default', 1],
  ['s084/e1583/legacy-001', 1],
  ['s084/e1584/legacy-001', 1],
  ['s100/e1837/default', 1],
  ['s111/e2085/default', 1],
  ['s127/e2224/default', 1],
  ['s009/e188/default', 3],
  ['s100/e1817/default', 2],
  ['s100/e1825/default', 3],
  ['s148/e2433/default', 2],
] as const
const scenes = validateAuthorScenes([
  scene009,
  scene023,
  scene050,
  scene084,
  scene091,
  scene100,
  scene111,
  scene127,
  scene148,
])
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
const digest = 'c'.repeat(64)
function source(key: string) {
  const [sceneId, entityId, behaviorId] = key.split('/')
  const behavior = scenes
    .find((scene) => scene.id === sceneId)
    ?.entities.find((entity) => entity.id === entityId)?.behaviors?.trigger?.[behaviorId!]
  if (!behavior) throw new Error(`missing ${key}`)
  return behavior.flow
}

const approvedStageLabels: Record<string, Record<string, string>> = {
  's023/e437/default': { initial: '确认购买并支付二十文' },
  's050/e845/default': { initial: '确认购买并支付一百文' },
  's050/e846/default': { initial: '确认购买并支付一百文' },
  's084/e1583/legacy-001': { initial: '确认交费后两名衙役放行' },
  's084/e1584/legacy-001': { initial: '确认交费后两名衙役放行' },
  's111/e2085/default': { initial: '确认购买并支付三十文' },
  's127/e2224/default': { initial: '确认买酒并支付一百文' },
  's100/e1825/default': {
    initial: '施舍半数钱财，打听刘府传闻',
    'legacy-002': '支付一百文，打听小莲儿',
    'legacy-003': '今日生意的复读',
  },
}

async function activate(
  flow: RuntimeScriptFlow,
  cursor: FlowCursor | undefined,
  answers: readonly boolean[],
  condition: boolean,
) {
  const trace: unknown[] = []
  const commands: RuntimeCommand[] = []
  const commits: FlowCursor[] = []
  let answerIndex = 0
  const host: ScriptRuntimeHost = {
    execute(command) {
      commands.push(command)
      trace.push(['command', command])
    },
    evalCondition(value) {
      trace.push(['condition', value])
      return condition
    },
    async confirm() {
      const answer = answers[answerIndex++ % answers.length]!
      trace.push(['confirm', answer])
      return answer
    },
    async startBattle(request) {
      trace.push(['battle', request])
      return condition ? 'victory' : 'defeat'
    },
    teleportOut: async () => condition,
    async wait(ms) {
      trace.push(['wait', ms])
    },
    async waitWorldTick() {
      trace.push('worldTick')
    },
    async yieldMacroTask() {
      trace.push('macroTask')
    },
  }
  await new RuntimeScriptRunner(host, new AbortController().signal).runFlow(
    compileRuntimeScriptFlow(flow, { timing: 'interactive', canonicalContentDigest: digest }),
    {
      cursor,
      cursorController: {
        reachSafePoint(next) {
          commits.push(next)
          return 'continue'
        },
      },
    },
  )
  return { trace, commands, cursor: commits.at(-1) ?? cursor, commits }
}

test.each(
  candidates,
)('%s retains %i meaningful steps, original decisions and effective next activation', async (key, steps) => {
  const author = source(key)
  expect(author.stages).toHaveLength(steps)
  for (const stage of author.stages) {
    const label = approvedStageLabels[key]?.[stage.id]
    if (label !== undefined) expect(stage.label).toBe(label)
  }
  const current = resolveAuthorDialogueTree(author, actors)
  const hashes: string[] = []
  for (const condition of [false, true])
    for (let mask = 0; mask < 8; mask++) {
      const trace = await interactiveGovernanceTrace(current, condition, mask)
      hashes.push(await sha256Bytes(new TextEncoder().encode(JSON.stringify(trace))))
    }
  expect(hashes).toEqual(oracle.cases[key])
})

test('declining retains the same step, cannot grant the gift, and accepting advances once', async () => {
  const flow = resolveAuthorDialogueTree(source('s100/e1817/default'), actors)
  const declined = await activate(flow, undefined, [false], false)
  expect(declined.cursor).toEqual({ kind: 'stage', stage: 'initial' })
  expect(declined.commands.some((command) => command.kind === 'giveItem')).toBe(false)
  const accepted = await activate(flow, declined.cursor, [true], false)
  expect(accepted.commands.filter((command) => command.kind === 'giveItem')).toEqual([
    { kind: 'giveItem', itemId: '287' },
  ])
  expect(accepted.cursor).toEqual({ kind: 'stage', stage: 'legacy-002' })
  const repeat = await activate(flow, accepted.cursor, [true], false)
  expect(repeat.commands.some((command) => command.kind === 'giveItem')).toBe(false)
})

test('different confirmation outcomes explicitly select different future steps', async () => {
  const flow = resolveAuthorDialogueTree(source('s091/e1682/default'), actors)
  expect((await activate(flow, undefined, [true], false)).cursor).toEqual({
    kind: 'stage',
    stage: 'legacy-002',
  })
  expect((await activate(flow, undefined, [false], false)).cursor).toEqual({
    kind: 'stage',
    stage: 'recovered-001',
  })
})

test('same vendor text preserves distinct top and bottom presentation in its future steps', () => {
  const flow = source('s023/e433/default')
  const top = flow.stages.find((stage) => stage.id === 'after-checkpoint')!.body[0]!
  const bottom = flow.stages.find((stage) => stage.id === 'after-checkpoint-002')!.body[0]!
  if (top.kind !== 'dialog' || bottom.kind !== 'dialog') throw new Error('expected dialogue')
  expect(top.cue.rows).toEqual(bottom.cue.rows)
  expect(top.cue.slot).toBe('top')
  expect(bottom.cue.slot).toBeUndefined()
  expect(top).not.toEqual(bottom)
})

test('shared return cannot substitute for ending its caller’s declined step', async () => {
  const commands: string[] = []
  const host: ScriptRuntimeHost = {
    execute(command) {
      commands.push(command.kind)
    },
    evalCondition: () => false,
    confirm: async () => false,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
  }
  const shared = new RuntimeSharedScriptResolver(
    { decline: { name: 'decline', self: 'none', body: [{ kind: 'returnScript' }] } },
    digest,
  )
  const flow: RuntimeScriptFlow = {
    kind: 'stages',
    initial: 'initial',
    stages: [
      {
        id: 'initial',
        body: [
          { kind: 'confirm', onYes: [], onNo: [{ kind: 'callScript', script: 'decline' }] },
          { kind: 'giveMoney', delta: -100 },
        ],
        next: 'repeat',
      },
      { id: 'repeat', body: [] },
    ],
  }
  const cursors: FlowCursor[] = []
  await new RuntimeScriptRunner(host, new AbortController().signal, shared).runFlow(
    compileRuntimeScriptFlow(flow, { timing: 'interactive', canonicalContentDigest: digest }),
    {
      cursorController: {
        reachSafePoint: (cursor) => {
          cursors.push(cursor)
          return 'continue'
        },
      },
    },
  )
  expect(commands).toEqual(['giveMoney'])
  expect(cursors).toEqual([{ kind: 'stage', stage: 'repeat' }])
})
