/** TEST-GLM-NEW-J-1 J05：migrate-enemies 报告形状与脚本计数臂（合成输入）。
 * 旧证：migrate-enemies.test.ts（真实提取源 census）+ migrate-enemies.wave2.test.ts
 * （合成 stats/fallback/dangling/队槽）均只用默认 reportHookSources=true 且零脚本对象；
 * `withScript` 计数、`reportHookSources=false` 的 v9 报告形状（无 hookSources 键）、
 * `teamSlug` 稳定 id 与无 tctx 缺省音效解析在旧测试零断言。纯函数，不 mock 被测核心。
 */
import { expect, test } from 'vitest'
import { sourceEnemy, sourceObject } from './__tests__/coverage-wave2/f-enemies-source.js'
import { enemySlug, mapEnemies, teamSlug } from './migrate-enemies.js'

test('三入口脚本指针使 withScript 计数；无 tctx 缺省翻译仍产出实例 fallback 但无 hooks', () => {
  const result = mapEnemies([sourceEnemy()], [sourceObject({ scriptOnReady: 5 })])
  expect(result.report.withScript).toBe(1)
  expect(result.report.hookSources).toEqual([])
  const enemy = result.enemies[0]!
  expect(enemy.ai).toEqual({
    resistanceToSorcery: 3,
    fallback: { action: { kind: 'cast', skillId: '9' }, chancePercent: 50 },
  })
  expect(enemy.ai.hooks).toBeUndefined()
  expect(enemy).not.toHaveProperty('choreography')
  expect(enemy).not.toHaveProperty('onDefeated')
})

test('reportHookSources=false 输出 v9 报告形状：无 hookSources 键（toEqual 精确）', () => {
  const result = mapEnemies([sourceEnemy()], [sourceObject()], undefined, undefined, false)
  expect(result.report).toEqual({
    total: 1,
    withScript: 0,
    danglingEnemyId: [],
    pendingScripts: [],
  })
})

test('缺省音效解析：无 tctx 时正号走 palSoundAssetId，负号拆绝对 id + 抑制语义', () => {
  const result = mapEnemies([sourceEnemy()], [sourceObject()])
  expect(result.enemies[0]!.sounds).toEqual({
    attack: 'sound.pal.001',
    action: 'sound.pal.002',
    magic: 'sound.pal.003',
    death: 'sound.pal.004',
    call: 'sound.pal.005',
    suppressMagicEffectSound: true,
  })
})

test('enemySlug/teamSlug 稳定 id 形状（与 startBattle/enemyTeamId 的 join 键）', () => {
  expect(enemySlug(398)).toBe('enemy-398')
  expect(teamSlug(7)).toBe('team-7')
  expect(mapEnemies([], [], undefined, undefined, false).report.total).toBe(0)
})
