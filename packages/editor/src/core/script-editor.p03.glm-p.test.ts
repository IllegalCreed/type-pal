// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P03（script-editor.p03.glm-p）：canonical 脚本纯 API 暗区合同。
 * 去重（真实旧 fullName 锚，非 token）：
 * - script-editor.test.ts › canonical script editor commands › tracks and rewrites
 *   cursor-handoff source behaviors without duplicate references（已证 cursor-handoff
 *   重写链）；本文件 behaviorReferences 的 cursorHandoff 只读引用收集为不同轴。
 * - script-editor.test.ts › renames a behavior immutably and rewrites page plus
 *   nested project references（已证重写）；只读 page 引用收集为不同轴。
 * - script-editor.test.ts › edits scene Hook variants through stable ids and
 *   rewrites selections（已证 hook 重写）；sceneHookReferences 只读 initial+command
 *   收集与 canonicalScriptReferenceDestinationExists 三臂为不同轴。
 * - describeScriptCommandOwner/describeCanonicalScriptReference 的中文标签合同
 *   （五 owner/三 locator/容器标签）无旧直测 fullName（旧测只经 UI 展示间接消费）。
 * - presentSelection/stateTransitionExecutionLabel 已由
 *   'renders all selection and transition execution semantics explicitly' 覆盖，不重测。
 * 合法输入：与 script-editor.test.ts 同构的 typed AuthorSceneDef/items/sharedScripts。
 */
import type {
  AuthorCommand,
  AuthorEntityBehaviors,
  AuthorSceneDef,
  AuthorSceneHooks,
  AuthorScriptFlow,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  behaviorReferences,
  canonicalScriptReferenceDestinationExists,
  describeCanonicalScriptReference,
  describeScriptCommandOwner,
  resolveCanonicalScriptCommand,
  type ScriptEditorState,
  ScriptEditSession,
  sceneHookReferences,
} from './script-editor.js'

const target = { scene: 's001', entity: 'e1' }
type AuthorEntityBehavior = NonNullable<AuthorEntityBehaviors['trigger']>[string]
type AuthorSceneHook = NonNullable<AuthorSceneHooks['onEnter']>['variants'][string]

function stageFlow(stageId = 'start', body: AuthorCommand[] = []): AuthorScriptFlow {
  return { kind: 'stages', initial: stageId, stages: [{ id: stageId, body }] }
}

function machineFlow(body: AuthorCommand[]): AuthorScriptFlow {
  return {
    kind: 'stateMachine',
    machine: {
      id: 'machine-1',
      label: '巡逻机',
      initial: 'idle',
      states: {
        idle: {
          label: '待机',
          body,
          next: { kind: 'stay' as const },
        },
      },
    },
  }
}

/** 合法 entry 容器：仅 onEnter hook 的 stateMachine initial state 允许 entry（一手门
 * author-script-core.ts:984-986，allowSceneEntry: slot === 'onEnter'）。 */
function onEnterEntryMachineFlow(
  prepare: AuthorCommand[],
  body: AuthorCommand[],
): AuthorScriptFlow {
  return {
    kind: 'stateMachine',
    machine: {
      id: 'machine-1',
      label: '巡逻机',
      initial: 'idle',
      states: {
        idle: {
          label: '待机',
          entry: { prepare, reveal: { kind: 'cut' as const } },
          body,
          next: { kind: 'stay' as const },
        },
      },
    },
  }
}

function behavior(id: string, flow: AuthorScriptFlow = stageFlow()): AuthorEntityBehavior {
  return { label: `标签-${id}`, order: 0, flow }
}

function hook(label: string, flow: AuthorScriptFlow = stageFlow()): AuthorSceneHook {
  return { label, order: 0, flow }
}

function selectionCommand(behaviorId: string): AuthorCommand {
  return {
    kind: 'selectEntityBehavior',
    target,
    channel: 'trigger',
    selection: { kind: 'use', value: behaviorId },
  }
}

/** 各 behavior 的真实合法游标（与 fixture 中 flow 定义一致）：
 * talk=stages/start；auto2=stateMachine machine-1/idle。一手门
 * script-editor.ts:655-668 按 source/selected flow 逐一核 cursor 归属。 */
const LEGAL_CURSOR = {
  talk: { kind: 'stage', stage: 'start' },
  auto2: { kind: 'state', machine: 'machine-1', state: 'idle' },
} as const

