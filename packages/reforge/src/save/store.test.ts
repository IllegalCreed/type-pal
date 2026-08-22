import { emptyWorldScriptState, type WorldState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { makeTestWorld } from '../test-fixtures.js'
import { MemorySaveStore } from './store.js'
import { SAVE_VERSION, type CurrentSavePayload, type SaveMeta } from './types.js'

function meta(slotId: string): SaveMeta {
  return {
    slotId,
    kind: 'manual',
    party: [{ name: '李逍遥', level: 1 }],
    mapName: '鬼界·民居',
    savedAt: 123,
  }
}
function payload(): CurrentSavePayload {
  const world: WorldState = {
    ...makeTestWorld(),
    script: emptyWorldScriptState(),
    entityLifecycles: {},
  }
  return {
    version: SAVE_VERSION,
    projectId: 'demo',
    contentVersion: 17,
    world,
    position: { sceneId: 's', pos: { col: 1, row: 2, height: 0 }, facing: 'down' },
  }
}

describe('MemorySaveStore', () => {
  test('putSlot → listMeta/getPayload/getThumb 往返', async () => {
    const s = new MemorySaveStore()
    expect(await s.listMeta()).toEqual([])
    const written = payload()
    await s.putSlot(meta('m01'), written, new Blob(['png']))
    expect((await s.listMeta()).map((m) => m.slotId)).toEqual(['m01'])
    expect((await s.getPayload('m01'))?.world).toEqual(written.world)
    expect(await s.getThumb('m01')).toBeInstanceOf(Blob)
  })
  test('缺失槽 → null', async () => {
    const s = new MemorySaveStore()
    expect(await s.getPayload('m99')).toBe(null)
    expect(await s.getThumb('m99')).toBe(null)
  })
  test('覆盖写：同槽 putSlot 二次 → listMeta 仍 1 条、payload 更新', async () => {
    const s = new MemorySaveStore()
    await s.putSlot(meta('m01'), payload(), new Blob(['a']))
    const p2 = payload()
    p2.position.pos.col = 99
    await s.putSlot(meta('m01'), p2, new Blob(['b']))
    expect(await s.listMeta()).toHaveLength(1)
    expect((await s.getPayload('m01'))?.position.pos.col).toBe(99)
  })
})
