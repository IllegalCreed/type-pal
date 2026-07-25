import type {
  AuthorCommandV5,
  NamedEntityBehaviorV5,
  ProjectMigrationSidecarV1,
  SceneDefV5,
  ScriptFlowV5,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  AddEntityBehaviorV5Command,
  CopyEntityBehaviorV5Command,
  DeleteEntityBehaviorV5Command,
  presentSelectionV5,
  RenameEntityBehaviorV5Command,
  type ScriptEditorStateV5,
  ScriptV5EditSession,
  SetItemPrivateScriptBodyV5Command,
  stateTransitionExecutionLabelV5,
  UpdateEntityBehaviorV5Command,
} from './script-v5-editor.js'

const target = { scene: 's001', entity: 'e1' }
const digest = 'a'.repeat(64)

function selectionCommand(behaviorId: string): AuthorCommandV5 {
  return {
    kind: 'selectEntityBehavior',
    target,
    channel: 'trigger',
    selection: { kind: 'use', value: behaviorId },
  }
}

function stageFlow(stageId = 'start', body: AuthorCommandV5[] = []): ScriptFlowV5 {
  return {
    kind: 'stages',
    initial: stageId,
    stages: [{ id: stageId, body }],
  }
}

function behavior(
  id: string,
  flow: ScriptFlowV5 = stageFlow(id === 'talk' ? 'start' : id),
): NamedEntityBehaviorV5 {
  return { label: id, order: id === 'talk' ? 0 : 1, flow }
}

function scene(): SceneDefV5 {
  return {
    id: 's001',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        sprite: 'npc',
        pos: { col: 1, row: 1, height: 0 },
        initialPage: 'default',
        pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
        behaviors: {
          trigger: {
            talk: behavior('talk'),
          },
        },
      },
    ],
  }
}

function sidecar(over: Partial<ProjectMigrationSidecarV1> = {}): ProjectMigrationSidecarV1 {
  return {
    version: 1,
    projectId: 'demo',
    transitionId: 'script-v4-v5',
    fromContentVersion: 4,
    toContentVersion: 5,
    sourceAuditDigest: digest,
    provenance: { kind: 'project-local', transformDigest: digest },
    legacyBindings: [],
    legacyCursors: [],
    legacyEntities: [],
    lineagePlans: { pages: [], stages: [] },
    localAllocations: [],
    targetClosures: [],
    digest,
    ...over,
  }
}

function editorState(
  migrationSidecars: readonly Readonly<ProjectMigrationSidecarV1>[] = [],
): ScriptEditorStateV5 {
  return {
    scenes: [scene()],
    items: [
      {
        id: 'private',
        name: '私有脚本物品',
        desc: [],
        buyPrice: 0,
        sellPrice: 0,
        sellable: false,
        use: {
          target: 'scene',
          consuming: true,
          effects: [
            {
              kind: 'itemPrivateScript',
              script: {
                id: 'use',
                label: '使用',
                body: [selectionCommand('talk')],
              },
            },
          ],
        },
      },
    ],
    sharedScripts: {
      'shared/user/select-talk': {
        name: '选择交谈',
        self: 'none',
        body: [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'enabled', is: true },
            then: [selectionCommand('talk')],
          },
        ],
      },
    },
    migrationSidecars,
  }
}

function triggerRegistry(state: ScriptEditorStateV5) {
  return state.scenes[0]!.entities[0]!.behaviors!.trigger!
}