function handoffCommand(
  from: keyof typeof LEGAL_CURSOR,
  to: keyof typeof LEGAL_CURSOR,
): AuthorCommand {
  return {
    kind: 'selectEntityBehavior',
    target,
    channel: 'trigger',
    selection: { kind: 'use', value: to },
    cursorHandoff: {
      kind: 'stateMap',
      fromBehavior: from,
      cases: [{ from: LEGAL_CURSOR[from], to: LEGAL_CURSOR[to] }],
      onUnmapped: 'error',
    },
  }
}

function scene(extra?: Partial<AuthorSceneDef>): AuthorSceneDef {
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
            label: '默认页',
            trigger: 'talk',
            triggerActivation: { on: 'interact', range: 1 },
          },
        ],
        behaviors: {
          trigger: {
            talk: behavior('talk', stageFlow('start', [selectionCommand('talk')])),
            auto2: behavior('auto2', machineFlow([selectionCommand('auto2')])),
          },
        },
      },
    ],
    ...extra,
  }
}

/** 公开准入门：真实 ScriptEditSession 构造（作者校验+引用闭包）。fixture 不合法时
 * 抛错由各测试直接失败——不把准入检查算新业务合同，只保证输入合法。 */
function assertFixturePassesPublicSession(state: ScriptEditorState): ScriptEditorState {
  void new ScriptEditSession(structuredClone(state))
  return state
}

function editorState(): ScriptEditorState {
  return assertFixturePassesPublicSession({
    scenes: [
      scene({
        hooks: {
          onEnter: {
            initial: 'enter-a',
            variants: {
              'enter-a': hook(
                '进场A',
                onEnterEntryMachineFlow(
                  [handoffCommand('talk', 'auto2')],
                  [selectionCommand('talk')],
                ),
              ),
              'enter-b': hook(
                '进场B',
                stageFlow('start', [
                  {
                    kind: 'selectSceneHooks',
                    scene: 's001',
                    selection: {
                      onEnter: { kind: 'use', value: 'enter-b' },
                      onTeleport: { kind: 'disabled' },
                    },
                  },
                ]),
              ),
            },
          },
        },
      }),
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
              script: { id: 'use', label: '使用', body: [handoffCommand('talk', 'auto2')] },
            },
          ],
        },
      },
    ],
    sharedScripts: {
      'shared/user/lib': {
        name: '共享库',
        self: 'none',
        body: [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'enabled', is: true },
            then: [selectionCommand('talk')],
            else: [handoffCommand('auto2', 'talk')],
          },
        ],
      },
    },
  })
}

describe('P03-G12 behaviorReferences 只读引用收集', () => {
  test('页槽命中产出 entity-page locator 引用；路径携带页 id 与通道', () => {
    const refs = behaviorReferences(editorState(), target, 'trigger', 'talk')
    const pageRef = refs.find((ref) => ref.kind === 'page')
    expect(pageRef?.path).toBe('scenes.s001.entities.e1.pages.default.trigger')
    expect(pageRef?.locator).toEqual({
      kind: 'entity-page',
      sceneId: 's001',
      entityId: 'e1',
      pageId: 'default',
      channel: 'trigger',
    })
  })

  test('嵌套命令 selection 命中产出 command 引用并保留完整命令路径', () => {
    const state = editorState()
    const refs = behaviorReferences(state, target, 'trigger', 'talk')
    const commandRefs = refs.filter((ref) => ref.kind === 'command').map((ref) => ref.path)
    // 触发器 body / onEnter hook body / 共享库 branch.then 三处 selection 命中。
    expect(commandRefs).toContain(
      'scenes.s001.entities.e1.behaviors.trigger.talk.flow.stages.start.body[0]',
    )
    expect(commandRefs).toContain(
      'scenes.s001.hooks.onEnter.variants.enter-a.flow.machine.states.idle.body[0]',
    )
    expect(commandRefs).toContain('sharedScripts.shared/user/lib.body[0].then[0]')
  })

  test('合法 onEnter entry.prepare 中的 cursorHandoff.fromBehavior 引用：完整路径与 locator（合法 entry 容器新轴）', () => {
    const state = editorState()
    const refs = behaviorReferences(state, target, 'trigger', 'talk')
    const handoff = refs.find(
      (ref): ref is Extract<typeof ref, { kind: 'command' }> =>
        ref.kind === 'command' && ref.path.endsWith('.cursorHandoff.fromBehavior'),
    )
    expect(handoff).toBeDefined()
    // 合法容器：onEnter hook 的 machine initial state entry.prepare
    //（实体 behavior 机器 entry 被公开校验拒收——author-script-core.ts:984-986）。
    expect(handoff?.path).toBe(
      'scenes.s001.hooks.onEnter.variants.enter-a.flow.machine.states.idle.entry.prepare[0].cursorHandoff.fromBehavior',
    )
    expect(handoff?.locator).toEqual({
      kind: 'command',
      owner: { kind: 'scene-hook', sceneId: 's001', slot: 'onEnter', hookId: 'enter-a' },
      container: { kind: 'state', machineId: 'machine-1', stateId: 'idle', section: 'prepare' },
      commandPath: '0',
    })
    // 完整 handoff 源/目标 cursor：经 locator 解析出的命令携带 stateMap 全体 cases。
    const resolved = resolveCanonicalScriptCommand(state, handoff!.locator)
    expect(resolved).toMatchObject({
      kind: 'selectEntityBehavior',
      cursorHandoff: {
        kind: 'stateMap',
        fromBehavior: 'talk',
        // 合法映射：talk(stages/start) → auto2(stateMachine machine-1/idle)
        cases: [
          {
            from: { kind: 'stage', stage: 'start' },
            to: { kind: 'state', machine: 'machine-1', state: 'idle' },
          },
        ],
        onUnmapped: 'error',
      },
    })
  })

  test('不存在的 behaviorId → 空引用列表（只读收集不抛错）', () => {
    expect(behaviorReferences(editorState(), target, 'trigger', 'ghost')).toEqual([])
  })
})

