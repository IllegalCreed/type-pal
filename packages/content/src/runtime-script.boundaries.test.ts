import { expect, test, vi } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import {
  checkRuntimeCommands,
  checkRuntimeEntityBehaviors,
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
