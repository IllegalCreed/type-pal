import type { Command } from '@type-pal/shared'
import { describe, expect, it } from 'vitest'
import type { GameState, NpcState } from '../core/game-state.js'
import { collectItemEventIds, collectMinimapData, scanTriggerGivesItem, worldToThumb } from './minimap.js'

// 变换常量(与 minimap.ts):SCALE=96/2080,CAM_OFF=16。
const SCALE = 96 / 2080

describe('worldToThumb', () => {
  it('世界像素 → 缩略图像素((wx+16)*SCALE)', () => {
    const [x0, y0] = worldToThumb(0, 0)
    expect(x0).toBeCloseTo(16 * SCALE, 4)
    expect(y0).toBeCloseTo(16 * SCALE, 4)
    // 远角 world(2032,2032) → ~(2048*SCALE)=94.52,落在 0..96 内
    const [x1, y1] = worldToThumb(2032, 2032)
    expect(x1).toBeCloseTo(2048 * SCALE, 4)
    expect(y1).toBeCloseTo(2048 * SCALE, 4)
    expect(x1).toBeLessThan(96)
  })
})

const cmds = (...c: Command[]): Command[] => c
const give = (count: number, name?: string): Command =>
  ({ op: 'giveItem', itemId: 10, count, _item: name }) as Command
const end = (): Command => ({ op: 'end' }) as Command
const dialog = (): Command => ({ op: 'showDialog', messageIndex: 0, text: '' }) as Command

describe('scanTriggerGivesItem', () => {
  it('线性扫到 end,命中 giveItem(count>0) → gives + 物品名', () => {
    const commands = cmds(dialog(), give(1, '灵葫芦'), end())
    const r = scanTriggerGivesItem(commands, { L_0: 0 }, 'L_0')
    expect(r.gives).toBe(true)
    expect(r.name).toBe('灵葫芦')
  })
  it('count<=0(扣道具) 不算宝物', () => {
    expect(scanTriggerGivesItem(cmds(give(-1), end()), { L_0: 0 }, 'L_0').gives).toBe(false)
  })
  it('giveItem 在 end 之后 → 扫不到', () => {
    const commands = cmds(dialog(), end(), give(1))
    expect(scanTriggerGivesItem(commands, { L_0: 0 }, 'L_0').gives).toBe(false)
  })
  it('label 缺失 / 不在 labelMap → false', () => {
    expect(scanTriggerGivesItem(cmds(give(1)), {}, undefined).gives).toBe(false)
    expect(scanTriggerGivesItem(cmds(give(1)), {}, 'L_X').gives).toBe(false)
  })
})

describe('collectItemEventIds', () => {
  it('扫全 npc trigger,返回给道具的对象 id → 物品名', () => {
    const gs = {
      npcs: [
        { id: 1, triggerLabel: 'L_0' },
        { id: 2, triggerLabel: 'L_2' },
        { id: 3, triggerLabel: undefined },
      ] as NpcState[],
    } as GameState
    // L_0(@0):给道具;L_2(@2):无
    const commands = cmds(give(1, '金蚕王'), end(), dialog(), end())
    const ids = collectItemEventIds(gs, commands, { L_0: 0, L_2: 2 })
    expect([...ids.keys()]).toEqual([1])
    expect(ids.get(1)).toBe('金蚕王')
  })
})

describe('collectMinimapData', () => {
  it('可见性过滤 + NPC/宝物分类 + 主角/镜头', () => {
    const gs = {
      party: { x: 512, y: 256 },
      camera: { x: 100, y: 80 },
      npcs: [
        { id: 1, x: 200, y: 200, spriteNum: 5, sState: 1 }, // 可见 NPC
        { id: 2, x: 0, y: 0, spriteNum: 0, sState: 1 }, // 无 sprite → skip
        { id: 3, x: 0, y: 0, spriteNum: 3, sState: 0 }, // 隐藏(sState 0) → skip
        { id: 4, x: 0, y: 0, spriteNum: 7, sVanishTime: 5 }, // 消失中 → skip
        { id: 5, x: 300, y: 300, spriteNum: 1, sState: 1 }, // 宝物(itemIds 命中)
      ] as NpcState[],
    } as GameState
    const itemIds = new Map<number, string | undefined>([[5, '伏魔剑']])
    const data = collectMinimapData(gs, itemIds)
    expect(data.player).toEqual({ x: 512, y: 256 })
    expect(data.camera).toEqual({ x: 100, y: 80 })
    expect(data.npcs).toEqual([{ x: 200, y: 200 }]) // 仅 id1
    expect(data.items).toEqual([{ x: 300, y: 300, name: '伏魔剑' }]) // id5
  })
})