describe('canonical script v5 editor commands', () => {
  test('publishes dirty and history changes through the editor session contract', () => {
    const session = new ScriptV5EditSession(editorState())
    const versions: number[] = []
    const unsubscribe = session.subscribe(() => versions.push(session.getVersion()))

    expect(session.isDirty()).toBe(false)
    expect(session.canUndo()).toBe(false)
    session.dispatch(
      new AddEntityBehaviorV5Command(target, 'trigger', 'alternate', behavior('alternate')),
    )
    expect(session.isDirty()).toBe(true)
    expect(session.canUndo()).toBe(true)
    expect(versions).toEqual([1])

    session.markSaved()
    expect(session.isDirty()).toBe(false)
    expect(versions).toEqual([1, 2])
    expect(session.undo()).toBe(true)
    expect(session.isDirty()).toBe(true)
    expect(session.canRedo()).toBe(true)
    expect(versions).toEqual([1, 2, 3])

    unsubscribe()
    session.redo()
    expect(versions).toEqual([1, 2, 3])
  })

  test('adds a validated named behavior without mutating the source state', () => {
    const original = editorState()
    const session = new ScriptV5EditSession(original)
    session.dispatch(
      new AddEntityBehaviorV5Command(target, 'trigger', 'alternate', behavior('alternate')),
    )
    expect(triggerRegistry(session.getState()).alternate).toMatchObject({
      label: 'alternate',
      order: 1,
    })
    expect(triggerRegistry(original).alternate).toBeUndefined()
    expect(() =>
      session.dispatch(
        new AddEntityBehaviorV5Command(target, 'trigger', 'alternate', behavior('alternate')),
      ),
    ).toThrow(/BehaviorId 已存在/)
  })

  test('renames a behavior immutably and rewrites page plus nested project references', () => {
    const original = editorState()
    const session = new ScriptV5EditSession(original)
    session.dispatch(new RenameEntityBehaviorV5Command(target, 'trigger', 'talk', 'greet'))

    const renamed = session.getState()
    expect(Object.keys(triggerRegistry(original))).toEqual(['talk'])
    expect(Object.keys(triggerRegistry(renamed))).toEqual(['greet'])
    expect(renamed.scenes[0]!.entities[0]!.pages![0]!.trigger).toBe('greet')
    expect(renamed.sharedScripts['shared/user/select-talk']!.body[0]).toMatchObject({
      kind: 'branch',
      then: [{ selection: { kind: 'use', value: 'greet' } }],
    })
    expect(renamed.items[0]!.use!.effects[0]).toMatchObject({
      kind: 'itemPrivateScript',
      script: {
        body: [{ selection: { kind: 'use', value: 'greet' } }],
      },
    })

    expect(session.undo()).toBe(true)
    expect(Object.keys(triggerRegistry(session.getState()))).toEqual(['talk'])
    expect(session.redo()).toBe(true)
    expect(Object.keys(triggerRegistry(session.getState()))).toEqual(['greet'])

    const escaped = session.getState()
    escaped.scenes[0]!.entities[0]!.pages![0]!.trigger = 'tampered'
    expect(session.getState().scenes[0]!.entities[0]!.pages![0]!.trigger).toBe('greet')
  })

  test('protects behavior identities represented by nested state-machine closures', () => {
    const protectedState = editorState([
      sidecar({
        targetClosures: [
          {
            target: {
              kind: 'state-machine',
              owner: {
                kind: 'entity-behavior',
                sceneId: 's001',
                entityId: 'e1',
                channel: 'trigger',
                behaviorId: 'talk',
              },
              machineId: 'dialogue',
            },
            identityDigest: digest,
          },
        ],
      }),
    ])
    const session = new ScriptV5EditSession(protectedState)
    expect(() =>
      session.dispatch(new RenameEntityBehaviorV5Command(target, 'trigger', 'talk', 'greet')),
    ).toThrow(/sidecar 保护/)
    expect(() =>
      session.dispatch(new DeleteEntityBehaviorV5Command(target, 'trigger', 'talk')),
    ).toThrow(/仍有 .*引用/)
  })

  test('preserves every historical stage and state cursor identity while editing flow bodies', () => {
    const stageCursor = sidecar({
      legacyCursors: [
        {
          legacyKey: 'entity:e1:trigger',
          mode: 'single',
          target: {
            legacyStageCount: 1,
            target: {
              kind: 'entity-behavior',
              sceneId: 's001',
              entityId: 'e1',
              channel: 'trigger',
              behaviorId: 'talk',
            },
            indices: [{ index: 0, cursor: { kind: 'stage', stage: 'start' } }],
          },
        },
      ],
    })
    const stageSession = new ScriptV5EditSession(editorState([stageCursor]))
    expect(() =>
      stageSession.dispatch(
        new UpdateEntityBehaviorV5Command(target, 'trigger', 'talk', {
          flow: stageFlow('renamed'),
        }),
      ),
    ).toThrow(/stage start 不可删除或改名/)
    stageSession.dispatch(
      new UpdateEntityBehaviorV5Command(target, 'trigger', 'talk', {
        flow: stageFlow('start', [{ kind: 'setFlag', flag: 'edited', value: true }]),
      }),
    )
    expect(triggerRegistry(stageSession.getState()).talk!.flow).toMatchObject({
      stages: [{ id: 'start', body: [{ flag: 'edited' }] }],
    })

    const machineFlow: ScriptFlowV5 = {
      kind: 'stateMachine',
      machine: {
        id: 'dialogue',
        label: '对话',
        initial: 'idle',
        states: {
          idle: { label: '等待', body: [], next: { kind: 'stay' } },
        },
      },
    }
    const machineState = editorState([
      sidecar({
        legacyCursors: [
          {
            legacyKey: 'entity:e1:trigger',
            mode: 'single',
            target: {
              legacyStageCount: 1,
              target: {
                kind: 'entity-behavior',
                sceneId: 's001',
                entityId: 'e1',
                channel: 'trigger',
                behaviorId: 'talk',
              },
              indices: [
                {
                  index: 0,
                  cursor: {
                    kind: 'state',
                    machine: 'dialogue',
                    state: 'idle',
                  },
                },
              ],
            },
          },
        ],
      }),
    ])
    triggerRegistry(machineState).talk = behavior('talk', machineFlow)
    const machineSession = new ScriptV5EditSession(machineState)
    expect(() =>
      machineSession.dispatch(
        new UpdateEntityBehaviorV5Command(target, 'trigger', 'talk', {
          flow: {
            ...machineFlow,
            machine: {
              ...machineFlow.machine,
              states: {
                renamed: {
                  label: '等待',
                  body: [],
                  next: { kind: 'stay' },
                },
              },
            },
          },
        }),
      ),
    ).toThrow(/state dialogue\/idle 不可删除或改名/)
  })

  test('copies and deletes only unreferenced behaviors', () => {
    const session = new ScriptV5EditSession(editorState())
    session.dispatch(
      new CopyEntityBehaviorV5Command(target, 'trigger', 'talk', 'talk-copy', '交谈副本'),
    )
    expect(triggerRegistry(session.getState())['talk-copy']).toMatchObject({
      label: '交谈副本',
      order: 1,
    })
    session.dispatch(new DeleteEntityBehaviorV5Command(target, 'trigger', 'talk-copy'))
    expect(triggerRegistry(session.getState())['talk-copy']).toBeUndefined()
    expect(() =>
      session.dispatch(new DeleteEntityBehaviorV5Command(target, 'trigger', 'talk')),
    ).toThrow(/仍有 .*引用/)
  })

  test('edits the item-private body through undoable commands', () => {
    const session = new ScriptV5EditSession(editorState())
    session.dispatch(
      new SetItemPrivateScriptBodyV5Command('private', 'use', 0, [
        { kind: 'setFlag', flag: 'used', value: true },
      ]),
    )
    expect(session.getState().items[0]!.use!.effects[0]).toMatchObject({
      script: { body: [{ kind: 'setFlag', flag: 'used', value: true }] },
    })
    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]!.use!.effects[0]).toMatchObject({
      script: {
        body: [{ kind: 'selectEntityBehavior' }],
      },
    })
  })
})

describe('canonical script v5 editor presentation', () => {
  test('renders all selection and transition execution semantics explicitly', () => {
    expect(presentSelectionV5({ kind: 'inherit' }, String)).toEqual({
      tone: 'inherit',
      label: '继承静态定义',
    })
    expect(presentSelectionV5({ kind: 'disabled' }, String)).toEqual({
      tone: 'disabled',
      label: '显式禁用',
    })
    expect(presentSelectionV5({ kind: 'use', value: 'talk' }, String)).toEqual({
      tone: 'use',
      label: '使用：talk',
    })
    expect(stateTransitionExecutionLabelV5({ kind: 'continue', state: 'next' })).toBe('同步继续')
    expect(stateTransitionExecutionLabelV5({ kind: 'advance', state: 'next' })).toBe('下次激活')
    expect(
      stateTransitionExecutionLabelV5({
        kind: 'to',
        state: 'next',
        yield: 'worldTick',
      }),
    ).toBe('让步后同次继续')
    expect(
      stateTransitionExecutionLabelV5({
        kind: 'branch',
        cond: { kind: 'flag', flag: 'route', is: true },
        then: { kind: 'stay' },
        else: { kind: 'restart' },
      }),
    ).toBe('条件分派')
  })
})
