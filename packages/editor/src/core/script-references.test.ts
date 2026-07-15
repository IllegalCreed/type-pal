import {
  type Command,
  createScriptIndex,
  deriveScriptChunk,
  type ScriptRef,
  upsertAuthoredScript,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  buildScriptReferenceIndex,
  findSceneEntryReferences,
  findScriptReferences,
} from './script-references.js'

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
      contentVersion: 3,
      entryScene: 's1',
      content: {
        scenes: 'content/scenes/',
        scripts: 'content/scripts/',
        maps: 'content/maps/index.json',
      },
      assets: {
        catalog: 'assets/index.json',
        roles: {},
        legacy: {
          families: ['tileset', 'sprite', 'color-table'],
          root: 'assets',
          tilesets: 'tilesets',
          sprites: 'sprites',
          palettes: 'palettes',
        },
      },
      startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
    },
    scenes: [
      {
        id: 's1',
        mapId: 'map-s1',
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
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
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

describe('W4-1 命名落点引用图', () => {
  test('同一 walker 覆盖场景槽、实体页、共享 chunk、分支、战败命令与敌人编舞', () => {
    const entryId = 'door-west'
    const load = (): Command => ({ kind: 'loadScene', scene: 's2', entryId })
    let state = addScript(baseState(), callerId, [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'x', is: true },
        then: [load()],
      },
    ])
    const source = state.scenes[0]!
    state = {
      ...state,
      scenes: [
        {
          ...source,
          onEnter: [{ body: [load()] }],
          onTeleport: [{ body: [load()] }],
          entities: [
            {
              ...source.entities[0]!,
              pages: [{ trigger: { on: 'interact', stages: [{ body: [load()] }] } }],
              hostile: { team: 1, onLose: [load()] },
            },
          ],
        },
        {
          id: 's2',
          mapId: 'map-s2',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entries: { [entryId]: { label: '西门', pos: { col: 2, row: 3, height: 0 } } },
          entities: [],
        },
      ],
      enemies: [
        {
          id: 'enemy-test',
          choreography: [{ at: 'battleStart', body: [load()] }],
        },
      ] as EditorState['enemies'],
    }

    const refs = findSceneEntryReferences(state, 's2', entryId)
    expect(refs).toHaveLength(6)
    expect(
      refs.some((entry) => entry.caller.type === 'script' && entry.path.includes('/then/')),
    ).toBe(true)
    expect(refs.some((entry) => entry.caller.type === 'global')).toBe(true)
    expect(buildScriptReferenceIndex(state).errors).toEqual([])
  })

  test('缺场景、缺落点、旧裸 entry 与 entryId+pos 全部阻止保存', () => {
    const state = baseState()
    state.scenes[0] = {
      ...state.scenes[0]!,
      onEnter: [
        {
          body: [
            { kind: 'loadScene', scene: 'missing' },
            { kind: 'loadScene', scene: 's1', entryId: 'missing-entry' },
            {
              kind: 'loadScene',
              scene: 's1',
              entryId: 'x',
              pos: { col: 1, row: 2, height: 0 },
            } as unknown as Command,
            { kind: 'loadScene', scene: 's1', entry: 'old' } as unknown as Command,
          ],
        },
      ],
    }
    const errors = buildScriptReferenceIndex(state).errors.join('\n')
    expect(errors).toMatch(/目标场景 missing 不存在/)
    expect(errors).toMatch(/命名落点 s1\/missing-entry 不存在/)
    expect(errors).toMatch(/entryId 与 pos 不能同时存在/)
    expect(errors).toMatch(/loadScene\.entry 已退役/)
  })
})
