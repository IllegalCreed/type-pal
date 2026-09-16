/**
 * TEST-FOUNDATION-COVERAGE-1 B3：validateAuthorItemCore 用途组合边界（validate.ts:1329-1360）。
 * 既有 validate-author.test.ts 已覆盖共享 ScriptRef/单私有槽组合/旧 ScriptRef 拒绝/外部效果与
 * 场景目标合同；本文件补 item-private 槽唯一门、battleOnly 上下文门与合法组合正控。
 */
import { describe, expect, test } from 'vitest'
import { validateAuthorItemCore } from './validate.js'

const privateScript = {
  kind: 'itemPrivateScript' as const,
  script: {
    id: 'use' as const,
    label: '使用',
    body: [{ kind: 'setFlag' as const, flag: 'used', value: true }],
  },
}
const item = (use: unknown) => ({
  id: 'item',
  name: '测试物品',
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  use,
})

describe('validateAuthorItemCore · item-private 槽唯一门', () => {
  test('两个 itemPrivateScript 效果拒绝', () => {
    expect(() =>
      validateAuthorItemCore([
        item({
          target: 'scene',
          consuming: false,
          effects: [privateScript, privateScript],
        }),
      ]),
    ).toThrow(/item-private use 槽只能出现一次/)
  })
})

describe('validateAuthorItemCore · battleOnly 上下文门', () => {
  test('battleOnly 用途包含不可用于战斗的效果（runScript 世界专用）拒绝', () => {
    expect(() =>
      validateAuthorItemCore([
        item({
          target: 'scene',
          consuming: false,
          battleOnly: true,
          effects: [{ kind: 'runScript', script: 'shared/user/teleport' }],
        }),
      ]),
    ).toThrow(/battleOnly 用途包含不可用于战斗的效果/)
  })
  test('battleOnly + 战斗可用效果（healHp）合法', () => {
    expect(() =>
      validateAuthorItemCore([
        item({
          target: 'oneAlly',
          consuming: true,
          battleOnly: true,
          effects: [{ kind: 'healHp', amount: 1 }],
        }),
      ]),
    ).not.toThrow()
  })
  test('纯世界效果（runScript）非 battleOnly 合法', () => {
    expect(() =>
      validateAuthorItemCore([
        item({
          target: 'scene',
          consuming: false,
          effects: [{ kind: 'runScript', script: 'shared/user/teleport' }],
        }),
      ]),
    ).not.toThrow()
  })
})
