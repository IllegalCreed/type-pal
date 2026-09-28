/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R20（reforge/battle-trial-config.ts 窄入口 +
 * battle-launch-preparation.ts 的 isBattleAbort 分类）。
 * 去重账：wave2 测试已覆盖 parse* 组合与 trialObject/abortableTrial/createTrialFileSnapshot；
 * 本文件只做未占用合同：trialInteger/trialBoolean/trialId 原语校验（合法值回读 + 带.where
 * 的拒绝消息）与 isBattleAbort 错误分类矩阵（trialAbortError 组合）。
 */
import { describe, expect, test } from 'vitest'
import { isBattleAbort } from './battle/battle-launch-preparation.js'
import { trialAbortError } from './battle-trial-assets.js'
import { trialBoolean, trialId, trialInteger } from './battle-trial-config.js'

describe('R20 trial 原语校验器', () => {
  test('trialInteger：合法回读；非整数/越界拒绝且消息带 where 与范围', () => {
    expect(trialInteger(5, 0, 10, 'trial.hp')).toBe(5)
    expect(() => trialInteger(5.5, 0, 10, 'trial.hp')).toThrow('trial.hp: 期望0～10的整数')
    expect(() => trialInteger(-1, 0, 10, 'trial.hp')).toThrow('期望0～10的整数')
    expect(() => trialInteger(11, 0, 10, 'trial.hp')).toThrow('期望0～10的整数')
    expect(() => trialInteger('7', 0, 10, 'trial.hp')).toThrow('期望0～10的整数')
  })

  test('trialBoolean：true/false 回读；非布尔拒绝带 where', () => {
    expect(trialBoolean(true, 'trial.flags.mute')).toBe(true)
    expect(trialBoolean(false, 'trial.flags.mute')).toBe(false)
    expect(() => trialBoolean(1, 'trial.flags.mute')).toThrow('trial.flags.mute: 期望布尔值')
  })

  test('trialId：非空无首尾空白回读；空串/带空白/非字符串拒绝', () => {
    expect(trialId('hero-1', 'trial.party[0].id')).toBe('hero-1')
    expect(() => trialId('', 'trial.party[0].id')).toThrow('期望非空、无首尾空白的稳定ID')
    expect(() => trialId(' hero ', 'trial.party[0].id')).toThrow('期望非空、无首尾空白的稳定ID')
    expect(() => trialId(7, 'trial.party[0].id')).toThrow('期望非空、无首尾空白的稳定ID')
  })
})

describe('R20 isBattleAbort 分类矩阵', () => {
  test('AbortError 名分类：trialAbortError/DOMException 真；普通错误/字符串/null 假', () => {
    expect(isBattleAbort(trialAbortError())).toBe(true)
    expect(isBattleAbort(new DOMException('x', 'AbortError'))).toBe(true)
    expect(isBattleAbort(new Error('普通失败'))).toBe(false)
    expect(isBattleAbort('AbortError')).toBe(false)
    expect(isBattleAbort(null)).toBe(false)
  })
})
