/** TEST-GLM-WAVE-O-1 O07：作者脚本方言与脚本库 guard 残余合同。
 *  旧证：author-script-core.test.ts / wave2 / guard-residual 覆盖主干；本卡按 gap-map
 *  直击未覆盖臂：未知/退役命令 kind、selection 三态、实体地址、openShop 轴、
 *  loop/startBattle/confirm/teleportOut 嵌套臂、hooks initial/variants、脚本库
 *  self 域、stages/stateMachine flow 结构、world script state cursor。
 */
import { describe, expect, test } from 'vitest'
import {
  checkBaseAuthorCommands,
  checkBaseSceneHooks,
  checkBaseScriptFlow,
  checkBaseScriptLibrary,
} from './author-script-core.js'

const ok = (run: () => unknown): void => expect(run).not.toThrow()
const fails = (run: () => unknown, message: string): void => expect(run).toThrow(message)

const flow = (body: unknown[]): object => ({
  kind: 'stages',
  initial: 'main',
  stages: [{ id: 'main', body }],
})

describe('O07 checkBaseAuthorCommands：kind 域与结构轴', () => {
  test('非数组 / 元素非对象 / kind 非字符串 逐轴拒绝', () => {
    fails(() => checkBaseAuthorCommands('nope', 'p'), 'p: 期望 BaseAuthorCommand[]')
    fails(() => checkBaseAuthorCommands([42], 'p'), 'p[0]: 期望对象')
    fails(() => checkBaseAuthorCommands([{ kind: '' }], 'p'), 'p[0].kind: 期望非空字符串')
  })

  test('退役 kind（jumpScript/setEntityAuto/clearSceneScripts）被拒且报退役', () => {
    for (const kind of ['jumpScript', 'setEntityAuto', 'clearSceneScripts'])
      fails(() => checkBaseAuthorCommands([{ kind }], 'p'), `未知或已退役的 author 命令 ${kind}`)
  })

  test('分支：缺 cond / then 非数组 / else 非数组 逐轴拒绝', () => {
    fails(() => checkBaseAuthorCommands([{ kind: 'branch', then: [] }], 'p'), 'p[0].cond: 期望对象')
    fails(
      () => checkBaseAuthorCommands([{ kind: 'branch', cond: { kind: 'flag', flag: 'f', is: true }, then: 'x' }], 'p'),
      /p\[0\]\.then/,
    )
    ok(() =>
      checkBaseAuthorCommands([
        {
          kind: 'branch',
          cond: { kind: 'flag', flag: 'f', is: true },
          then: [{ kind: 'gameOver' }],
          else: [],
        },
      ]),
    )
  })

  test('loop：mode/cond/body/yield/maxIterations 全键与越界值', () => {
    ok(() =>
      checkBaseAuthorCommands(
        [
          {
            kind: 'loop',
            mode: 'while',
            cond: { kind: 'hasMoney', atLeast: 1 },
            body: [],
            yield: 'worldTick',
            maxIterations: 5,
          },
        ],
        'p',
      ),
    )
    fails(
      () =>
        checkBaseAuthorCommands(
          [
            { kind: 'loop', mode: 'when', cond: { kind: 'allFullHp' }, body: [], yield: 'worldTick', maxIterations: 1 },
          ],
          'p',
        ),
      /loop\.mode|mode/,
    )
    fails(
      () =>
        checkBaseAuthorCommands(
          [
            { kind: 'loop', mode: 'while', cond: { kind: 'allFullHp' }, body: [], yield: 'macroTask', maxIterations: 1 },
          ],
          'p',
        ),
      /yield/,
    )
  })

  test('startBattle：onLose/onFlee 子树递归校验（未知 kind 在子树内报错）', () => {
    fails(
      () =>
        checkBaseAuthorCommands(
          [
            {
              kind: 'startBattle',
              enemyTeamId: 't1',
              onLose: [{ kind: 'jumpScript', script: 'x' }],
            },
          ],
          'p',
        ),
      /未知或已退役的 author 命令 jumpScript/,
    )
    ok(() => checkBaseAuthorCommands([{ kind: 'startBattle', enemyTeamId: 't1' }], 'p'))
  })

  test('confirm：onNo 必填且递归；teleportOut onFail 递归', () => {
    fails(() => checkBaseAuthorCommands([{ kind: 'confirm' }], 'p'), /onNo/)
    ok(() =>
      checkBaseAuthorCommands([
        { kind: 'confirm', onNo: [{ kind: 'fade', dir: 'out' }] },
        { kind: 'teleportOut', onFail: [] },
      ]),
    )
  })

  test('selectEntityBehavior：channel/selection 三态与未知 kind', () => {
    const cmd = (selection: unknown): unknown[] => [
      { kind: 'selectEntityBehavior', target: { scene: 's', entity: 'e' }, channel: 'trigger', selection },
    ]
    ok(() => checkBaseAuthorCommands(cmd({ kind: 'use', value: 'b1' }), 'p'))
    ok(() => checkBaseAuthorCommands(cmd({ kind: 'inherit' }), 'p'))
    ok(() => checkBaseAuthorCommands(cmd({ kind: 'disabled' }), 'p'))
    fails(() => checkBaseAuthorCommands(cmd({ kind: 'wat' }), 'p'), /期望 inherit\|disabled\|use/)
    fails(
      () =>
        checkBaseAuthorCommands(
          [{ kind: 'selectEntityBehavior', target: { scene: 's', entity: 'e' }, channel: 'talk', selection: { kind: 'inherit' } }],
          'p',
        ),
      /channel/,
    )
  })

  test('selectSceneHooks：onEnter/onTeleport 选择值逐轴校验', () => {
    ok(() =>
      checkBaseAuthorCommands(
        [{ kind: 'selectSceneHooks', scene: 's', selection: { onEnter: { kind: 'use', value: 'h1' } } }],
        'p',
      ),
    )
    fails(
      () =>
        checkBaseAuthorCommands(
          [{ kind: 'selectSceneHooks', scene: 's', selection: { onEnter: { kind: 'wat' } } }],
          'p',
        ),
      'p[0].selection.onEnter.kind: 期望 inherit|disabled|use',
    )
  })

  test('openShop：shop 非整数与 mode 非法 逐轴拒绝', () => {
    fails(() => checkBaseAuthorCommands([{ kind: 'openShop', shop: 1.5, mode: 'buy' }], 'p'), /shop/)
    fails(() => checkBaseAuthorCommands([{ kind: 'openShop', shop: 1, mode: 'rob' }], 'p'), /mode/)
    ok(() => checkBaseAuthorCommands([{ kind: 'openShop', shop: 1, mode: 'sell' }], 'p'))
  })

  test('setMultiEntityState / setEntityPosRelParty 形状轴', () => {
    ok(() =>
      checkBaseAuthorCommands([
        { kind: 'setMultiEntityState', targets: [{ scene: 's', entity: 'e' }], state: 2 },
        { kind: 'setEntityPosRelParty', target: { scene: 's', entity: 'e' }, dcol: 1, drow: -1 },
      ]),
    )
    fails(
      () => checkBaseAuthorCommands([{ kind: 'setMultiEntityState', targets: 'x', state: 2 }], 'p'),
      /targets/,
    )
  })
})

