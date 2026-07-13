import {
  type Command,
  createScriptIndex,
  deriveScriptChunk,
  type ScriptRef,
  upsertAuthoredScript,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import { buildScriptReferenceIndex, findScriptReferences } from './script-references.js'

const targetId = 'shared/user/target-a1b2c3d4'
const callerId = 'shared/user/caller-a1b2c3d4'

function ref(state: EditorState, id: string): ScriptRef {
  return { chunk: deriveScriptChunk(id, state.scriptIndex!.shards)!, id }
}

function baseState(): EditorState {
  return {
    manifest: {
      id: 'test',
      name: 'test',
      contentVersion: 1,
      entryScene: 's1',
      content: { scenes: 'content/scenes/', scripts: 'content/scripts/' },
      assets: {
        root: 'assets',
        maps: 'maps',
        tilesets: 'tilesets',
        sprites: 'sprites',
        palettes: 'palettes',
      },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    },
    scenes: [
      {
        id: 's1',
        map: { reuseOriginalMap: 0 },
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e1',
            pos: { col: 0, row: 0, height: 0 },
            sprite: '1',
            pages: [{ trigger: { on: 'interact', stages: [{ body: [] }] } }],
          },
        ],
      },
    ],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    maps: {},
    tilesets: [],
    tilesetBlobs: {},
    scriptIndex: createScriptIndex(),
    scriptChunks: {},
  } as EditorState
}

function addScript(
  state: EditorState,
  id: string,
  body: Command[],
  self: 'none' | 'optional' | 'required' = 'none',
): EditorState {
  const next = upsertAuthoredScript(
    state.scriptIndex!,
    state.scriptChunks,
    id,
    { name: id, self },
    body,
  )
  return { ...state, scriptIndex: next.index, scriptChunks: next.chunks }
}

describe('N6 脚本引用图', () => {
  test('覆盖场景入口、共享体互调、动态绑定与嵌套分支', () => {
    let state = addScript(baseState(), targetId, [{ kind: 'wait', ms: 10 }])
    state = addScript(state, callerId, [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 50 },
        // biome-ignore lint/suspicious/noThenProperty: `then` 是 Command branch 的既定 schema 字段。
        then: [{ kind: 'callScript', ref: ref(state, targetId) }],
      },
    ])
    const target = ref(state, targetId)
    state = {
      ...state,
      scenes: [
        {
          ...state.scenes[0]!,
          onEnter: [
            {
              body: [
                { kind: 'callScript', ref: target },
                { kind: 'setEntityAuto', entity: 'e1', script: target },
              ],
            },
          ],
        },
      ],
    }

    const refs = findScriptReferences(state, targetId)
    expect(refs.map((entry) => entry.kind).sort()).toEqual(['binding', 'call', 'call'])
    expect(refs.some((entry) => entry.caller.type === 'scene')).toBe(true)
    expect(
      refs.some((entry) => entry.caller.type === 'script' && entry.path.includes('/then/')),
    ).toBe(true)
    expect(buildScriptReferenceIndex(state).errors).toEqual([])
  })

  test('作者 call 环、孤儿 ref 与 required self 均阻止保存', () => {
    let state = addScript(
      baseState(),
      targetId,
      [{ kind: 'callScript', ref: { chunk: 'shared/c00', id: callerId } }],
      'required',
    )
    state = addScript(state, callerId, [{ kind: 'callScript', ref: ref(state, targetId) }])
    state = {
      ...state,
      scenes: [
        {
          ...state.scenes[0]!,
          onEnter: [{ body: [{ kind: 'callScript', ref: ref(state, targetId) }] }],
        },
      ],
    }

    const errors = buildScriptReferenceIndex(state).errors.join('\n')
    expect(errors).toMatch(/作者脚本 call 环/)
    expect(errors).toMatch(/需要显式 self/)

    const orphan = {
      ...state,
      scenes: [
        {
          ...state.scenes[0]!,
          onEnter: [
            {
              body: [
                { kind: 'callScript', ref: { chunk: 'shared/c00', id: 'shared/user/missing' } },
              ],
            },
          ],
        },
      ],
    } as EditorState
    expect(buildScriptReferenceIndex(orphan).errors.join('\n')).toMatch(/孤儿 ref/)
  })

  test('作者体硬编码 eNN 只警告；实体触发上下文可继承 required self', () => {
    let state = addScript(
      baseState(),
      targetId,
      [{ kind: 'moveEntity', entity: 'e12', to: { col: 1, row: 1, height: 0 }, speed: 'normal' }],
      'required',
    )
    state = {
      ...state,
      scenes: [
        {
          ...state.scenes[0]!,
          entities: [
            {
              ...state.scenes[0]!.entities[0]!,
              pages: [
                {
                  trigger: {
                    on: 'interact',
                    stages: [{ body: [{ kind: 'callScript', ref: ref(state, targetId) }] }],
                  },
                },
              ],
            },
          ],
        },
      ],
    }
    const diagnostics = buildScriptReferenceIndex(state)
    expect(diagnostics.errors).toEqual([])
    expect(diagnostics.warnings.join('\n')).toMatch(/硬编码场景实体 e12/)
  })
})