describe('P03-G13 sceneHookReferences 与目标存在性', () => {
  test('hook 变体流内的 selectSceneHooks 命令引用：owner/容器/路径完整 locator（旧测只证 shared-script body 容器）', () => {
    const state = editorState()
    // enter-b 变体流内的 selectSceneHooks 选择 enter-b；enter-b 非 initial。
    const refs = sceneHookReferences(state, 's001', 'onEnter', 'enter-b')
    const command = refs.find((ref) => ref.kind === 'command')!
    expect(command.path).toBe(
      'scenes.s001.hooks.onEnter.variants.enter-b.flow.stages.start.body[0]',
    )
    expect(command.locator).toEqual({
      kind: 'command',
      owner: { kind: 'scene-hook', sceneId: 's001', slot: 'onEnter', hookId: 'enter-b' },
      container: { kind: 'step', stepId: 'start', section: 'body' },
      commandPath: '0',
    })
  })

  test('真实非 initial hook：无 initial 引用、恰一命令引用（精确路径）', () => {
    // enter-b 存在于 variants 但 initial 是 enter-a → 查 enter-b 不应产出 initial 引用。
    const refs = sceneHookReferences(editorState(), 's001', 'onEnter', 'enter-b')
    expect(refs.filter((ref) => ref.kind === 'initial')).toHaveLength(0)
    expect(refs.filter((ref) => ref.kind === 'command')).toHaveLength(1)
    expect(refs[0]?.kind).toBe('command')
    expect(refs[0]?.path).toBe(
      'scenes.s001.hooks.onEnter.variants.enter-b.flow.stages.start.body[0]',
    )
  })

  test('destinationExists 三臂：command/entity-page/scene-hook-initial', () => {
    const state = editorState()
    // command 臂：真实 selection 命令存在
    const commandRef = behaviorReferences(state, target, 'trigger', 'talk').find(
      (ref) => ref.kind === 'command',
    )!
    expect(canonicalScriptReferenceDestinationExists(state, commandRef)).toBe(true)
    // entity-page 臂：页面存在
    const pageRef = behaviorReferences(state, target, 'trigger', 'talk').find(
      (ref) => ref.kind === 'page',
    )!
    expect(canonicalScriptReferenceDestinationExists(state, pageRef)).toBe(true)
    // scene-hook-initial 臂：initial 恰为该 hook → true；换成别的 hook id → false
    expect(
      canonicalScriptReferenceDestinationExists(state, {
        kind: 'initial',
        path: 'x',
        locator: {
          kind: 'scene-hook-initial',
          sceneId: 's001',
          slot: 'onEnter',
          hookId: 'enter-a',
        },
      }),
    ).toBe(true)
    expect(
      canonicalScriptReferenceDestinationExists(state, {
        kind: 'initial',
        path: 'x',
        locator: { kind: 'scene-hook-initial', sceneId: 's001', slot: 'onEnter', hookId: 'ghost' },
      }),
    ).toBe(false)
  })
})

