/**
 * TEST-GLM-STATE-COMMANDS-1 D02：ambience-commands 残差。
 * 去重：commands.test.ts「UpdateAmbience:调乘色,invert 还原;源不变」「AddAmbience:追加恒等白;
 * invert 移除;重复 id 不动」「DeleteAmbience:零引用时删除;invert 按原索引恢复且源不变」
 * 「DeleteAmbience:脚本显式引用…」「DeleteAmbience:删除时重读独立脚本会话…」
 * 「DeleteAmbience:缺目标跳过 oracle…」、AmbienceTab.test.tsx 15 例——本文件只补冻结池内：
 * UpdateAmbience 缺席 id/未 apply invert/二次 apply 首轮捕获、AddAmbience 重复 no-op 与
 * 未添加 invert 原引用、DeleteAmbience 二次 apply 首轮快照、undo 重占用恰抛与缺席表插回。
 * 业务正例基座为正式空白项目（保存门自证）；ambiences 缺席表的防御轴单列于文末防御 describe。
 */
import { describe, expect, test } from 'vitest'
import {
  deepSnapshot,
  defensiveDefinitionStateWithout,
  expectExactError,
  expectInputsUnchanged,
  legalDefinitionState,
  mkAmbience,
  realRefs,
} from './__tests__/glm-state-commands-d.js'
import {
  AddAmbienceCommand,
  DeleteAmbienceCommand,
  UpdateAmbienceCommand,
} from './ambience-commands.js'

describe('D02 ambience-commands 残差', () => {
  test('UpdateAmbience：缺席 id apply 原引用；未 apply invert 原引用', async () => {
    const s0 = await legalDefinitionState({ ambiences: [mkAmbience('day')] })
    const missing = new UpdateAmbienceCommand('night', { tint: [10, 20, 30] })
    expect(missing.apply(s0)).toBe(s0)
    expect(missing.invert(s0)).toBe(s0)
    expectInputsUnchanged(() => missing.apply(s0), [s0])
  })

  test('UpdateAmbience：二次 apply 保持首轮 oldPatch（undo 回首次前）', async () => {
    const s0 = await legalDefinitionState({ ambiences: [mkAmbience('day')] })
    const cmd = new UpdateAmbienceCommand('day', { tint: [10, 20, 30] })
    const s1 = cmd.apply(s0)
    const s2 = cmd.apply(s1)
    expect(s2.ambiences![0]!.tint).toEqual([10, 20, 30])
    expect(cmd.invert(s2).ambiences![0]!.tint).toEqual([255, 255, 255])
  })

  test('AddAmbience：合法项目空表追加 + invert 清空；重复 id no-op；未添加 invert 原引用', async () => {
    const s0 = await legalDefinitionState({ ambiences: [] })
    const cmd = new AddAmbienceCommand('dusk', '黄昏')
    const s1 = cmd.apply(s0)
    expect(s1.ambiences).toEqual([mkAmbience('dusk', '黄昏')])
    expect(cmd.invert(s1).ambiences).toEqual([])
    const withDay = await legalDefinitionState({ ambiences: [mkAmbience('day')] })
    const dup = new AddAmbienceCommand('day', '重复')
    expect(dup.apply(withDay)).toBe(withDay)
    expect(dup.invert(withDay)).toBe(withDay)
    expectInputsUnchanged(() => dup.apply(withDay), [withDay])
  })

  test('DeleteAmbience：删除中位元素按原索引恢复；二次 apply 保持首轮快照（真实引用索引）', async () => {
    const s0 = await legalDefinitionState({
      ambiences: [mkAmbience('a'), mkAmbience('b'), mkAmbience('c')],
    })
    expect(new DeleteAmbienceCommand('gone', realRefs).invert(s0)).toBe(s0)
    const middle = new DeleteAmbienceCommand('b', realRefs)
    const s1 = middle.apply(s0)
    expect(s1.ambiences!.map((ambience) => ambience.id)).toEqual(['a', 'c'])
    expect(middle.invert(s1).ambiences!.map((ambience) => ambience.id)).toEqual(['a', 'b', 'c'])
    const s2 = middle.apply(s0)
    expect(s2.ambiences!.map((ambience) => ambience.id)).toEqual(['a', 'c'])
    expect(middle.invert(s2).ambiences!.map((ambience) => ambience.id)).toEqual(['a', 'b', 'c'])
  })

  test('DeleteAmbience：undo 时 id 已被占用恰抛（整串）', async () => {
    const s0 = await legalDefinitionState({ ambiences: [mkAmbience('day')] })
    const cmd = new DeleteAmbienceCommand('day', realRefs)
    const snap = deepSnapshot(s0)
    const removed = cmd.apply(s0)
    const reoccupied = new AddAmbienceCommand('day', '占位').apply(removed)
    expectExactError(() => cmd.invert(reoccupied), '无法撤销删除：氛围 id 已被占用 day')
    expect(cmd.invert(removed).ambiences!.map((ambience) => ambience.id)).toEqual(['day'])
    expect(s0).toEqual(snap)
  })
})

describe('D02 ambience-commands 防御轴（有意缺表）', () => {
  test('UpdateAmbience 与 DeleteAmbience：ambiences 表缺席 → apply/invert 原引用', async () => {
    const bare = await defensiveDefinitionStateWithout(['ambiences'])
    const missing = new UpdateAmbienceCommand('night', { tint: [10, 20, 30] })
    expect(missing.apply(bare)).toBe(bare)
    const cmd = new DeleteAmbienceCommand('day', realRefs)
    expect(cmd.apply(bare)).toBe(bare)
    expect(cmd.invert(bare)).toBe(bare)
  })

  test('AddAmbience：ambiences 表缺席 → 追加成功 + invert 清空', async () => {
    const bare = await defensiveDefinitionStateWithout(['ambiences'])
    const cmd = new AddAmbienceCommand('dusk', '黄昏')
    const s1 = cmd.apply(bare)
    expect(s1.ambiences).toEqual([mkAmbience('dusk', '黄昏')])
    expect(cmd.invert(s1).ambiences).toEqual([])
  })
})
