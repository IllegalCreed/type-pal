import type {
  AuthorCommand,
  AuthorEntityBehaviors,
  AuthorSceneDef,
  AuthorSceneHooks,
  AuthorScriptFlow,
} from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  AddEntityBehaviorCommand,
  AddItemPrivateScriptCommand,
  AddSceneEntityDefinitionCommand,
  AddSceneHookCommand,
  AddSharedScriptCommand,
  behaviorReferences,
  CopyEntityBehaviorCommand,
  CopySceneHookCommand,
  collectCanonicalScriptTransitionVisits,
  collectScriptReferenceIssues,
  DeleteEntityBehaviorCommand,
  DeleteItemPrivateScriptCommand,
  DeleteSceneEntityDefinitionCommand,
  DeleteSceneHookCommand,
  DeleteSharedScriptCommand,
  describeCanonicalScriptReference,
  presentSelection,
  RenameEntityBehaviorCommand,
  RenameSceneHookCommand,
  ReorderEntityBehaviorSchemesCommand,
  ReorderSceneHookVariantsCommand,
  resolveCanonicalScriptCommand,
  SaveSceneHookDetailsCommand,
  type ScriptEditorState,
  ScriptEditSession,
  SetEntityHostileOnLoseCommand,
  SetEntityPageBehaviorCommand,
  SetEntityPageTriggerActivationCommand,
  SetItemPrivateScriptBodyCommand,
  SetSceneHookInitialCommand,
  sceneHookReferences,
  stateTransitionExecutionLabel,
  UpdateSceneHookCommand,
  UpdateSharedScriptCommand,
  UpdateSharedScriptMetadataCommand,
} from './script-editor.js'

const target = { scene: 's001', entity: 'e1' }
type AuthorEntityBehavior = NonNullable<AuthorEntityBehaviors['trigger']>[string]
type AuthorSceneHook = NonNullable<AuthorSceneHooks['onEnter']>['variants'][string]

function selectionCommand(behaviorId: string): AuthorCommand {
  return {
    kind: 'selectEntityBehavior',
    target,
    channel: 'trigger',
    selection: { kind: 'use', value: behaviorId },
  }
}

function stageFlow(stageId = 'start', body: AuthorCommand[] = []): AuthorScriptFlow {
  return {
    kind: 'stages',
    initial: stageId,
    stages: [{ id: stageId, body }],
  }
}

function behavior(
  id: string,
  flow: AuthorScriptFlow = stageFlow(id === 'talk' ? 'start' : id),
): AuthorEntityBehavior {
  return { label: id, order: id === 'talk' ? 0 : 1, flow }
}

function hook(label: string): AuthorSceneHook {
  return { label, order: 0, flow: stageFlow() }
}

function entityStateCommands(): AuthorCommand[] {
  return [
    { kind: 'suspendEntity', target, ticks: 4 },
    { kind: 'hideEntity', target, ticks: 8 },
    { kind: 'restoreEntity', target },
    { kind: 'removeEntity', target },
  ]
}

function scene(): AuthorSceneDef {
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
        pages: [
          {
            id: 'default',
            label: '默认',
            trigger: 'talk',
            triggerActivation: { on: 'interact', range: 1 },
          },
        ],
        behaviors: {
          trigger: {
            talk: behavior('talk'),
          },
        },
      },
    ],
  }
}

function editorState(): ScriptEditorState {
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
  }
}

function triggerRegistry(state: ScriptEditorState) {
  return state.scenes[0]!.entities[0]!.behaviors!.trigger!
}