describe('P03-G14 中文标签合同（describeScriptCommandOwner / describeCanonicalScriptReference）', () => {
  test('五种 owner 标签：实体行为/场景 hook/战败/物品私有/共享脚本', () => {
    const state = editorState()
    expect(
      describeScriptCommandOwner(state, {
        kind: 'entity-behavior',
        sceneId: 's001',
        entityId: 'e1',
        channel: 'trigger',
        behaviorId: 'talk',
      }),
    ).toBe('场景 s001 / 实体 e1 / 交互脚本“标签-talk”')
    expect(
      describeScriptCommandOwner(state, {
        kind: 'scene-hook',
        sceneId: 's001',
        slot: 'onEnter',
        hookId: 'enter-a',
      }),
    ).toBe('场景 s001 / 进场脚本“进场A”')
    expect(
      describeScriptCommandOwner(state, {
        kind: 'entity-hostile-on-lose',
        sceneId: 's001',
        entityId: 'e1',
      }),
    ).toBe('场景 s001 / 实体 e1 / 战败后脚本')
    expect(
      describeScriptCommandOwner(state, {
        kind: 'item-private-script',
        itemId: 'private',
        ability: 'use',
        scriptId: 'use',
      }),
    ).toBe('物品“私有脚本物品”（private） / 使用脚本')
    expect(
      describeScriptCommandOwner(state, { kind: 'shared-script', scriptId: 'shared/user/lib' }),
    ).toBe('可复用脚本“共享库”')
  })

  test('悬空 id 回退到 id 本身（behavior/hook/item/script 四臂）', () => {
    const state = editorState()
    expect(
      describeScriptCommandOwner(state, {
        kind: 'entity-behavior',
        sceneId: 's001',
        entityId: 'e1',
        channel: 'auto',
        behaviorId: 'ghost',
      }),
    ).toContain('ghost')
    expect(
      describeScriptCommandOwner(state, {
        kind: 'scene-hook',
        sceneId: 's001',
        slot: 'onTeleport',
        hookId: 'ghost',
      }),
    ).toContain('ghost')
    expect(
      describeScriptCommandOwner(state, {
        kind: 'item-private-script',
        itemId: 'ghost',
        ability: 'throw',
        scriptId: 'throw',
      }),
    ).toContain('ghost')
    expect(
      describeScriptCommandOwner(state, { kind: 'shared-script', scriptId: 'shared/ghost' }),
    ).toContain('shared/ghost')
  })

  test('describeCanonicalScriptReference：entity-page 与 scene-hook-initial 两臂文案', () => {
    const state = editorState()
    expect(
      describeCanonicalScriptReference(state, {
        kind: 'page',
        path: 'p',
        locator: {
          kind: 'entity-page',
          sceneId: 's001',
          entityId: 'e1',
          pageId: 'default',
          channel: 'trigger',
        },
      }),
    ).toBe('场景 s001 / 实体 e1 / 页面“默认页” / 使用交互脚本')
    expect(
      describeCanonicalScriptReference(state, {
        kind: 'initial',
        path: 'p',
        locator: {
          kind: 'scene-hook-initial',
          sceneId: 's001',
          slot: 'onEnter',
          hookId: 'enter-a',
        },
      }),
    ).toBe('场景 s001 / 进入场景时默认使用“进场A”')
  })

  test('describeCanonicalScriptReference：合法 onEnter entry.prepare 命令引用整串标签（新轴）', () => {
    const state = editorState()
    // locator 内联构造（与 G12-03 实测引用同形）；describe 是纯标签函数，不依赖收集器。
    expect(
      describeCanonicalScriptReference(state, {
        kind: 'command',
        path: 'scenes.s001.hooks.onEnter.variants.enter-a.flow.machine.states.idle.entry.prepare[0].cursorHandoff.fromBehavior',
        locator: {
          kind: 'command',
          owner: { kind: 'scene-hook', sceneId: 's001', slot: 'onEnter', hookId: 'enter-a' },
          container: { kind: 'state', machineId: 'machine-1', stateId: 'idle', section: 'prepare' },
          commandPath: '0',
        },
      }),
    ).toBe(
      '场景 s001 / 进场脚本“进场A” / 连续流程“巡逻机” / 状态“待机” / 画面出现前 / 第 1 条指令「切换实体脚本方案」',
    )
  })
})
