import { describe, expect, test } from 'vitest'
import { makeTestWorld } from '../test-fixtures.js'
import { buildMeta, buildPayload } from './ops.js'
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
})
