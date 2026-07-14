import { describe, expect, test } from 'vitest'
import { makeTestWorld } from '../test-fixtures.js'
import { buildMeta, buildPayload, normalizePayload } from './ops.js'
import { SAVE_VERSION } from './types.js'

describe('save ops（纯）', () => {
  test('buildMeta：队伍名+等级快照、kind、注入 now', () => {
    const w = makeTestWorld()
    const m = buildMeta('m01', w, '鬼界·民居', (c) => `名:${c.template}`, 999)
    expect(m).toEqual({
      slotId: 'm01',
      kind: 'manual',
      party: w.party.map((c) => ({ name: `名:${c.template}`, level: c.level })),
      mapName: '鬼界·民居',
      savedAt: 999,
    })
  })
  test('buildPayload：version + projectId/contentVersion + world + position', () => {
    const w = makeTestWorld()
    const pos = { col: 1, row: 2, height: 0 }
    const p = buildPayload(w, { sceneId: 's', pos, facing: 'down' }, 'demo', 1)
    expect(p.version).toBe(SAVE_VERSION)
    expect(p.projectId).toBe('demo')
    expect(p.contentVersion).toBe(1)
    expect(p.world).toBe(w)
    expect(p.position).toEqual({ sceneId: 's', pos, facing: 'down' })
  })
  test('normalizePayload:结构补默认(旧档缺容器字段/新增 luck)不动既有值', () => {
    const w = makeTestWorld()
    const p = buildPayload(
      w,
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'demo',
      1,
    )
    // 模拟"引擎加字段前的旧档":抹掉后加字段(结构演进,非数值污染)
    const c = p.world.party[0]! as unknown as Record<string, unknown>
    delete c.hiddenExp
    delete c.tags
    delete c.luck
    const beforeHp = p.world.party[0]!.hp
    const n = normalizePayload(p)
    expect(n.world.party[0]!.hiddenExp).toEqual({})
    expect(n.world.party[0]!.tags).toEqual([])
    expect(n.world.party[0]!.luck).toBe(0)
    expect(n.world.party[0]!.hp).toBe(beforeHp) // 既有值不动(不做旧档数值复原)
  })
  test('normalizePayload:格式新于引擎 → 抛(宁拒不猜)', () => {
    const w = makeTestWorld()
    const p = buildPayload(
      w,
      { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'demo',
      1,
    )
    p.version = SAVE_VERSION + 1
    expect(() => normalizePayload(p)).toThrow(/新于引擎/)
  })
  test('normalizePayload:新版稳定地图覆写原样保留', () => {
    const p = buildPayload(
      makeTestWorld(),
      { sceneId: 's230', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      2,
    )
    p.world.script = {
      flags: {},
      vars: {},
      entityState: {},
      entityStage: {},
      mapOverride: { s230: 'map-056' },
    }
    expect(normalizePayload(p).world.script?.mapOverride).toEqual({ s230: 'map-056' })
  })
  test('normalizePayload:旧数字地图覆写明确拒绝，不猜成稳定地图 ID', () => {
    const p = buildPayload(
      makeTestWorld(),
      { sceneId: 's230', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
      'pal',
      1,
    )
    p.world.script = {
      flags: {},
      vars: {},
      entityState: {},
      entityStage: {},
      mapOverride: { s230: 'map-056' },
    }
    ;(p.world.script.mapOverride as unknown as Record<string, unknown>).s230 = 56
    expect(() => normalizePayload(p)).toThrow(
      /旧存档 world\.script\.mapOverride\[s230\].*数字地图编号 56/,
    )
  })
})
