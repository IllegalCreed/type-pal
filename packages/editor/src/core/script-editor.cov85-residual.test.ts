/**
 * TEST-COVERAGE85-GLM-EDITOR-1 批2：script-editor 命令守卫与遍历残臂。
 *
 * fullName 排重（旧文件已证，不复制）：
 * - script-editor.test.ts：行为/Hook/物品/共享脚本命令的成功链、undo/redo 事务、
 *   已存在/精确排列/引用拒删族、元数据 patch 校验、confirm/repeat 内选择器重写。
 * - script-editor.hooks-session.test.ts：SaveSceneHookDetails default 隔离与逐层删除。
 * - script-editor-projection(.boundaries).test.ts、p03b.glm-p：投影与 P03b 面。
 * 本文件只补 cov-base 实测缺臂：id 卫（BehaviorId/HookId/ScriptId 空/路径字符）、
 * registry/缺实体/缺物品/缺 hook/非敌对实体族的精确错误、战败脚本 delete 臂、
 * startBattle onLose/onFlee 与 teleportOut onFail 与 stage entry prepare 内的命令遍历/
 * 重写、branch else 臂重写、describe 系列标签、会话 discardRedo/redo 空/历史准备失效
 * /未绑定发布守卫。全部经公开 ScriptEditSession.dispatch 或导出函数，精确错误消息 +
 * 拒绝后状态/历史零污染断言；状态由当前合法作者对象构造（validateState 在构造期通过）。
 */
import type {
  AuthorCommand,
  AuthorEntityBehaviors,
  AuthorSceneHooks,
  AuthorScriptFlow,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import type { CanonicalScriptReference } from './script-editor.js'
import {
  AddEntityBehaviorCommand,
  AddItemDefinitionCommand,
  AddItemPrivateScriptCommand,
  AddSceneHookCommand,
  AddSharedScriptCommand,
  CopyEntityBehaviorCommand,
  CopySceneHookCommand,
  collectCanonicalScriptCommandVisits,
  DeleteItemDefinitionCommand,
  DeleteItemPrivateScriptCommand,
  DeleteSceneHookCommand,
  DeleteSharedScriptCommand,
  describeCanonicalScriptReference,
  RenameEntityBehaviorCommand,
  RenameSceneHookCommand,
  type ScriptEditorState,
  ScriptEditSession,
  SetEntityHostileOnLoseCommand,
  SetItemPrivateScriptBodyCommand,
  SetSceneHookInitialCommand,
  UpdateSharedScriptCommand,
  UpdateSharedScriptMetadataCommand,
} from './script-editor.js'

const target = { scene: 's001', entity: 'e1' }
const other = { scene: 's001', entity: 'e2' }

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

function stageFlow(body: AuthorCommand[] = []): AuthorScriptFlow {
  return { kind: 'stages', initial: 'start', stages: [{ id: 'start', body }] }
}

function behavior(id: string, flow?: AuthorScriptFlow): AuthorEntityBehavior {
  return { label: id, order: 0, flow: flow ?? stageFlow() }
}

function hook(label: string, body: AuthorCommand[] = []): AuthorSceneHook {
  return { label, order: 0, flow: stageFlow(body) }
}

function editorState(): ScriptEditorState {
  return {
    scenes: [
      {
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
            behaviors: { trigger: { talk: behavior('talk') } },
            hostile: {
              enemyTeamId: 'team-1',
              onLose: [{ kind: 'wait', ms: 1 }],
              onVictory: { kind: 'remove' },
              onPlayerFlee: { kind: 'remain' },
            },
          },
          { id: 'e2', sprite: 'npc', pos: { col: 2, row: 1, height: 0 } },
        ],
        hooks: {
          onEnter: {
            initial: 'enter-default',
            variants: { 'enter-default': hook('默认进场') },
          },
          onTeleport: {
            initial: 'tp-default',
            variants: { 'tp-default': hook('默认传送') },
          },
        },
      },
    ],
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
              script: { id: 'use', label: '使用', body: [selectionCommand('talk')] },
            },
          ],
        },
      },
    ],
    sharedScripts: {
      'shared/user/select-talk': {
        name: '选择交谈',
        self: 'none',
        body: [selectionCommand('talk')],
      },
    },
  }
}

