import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import { createInitialGameState } from '../core/game-state.js'
import type { EventKind } from './minimap.js'
import {
  BASE_PX,
  classifyTrigger,
  collectEventKinds,
  collectMinimapData,
  computeView,
  worldToThumb,
} from './minimap.js'

// 独立取bootstrap的640输出/2080世界宽;不从被测BASE_PX反推oracle。
const SCALE = 640 / 2080

describe('worldToThumb', () => {
  it('世界像素 → 底图像素((wx+16)*SCALE)', () => {
    const [x0, y0] = worldToThumb(0, 0)
    expect(x0).toBeCloseTo(16 * SCALE, 6)
    expect(y0).toBeCloseTo(16 * SCALE, 6)
    const [x1, y1] = worldToThumb(2032, 2032)
    expect(x1).toBeCloseTo(2048 * SCALE, 4)
    expect(y1).toBeCloseTo(2048 * SCALE, 4)
    expect(x1).toBeLessThanOrEqual(BASE_PX)
    // 原L18几何例的(320,0)/单调与原点六位精度逐断言迁入此主合同。
    const [x320] = worldToThumb(320, 0)
    expect(x320).toBeGreaterThan(x0)
    expect(x320).toBeCloseTo(336 * SCALE, 6)
  })
})

describe('computeView', () => {
  it('视野>=全图 → 全图(sx=sy=0,sw=BASE_PX)', () => {
    expect(computeView(2080, 1024, 1024)).toEqual({ sx: 0, sy: 0, sw: 640 })
  })
  it('缩放档以主角为中心(960 世界px → 1/3 框),clamp 在底图内', () => {
    // 640/2080=4/13;中心(1040,1040)*4/13=(320,320),半宽1920/13。
    const v = computeView(960, 1024, 1024)
    expect(v.sw).toBeCloseTo(3840 / 13, 6)
    expect(v.sx).toBeCloseTo(2240 / 13, 6)
    expect(v.sy).toBeCloseTo(2240 / 13, 6)
    // 独立的y中心输入,避免x/y被错用时因对称夹具互相掩盖。
    const offset = computeView(960, 1024, 512)
    expect(offset.sx).toBeCloseTo(2240 / 13, 6)
    expect(offset.sy).toBeCloseTo(192 / 13, 6)
    expect(offset.sw).toBeCloseTo(3840 / 13, 6)
  })
  it('主角在边角 → clamp 不越界(sx>=0, sx+sw<=BASE_PX)', () => {
    const near = computeView(640, 0, 0)
    expect(near.sx).toBe(0)
    expect(near.sy).toBe(0)
    expect(near.sw).toBeCloseTo(2560 / 13, 6)
    const far = computeView(640, 2048, 2048)
    expect(far.sx).toBeCloseTo(5760 / 13, 6)
    expect(far.sy).toBeCloseTo(5760 / 13, 6)
    expect(far.sw).toBeCloseTo(2560 / 13, 6)
    expect(far.sx + far.sw).toBeCloseTo(640, 6)
    expect(far.sy + far.sw).toBeCloseTo(640, 6)
  })
})

const cmds = (...c: Command[]): Command[] => c
const give = (count: number, name?: string): Command => ({
  op: 'giveItem',
  itemId: 10,
  count,
  _item: name,
})
const end = (): Command => ({ op: 'end' })
const dialog = (): Command => ({ op: 'showDialog', messageIndex: 0, text: '' })
const teleport = (): Command => ({ op: 'loadScene', sceneId: 5 })
const raw = (opcode: number, ...ops: number[]): Command => ({
  op: 'raw',
  opcode,
  operands: [ops[0] ?? 0, ops[1] ?? 0, ops[2] ?? 0],
})