describe('O07 checkBaseScriptFlow：stages 与 stateMachine', () => {
  test('stages：空 stages / 重复 stage id / 未知 next 逐轴拒绝', () => {
    ok(() => checkBaseScriptFlow(flow([]), 'p'))
    fails(
      () => checkBaseScriptFlow({ kind: 'stages', initial: 'main', stages: [] }, 'p'),
      'p.stages: 期望非空数组',
    )
    fails(
      () =>
        checkBaseScriptFlow(
          {
            kind: 'stages',
            initial: 'main',
            stages: [
              { id: 'main', body: [], next: 'nowhere' },
            ],
          },
          'p',
        ),
      /next/,
    )
    fails(
      () =>
        checkBaseScriptFlow(
          {
            kind: 'stages',
            initial: 'ghost',
            stages: [{ id: 'main', body: [], next: 'main' }],
          },
          'p',
        ),
      /initial/,
    )
  })

  test('stateMachine：initial/states/next 结构与 branch transition 递归', () => {
    ok(() =>
      checkBaseScriptFlow(
        {
          kind: 'stateMachine',
          machine: {
            id: 'm',
            label: 'l',
            initial: 'a',
            states: {
              a: {
                label: 'a',
                body: [],
                next: {
                  kind: 'branch',
                  cond: { kind: 'flag', flag: 'f', is: true },
                  then: { kind: 'stay' },
                  else: { kind: 'restart' },
                },
              },
            },
          },
        },
        'p',
      ),
    )
    fails(
      () =>
        checkBaseScriptFlow(
          {
            kind: 'stateMachine',
            machine: {
              id: 'm',
              label: 'l',
              initial: 'ghost',
              states: { a: { label: 'a', body: [], next: { kind: 'stay' } } },
            },
          },
          'p',
        ),
      /initial/,
    )
  })
})