/** 拒绝后保真：状态零变化、零历史、零脏。 */
function expectRejected(
  session: ScriptEditSession,
  build: () => Parameters<ScriptEditSession['dispatch']>[0],
  message: RegExp,
) {
  const before = structuredClone(session.getState())
  const undoable = session.canUndo()
  const dirty = session.isDirty()
  const historyVersion = session.getHistoryVersion()
  expect(() => session.dispatch(build())).toThrow(message)
  expect(session.getState()).toEqual(before)
  expect(session.canUndo()).toBe(undoable)
  expect(session.isDirty()).toBe(dirty)
  expect(session.getHistoryVersion()).toBe(historyVersion)
}

test('cov85-residual id 卫：BehaviorId/HookId/ScriptId 空白与路径字符精确拒绝', () => {
  const session = new ScriptEditSession(editorState())
  expectRejected(
    session,
    () => new AddEntityBehaviorCommand(target, 'trigger', '  ', behavior('x')),
    /BehaviorId 不能为空/,
  )
  expectRejected(
    session,
    () => new AddEntityBehaviorCommand(target, 'trigger', 'a/b', behavior('x')),
    /BehaviorId 非法 a\/b/,
  )
  expectRejected(
    session,
    () => new AddEntityBehaviorCommand(target, 'trigger', 'a\\b', behavior('x')),
    /BehaviorId 非法/,
  )
  expectRejected(
    session,
    () => new AddSceneHookCommand('s001', 'onEnter', ' ', hook('x')),
    /HookId 不能为空/,
  )
  expectRejected(
    session,
    () => new AddSceneHookCommand('s001', 'onEnter', 'a/b', hook('x')),
    /HookId 非法 a\/b/,
  )
  expectRejected(
    session,
    () => new AddSharedScriptCommand(' ', { name: '空', self: 'none', body: [] }),
    /ScriptId 不能为空/,
  )
  expectRejected(
    session,
    () => new AddSharedScriptCommand('shared\\back', { name: '反斜杠', self: 'none', body: [] }),
    /ScriptId 非法 shared\\back/,
  )
  expectRejected(
    session,
    () => new AddSharedScriptCommand('/lead', { name: '前导斜杠', self: 'none', body: [] }),
    /ScriptId 非法 \/lead/,
  )
  expectRejected(
    session,
    () => new AddSharedScriptCommand('trail/', { name: '尾斜杠', self: 'none', body: [] }),
    /ScriptId 非法 trail\//,
  )
})

test('cov85-residual registry 缺失族：auto 通道复制/改名与改名撞 id 精确拒绝', () => {
  const session = new ScriptEditSession(editorState())
  expectRejected(
    session,
    () => new CopyEntityBehaviorCommand(target, 'auto', 'talk', 'auto-copy'),
    /behavior 不存在 s001\/e1\/auto\/talk/,
  )
  expectRejected(
    session,
    () => new CopyEntityBehaviorCommand(target, 'trigger', 'talk', 'talk'),
    /BehaviorId 已存在 talk/,
  )
  expectRejected(
    session,
    () => new RenameEntityBehaviorCommand(target, 'trigger', 'missing', 'x'),
    /behavior 不存在 missing/,
  )
  expectRejected(
    session,
    () => new RenameEntityBehaviorCommand(target, 'trigger', 'talk', 'talk'),
    /BehaviorId 已存在 talk/,
  )
})

test('cov85-residual Hook 命令守卫：改名撞 id、initial 指向缺失、删除缺 registry', () => {
  const session = new ScriptEditSession(editorState())
  // 改名成功后旧 id 消失；再对旧 id 改名 → hook 不存在。
  session.dispatch(new RenameSceneHookCommand('s001', 'onEnter', 'enter-default', 'enter-renamed'))
  session.dispatch(new AddSceneHookCommand('s001', 'onEnter', 'second', hook('第二进场')))
  expectRejected(
    session,
    () => new RenameSceneHookCommand('s001', 'onEnter', 'enter-renamed', 'second'),
    /HookId 已存在 second/,
  )
  expectRejected(
    session,
    () => new RenameSceneHookCommand('s001', 'onEnter', 'gone', 'x'),
    /hook 不存在 gone/,
  )
  expectRejected(
    session,
    () => new CopySceneHookCommand('s001', 'onEnter', 'enter-renamed', 'enter-renamed'),
    /HookId 已存在 enter-renamed/,
  )
  expectRejected(
    session,
    () => new SetSceneHookInitialCommand('s001', 'onTeleport', 'missing-hook'),
    /hook 通道不存在|hook 不存在/,
  )
  expectRejected(
    session,
    () => new DeleteSceneHookCommand('s001', 'onTeleport', 'ghost'),
    /hook 不存在 s001\/onTeleport\/ghost/,
  )
})