describe('classifyTrigger', () => {
  it('giveItem(count>0) → item + 物品名', () => {
    const r = classifyTrigger(cmds(dialog(), give(1, '灵葫芦'), end()), { L_0: 0 }, 'L_0')
    expect(r.kind).toBe('item')
    expect(r.name).toBe('灵葫芦')
  })
  it('loadScene(无 giveItem) → teleport(不标)', () => {
    expect(classifyTrigger(cmds(teleport(), end()), { L_0: 0 }, 'L_0').kind).toBe('teleport')
  })
  it('item 优先于 teleport', () => {
    for (const commands of [cmds(give(1), teleport(), end()), cmds(teleport(), give(1), end())]) {
      expect(classifyTrigger(commands, { L_0: 0 }, 'L_0').kind).toBe('item')
    }
  })
  it('count=0仍归item(库存helper将0按1处理;不代表原盘道具名称)', () => {
    expect(classifyTrigger(cmds(give(0, '木鞋'), end()), { L_0: 0 }, 'L_0')).toEqual({
      kind: 'item',
      name: '木鞋',
    })
  })
  it('count<0(扣道具) → other', () => {
    expect(classifyTrigger(cmds(give(-1), end()), { L_0: 0 }, 'L_0').kind).toBe('other')
  })
  it('0x1E 加钱(正额) → item(金钱);扣钱(负额)→ other', () => {
    expect(classifyTrigger(cmds(raw(0x1e, 500), end()), { L_0: 0 }, 'L_0')).toEqual({
      kind: 'item',
      name: '金钱',
    })
    expect(classifyTrigger(cmds(raw(0x1e, 0xff00), end()), { L_0: 0 }, 'L_0').kind).toBe('other') // 负 i16
  })
  it('0x55 学法术 → item(法术)', () => {
    expect(classifyTrigger(cmds(raw(0x55, 12), end()), { L_0: 0 }, 'L_0')).toEqual({
      kind: 'item',
      name: '法术',
    })
  })
  it('label 缺失 → other;`L_<n>` 直解兜底(labelMap 无也能解全局 ip)', () => {
    expect(classifyTrigger(cmds(give(1)), {}, undefined).kind).toBe('other')
    expect(classifyTrigger(cmds(give(1), end()), {}, 'L_0').kind).toBe('item')
  })
})

describe('collectEventKinds', () => {
  it('扫全 npc → id → 类别(item/teleport/other)', () => {
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [
      { id: 1, x: 0, y: 0, spriteNum: 0, triggerLabel: 'L_0' },
      { id: 2, x: 0, y: 0, spriteNum: 0, triggerLabel: 'L_2' },
      { id: 3, x: 0, y: 0, spriteNum: 0, triggerLabel: 'L_4' },
    ]
    const commands = cmds(give(1, '金蚕王'), end(), teleport(), end(), dialog(), end())
    const kinds = collectEventKinds(gs, commands, { L_0: 0, L_2: 2, L_4: 4 })
    expect(kinds.get(1)).toEqual({ kind: 'item', name: '金蚕王' })
    expect(kinds.get(2)?.kind).toBe('teleport')
    expect(kinds.get(3)?.kind).toBe('other')
  })
})

describe('collectMinimapData', () => {
  it('teleport 不标 / item / NPC 分类 + 主角镜头', () => {
    const gs = createInitialGameState({ x: 512, y: 256, facing: 'down' })
    gs.camera = { x: 100, y: 80 }
    gs.npcs = [
      { id: 1, x: 200, y: 200, spriteNum: 5, sState: 1 }, // NPC(other + 有 sprite)
      { id: 2, x: 0, y: 0, spriteNum: 0, sState: 1 }, // other 但无 sprite → skip
      { id: 3, x: 0, y: 0, spriteNum: 3, sState: 0 }, // 隐藏 → skip
      { id: 5, x: 300, y: 300, spriteNum: 1, sState: 1 }, // 宝物
      { id: 6, x: 400, y: 400, spriteNum: 7, sState: 1 }, // 传送门 → skip
    ]
    const kinds = new Map<number, { kind: EventKind; name?: string }>([
      [1, { kind: 'other' }],
      [2, { kind: 'other' }],
      [3, { kind: 'other' }],
      [5, { kind: 'item', name: '伏魔剑' }],
      [6, { kind: 'teleport' }],
    ])
    const data = collectMinimapData(gs, kinds)
    expect(data.npcs).toEqual([{ x: 200, y: 200 }]) // 仅 id1
    expect(data.items).toEqual([{ x: 300, y: 300, name: '伏魔剑' }]) // 仅 id5
    expect(data.player).toEqual({ x: 512, y: 256 })
    expect(data.camera).toEqual({ x: 100, y: 80 })
  })
})
