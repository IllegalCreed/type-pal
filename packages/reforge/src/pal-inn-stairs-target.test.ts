import { type FlowCursor, gridToPixel, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import rooms from '../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import inn from '../../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import { SPEED_GRID, walkTick } from './entity-walk.js'
import { compileRuntimeScriptFlow } from './runtime-script-compiler.js'
import { RuntimeScriptRunner, type ScriptRuntimeHost } from './runtime-script-runner.js'

const target = { scene: 's003', entity: 'e56' }
const endpoints = [
  [121, 45],
  [121, 49],
  [122, 49],
  [131, 52],
  [137, 52],
  [137, 66],
]

test.each([
  ['s003', 'e56', 'trigger', 'default', '接待苗人：包店与赏银'],
  ['s003', 'e56', 'trigger', 'legacy-001', '学剑归来：苗人占用逍遥的房间'],
  ['s003', 'e56', 'trigger', 'legacy-002', '救出灵儿后：交代绑架与送她回岛'],
  ['s003', 'e56', 'trigger', 'legacy-003', '安顿灵儿后：询问休息、让逍遥回房'],
  ['s003', 'e56', 'auto', 'legacy-001', '苗人倒下后：走近查看'],
  ['s003', 'e56', 'auto', 'legacy-002', '灵儿夜哭：赶来询问'],
  ['s003', 'e56', 'auto', 'legacy-003', '夜间安慰灵儿：走到她身旁'],
  ['s003', 'e56', 'auto', 'legacy-004', '安慰灵儿后：回房退场'],
  ['s003', 'e56', 'auto', 'legacy-005', '苗人闹事：赶到现场'],
  ['s003', 'e56', 'auto', 'legacy-006', '接客后：下楼到大厅'],
  ['s003', 'e62', 'trigger', 'default', '门口初见：醉汉挡在门口'],
  ['s003', 'e62', 'trigger', 'legacy-001', '客人退酒后：继续向逍遥讨酒'],
  ['s003', 'e62', 'trigger', 'c8-321c0a7d7de1', '赠桂花酒：约定山神庙学剑'],
  ['s003', 'e62', 'auto', 'default', '门口醉卧：交替姿势'],
  ['s001', 'e19', 'trigger', 'default', '赶道士期间：追问是否打发走'],
  ['s001', 'e19', 'trigger', 'c8-74bc98f07f8e', '赠酒后：给钱托逍遥买鲜虾'],
  ['s001', 'e19', 'auto', 'default', '厨房待机：保持向上姿势'],
] as const)('names the actual %s/%s/%s/%s behavior by its verified purpose', (sceneId, id, channel, behavior, label) => {
  const source = sceneId === 's003' ? inn : rooms
  const entity = validateAuthorScenes([structuredClone(source)])[0]!.entities.find(
    (e) => e.id === id,
  )!
  expect(entity.behaviors?.[channel]?.[behavior]?.label).toBe(label)
})

test('one activation runs the actual aunt route as one step with six target commands and explicit completion', async () => {
  const scene = validateAuthorScenes([structuredClone(inn)])[0]!
  const aunt = scene.entities.find((entity) => entity.id === target.entity)!
  const source = aunt.behaviors!.auto!['legacy-006']!.flow
  expect(source.kind).toBe('stages')
  if (source.kind !== 'stages') throw new Error('expected authored target route')
  expect(source.stages).toHaveLength(1)
  expect(source.stages.every((stage) => stage.body.length > 0)).toBe(true)
  expect(
    source.stages
      .flatMap((stage) => stage.body)
      .some((command) => command.kind === 'nudgeEntity' || command.kind === 'animEntity'),
  ).toBe(false)
  let position = { ...aunt.pos }
  let cursor: FlowCursor = { kind: 'stage', stage: source.initial }
  const committed: number[][] = []
  const safePoints: FlowCursor[] = []
  const events: string[] = []
  const unexpected = (): never => {
    throw new Error('unexpected stair control operation')
  }
  const host: ScriptRuntimeHost = {
    execute: (command) => {
      switch (command.kind) {
        case 'moveEntity': {
          expect(command.target).toEqual(target)
          expect(command.speed).toBe('normal')
          let done = false
          for (let tick = 0; tick < 200 && !done; tick++) {
            const before = gridToPixel(position)
            const result = walkTick(position, command.to, command.speed)
            const after = gridToPixel(result.pos)
            expect(Math.hypot(after.x - before.x, after.y - before.y)).toBeLessThanOrEqual(
              Math.hypot(16, 8) * SPEED_GRID.normal + 1e-9,
            )
            position = result.pos
            done = result.done
          }
          expect(done).toBe(true)
          committed.push([position.col, position.row])
          events.push(`arrive:${position.col},${position.row}`)
          return
        }
        case 'setEntityTriggerActivation':
          events.push(
            command.selection.kind === 'disabled'
              ? 'disabled'
              : `activate:${command.selection.kind === 'use' ? command.selection.value.on : 'inherit'}`,
          )
          return
        case 'selectEntityBehavior':
          expect(command.target).toEqual(target)
          expect(command.channel).toBe('trigger')
          expect(command.selection).toEqual({ kind: 'use', value: 'greet-after-guests' })
          expect(position).toEqual({ col: 137, row: 66, height: 0 })
          events.push('select:greet-after-guests')
          return
        default:
          unexpected()
      }
    },
    wait: async () => {},
    waitWorldTick: async () => unexpected(),
    yieldMacroTask: async () => unexpected(),
    evalCondition: unexpected,
    confirm: async () => unexpected(),
    startBattle: async () => unexpected(),
    teleportOut: async () => unexpected(),
  }
  const executable = compileRuntimeScriptFlow(source, {
    canonicalContentDigest: 'a'.repeat(64),
    timing: 'auto',
  })
  await new RuntimeScriptRunner(host, new AbortController().signal).runFlow(executable, {
    self: target,
    cursor,
    cursorController: {
      reachSafePoint(next) {
        cursor = next
        safePoints.push(structuredClone(next))
        return 'continue'
      },
    },
  })
  expect(position).toEqual({ col: 137, row: 66, height: 0 })
  expect(committed).toEqual(endpoints)
  expect(safePoints).toEqual([{ kind: 'completed' }])
  expect(cursor).toEqual({ kind: 'completed' })
  expect(events).toEqual([
    'disabled',
    'arrive:121,45',
    'arrive:121,49',
    'arrive:122,49',
    'arrive:131,52',
    'activate:interact',
    'arrive:137,52',
    'arrive:137,66',
    'activate:touch',
    'select:greet-after-guests',
  ])
})