describe('O07 checkBaseSceneHooks：channel/initial/variants', () => {
  const hooks = (over: object): unknown => ({
    onEnter: { initial: 'h1', variants: { h1: { label: 'h', order: 0, flow: flow([]) } }, ...over },
  })

  test('合法单钩子通过；未知 initial 拒绝', () => {
    ok(() => checkBaseSceneHooks(hooks({}), 'p'))
    fails(
      () => checkBaseSceneHooks(hooks({ initial: 'ghost' }), 'p'),
      'p.onEnter.initial: 未命中 hook ghost',
    )
  })

  test('空 variants / 非法 order / 未知字段 逐轴拒绝', () => {
    fails(
      () => checkBaseSceneHooks({ onEnter: { variants: {} } }, 'p'),
      'p.onEnter.variants: 不能为空',
    )
    fails(
      () =>
        checkBaseSceneHooks(
          { onEnter: { variants: { h1: { label: 'h', order: -1, flow: flow([]) } } } },
          'p',
        ),
      /order: 期望非负整数/,
    )
    fails(
      () =>
        checkBaseSceneHooks(
          { onEnter: { variants: { h1: { label: 'h', order: 0, flow: flow([]), extra: 1 } } } },
          'p',
        ),
      /未知字段/,
    )
  })

  test('onTeleport 钩子走同域校验且禁 scene-entry 命令', () => {
    ok(() =>
      checkBaseSceneHooks(
        { onTeleport: { variants: { h1: { label: 'h', order: 0, flow: flow([]) } } } },
        'p',
      ),
    )
  })
})

describe('O07 checkBaseScriptLibrary：self 域与 body', () => {
  const script = (over: object): unknown => ({
    name: '共享脚本',
    self: 'none',
    body: [],
    ...over,
  })

  test('self 三态合法 / 非法值拒绝', () => {
    for (const self of ['none', 'optional', 'required'] as const)
      ok(() => checkBaseScriptLibrary({ s: script({ self }) }))
    fails(() => checkBaseScriptLibrary({ s: script({ self: 'maybe' }) }), /self: 期望 none\|optional\|required/)
  })

  test('坏 body / description 非字符串 / 未知字段 逐轴拒绝', () => {
    fails(() => checkBaseScriptLibrary({ s: script({ body: 'x' }) }), /s\.body/)
    fails(
      () => checkBaseScriptLibrary({ s: script({ description: 3 }) }),
      /description: 期望 string/,
    )
    fails(() => checkBaseScriptLibrary({ s: script({ wat: 1 }) }), /未知字段/)
  })

  test('callScript 引用形状（script 稳定 id 字符串）', () => {
    ok(() => checkBaseScriptLibrary({ s: script({ body: [{ kind: 'callScript', script: 's' }] }) }))
    fails(
      () => checkBaseScriptLibrary({ s: script({ body: [{ kind: 'callScript', script: 3 }] }) }),
      /script/,
    )
  })
})