describe('canonical script editor commands', () => {
  test('validates shared ScriptId closure in item roots and nested author commands', () => {
    const broken = editorState()
    broken.items[0]!.use!.effects.push({ kind: 'runScript', script: 'shared/missing-item' })
    broken.sharedScripts['shared/user/select-talk']!.body = [
      { kind: 'callScript', script: 'shared/missing-command' },
    ]

    expect(collectScriptReferenceIssues(broken)).toEqual([
      {
        severity: 'error',
        path: 'items.private.use.effects[1].script',
        message: '共享脚本 "shared/missing-item" 不在当前脚本库',
      },
      {
        severity: 'error',
        path: 'sharedScripts.shared/user/select-talk.body[0].script',
        message: '共享脚本 "shared/missing-command" 不在当前脚本库',
      },
    ])
  })

  test('publishes dirty and history changes through the editor session contract', () => {
    const session = new ScriptEditSession(editorState())
    const versions: number[] = []
    const unsubscribe = session.subscribe(() => versions.push(session.getVersion()))

    expect(session.isDirty()).toBe(false)
    expect(session.canUndo()).toBe(false)
    expect(session.getHistoryVersion()).toBe(0)
    session.dispatch(
      new AddEntityBehaviorCommand(target, 'trigger', 'alternate', behavior('alternate')),
    )
    expect(session.isDirty()).toBe(true)
    expect(session.canUndo()).toBe(true)
    expect(session.getHistoryVersion()).toBe(1)
    expect(versions).toEqual([1])

    session.markSaved()
    expect(session.isDirty()).toBe(false)
    expect(session.getHistoryVersion()).toBe(1)
    expect(versions).toEqual([1, 2])
    expect(session.undo()).toBe(true)
    expect(session.isDirty()).toBe(true)
    expect(session.canRedo()).toBe(true)
    expect(session.getHistoryVersion()).toBe(2)
    expect(versions).toEqual([1, 2, 3])

    unsubscribe()
    session.redo()
    expect(versions).toEqual([1, 2, 3])
  })

  test('adds a validated named behavior without mutating the source state', () => {
    const original = editorState()
    const session = new ScriptEditSession(original)
    session.dispatch(
      new AddEntityBehaviorCommand(target, 'trigger', 'alternate', behavior('alternate')),
    )
    expect(triggerRegistry(session.getState()).alternate).toMatchObject({
      label: 'alternate',
      order: 1,
    })
    expect(triggerRegistry(original).alternate).toBeUndefined()
    expect(() =>
      session.dispatch(
        new AddEntityBehaviorCommand(target, 'trigger', 'alternate', behavior('alternate')),
      ),
    ).toThrow(/BehaviorId 已存在/)
  })

  test('appends and atomically reorders behavior schemes as one exact permutation', () => {
    const session = new ScriptEditSession(editorState())
    session.dispatch(
      new AddEntityBehaviorCommand(target, 'trigger', 'alternate', {
        ...behavior('alternate'),
        order: -99,
      }),
    )
    session.dispatch(
      new AddEntityBehaviorCommand(target, 'trigger', 'third', {
        ...behavior('third'),
        order: 80,
      }),
    )
    expect(triggerRegistry(session.getState())).toMatchObject({
      talk: { order: 0 },
      alternate: { order: 1 },
      third: { order: 2 },
    })

    const beforeReorderVersion = session.getHistoryVersion()
    session.dispatch(
      new ReorderEntityBehaviorSchemesCommand(target, 'trigger', ['third', 'talk', 'alternate']),
    )
    expect(session.getHistoryVersion()).toBe(beforeReorderVersion + 1)
    expect(triggerRegistry(session.getState())).toMatchObject({
      third: { order: 0 },
      talk: { order: 1 },
      alternate: { order: 2 },
    })
    expect(session.undo()).toBe(true)
    expect(triggerRegistry(session.getState())).toMatchObject({
      talk: { order: 0 },
      alternate: { order: 1 },
      third: { order: 2 },
    })
    expect(session.redo()).toBe(true)
    expect(triggerRegistry(session.getState()).third?.order).toBe(0)

    for (const invalid of [
      ['talk', 'alternate'],
      ['talk', 'talk', 'third'],
      ['talk', 'alternate', 'missing'],
    ]) {
      expect(() =>
        session.dispatch(new ReorderEntityBehaviorSchemesCommand(target, 'trigger', invalid)),
      ).toThrow(/精确排列/)
    }
  })

  test('renames a behavior immutably and rewrites page plus nested project references', () => {
    const original = editorState()
    const session = new ScriptEditSession(original)
    session.dispatch(new RenameEntityBehaviorCommand(target, 'trigger', 'talk', 'greet'))

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

  test('tracks and rewrites cursor-handoff source behaviors without duplicate references', () => {
    const state = editorState()
    triggerRegistry(state).alternate = behavior('alternate')
    state.sharedScripts['shared/user/select-talk']!.body = [
      {
        kind: 'selectEntityBehavior',
        target,
        channel: 'trigger',
        selection: { kind: 'use', value: 'alternate' },
        cursorHandoff: {
          kind: 'stateMap',
          fromBehavior: 'talk',
          cases: [
            {
              from: { kind: 'stage', stage: 'start' },
              to: { kind: 'stage', stage: 'alternate' },
            },
          ],
          onUnmapped: 'error',
        },
      },
    ]
    expect(
      behaviorReferences(state, target, 'trigger', 'talk').filter(
        (reference) => reference.kind === 'command',
      ),
    ).toEqual([
      expect.objectContaining({
        path: 'items.private.use.effects[0].script.body[0]',
      }),
      expect.objectContaining({
        path: 'sharedScripts.shared/user/select-talk.body[0].cursorHandoff.fromBehavior',
      }),
    ])

    const session = new ScriptEditSession(state)
    session.dispatch(new RenameEntityBehaviorCommand(target, 'trigger', 'talk', 'greet'))
    expect(session.getState().sharedScripts['shared/user/select-talk']!.body[0]).toMatchObject({
      selection: { kind: 'use', value: 'alternate' },
      cursorHandoff: { fromBehavior: 'greet' },
    })
  })

  test('tracks and rewrites references inside an entity battle-loss script', () => {
    const state = editorState()
    state.scenes[0]!.entities[0]!.hostile = {
      enemyTeamId: 'team-1',
      onLose: [selectionCommand('talk')],
      onVictory: { kind: 'remove' },
      onPlayerFlee: { kind: 'remain' },
    }
    const references = behaviorReferences(state, target, 'trigger', 'talk')
    const hostileReference = references.find(
      (reference) =>
        reference.kind === 'command' && reference.locator.owner.kind === 'entity-hostile-on-lose',
    )
    expect(hostileReference).toMatchObject({
      kind: 'command',
      locator: {
        kind: 'command',
        owner: {
          kind: 'entity-hostile-on-lose',
          sceneId: 's001',
          entityId: 'e1',
        },
        container: { kind: 'body' },
        commandPath: '0',
      },
    })
    expect(describeCanonicalScriptReference(state, hostileReference!)).toBe(
      '场景 s001 / 实体 e1 / 战败后脚本 / 第 1 条指令「切换实体脚本方案」',
    )

    const session = new ScriptEditSession(state)
    session.dispatch(new RenameEntityBehaviorCommand(target, 'trigger', 'talk', 'greet'))
    expect(session.getState().scenes[0]!.entities[0]!.hostile?.onLose).toMatchObject([
      { selection: { kind: 'use', value: 'greet' } },
    ])
  })

  test('edits the canonical battle-loss script through one undoable command', () => {
    const state = editorState()
    state.scenes[0]!.entities[0]!.hostile = {
      enemyTeamId: 'team-1',
      onLose: [selectionCommand('talk')],
      onVictory: { kind: 'remove' },
      onPlayerFlee: { kind: 'remain' },
    }
    const session = new ScriptEditSession(state)

    session.dispatch(
      new SetEntityHostileOnLoseCommand(target, [
        { kind: 'setFlag', flag: 'battle-lost', value: true },
      ]),
    )
    expect(session.getState().scenes[0]!.entities[0]!.hostile?.onLose).toEqual([
      { kind: 'setFlag', flag: 'battle-lost', value: true },
    ])
    expect(session.undo()).toBe(true)
    expect(session.getState().scenes[0]!.entities[0]!.hostile?.onLose).toMatchObject([
      { kind: 'selectEntityBehavior' },
    ])
    expect(session.redo()).toBe(true)
    expect(session.getState().scenes[0]!.entities[0]!.hostile?.onLose).toEqual([
      { kind: 'setFlag', flag: 'battle-lost', value: true },
    ])
    session.dispatch(new SetEntityHostileOnLoseCommand(target, 'gameOver'))
    expect(session.getState().scenes[0]!.entities[0]!.hostile?.onLose).toBe('gameOver')
  })

  test('locates state-machine commands and rejects an invalid command path', () => {
    const state = editorState()
    state.sharedScripts['shared/user/select-talk'] = {
      name: '连续剧情',
      self: 'none',
      body: [],
    }
    state.scenes[0]!.entities[0]!.behaviors!.trigger!.source = {
      label: '连续来源',
      order: 1,
      flow: {
        kind: 'stateMachine',
        machine: {
          id: 'conversation',
          label: '连续交谈',
          initial: 'opening',
          states: {
            opening: {
              label: '开场',
              body: [selectionCommand('talk')],
              next: { kind: 'stay' },
            },
          },
        },
      },
    }
    const reference = behaviorReferences(state, target, 'trigger', 'talk').find(
      (candidate) =>
        candidate.kind === 'command' &&
        candidate.locator.owner.kind === 'entity-behavior' &&
        candidate.locator.owner.behaviorId === 'source',
    )
    expect(reference).toMatchObject({
      locator: {
        container: {
          kind: 'state',
          machineId: 'conversation',
          stateId: 'opening',
          section: 'body',
        },
        commandPath: '0',
      },
    })
    expect(describeCanonicalScriptReference(state, reference!)).toBe(
      '场景 s001 / 实体 e1 / 交互脚本“连续来源” / 连续流程“连续交谈” / 状态“开场” / 脚本正文 / 第 1 条指令「切换实体脚本方案」',
    )
    if (reference?.kind !== 'command') throw new Error('missing command reference')
    expect(resolveCanonicalScriptCommand(state, reference.locator)?.kind).toBe(
      'selectEntityBehavior',
    )
    expect(
      resolveCanonicalScriptCommand(state, {
        ...reference.locator,
        commandPath: 'not-a-command-path',
      }),
    ).toBeUndefined()
  })

  test('collects state-machine transitions with stable owner and exact path', () => {
    const state = editorState()
    state.scenes[0]!.entities[0]!.behaviors!.trigger!.source = {
      label: '连续来源',
      order: 1,
      flow: {
        kind: 'stateMachine',
        machine: {
          id: 'conversation',
          label: '连续交谈',
          initial: 'opening',
          states: {
            opening: {
              label: '开场',
              body: [],
              next: {
                kind: 'branch',
                cond: { kind: 'inParty', actorId: 'hero' },
                then: { kind: 'stay' },
                else: { kind: 'restart' },
              },
            },
          },
        },
      },
    }

    expect(collectCanonicalScriptTransitionVisits(state)).toEqual([
      {
        transition: {
          kind: 'branch',
          cond: { kind: 'inParty', actorId: 'hero' },
          then: { kind: 'stay' },
          else: { kind: 'restart' },
        },
        path: 'scenes.s001.entities.e1.behaviors.trigger.source.flow.machine.states.opening.next',
        owner: {
          kind: 'entity-behavior',
          sceneId: 's001',
          entityId: 'e1',
          channel: 'trigger',
          behaviorId: 'source',
        },
      },
    ])
  })

  test('copies and deletes only unreferenced behaviors', () => {
    const session = new ScriptEditSession(editorState())
    session.dispatch(
      new CopyEntityBehaviorCommand(target, 'trigger', 'talk', 'talk-copy', '交谈副本'),
    )
    expect(triggerRegistry(session.getState())['talk-copy']).toMatchObject({
      label: '交谈副本',
      order: 1,
    })
    session.dispatch(new DeleteEntityBehaviorCommand(target, 'trigger', 'talk-copy'))
    expect(triggerRegistry(session.getState())['talk-copy']).toBeUndefined()
    expect(() =>
      session.dispatch(new DeleteEntityBehaviorCommand(target, 'trigger', 'talk')),
    ).toThrow(/仍有 .*引用/)
  })

  test('edits the item-private body through undoable commands', () => {
    const session = new ScriptEditSession(editorState())
    session.dispatch(
      new SetItemPrivateScriptBodyCommand('private', 'use', 0, [
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

  test('ED-5J: creates an item-private script, rejects a duplicate, undoes and redoes', () => {
    const base = editorState()
    base.items[0]!.use = { target: 'scene', consuming: true, effects: [] }
    const session = new ScriptEditSession(base)
    session.dispatch(new AddItemPrivateScriptCommand('private', '私有脚本物品私有脚本'))
    expect(session.getState().items[0]!.use!.effects).toMatchObject([
      {
        kind: 'itemPrivateScript',
        script: { id: 'use', label: '私有脚本物品私有脚本', body: [] },
      },
    ])
    expect(() => session.dispatch(new AddItemPrivateScriptCommand('private', '再来一条'))).toThrow(
      /已有私有脚本/,
    )
    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]!.use!.effects).toHaveLength(0)
    expect(session.redo()).toBe(true)
    expect(session.getState().items[0]!.use!.effects[0]).toMatchObject({
      kind: 'itemPrivateScript',
      script: { id: 'use', label: '私有脚本物品私有脚本', body: [] },
    })
  })

  test('deletes an item-private script and can rebuild a detached legacy remainder', () => {
    const session = new ScriptEditSession(editorState())
    session.dispatch(new DeleteItemPrivateScriptCommand('private', 'use', 'use'))
    expect(session.getState().items[0]!.use!.effects).toHaveLength(0)
    expect(session.undo()).toBe(true)
    expect(session.getState().items[0]!.use!.effects[0]).toMatchObject({
      kind: 'itemPrivateScript',
      script: { body: [{ kind: 'selectEntityBehavior' }] },
    })
    expect(session.redo()).toBe(true)
    expect(session.getState().items[0]!.use!.effects).toHaveLength(0)
    expect(() =>
      session.dispatch(new DeleteItemPrivateScriptCommand('private', 'use', 'use')),
    ).toThrow(/不存在当前物品脚本/)

    session.undo()
    session.dispatch(
      new AddItemPrivateScriptCommand('private', '重新添加', { replaceDetached: true }),
    )
    expect(session.getState().items[0]!.use!.effects).toEqual([
      {
        kind: 'itemPrivateScript',
        script: { id: 'use', label: '重新添加', body: [] },
      },
    ])
  })

  test('creates and edits canonical shared scripts and rejects referenced deletion', () => {
    const session = new ScriptEditSession(editorState())
    session.dispatch(
      new AddSharedScriptCommand('shared/user/book', {
        name: '读天书',
        self: 'none',
        body: [],
      }),
    )
    session.dispatch(
      new UpdateSharedScriptCommand('shared/user/book', {
        body: [{ kind: 'setFlag', flag: 'book-read', value: true }],
      }),
    )
    expect(session.getState().sharedScripts['shared/user/book']).toMatchObject({
      name: '读天书',
      body: [{ kind: 'setFlag', flag: 'book-read', value: true }],
    })
    session.dispatch(
      new UpdateSharedScriptCommand('shared/user/select-talk', {
        body: [{ kind: 'callScript', script: 'shared/user/book' }],
      }),
    )
    expect(() => session.dispatch(new DeleteSharedScriptCommand('shared/user/book'))).toThrow(
      /不在当前脚本库/,
    )
    expect(session.getState().sharedScripts['shared/user/book']).toBeDefined()
    session.dispatch(new UpdateSharedScriptCommand('shared/user/select-talk', { body: [] }))
    session.dispatch(new DeleteSharedScriptCommand('shared/user/book'))
    expect(session.getState().sharedScripts['shared/user/book']).toBeUndefined()
  })

  test('updates shared-script metadata with structure sharing and exact undo/redo', () => {
    const session = new ScriptEditSession(editorState())
    const before = session.getStateSnapshot()
    const targetBefore = before.sharedScripts['shared/user/select-talk']!
    const otherId = Object.keys(before.sharedScripts).find((id) => id !== 'shared/user/select-talk')
    const otherBefore = otherId ? before.sharedScripts[otherId] : undefined
    const cloneSpy = vi.spyOn(globalThis, 'structuredClone')

    session.dispatch(
      new UpdateSharedScriptMetadataCommand('shared/user/select-talk', {
        name: '选择对话（改）',
        description: '结构共享元数据',
        self: 'optional',
      }),
    )
    const after = session.getStateSnapshot()
    expect(cloneSpy).not.toHaveBeenCalled()
    expect(after).not.toBe(before)
    expect(after.scenes).toBe(before.scenes)
    expect(after.items).toBe(before.items)
    expect(after.sharedScripts).not.toBe(before.sharedScripts)
    expect(after.sharedScripts['shared/user/select-talk']).not.toBe(targetBefore)
    expect(after.sharedScripts['shared/user/select-talk']?.body).toBe(targetBefore.body)
    if (otherId) expect(after.sharedScripts[otherId]).toBe(otherBefore)
    expect(session.getAffectedRecordsSince(0)).toEqual({
      sharedScripts: ['shared/user/select-talk'],
    })

    expect(session.undo()).toBe(true)
    expect(session.getStateSnapshot()).toBe(before)
    expect(session.redo()).toBe(true)
    expect(session.getStateSnapshot()).toBe(after)
    cloneSpy.mockRestore()
  })

  test('rejects invalid shared-script metadata without entering history', () => {
    const session = new ScriptEditSession(editorState())
    const history = session.getHistoryVersion()
    expect(
      () => new UpdateSharedScriptMetadataCommand('shared/user/select-talk', { name: '   ' }),
    ).toThrow(/不能为空/)
    expect(
      () =>
        new UpdateSharedScriptMetadataCommand('shared/user/select-talk', {
          body: [],
        } as never),
    ).toThrow(/不允许修改 body/)
    expect(
      () =>
        new UpdateSharedScriptMetadataCommand('shared/user/select-talk', {
          self: 'sometimes',
        } as never),
    ).toThrow(/none\|optional\|required/)
    expect(session.getHistoryVersion()).toBe(history)
  })

  test('validates nested entity-state commands in a shared script and preserves undo/redo', () => {
    const nestedBodies: Record<string, AuthorCommand[]> = {
      branch: [
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'enabled', is: true },
          then: entityStateCommands(),
        },
      ],
      loop: [
        {
          kind: 'loop',
          mode: 'while',
          cond: { kind: 'flag', flag: 'enabled', is: true },
          body: entityStateCommands(),
          yield: 'worldTick',
          maxIterations: 8,
        },
      ],
      confirm: [{ kind: 'confirm', onNo: entityStateCommands() }],
      battle: [
        {
          kind: 'startBattle',
          enemyTeamId: 'team-1',
          onLose: entityStateCommands(),
          onFlee: entityStateCommands(),
        },
      ],
    }

    for (const body of Object.values(nestedBodies)) {
      const session = new ScriptEditSession(editorState())
      expect(
        session.dispatch(new UpdateSharedScriptCommand('shared/user/select-talk', { body })),
      ).toBe(true)
      expect(session.getState().sharedScripts['shared/user/select-talk']?.body).toEqual(body)
      expect(session.undo()).toBe(true)
      expect(session.redo()).toBe(true)
      expect(session.getState().sharedScripts['shared/user/select-talk']?.body).toEqual(body)
    }
  })

  test('preserves source-derived zone facing commands and other zone state commands', () => {
    const state = editorState()
    state.scenes[0]!.entities.push({
      id: 'zone-1',
      zone: true,
      pos: { col: 2, row: 3, height: 0 },
    })
    const session = new ScriptEditSession(state)
    const zoneTarget = { scene: 's001', entity: 'zone-1' }

    expect(
      session.dispatch(
        new UpdateSharedScriptCommand('shared/user/select-talk', {
          body: [{ kind: 'setEntityFacing', target: zoneTarget, facing: 'down' }],
        }),
      ),
    ).toBe(true)
    expect(session.getState().sharedScripts['shared/user/select-talk']?.body).toEqual([
      { kind: 'setEntityFacing', target: zoneTarget, facing: 'down' },
    ])

    expect(
      session.dispatch(
        new UpdateSharedScriptCommand('shared/user/select-talk', {
          body: [{ kind: 'suspendEntity', target: zoneTarget, ticks: 1 }],
        }),
      ),
    ).toBe(true)
  })

  test('edits scene Hook variants through stable ids and rewrites selections', () => {
    const session = new ScriptEditSession(editorState())
    session.dispatch(new AddSceneHookCommand('s001', 'onEnter', 'default', hook('默认进场')))
    session.dispatch(new AddSceneHookCommand('s001', 'onEnter', 'alternate', hook('备用进场')))
    session.dispatch(
      new UpdateSceneHookCommand('s001', 'onEnter', 'alternate', {
        flow: stageFlow('alternate', [{ kind: 'setFlag', flag: 'entered', value: true }]),
      }),
    )
    session.dispatch(new SetSceneHookInitialCommand('s001', 'onEnter', 'alternate'))
    session.dispatch(
      new UpdateSharedScriptCommand('shared/user/select-talk', {
        body: [
          {
            kind: 'selectSceneHooks',
            scene: 's001',
            selection: { onEnter: { kind: 'use', value: 'alternate' } },
          },
        ],
      }),
    )
    expect(sceneHookReferences(session.getState(), 's001', 'onEnter', 'alternate')).toEqual([
      {
        kind: 'initial',
        path: 'scenes.s001.hooks.onEnter.initial',
        locator: {
          kind: 'scene-hook-initial',
          sceneId: 's001',
          slot: 'onEnter',
          hookId: 'alternate',
        },
      },
      {
        kind: 'command',
        path: 'sharedScripts.shared/user/select-talk.body[0]',
        locator: {
          kind: 'command',
          owner: { kind: 'shared-script', scriptId: 'shared/user/select-talk' },
          container: { kind: 'body' },
          commandPath: '0',
        },
      },
    ])

    session.dispatch(new RenameSceneHookCommand('s001', 'onEnter', 'alternate', 'story-entry'))
    const renamed = session.getState()
    expect(renamed.scenes[0]!.hooks!.onEnter!.initial).toBe('story-entry')
    expect(renamed.sharedScripts['shared/user/select-talk']!.body[0]).toMatchObject({
      selection: { onEnter: { kind: 'use', value: 'story-entry' } },
    })
    session.dispatch(new CopySceneHookCommand('s001', 'onEnter', 'story-entry', 'story-entry-copy'))
    session.dispatch(new DeleteSceneHookCommand('s001', 'onEnter', 'story-entry-copy'))
    expect(
      session.getState().scenes[0]!.hooks!.onEnter!.variants['story-entry-copy'],
    ).toBeUndefined()
    expect(() =>
      session.dispatch(new DeleteSceneHookCommand('s001', 'onEnter', 'story-entry')),
    ).toThrow(/仍有 .*引用/)
  })

  test('appends and atomically reorders hook variants without changing the initial hook', () => {
    const session = new ScriptEditSession(editorState())
    session.dispatch(new AddSceneHookCommand('s001', 'onEnter', 'default', hook('默认进场')))
    session.dispatch(new AddSceneHookCommand('s001', 'onEnter', 'alternate', hook('备用进场')))
    session.dispatch(new SetSceneHookInitialCommand('s001', 'onEnter', 'alternate'))
    const variants = session.getState().scenes[0]!.hooks!.onEnter!.variants
    expect(variants.default?.order).toBe(0)
    expect(variants.alternate?.order).toBe(1)

    const beforeReorderVersion = session.getHistoryVersion()
    session.dispatch(
      new ReorderSceneHookVariantsCommand('s001', 'onEnter', ['alternate', 'default']),
    )
    expect(session.getHistoryVersion()).toBe(beforeReorderVersion + 1)
    expect(session.getState().scenes[0]!.hooks!.onEnter).toMatchObject({
      initial: 'alternate',
      variants: { alternate: { order: 0 }, default: { order: 1 } },
    })
    expect(session.undo()).toBe(true)
    expect(session.getState().scenes[0]!.hooks!.onEnter).toMatchObject({
      initial: 'alternate',
      variants: { default: { order: 0 }, alternate: { order: 1 } },
    })
    expect(session.redo()).toBe(true)
    expect(session.getState().scenes[0]!.hooks!.onEnter!.initial).toBe('alternate')
    expect(() =>
      session.dispatch(new ReorderSceneHookVariantsCommand('s001', 'onEnter', ['alternate'])),
    ).toThrow(/精确排列/)
  })

  test('saves a scene Hook name and default state as one undo unit', () => {
    const setup = new ScriptEditSession(editorState())
    setup.dispatch(new AddSceneHookCommand('s001', 'onEnter', 'default', hook('默认进场')))
    setup.dispatch(new AddSceneHookCommand('s001', 'onEnter', 'alternate', hook('备用进场')))
    const session = new ScriptEditSession(setup.getState())

    session.dispatch(
      new SaveSceneHookDetailsCommand('s001', 'onEnter', 'alternate', '第二次进场', true),
    )
    expect(session.getState().scenes[0]!.hooks!.onEnter).toMatchObject({
      initial: 'alternate',
      variants: { alternate: { label: '第二次进场' } },
    })

    expect(session.undo()).toBe(true)
    expect(session.canUndo()).toBe(false)
    expect(session.getState().scenes[0]!.hooks!.onEnter).toMatchObject({
      initial: 'default',
      variants: { alternate: { label: '备用进场' } },
    })
    expect(session.redo()).toBe(true)
    expect(session.getState().scenes[0]!.hooks!.onEnter).toMatchObject({
      initial: 'alternate',
      variants: { alternate: { label: '第二次进场' } },
    })
  })

  test('selects page behaviors by stable id and validates the local registry', () => {
    const session = new ScriptEditSession(editorState())
    session.dispatch(
      new AddEntityBehaviorCommand(target, 'trigger', 'alternate', behavior('alternate')),
    )
    session.dispatch(new SetEntityPageBehaviorCommand(target, 'default', 'trigger', 'alternate'))
    expect(session.getState().scenes[0]!.entities[0]!.pages![0]!.trigger).toBe('alternate')
    session.dispatch(new SetEntityPageBehaviorCommand(target, 'default', 'trigger', undefined))
    expect(session.getState().scenes[0]!.entities[0]!.pages![0]!.trigger).toBeUndefined()
    expect(() =>
      session.dispatch(new SetEntityPageBehaviorCommand(target, 'default', 'trigger', 'missing')),
    ).toThrow(/behavior 不存在/)
  })

  test('edits current page trigger activation as one undoable canonical change', () => {
    const session = new ScriptEditSession(editorState())
    session.dispatch(
      new SetEntityPageTriggerActivationCommand(target, 'default', { on: 'touch', range: 3 }),
    )
    expect(session.getState().scenes[0]!.entities[0]!.pages![0]!.triggerActivation).toEqual({
      on: 'touch',
      range: 3,
    })

    expect(session.undo()).toBe(true)
    expect(session.getState().scenes[0]!.entities[0]!.pages![0]!.triggerActivation).toEqual({
      on: 'interact',
      range: 1,
    })
    expect(session.redo()).toBe(true)
    expect(session.getState().scenes[0]!.entities[0]!.pages![0]!.triggerActivation).toEqual({
      on: 'touch',
      range: 3,
    })

    expect(() =>
      session.dispatch(
        new SetEntityPageTriggerActivationCommand(target, 'default', {
          on: 'touch',
          range: -1,
        }),
      ),
    ).toThrow(/期望非负有限数/)
    expect(() =>
      session.dispatch(
        new SetEntityPageTriggerActivationCommand(target, 'missing', {
          on: 'interact',
          range: 1,
        }),
      ),
    ).toThrow(/实体页不存在/)
  })

  test('adds and deletes a current canonical scene entity with stable undo order', () => {
    const session = new ScriptEditSession(editorState())
    const entity = {
      id: 'zone-new',
      zone: true as const,
      pos: { col: 7, row: 8, height: 0 },
      behaviors: {
        trigger: {
          default: {
            label: '默认触发行为',
            order: 0,
            flow: {
              kind: 'stages' as const,
              initial: 'initial',
              stages: [{ id: 'initial', body: [] }],
            },
          },
        },
      },
      pages: [
        {
          id: 'default',
          label: '默认模式',
          trigger: 'default',
          triggerActivation: { on: 'interact' as const, range: 1 },
        },
      ],
      initialPage: 'default',
    }
    session.dispatch(new AddSceneEntityDefinitionCommand('s001', entity))
    expect(session.getState().scenes[0]!.entities.at(-1)).toEqual(entity)
    expect(session.undo()).toBe(true)
    expect(session.getState().scenes[0]!.entities.some((entry) => entry.id === entity.id)).toBe(
      false,
    )
    expect(session.redo()).toBe(true)
    expect(() => session.dispatch(new AddSceneEntityDefinitionCommand('s001', entity))).toThrow(
      /实体已存在/,
    )

    session.dispatch(new DeleteSceneEntityDefinitionCommand('s001', entity.id))
    expect(session.getState().scenes[0]!.entities.some((entry) => entry.id === entity.id)).toBe(
      false,
    )
    expect(session.undo()).toBe(true)
    expect(session.getState().scenes[0]!.entities.at(-1)).toEqual(entity)
    expect(session.redo()).toBe(true)
    expect(session.getState().scenes[0]!.entities.some((entry) => entry.id === entity.id)).toBe(
      false,
    )
  })
})

describe('canonical script editor presentation', () => {
  test('renders all selection and transition execution semantics explicitly', () => {
    expect(presentSelection({ kind: 'inherit' }, String)).toEqual({
      tone: 'inherit',
      label: '继承静态定义',
    })
    expect(presentSelection({ kind: 'disabled' }, String)).toEqual({
      tone: 'disabled',
      label: '显式禁用',
    })
    expect(presentSelection({ kind: 'use', value: 'talk' }, String)).toEqual({
      tone: 'use',
      label: '使用：talk',
    })
    expect(stateTransitionExecutionLabel({ kind: 'continue', state: 'next' })).toBe('同步继续')
    expect(stateTransitionExecutionLabel({ kind: 'advance', state: 'next' })).toBe('下次激活')
    expect(
      stateTransitionExecutionLabel({
        kind: 'to',
        state: 'next',
        yield: 'worldTick',
      }),
    ).toBe('让步后同次继续')
    expect(
      stateTransitionExecutionLabel({
        kind: 'branch',
        cond: { kind: 'flag', flag: 'route', is: true },
        then: { kind: 'stay' },
        else: { kind: 'restart' },
      }),
    ).toBe('条件分派')
  })
})
