/**
 * TEST-GLM-CONTENT-GUARDS-3 G2：checkWorldScriptState 残差。
 * 去重：author-script-core.test.ts 'canonical author script schema' 前四条已证
 * 组合实体映射正控、持久 selection 与 owner-bound cursor、inherit 拒绝、
 * vars NaN / 扁平 entityState / 未知字段——本文件只补冻结池内 flags 布尔叶、
 * 嵌套 entityState/entityPos/entityLayer 数值叶、followers 数组门、
 * cursor.at kind 叶与 mapOverride 空串叶。不测运行时读档政策。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import { checkWorldScriptState, emptyWorldScriptState } from './author-script-core.js'

describe('G2 world script state 残差', () => {
  test('空状态与全量合法状态（含 follower/mapOverride/双型 cursor）通过且输入保真', () => {
    expectAcceptsUnchanged((value) => checkWorldScriptState(value), emptyWorldScriptState())
    const full = {
      flags: { opened: true },
      vars: { visits: 2 },
      entityState: { s001: { e1: 3 } },
      entityPos: { s001: { e1: { col: 4, row: 5, height: 0 } } },
      entityLayer: { s001: { e1: 7 } },
      behaviors: {
        entities: {
          s001: {
            e1: {
              page: 'default',
              trigger: {
                selection: { kind: 'use', value: 'talk' },
                cursor: {
                  behavior: 'talk',
                  at: { kind: 'state', machine: 'conversation', state: 'waiting' },
                },
              },
            },
          },
        },
      },
      followers: ['sprite-82'],
      mapOverride: { s001: 'map-001' },
    }
    expectAcceptsUnchanged((value) => checkWorldScriptState(value), full)
  })

  test.each([
    ['flags 非布尔', { flags: { opened: 'yes' } }, 'world.script.flags.opened: 期望 boolean'],
    [
      'entityState 嵌套值非整数',
      { entityState: { s001: { e1: 1.5 } } },
      'world.script.entityState.s001.e1: 期望有限整数',
    ],
    [
      'entityPos 轴非有限数',
      { entityPos: { s001: { e1: { col: Number.NaN, row: 1, height: 0 } } } },
      'world.script.entityPos.s001.e1.col: 期望有限数',
    ],
    [
      'entityLayer 非整数',
      { entityLayer: { s001: { e1: 1.5 } } },
      'world.script.entityLayer.s001.e1: 期望有限整数',
    ],
    ['followers 非数组', { followers: 'sprite-82' }, 'world.script.followers: 期望 string[]'],
    [
      'mapOverride 空串',
      { mapOverride: { s001: '' } },
      'world.script.mapOverride.s001: 期望非空字符串',
    ],
  ] as const)('%s拒绝且实际输入不变', (_label, over, error) => {
    expectAcceptsUnchanged((value) => checkWorldScriptState(value), emptyWorldScriptState())
    const bad = { ...emptyWorldScriptState(), ...over }
    const before = deepSnapshot(bad)
    expectExactError(() => checkWorldScriptState(bad), error)
    expect(bad).toEqual(before)
  })

  test('behavior 槽 cursor.at 非法 kind 拒绝', () => {
    const control = {
      ...emptyWorldScriptState(),
      behaviors: {
        entities: {
          s001: {
            e1: {
              page: 'default',
              trigger: {
                cursor: { behavior: 'talk', at: { kind: 'stage', stage: 'revealed' } },
              },
            },
          },
        },
      },
    }
    expectAcceptsUnchanged((value) => checkWorldScriptState(value), control)
    const bad = {
      ...emptyWorldScriptState(),
      behaviors: {
        entities: {
          s001: {
            e1: {
              page: 'default',
              trigger: {
                cursor: { behavior: 'talk', at: { kind: 'bogus' } },
              },
            },
          },
        },
      },
    }
    const before = deepSnapshot(bad)
    expectExactError(
      () => checkWorldScriptState(bad),
      'world.script.behaviors.entities.s001.e1.trigger.cursor.at.kind: 期望 stage|state',
    )
    expect(bad).toEqual(before)
  })
})