test('cov85-residual 物品命令守卫：重复/缺物品/非私有脚本槽/缺 effects', () => {
  const session = new ScriptEditSession(editorState())
  const item = structuredClone(session.getState().items[0]!)
  expectRejected(session, () => new AddItemDefinitionCommand(item), /物品已存在 private/)
  expectRejected(session, () => new DeleteItemDefinitionCommand('ghost'), /物品不存在 ghost/)
  expectRejected(
    session,
    () => new AddItemPrivateScriptCommand('ghost', '标签'),
    /物品不存在 ghost/,
  )
  expectRejected(
    session,
    () => new SetItemPrivateScriptBodyCommand('ghost', 'use', 0, []),
    /物品不存在 ghost/,
  )
  expectRejected(
    session,
    () => new SetItemPrivateScriptBodyCommand('private', 'use', 9, []),
    /不是物品私有脚本/,
  )
  expectRejected(
    session,
    () => new DeleteItemPrivateScriptCommand('private', 'throw', 'use'),
    /private.throw 不存在/,
  )
})

test('cov85-residual 战败脚本：非敌对实体拒绝，onLose=undefined 走删除臂', () => {
  const state = editorState()
  const session = new ScriptEditSession(state)
  expectRejected(
    session,
    () => new SetEntityHostileOnLoseCommand(other, [{ kind: 'wait', ms: 2 }]),
    /实体不是敌对实体 s001\/e2/,
  )
  expect(session.getState().scenes[0]!.entities[0]!.hostile?.onLose).toEqual([
    { kind: 'wait', ms: 1 },
  ])
  session.dispatch(new SetEntityHostileOnLoseCommand(target, undefined))
  expect(session.getState().scenes[0]!.entities[0]!.hostile).toEqual({
    enemyTeamId: 'team-1',
    onVictory: { kind: 'remove' },
    onPlayerFlee: { kind: 'remain' },
  })
  expect(session.undo()).toBe(true)
  expect(session.getState().scenes[0]!.entities[0]!.hostile?.onLose).toEqual([
    { kind: 'wait', ms: 1 },
  ])
})

test('cov85-residual 共享脚本守卫：更新/删除缺脚本、元数据 invert 未 apply', () => {
  const session = new ScriptEditSession(editorState())
  expectRejected(
    session,
    () => new UpdateSharedScriptCommand('shared/user/missing', { name: 'x' }),
    /共享脚本不存在 shared\/user\/missing/,
  )
  const deleteMissing = new DeleteSharedScriptCommand('shared/user/missing', undefined as never)
  expect(() => deleteMissing.apply(session.getState())).toThrow(
    /共享脚本不存在 shared\/user\/missing/,
  )
  const metadata = new UpdateSharedScriptMetadataCommand('shared/user/select-talk', {
    name: '改名',
  })
  expect(() => metadata.invert(session.getState())).toThrow(/编辑共享脚本元数据: 尚未 apply/)
})

test('cov85-residual startBattle onLose/onFlee 与 teleportOut onFail 内命令被遍历且选择器随改名重写', () => {
  const state = editorState()
  const nested: AuthorCommand[] = [
    {
      kind: 'startBattle',
      enemyTeamId: 'team-1',
      onLose: [selectionCommand('talk')],
      onFlee: [{ kind: 'teleportOut', onFail: [selectionCommand('talk')] }],
    },
    { kind: 'teleportOut', onFail: [selectionCommand('talk')] },
  ]
  state.scenes[0]!.entities[0]!.behaviors!.trigger!.talk = behavior('talk', stageFlow(nested))
  const session = new ScriptEditSession(state)
  const paths = collectCanonicalScriptCommandVisits(session.getState()).map((visit) => visit.path)
  expect(paths).toContain(
    'scenes.s001.entities.e1.behaviors.trigger.talk.flow.stages.start.body[0].onLose[0]',
  )
  expect(paths).toContain(
    'scenes.s001.entities.e1.behaviors.trigger.talk.flow.stages.start.body[0].onFlee[0].onFail[0]',
  )
  expect(paths).toContain(
    'scenes.s001.entities.e1.behaviors.trigger.talk.flow.stages.start.body[1].onFail[0]',
  )
  // 改名 talk → greet 后三处嵌套选择器全部重写。
  session.dispatch(new RenameEntityBehaviorCommand(target, 'trigger', 'talk', 'greet'))
  const talk = session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.greet!
  const flattened = JSON.stringify(talk.flow)
  expect(flattened).not.toContain('"value":"talk"')
  expect(flattedMatches(flattened, /"kind":"selectEntityBehavior"/g)).toBe(3)
  expect(flattened).toContain('"value":"greet"')
  expect(session.undo()).toBe(true)
  expect(
    JSON.stringify(session.getState().scenes[0]!.entities[0]!.behaviors!.trigger!.talk!.flow),
  ).toContain('"value":"talk"')
})

