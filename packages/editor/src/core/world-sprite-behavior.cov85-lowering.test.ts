/**
 * TEST-COVERAGE85-GLM-EDITOR-1 批1a：world-sprite-behavior 只读投影 lowering 残臂。
 *
 * fullName 排重（旧文件已证，不复制）：
 * - world-sprite-behavior.wave2.test.ts：实体叶命令全参 lowering、until/while/not/any 条件
 *   保留、shared callScript self 兼容/异己/缺失、initial 排序与 next 下标映射。
 * - world-sprite-behavior.kimi-workflows.test.ts：projectCanonicalSpritePreviewState 壳层
 *   保留/共享 chunk 注入；describeSpriteReferenceBehavior owner 分类。
 * 本文件只补 coverage 实测仍缺的臂（cov-base/coverage-final.json 逐分支对照）：
 * startBattle onLose/onFlee 嵌套 lowering、teleportOut onFail、setEntityTriggerActivation
 * inherit/use(range 有无)、select* 丢弃、超预算 repeat 保留作者节点、空 repeat 丢弃、
 * playEntityAction startAtMs/wait 与 mountParty dx/dy 可选参透传、entitiesNear/all 条件
 * lowering、initial stage entry prepare/reveal 投影。全部经 checkAuthorScriptFlow 合法化
 * 后调公开 projectCanonicalScriptFlowPreview，断言精确投影业务结果并复核输入隔离。
 */
import type { AuthorCommand, AuthorScriptLibrary } from '@type-pal/content'
import { checkAuthorScriptFlow } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  projectCanonicalScriptFlowPreview,
  SCRIPT_PREVIEW_SHARED_CHUNK,
} from './world-sprite-behavior.js'

const self = { scene: 's1', entity: 'a' }

function legalFlow(body: readonly AuthorCommand[]) {
  const flow = { kind: 'stages', initial: 'main', stages: [{ id: 'main', body }] }
  checkAuthorScriptFlow(flow, 'cov85.lowering.flow')
  return flow
}

function lowered(
  body: readonly AuthorCommand[],
): ReturnType<typeof projectCanonicalScriptFlowPreview> {
  return projectCanonicalScriptFlowPreview(legalFlow(body), self, {})
}

test('cov85-lowering startBattle：onLose/onFlee 递归 lowering，缺席臂不产出键', () => {
  const output = lowered([
    {
      kind: 'startBattle',
      enemyTeamId: 'team-1',
      onLose: [
        { kind: 'setEntityFrame', target: self, frame: 3 },
        { kind: 'branch', cond: { kind: 'chance', percent: 40 }, then: [{ kind: 'wait', ms: 5 }] },
      ],
      onFlee: [{ kind: 'wait', ms: 9 }],
    },
    { kind: 'startBattle', enemyTeamId: 'team-2' },
  ])
  const before = JSON.stringify(output)
  expect(output).toEqual([
    {
      body: [
        {
          kind: 'startBattle',
          enemyTeamId: 'team-1',
          onLose: [
            { kind: 'setEntityFrame', entity: 'a', frame: 3 },
            {
              kind: 'branch',
              cond: { kind: 'chance', percent: 40 },
              then: [{ kind: 'wait', ms: 5 }],
            },
          ],
          onFlee: [{ kind: 'wait', ms: 9 }],
        },
        { kind: 'startBattle', enemyTeamId: 'team-2' },
      ],
    },
  ])
  expect(before).toBe(JSON.stringify(output))
})

test('cov85-lowering teleportOut：onFail 嵌套 lowering，裸 teleportOut 保持裸形态', () => {
  expect(
    lowered([
      { kind: 'teleportOut', onFail: [{ kind: 'setEntityFacing', target: self, facing: 'left' }] },
      { kind: 'teleportOut' },
    ]),
  ).toEqual([
    {
      body: [
        { kind: 'teleportOut', onFail: [{ kind: 'setEntityFacing', entity: 'a', facing: 'left' }] },
        { kind: 'teleportOut' },
      ],
    },
  ])
})

test('cov85-lowering setEntityTriggerActivation：inherit 丢弃，use 带/不带 range 两形', () => {
  expect(
    lowered([
      {
        kind: 'setEntityTriggerActivation',
        target: self,
        selection: { kind: 'inherit' },
      },
      {
        kind: 'setEntityTriggerActivation',
        target: self,
        selection: { kind: 'use', value: { on: 'touch', range: 2 } },
      },
      {
        kind: 'setEntityTriggerActivation',
        target: self,
        selection: { kind: 'use', value: { on: 'interact' } },
      },
    ]),
  ).toEqual([
    {
      body: [
        { kind: 'setEntityTriggerMode', entity: 'a', on: 'touch', range: 2 },
        { kind: 'setEntityTriggerMode', entity: 'a', on: 'interact' },
      ],
    },
  ])
})

test('cov85-lowering selectEntityBehavior/selectEntityPage/selectSceneHooks 只改选择不进演出', () => {
  expect(
    lowered([
      {
        kind: 'selectEntityBehavior',
        target: self,
        channel: 'auto',
        selection: { kind: 'use', value: 'idle' },
      },
      { kind: 'selectEntityPage', target: self, selection: { kind: 'use', value: 'main' } },
      {
        kind: 'selectSceneHooks',
        scene: 's1',
        selection: { onEnter: { kind: 'use', value: 'hook-1' } },
      },
      { kind: 'wait', ms: 1 },
    ]),
  ).toEqual([{ body: [{ kind: 'wait', ms: 1 }] }])
})

