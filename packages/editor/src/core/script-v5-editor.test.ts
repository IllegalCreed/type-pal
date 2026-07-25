import type {
  AuthorCommandV5,
  NamedEntityBehaviorV5,
  NamedSceneHookV5,
  ProjectMigrationSidecarV1,
  SceneDefV5,
  ScriptFlowV5,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  AddEntityBehaviorV5Command,
  AddSceneHookV5Command,
  AddSharedScriptV5Command,
  behaviorReferencesV5,
  CopyEntityBehaviorV5Command,
  CopySceneHookV5Command,
  collectScriptV5ReferenceIssues,
  DeleteEntityBehaviorV5Command,
  DeleteSceneHookV5Command,
  DeleteSharedScriptV5Command,
  presentSelectionV5,
  RenameEntityBehaviorV5Command,
  RenameSceneHookV5Command,
  type ScriptEditorStateV5,
  ScriptV5EditSession,
  SetEntityPageBehaviorV5Command,
  SetItemPrivateScriptBodyV5Command,
  SetSceneHookInitialV5Command,
  sceneHookReferencesV5,
  stateTransitionExecutionLabelV5,
  UpdateEntityBehaviorV5Command,
  UpdateSceneHookV5Command,
  UpdateSharedScriptV5Command,
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

function hook(label: string): NamedSceneHookV5 {
  return { label, order: 0, flow: stageFlow() }
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
  test('validates shared ScriptId closure in item roots and nested author commands', () => {
    const broken = editorState()
    broken.items[0]!.use!.effects.push({ kind: 'runScript', script: 'shared/missing-item' })
    broken.sharedScripts['shared/user/select-talk']!.body = [
      { kind: 'callScript', script: 'shared/missing-command' },
    ]

    expect(collectScriptV5ReferenceIssues(broken)).toEqual([
      {
        severity: 'error',
        path: 'items.private.use.effects[1].script',
        message: '共享脚本 "shared/missing-item" 不在 canonical v5 脚本库',
      },
      {
        severity: 'error',
        path: 'sharedScripts.shared/user/select-talk.body[0].script',
        message: '共享脚本 "shared/missing-command" 不在 canonical v5 脚本库',
      },
    ])
  })

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

  test('does not expose migration metadata as an authoring reference', () => {
    const migratedState = editorState([
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
    const session = new ScriptV5EditSession(migratedState)
    session.dispatch(new RenameEntityBehaviorV5Command(target, 'trigger', 'talk', 'greet'))
    expect(Object.keys(triggerRegistry(session.getState()))).toEqual(['greet'])
    expect(behaviorReferencesV5(session.getState(), target, 'trigger', 'greet')).toEqual([
      {
        kind: 'page',
        path: 'scenes.s001.entities.e1.pages.default.trigger',
      },
      {
        kind: 'command',
        path: 'items.private.use.effects[0].script.body[0]',
      },
      {
        kind: 'command',
        path: 'sharedScripts.shared/user/select-talk.body[0].then[0]',
      },
    ])
    expect(() =>
      session.dispatch(new DeleteEntityBehaviorV5Command(target, 'trigger', 'greet')),
    ).toThrow(/仍有 .*引用/)
  })

  test('does not let development migration metadata block shared-script deletion', () => {
    const migratedState = editorState([
      sidecar({
        targetClosures: [
          {
            target: {
              kind: 'shared-script',
              scriptId: 'shared/user/select-talk',
            },
            identityDigest: digest,
          },
        ],
      }),
    ])
    const session = new ScriptV5EditSession(migratedState)

    session.dispatch(new DeleteSharedScriptV5Command('shared/user/select-talk'))
    expect(session.getState().sharedScripts['shared/user/select-talk']).toBeUndefined()
    expect(session.undo()).toBe(true)
    expect(session.getState().sharedScripts['shared/user/select-talk']).toBeDefined()
  })

  test('lets pre-release author edits replace stage and state identities despite migration cursors', () => {
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
    stageSession.dispatch(
      new UpdateEntityBehaviorV5Command(target, 'trigger', 'talk', {
        flow: stageFlow('renamed', [{ kind: 'setFlag', flag: 'edited', value: true }]),
      }),
    )
    expect(triggerRegistry(stageSession.getState()).talk!.flow).toMatchObject({
      initial: 'renamed',
      stages: [{ id: 'renamed', body: [{ flag: 'edited' }] }],
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
    machineSession.dispatch(
      new UpdateEntityBehaviorV5Command(target, 'trigger', 'talk', {
        flow: {
          ...machineFlow,
          machine: {
            ...machineFlow.machine,
            initial: 'renamed',
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
    )
    expect(triggerRegistry(machineSession.getState()).talk!.flow).toMatchObject({
      machine: {
        initial: 'renamed',
        states: { renamed: { label: '等待' } },
      },
    })
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

  test('creates and edits canonical shared scripts and rejects referenced deletion', () => {
    const session = new ScriptV5EditSession(editorState())
    session.dispatch(
      new AddSharedScriptV5Command('shared/user/book', {
        name: '读天书',
        self: 'none',
        body: [],
      }),
    )
    session.dispatch(
      new UpdateSharedScriptV5Command('shared/user/book', {
        body: [{ kind: 'setFlag', flag: 'book-read', value: true }],
      }),
    )
    expect(session.getState().sharedScripts['shared/user/book']).toMatchObject({
      name: '读天书',
      body: [{ kind: 'setFlag', flag: 'book-read', value: true }],
    })
    session.dispatch(
      new UpdateSharedScriptV5Command('shared/user/select-talk', {
        body: [{ kind: 'callScript', script: 'shared/user/book' }],
      }),
    )
    expect(() => session.dispatch(new DeleteSharedScriptV5Command('shared/user/book'))).toThrow(
      /不在 canonical v5 脚本库/,
    )
    expect(session.getState().sharedScripts['shared/user/book']).toBeDefined()
    session.dispatch(new UpdateSharedScriptV5Command('shared/user/select-talk', { body: [] }))
    session.dispatch(new DeleteSharedScriptV5Command('shared/user/book'))
    expect(session.getState().sharedScripts['shared/user/book']).toBeUndefined()
  })

  test('edits scene Hook variants through stable ids and rewrites selections', () => {
    const session = new ScriptV5EditSession(editorState())
    session.dispatch(new AddSceneHookV5Command('s001', 'onEnter', 'default', hook('默认进场')))
    session.dispatch(new AddSceneHookV5Command('s001', 'onEnter', 'alternate', hook('备用进场')))
    session.dispatch(
      new UpdateSceneHookV5Command('s001', 'onEnter', 'alternate', {
        flow: stageFlow('alternate', [{ kind: 'setFlag', flag: 'entered', value: true }]),
      }),
    )
    session.dispatch(new SetSceneHookInitialV5Command('s001', 'onEnter', 'alternate'))
    session.dispatch(
      new UpdateSharedScriptV5Command('shared/user/select-talk', {
        body: [
          {
            kind: 'selectSceneHooks',
            scene: 's001',
            selection: { onEnter: { kind: 'use', value: 'alternate' } },
          },
        ],
      }),
    )
    expect(sceneHookReferencesV5(session.getState(), 's001', 'onEnter', 'alternate')).toEqual([
      {
        kind: 'initial',
        path: 'scenes.s001.hooks.onEnter.initial',
      },
      {
        kind: 'command',
        path: 'sharedScripts.shared/user/select-talk.body[0]',
      },
    ])

    session.dispatch(new RenameSceneHookV5Command('s001', 'onEnter', 'alternate', 'story-entry'))
    const renamed = session.getState()
    expect(renamed.scenes[0]!.hooks!.onEnter!.initial).toBe('story-entry')
    expect(renamed.sharedScripts['shared/user/select-talk']!.body[0]).toMatchObject({
      selection: { onEnter: { kind: 'use', value: 'story-entry' } },
    })
    session.dispatch(
      new CopySceneHookV5Command('s001', 'onEnter', 'story-entry', 'story-entry-copy'),
    )
    session.dispatch(new DeleteSceneHookV5Command('s001', 'onEnter', 'story-entry-copy'))
    expect(
      session.getState().scenes[0]!.hooks!.onEnter!.variants['story-entry-copy'],
    ).toBeUndefined()
    expect(() =>
      session.dispatch(new DeleteSceneHookV5Command('s001', 'onEnter', 'story-entry')),
    ).toThrow(/仍有 .*引用/)
  })

  test('selects page behaviors by stable id and validates the local registry', () => {
    const session = new ScriptV5EditSession(editorState())
    session.dispatch(
      new AddEntityBehaviorV5Command(target, 'trigger', 'alternate', behavior('alternate')),
    )
    session.dispatch(new SetEntityPageBehaviorV5Command(target, 'default', 'trigger', 'alternate'))
    expect(session.getState().scenes[0]!.entities[0]!.pages![0]!.trigger).toBe('alternate')
    session.dispatch(new SetEntityPageBehaviorV5Command(target, 'default', 'trigger', undefined))
    expect(session.getState().scenes[0]!.entities[0]!.pages![0]!.trigger).toBeUndefined()
    expect(() =>
      session.dispatch(new SetEntityPageBehaviorV5Command(target, 'default', 'trigger', 'missing')),
    ).toThrow(/behavior 不存在/)
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
