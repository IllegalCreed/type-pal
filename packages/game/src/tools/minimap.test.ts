import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { GameState, NpcState } from '../core/game-state.js'
import type { EventKind } from './minimap.js'
import {
  BASE_PX,
  classifyTrigger,
  collectEventKinds,
  collectMinimapData,
  computeView,
  worldToThumb,
} from './minimap.js'

// 变换常量(与 minimap.ts):SCALE=BASE_PX/2080,CAM_OFF=16。
const SCALE = BASE_PX / 2080

describe('worldToThumb', () => {
  it('世界像素 → 底图像素((wx+16)*SCALE)', () => {
    const [x0, y0] = worldToThumb(0, 0)
    expect(x0).toBeCloseTo(16 * SCALE, 4)
    expect(y0).toBeCloseTo(16 * SCALE, 4)
    const [x1, y1] = worldToThumb(2032, 2032)
    expect(x1).toBeCloseTo(2048 * SCALE, 4)
    expect(y1).toBeCloseTo(2048 * SCALE, 4)
    expect(x1).toBeLessThanOrEqual(BASE_PX)
  })
})

describe('computeView', () => {
  it('视野>=全图 → 全图(sx=sy=0,sw=BASE_PX)', () => {
    expect(computeView(2080, 1024, 1024)).toEqual({ sx: 0, sy: 0, sw: BASE_PX })
  })
  it('缩放档以主角为中心(960 世界px → 1/3 框),clamp 在底图内', () => {
    const v = computeView(960, 1024, 1024)
    expect(v.sw).toBeCloseTo((960 * BASE_PX) / 2080, 3)
    // 主角(1024)→ 底图中心附近,视图围绕它
    const [px] = worldToThumb(1024, 1024)
    expect(px).toBeGreaterThanOrEqual(v.sx)
    expect(px).toBeLessThanOrEqual(v.sx + v.sw)
  })
  it('主角在边角 → clamp 不越界(sx>=0, sx+sw<=BASE_PX)', () => {
    const v = computeView(640, 0, 0)
    expect(v.sx).toBeGreaterThanOrEqual(0)
    expect(v.sx + v.sw).toBeLessThanOrEqual(BASE_PX + 0.001)
  })
})

const cmds = (...c: Command[]): Command[] => c
const give = (count: number, name?: string): Command =>
  ({ op: 'giveItem', itemId: 10, count, _item: name }) as Command
const end = (): Command => ({ op: 'end' }) as Command
const dialog = (): Command => ({ op: 'showDialog', messageIndex: 0, text: '' }) as Command
const teleport = (): Command => ({ op: 'loadScene', sceneId: 5 }) as Command
const raw = (opcode: number, ...ops: number[]): Command =>
  ({ op: 'raw', opcode, operands: [ops[0] ?? 0, ops[1] ?? 0, ops[2] ?? 0] }) as Command

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
    expect(classifyTrigger(cmds(give(1), teleport(), end()), { L_0: 0 }, 'L_0').kind).toBe('item')
  })
  it('count=0 → item(sdlpal count==0 给 1 个;**绝大多数地图宝物 count=0**,如木鞋)', () => {
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
    const gs = {
      npcs: [
        { id: 1, triggerLabel: 'L_0' },
        { id: 2, triggerLabel: 'L_2' },
        { id: 3, triggerLabel: 'L_4' },
      ] as NpcState[],
    } as GameState
    const commands = cmds(give(1, '金蚕王'), end(), teleport(), end(), dialog(), end())
    const kinds = collectEventKinds(gs, commands, { L_0: 0, L_2: 2, L_4: 4 })
    expect(kinds.get(1)).toEqual({ kind: 'item', name: '金蚕王' })
    expect(kinds.get(2)?.kind).toBe('teleport')
    expect(kinds.get(3)?.kind).toBe('other')
  })
})

describe('collectMinimapData', () => {
  it('teleport 不标 / item / NPC 分类 + 主角镜头', () => {
    const gs = {
      party: { x: 512, y: 256 },
      camera: { x: 100, y: 80 },
      npcs: [
        { id: 1, x: 200, y: 200, spriteNum: 5, sState: 1 }, // NPC(other + 有 sprite)
        { id: 2, x: 0, y: 0, spriteNum: 0, sState: 1 }, // other 但无 sprite → skip
        { id: 3, x: 0, y: 0, spriteNum: 3, sState: 0 }, // 隐藏 → skip
        { id: 5, x: 300, y: 300, spriteNum: 1, sState: 1 }, // 宝物
        { id: 6, x: 400, y: 400, spriteNum: 7, sState: 1 }, // 传送门 → skip
      ] as NpcState[],
    } as GameState
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