test('cov85-lowering 超预算 repeat 保留作者原节点供安全图拒绝，空 repeat 直接丢弃', () => {
  const oversized: AuthorCommand = { kind: 'repeat', count: 5000, body: [{ kind: 'wait', ms: 1 }] }
  checkAuthorScriptFlow(
    { kind: 'stages', initial: 'main', stages: [{ id: 'main', body: [oversized] }] },
    'cov85.lowering.oversized',
  )
  const output = projectCanonicalScriptFlowPreview(
    { kind: 'stages', initial: 'main', stages: [{ id: 'main', body: [oversized] }] },
    self,
    {},
  )
  // 5000×1 > 4096：不展开，原样保留（后续 validateVisualCommandGraph 会拒绝该节点）。
  expect(output).toEqual([{ body: [oversized] }])
  expect(lowered([{ kind: 'repeat', count: 3, body: [] }])).toEqual([{ body: [] }])
})

test('cov85-lowering playEntityAction/mountParty 可选参：显式才透传，缺省省键', () => {
  expect(
    lowered([
      {
        kind: 'playEntityAction',
        target: self,
        sprite: 'sprite.x',
        action: 'open',
        loop: true,
        startAtMs: 120,
        wait: true,
      },
      { kind: 'playEntityAction', target: self, sprite: 'sprite.x', action: 'open', loop: false },
      { kind: 'mountParty', target: self, dx: 1, dy: -1 },
      { kind: 'mountParty', target: self },
    ]),
  ).toEqual([
    {
      body: [
        {
          kind: 'playEntityAction',
          entity: 'a',
          sprite: 'sprite.x',
          action: 'open',
          loop: true,
          startAtMs: 120,
          wait: true,
        },
        { kind: 'playEntityAction', entity: 'a', sprite: 'sprite.x', action: 'open', loop: false },
        { kind: 'mountParty', entity: 'a', dx: 1, dy: -1 },
        { kind: 'mountParty', entity: 'a' },
      ],
    },
  ])
})

test('cov85-lowering 条件 lowering：entitiesNear 展开 from/to，all 递归子条件', () => {
  const from = { scene: 's1', entity: 'a' }
  const to = { scene: 's1', entity: 'b' }
  const output = lowered([
    {
      kind: 'branch',
      cond: { kind: 'entitiesNear', from, to, range: 3 },
      then: [{ kind: 'wait', ms: 1 }],
    },
    {
      kind: 'branch',
      cond: {
        kind: 'all',
        of: [
          { kind: 'entitiesNear', from, to, range: 1 },
          { kind: 'entityInScene', target: to },
        ],
      },
      then: [{ kind: 'wait', ms: 2 }],
    },
  ])
  expect(output).toEqual([
    {
      body: [
        {
          kind: 'branch',
          cond: { kind: 'entitiesNear', from: 'a', to: 'b', range: 3 },
          then: [{ kind: 'wait', ms: 1 }],
        },
        {
          kind: 'branch',
          cond: {
            kind: 'all',
            of: [
              { kind: 'entitiesNear', from: 'a', to: 'b', range: 1 },
              { kind: 'entityInScene', entity: 'b' },
            ],
          },
          then: [{ kind: 'wait', ms: 2 }],
        },
      ],
    },
  ])
})

test('cov85-lowering onEnter initial stage 的 entry：prepare 命令逐条 lowering，reveal 原样克隆', () => {
  const flow = {
    kind: 'stages',
    initial: 'main',
    stages: [
      {
        id: 'main',
        entry: {
          prepare: [
            { kind: 'setEntityFrame', target: self, frame: 2 },
            { kind: 'setEntityFacing', target: self, facing: 'up' },
          ],
          reveal: { kind: 'fade', outMs: 100, inMs: 200 },
        },
        body: [{ kind: 'wait', ms: 3 }],
      },
    ],
  }
  checkAuthorScriptFlow(flow, 'cov85.lowering.entry', { allowSceneEntry: true })
  const before = structuredClone(flow)
  expect(projectCanonicalScriptFlowPreview(flow, self, {})).toEqual([
    {
      entry: {
        prepare: [
          { kind: 'setEntityFrame', entity: 'a', frame: 2 },
          { kind: 'setEntityFacing', entity: 'a', facing: 'up' },
        ],
        reveal: { kind: 'fade', outMs: 100, inMs: 200 },
      },
      body: [{ kind: 'wait', ms: 3 }],
    },
  ])
  expect(flow).toEqual(before)
})

test('cov85-lowering shared callScript 在 entry prepare 中同样按兼容 self 折叠到共享 chunk', () => {
  const shared: AuthorScriptLibrary = {
    wave: { name: '挥手', self: 'none', body: [{ kind: 'wait', ms: 5 }] },
  }
  const flow = {
    kind: 'stages',
    initial: 'main',
    stages: [
      {
        id: 'main',
        entry: {
          prepare: [{ kind: 'callScript', script: 'wave' }],
          reveal: { kind: 'cut' },
        },
        body: [],
      },
    ],
  }
  checkAuthorScriptFlow(flow, 'cov85.lowering.entryCall', { allowSceneEntry: true })
  expect(projectCanonicalScriptFlowPreview(flow, self, shared)).toEqual([
    {
      entry: {
        prepare: [{ kind: 'callScript', ref: { chunk: SCRIPT_PREVIEW_SHARED_CHUNK, id: 'wave' } }],
        reveal: { kind: 'cut' },
      },
      body: [],
    },
  ])
})
