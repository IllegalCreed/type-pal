import { initialWorld } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildMeta, buildPayload } from './ops.js'
import { SAVE_VERSION } from './types.js'

describe('save ops（纯）', () => {
  test('buildMeta：队伍名+等级快照、kind、注入 now', () => {
    const w = initialWorld()
    const m = buildMeta('m01', w, '鬼界·民居', (c) => `名:${c.template}`, 999)
    expect(m).toEqual({
      slotId: 'm01',
      kind: 'manual',
      party: w.party.map((c) => ({ name: `名:${c.template}`, level: c.level })),
      mapName: '鬼界·民居',
      savedAt: 999,
    })
  })
  test('buildPayload：version=SAVE_VERSION + world + position', () => {
    const w = initialWorld()
    const p = buildPayload(w, { sceneId: 's', x: 1, y: 2, facing: 'down' })
    expect(p.version).toBe(SAVE_VERSION)
    expect(p.world).toBe(w)
    expect(p.position).toEqual({ sceneId: 's', x: 1, y: 2, facing: 'down' })
  })
})
