/** TEST-GLM-WAVE-O-1 O08：隐藏经验池残余合同。
 *  旧证（existing-proof，O-R9 续审逐条件扣除，不计净新）：
 *  - rewards.test.ts:139-160「比例分配 ×2 + 过阈值 +R(1,2) + 余数回存;零行为跳过」已同条件
 *    同答案覆盖：多属性按计数比例分配、×2 加成、阈值升级循环、余数回存、零计数短路
 *    （含 `{attack:0}` 类零总数）、R(1,2) 下界；
 *  - rewards.test.ts:162-172 集成行已覆盖 hiddenCounts 走通 → hiddenUps 报告。
 *  本文件只保留旧证未覆盖的真实新轴：池经验 WORD 截断的可观测证明。
 *
 *  O-R9 续审同时确认 grid.test.ts:30/35/40/11-26/69-81 已覆盖
 *  gridToPixel 公式、pixelToGrid 唯一反解、height 不投影、spriteScreenY 每级 -16px、
 *  pixelDeltaToGridDelta 小数保留 —— 原四条几何行系重复，已删除登记（文件头曾误写
 *  「grid 邻域零测试文件」，r9 逐条件复核推翻该前提）。
 */

import type { CharacterInstance } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { applyHiddenExp } from './rewards.js'

const hero = (over: Partial<CharacterInstance> = {}): CharacterInstance => ({
  id: 'hero',
  template: 'hero',
  level: 5,
  exp: 0,
  hp: 100,
  maxHP: 100,
  mp: 50,
  maxMP: 50,
  attack: 10,
  defense: 10,
  magicAttack: 10,
  speed: 10,
  luck: 10,
  equipment: {},
  tags: [],
  ...over,
})

describe('O08 applyHiddenExp：池经验 WORD 截断', () => {
  test('池 exp 超 0xffff 时按位与截断（100000 → 34464），未截断值不可能出现', () => {
    // 阈值表在当前级放超大阈值：循环立即退出，exp = trunc(50000*1/1)*2 + 0 = 100000。
    // rewards.ts `pool.exp = exp & 0xffff` → 100000 & 0xffff = 34464 ≠ 100000，
    // 直接观察截断位；若产品去掉掩码，本断言恰红。
    const c = hero()
    const table = Array.from({ length: 100 }, (_, i) => (i === 5 ? 1_000_000_000 : 10))
    const ups = applyHiddenExp(c, { attack: 1 }, 50000, table, () => 0)
    expect(ups).toEqual([])
    expect(c.hiddenExp?.attack?.exp).toBe(34464)
  })
})
