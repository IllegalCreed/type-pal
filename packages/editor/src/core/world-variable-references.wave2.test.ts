import { checkAuthorScriptLibrary, type WorldVariableRegistryV1 } from '@type-pal/content'
import { expect, test } from 'vitest'
import type { ScriptEditorState } from './script-editor.js'
import {
  buildWorldVariableRegistryFromReferencesV1,
  collectWorldVariableReferencesV1,
  collectWorldVariableRegistryIssuesV1,
} from './world-variable-references.js'

function fixture(): ScriptEditorState {
  const state: ScriptEditorState = {
    scenes: [],
    items: [],
    sharedScripts: {
      entry: {
        name: 'Entry',
        self: 'none',
        body: [
          { kind: 'addVar', var: 'score', delta: -2 },
          { kind: 'addVar', var: 'score', delta: 0 },
          {
            kind: 'branch',
            cond: {
              kind: 'any',
              of: [
                { kind: 'flag', flag: 'open', is: false },
                { kind: 'not', cond: { kind: 'var', var: 'score', op: '<', value: 1 } },
              ],
            },
            then: [{ kind: 'setFlag', flag: 'open', value: true }],
          },
        ],
      },
    },
  }
  checkAuthorScriptLibrary(state.sharedScripts)
  return state
}
test('negative and zero writes retain exact details and nested reads keep command navigation locators', () => {
  const input = fixture(),
    before = structuredClone(input),
    index = collectWorldVariableReferencesV1(input)
  expect(
    index.all.map(({ id, kind, access, detail, path }) => ({ id, kind, access, detail, path })),
  ).toEqual([
    {
      id: 'score',
      kind: 'number',
      access: 'write',
      detail: '= -2',
      path: 'sharedScripts.entry.body[0].var',
    },
    {
      id: 'score',
      kind: 'number',
      access: 'write',
      detail: '+= 0',
      path: 'sharedScripts.entry.body[1].var',
    },
    {
      id: 'open',
      kind: 'flag',
      access: 'read',
      detail: 'is false',
      path: 'sharedScripts.entry.body[2].cond.any[0]',
    },
    {
      id: 'score',
      kind: 'number',
      access: 'read',
      detail: '< 1',
      path: 'sharedScripts.entry.body[2].cond.any[1].not',
    },
    {
      id: 'open',
      kind: 'flag',
      access: 'write',
      detail: '= true',
      path: 'sharedScripts.entry.body[2].then[0].flag',
    },
  ])
  expect(index.all.map((entry) => entry.reference?.kind)).toEqual([
    'command',
    'command',
    'command',
    'command',
    'command',
  ])
  expect(index.byId.get('score')).toEqual([index.all[0], index.all[1], index.all[3]])
  expect(input).toEqual(before)
})
test('registry diagnostics return exact mismatch/undeclared records without changing caller data', () => {
  const input = fixture(),
    index = collectWorldVariableReferencesV1(input)
  const registry: WorldVariableRegistryV1 = {
    score: { kind: 'flag', name: 'Wrong', description: '', initial: false },
  }
  const before = structuredClone({ input, registry })
  expect(collectWorldVariableRegistryIssuesV1(registry, index)).toEqual([
    {
      code: 'kind-mismatch',
      id: 'score',
      message: '变量 "score" 定义为 flag，脚本按 number 使用',
      path: 'sharedScripts.entry.body[0].var',
    },
    {
      code: 'undeclared',
      id: 'open',
      message: '变量 "open" 未在 worldVariables 登记',
      path: 'sharedScripts.entry.body[2].cond.any[0]',
    },
  ])
  const generated = buildWorldVariableRegistryFromReferencesV1(index)
  expect(generated).toEqual({
    score: { kind: 'number', name: 'score', description: '', initial: 0 },
    open: { kind: 'flag', name: 'open', description: '', initial: false },
  })
  expect(collectWorldVariableRegistryIssuesV1(generated, index)).toEqual([])
  expect({ input, registry }).toEqual(before)
})