function flattedMatches(haystack: string, pattern: RegExp): number {
  return [...haystack.matchAll(pattern)].length
}

test('cov85-residual branch else 臂内的选择器遍历', () => {
  const state = editorState()
  const flow: AuthorScriptFlow = {
    kind: 'stages',
    initial: 'start',
    stages: [
      {
        id: 'start',
        body: [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'f', is: true },
            then: [{ kind: 'wait', ms: 1 }],
            else: [selectionCommand('talk')],
          },
        ],
      },
    ],
  }
  state.scenes[0]!.entities[0]!.behaviors!.trigger!.talk = behavior('talk', flow)
  const session = new ScriptEditSession(state)
  const paths = collectCanonicalScriptCommandVisits(session.getState()).map((visit) => visit.path)
  expect(paths).toContain(
    'scenes.s001.entities.e1.behaviors.trigger.talk.flow.stages.start.body[0].else[0]',
  )
})

test('cov85-residual describe 系列标签：hostile/hook/item/shared/page/hook-initial 各分支', () => {
  const state = editorState()
  const entity = state.scenes[0]!.entities[0]!
  entity.pages = [
    {
      id: 'default',
      label: '默认',
      trigger: 'talk',
      triggerActivation: { on: 'interact', range: 1 },
    },
    { id: 'auto-page', label: '自动页', auto: 'idle' },
  ]
  entity.behaviors = { trigger: { talk: behavior('talk') }, auto: { idle: behavior('idle') } }
  entity.initialPage = 'default'
  const references: CanonicalScriptReference[] = [
    {
      kind: 'initial',
      path: 'scenes.s001.hooks.onEnter.initial',
      locator: {
        kind: 'scene-hook-initial',
        sceneId: 's001',
        slot: 'onEnter',
        hookId: 'enter-default',
      },
    },
    {
      kind: 'page',
      path: 'scenes.s001.entities.e1.pages.default.trigger',
      locator: {
        kind: 'entity-page',
        sceneId: 's001',
        entityId: 'e1',
        pageId: 'default',
        channel: 'trigger' as const,
      },
    },
    {
      kind: 'page',
      path: 'scenes.s001.entities.e1.pages.auto-page.auto',
      locator: {
        kind: 'entity-page',
        sceneId: 's001',
        entityId: 'e1',
        pageId: 'auto-page',
        channel: 'auto' as const,
      },
    },
  ]
  const described = references.map((reference) =>
    describeCanonicalScriptReference(state, reference),
  )
  expect(described[0]).toContain('进入场景时')
  expect(described[0]).toContain('默认进场')
  expect(described[1]).toContain('页面“默认”')
  expect(described[1]).toContain('交互脚本')
  expect(described[2]).toContain('自动行为')
})

test('cov85-residual 会话守卫：discardRedo 非栈顶命令拒false、空 redo/undo false、未绑定发布拒绝', () => {
  const session = new ScriptEditSession(editorState())
  expect(session.redo()).toBe(false)
  expect(session.undo()).toBe(false)
  const command = new AddEntityBehaviorCommand(target, 'trigger', 'extra', behavior('extra'))
  session.dispatch(command)
  session.undo()
  expect(
    session.discardRedo(new AddEntityBehaviorCommand(target, 'trigger', 'other', behavior('o'))),
  ).toBe(false)
  expect(session.canRedo()).toBe(true)
  expect(() => session.publishHistoryNotification({})).toThrow(/脚本历史尚未绑定/)
})

test('cov85-residual 历史准备失效：prepare 后版本推进，validate 精确拒绝', () => {
  const session = new ScriptEditSession(editorState())
  const command = new AddEntityBehaviorCommand(target, 'trigger', 'extra', behavior('extra'))
  const prepared = session.prepareHistoryChange('dispatch', command, Symbol('cov85'))
  expect(prepared).toBeDefined()
  session.dispatch(new AddEntityBehaviorCommand(target, 'trigger', 'another', behavior('a')))
  expect(() => prepared!.validate()).toThrow(/脚本历史准备结果已失效/)
})
