import { describe, expect, test, vi } from 'vitest'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  checkRuntimeCommands,
  checkRuntimeEntityBehaviors,
  checkRuntimeEntityPages,
  checkRuntimeSceneHooks,
  checkRuntimeScriptFlow,
  checkRuntimeScriptLibrary,
  RUNTIME_COMMAND_KINDS,
  type RuntimeCommand,
  type RuntimeScriptFlow,
  runtimeCommandValidationOptions,
} from './runtime-script.js'

const target = { scene: 'scene.home', entity: 'guard' }
const flow = (body: RuntimeCommand[]): RuntimeScriptFlow => ({
  kind: 'stages',
  initial: 'start',
  stages: [{ id: 'start', body }],
})

test('runtime options cannot replace the current vocabulary or bypass lifecycle validation', () => {
  const bypass = vi.fn(() => true)
  const options = {
    commandKinds: { invented: true },
    dialectLabel: 'invented',
    checkExtensionCommand: bypass,
    forbidLoadScene: true,
  }
  const result = runtimeCommandValidationOptions(options)
  expect(result.commandKinds).toBe(RUNTIME_COMMAND_KINDS)
  expect(result.dialectLabel).toBe('current')
  expect(result.forbidLoadScene).toBe(true)
  expect(() =>
    checkRuntimeCommands([{ kind: 'hideEntity', target, ticks: 1 }], 'commands', options),
  ).not.toThrow()
  expect(() => checkRuntimeCommands([{ kind: 'invented' }], 'commands', options)).toThrow(
    'current 命令 invented',
  )
  expect(() =>
    checkRuntimeCommands([{ kind: 'hideEntity', target, ticks: 0 }], 'commands', options),
  ).toThrow('.ticks: 期望正安全整数')
  expect(() =>
    checkRuntimeCommands([{ kind: 'loadScene', scene: 'other' }], 'commands', options),
  ).toThrow(new Error('commands[0]: auto 行为禁止 loadScene'))
  expect(bypass).not.toHaveBeenCalled()
  expect(options.checkExtensionCommand).toBe(bypass)
})

test('runtime forwards the same cue and full nested path to the supplied dialogue validator', () => {
  const cue = {
    identity: { kind: 'narration' as const },
    slot: 'bottom' as const,
    rows: [{ text: 'text.line' }],
  }
  const input = flow([
    {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'ready', is: true },
      then: [{ kind: 'dialog', cue }],
    },
  ])
  const before = deepSnapshot(input)
  const checkDialogueCue = vi.fn()
  checkRuntimeScriptFlow(input, 'flow', { checkDialogueCue })
  expect(checkDialogueCue).toHaveBeenCalledExactlyOnceWith(
    cue,
    'flow.stages[0].body[0].then[0].cue',
  )
  expect(checkDialogueCue.mock.calls[0]![0]).toBe(cue)
  const failure = new Error('invalid cue witness')
  expect(() =>
    checkRuntimeScriptFlow(input, 'flow', {
      checkDialogueCue: () => {
        throw failure
      },
    }),
  ).toThrow(failure)
  expect(input).toEqual(before)
})

test('runtime scene change is allowed in trigger flow but rejected in the actual auto behavior wrapper', () => {
  const body: RuntimeCommand[] = [{ kind: 'loadScene', scene: 'other' }]
  const behavior = { label: 'change scene', order: 0, flow: flow(body) }
  expect(() =>
    checkRuntimeEntityBehaviors({ trigger: { change: behavior } }, 'entity'),
  ).not.toThrow()
  const input = { auto: { change: behavior } }
  const before = deepSnapshot(input)
  expect(() => checkRuntimeEntityBehaviors(input, 'entity')).toThrow('auto 行为禁止 loadScene')
  expect(input).toEqual(before)
})

