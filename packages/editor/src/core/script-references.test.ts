import type { Command } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadLegalUiProject } from '../ui/__tests__/glm-leaf-workflows/legal-session.js'
import { stubNodeTestHost } from '../ui/__tests__/glm-leaf-workflows/node-bridge.js'
import { fixtureScriptRef, withFixtureScript } from './__tests__/script-reference-fixture.js'
import type { EditorState } from './edit-session.js'
import type { ScriptEditorState } from './script-editor.js'
import {
  buildCanonicalSceneEntryReferenceIndex,
  buildScriptReferenceIndex,
  findSceneEntryReferences,
  findScriptReferences,
} from './script-references.js'

const targetId = 'shared/user/target-a1b2c3d4'
const callerId = 'shared/user/caller-a1b2c3d4'

async function baseState(): Promise<EditorState> {
  await stubNodeTestHost()
  const { state } = await loadLegalUiProject('script-reference-reader')
  const [scene] = state.scenes
  if (!scene) throw new Error('Fixture is missing its opening scene')
  return {
    ...state,
    scenes: [
      {
        ...scene,
        entities: [
          {
            id: 'e1',
            pos: { col: 0, row: 0, height: 0 },
            sprite: 'sprite-1',
            pages: [{ trigger: { on: 'interact', stages: [{ body: [] }] } }],
          },
        ],
      },
    ],
  }
}

describe('内存脚本引用图', () => {
  test('覆盖场景入口、共享体互调、动态绑定与嵌套分支', async () => {
    let state = withFixtureScript(await baseState(), targetId, [{ kind: 'wait', ms: 10 }])
    state = withFixtureScript(state, callerId, [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 50 },
        then: [{ kind: 'callScript', ref: fixtureScriptRef(targetId) }],
      },
    ])
    const target = fixtureScriptRef(targetId)
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

  test('作者 call 环、孤儿 ref 与 required self 均阻止保存', async () => {
    let state = withFixtureScript(
      await baseState(),
      targetId,
      [{ kind: 'callScript', ref: { chunk: 'shared/c00', id: callerId } }],
      'required',
    )
    state = withFixtureScript(state, callerId, [
      { kind: 'callScript', ref: fixtureScriptRef(targetId) },
    ])
    state = {
      ...state,
      scenes: [
        {
          ...state.scenes[0]!,
          onEnter: [{ body: [{ kind: 'callScript', ref: fixtureScriptRef(targetId) }] }],
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
    } satisfies EditorState
    expect(buildScriptReferenceIndex(orphan).errors.join('\n')).toMatch(/孤儿 ref/)
  })

  test('作者体硬编码 eNN 只警告；实体触发上下文可继承 required self', async () => {
    let state = withFixtureScript(
      await baseState(),
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
                    stages: [{ body: [{ kind: 'callScript', ref: fixtureScriptRef(targetId) }] }],
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

describe('命名落点引用图', () => {
  test('canonical visitor builds one reusable index for a 31-entry scene', () => {
    const entryIds = Array.from({ length: 31 }, (_, index) => `entry-${index + 1}`)
    const canonical: ScriptEditorState = {
      scenes: [],
      items: [],
      sharedScripts: {
        'shared/user/entry-index': {
          name: '落点索引',
          self: 'none',
          body: [
            {
              kind: 'branch',
              cond: { kind: 'flag', flag: 'enabled', is: true },
              then: entryIds.map((entryId) => ({
                kind: 'loadScene' as const,
                scene: 's2',
                entryId,
              })),
            },
          ],
        },
      },
    }

    const index = buildCanonicalSceneEntryReferenceIndex(canonical)
    expect(index.size).toBe(31)
    for (const entryId of entryIds) {
      const references = index.get(JSON.stringify(['s2', entryId]))
      expect(references).toHaveLength(1)
      const canonical = references?.[0]?.canonical
      if (!canonical || canonical.locator.kind !== 'command')
        throw new Error(`expected canonical command locator for ${entryId}`)
      expect(canonical.locator.owner).toEqual({
        kind: 'shared-script',
        scriptId: 'shared/user/entry-index',
      })
    }
  })

  test('同一 walker 覆盖场景槽、实体页、共享 chunk、分支与战败命令', async () => {
    const entryId = 'door-west'
    const load = (): Command => ({ kind: 'loadScene', scene: 's2', entryId })
    let state = withFixtureScript(await baseState(), callerId, [
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
              hostile: { enemyTeamId: 'team-1', onLose: [load()] },
            },
          ],
        },
        {
          id: 's2',
          mapId: source.mapId,
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entries: { [entryId]: { label: '西门', pos: { col: 2, row: 3, height: 0 } } },
          entities: [],
        },
      ],
    }

    const refs = findSceneEntryReferences(state, 's2', entryId)
    expect(refs).toHaveLength(5)
    expect(
      refs.some((entry) => entry.caller.type === 'script' && entry.path.includes('/then/')),
    ).toBe(true)
    expect(buildScriptReferenceIndex(state).errors).toEqual([])
  })

  test('缺场景、缺落点、旧裸 entry 与 entryId+pos 全部阻止保存', async () => {
    const state = await baseState()
    const [opening] = state.scenes
    if (!opening) throw new Error('Fixture is missing its opening scene')
    const decoded = {
      ...opening,
      onEnter: [
        {
          body: [
            { kind: 'loadScene', scene: 'missing' },
            {
              kind: 'loadScene',
              scene: opening.id,
              entryId: 'missing-entry',
            },
            {
              kind: 'loadScene',
              scene: opening.id,
              entryId: 'x',
              pos: { col: 1, row: 2, height: 0 },
            },
            {
              kind: 'loadScene',
              scene: opening.id,
              entry: 'old',
            },
          ],
        },
      ],
    }
    const results: ReturnType<typeof buildScriptReferenceIndex> = Reflect.apply(
      buildScriptReferenceIndex,
      undefined,
      [{ ...state, scenes: [decoded] }],
    )
    const errors = results.errors.join('\n')
    expect(errors).toMatch(/目标场景 missing 不存在/)
    expect(errors).toContain(`命名落点 ${opening.id}/missing-entry 不存在`)
    expect(errors).toMatch(/entryId 与 pos 不能同时存在/)
    expect(errors).toMatch(/loadScene\.entry 已退役/)
  })
})