test('runtime shared-script explicit path and scene-hook wrappers preserve recursive lifecycle validation', () => {
  const valid = flow([{ kind: 'suspendEntity', target, ticks: 1 }])
  const hooks = {
    onEnter: { initial: 'intro', variants: { intro: { label: 'intro', order: 0, flow: valid } } },
  }
  expect(() => checkRuntimeSceneHooks(hooks, 'hooks')).not.toThrow()
  const bad = {
    custom: { name: 'custom', self: 'none', body: [{ kind: 'restoreEntity', target, ticks: 1 }] },
  }
  const before = deepSnapshot(bad)
  expect(() => checkRuntimeScriptLibrary(bad, 'custom/scripts.json')).toThrow(
    'custom/scripts.json.custom.body[0].ticks: 未知字段',
  )
  expect(bad).toEqual(before)
  expect(() => checkRuntimeCommands({}, 'commands')).toThrow('commands: 期望 RuntimeCommand[]')
})

describe('current lifecycle commands', () => {
  test('accepts lifecycle leaves with exact targets and ticks', () => {
    expect(() =>
      checkRuntimeCommands(
        [
          { kind: 'suspendEntity', target, ticks: 15 },
          { kind: 'hideEntity', target, ticks: 800 },
          { kind: 'restoreEntity', target },
          { kind: 'removeEntity', target },
        ],
        'script',
      ),
    ).not.toThrow()
  })

  test('rejects vanishEntity, including in nested arms', () => {
    expect(() =>
      checkRuntimeCommands(
        [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'x', is: true },
            then: [
              { kind: 'startBattle', enemyTeamId: 'team-1', onFlee: [{ kind: 'vanishEntity' }] },
            ],
          },
        ],
        'script',
      ),
    ).toThrow(
      new Error(
        'script[0].then[0].onFlee[0].kind: current 禁止 vanishEntity；请使用显式生命周期命令',
      ),
    )
  })

  test('rejects malformed lifecycle variants directly', () => {
    expect(() =>
      checkRuntimeCommands([{ kind: 'removeEntity', target, extra: true }], 'script'),
    ).toThrow(new Error('script[0].extra: 未知字段'))
    expect(() =>
      checkRuntimeCommands([{ kind: 'restoreEntity', target: { scene: 's001' } }], 'script'),
    ).toThrow(new Error('script[0].target.entity: 期望非空字符串'))
  })

  test('retains non-lifecycle command shape and recursive validation', () => {
    expect(() =>
      checkRuntimeCommands(
        [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'x', is: true },
            then: [{ kind: 'setEntityState', target, state: 1 }],
            else: [{ kind: 'restoreEntity', target }],
          },
        ],
        'script',
      ),
    ).not.toThrow()
  })

  test('applies the same recursive boundary to flows, pages, hooks, and shared scripts', () => {
    const flow = {
      kind: 'stages' as const,
      initial: 'start',
      stages: [{ id: 'start', body: [{ kind: 'hideEntity' as const, target, ticks: 8 }] }],
    }
    expect(() => checkRuntimeScriptFlow(flow, 'flow')).not.toThrow()
    expect(() =>
      checkRuntimeEntityBehaviors(
        { trigger: { talk: { label: 'talk', order: 0, flow } } },
        'behaviors',
      ),
    ).not.toThrow()
    expect(() =>
      checkRuntimeEntityPages(
        [{ id: 'default', label: 'default', trigger: 'talk' }],
        { trigger: { talk: { label: 'talk', order: 0, flow } } },
        'default',
        'entity',
      ),
    ).not.toThrow()
    expect(() =>
      checkRuntimeSceneHooks(
        { onEnter: { initial: 'intro', variants: { intro: { label: 'intro', order: 0, flow } } } },
        'hooks',
      ),
    ).not.toThrow()
    expect(() =>
      checkRuntimeScriptLibrary({
        shared: { name: 'shared', self: 'none', body: flow.stages[0]!.body },
      }),
    ).not.toThrow()
    expect(() =>
      checkRuntimeScriptFlow(
        {
          kind: 'stages',
          initial: 'start',
          stages: [{ id: 'start', body: [{ kind: 'vanishEntity' }] }],
        },
        'flow',
      ),
    ).toThrow(/禁止 vanishEntity/)
  })
})
