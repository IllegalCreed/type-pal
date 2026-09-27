/**
 * TEST-GLM-STATE-COMMANDS-1 D02：ambience-commands 残差。
 * 去重：commands.test.ts「UpdateAmbience:调乘色,invert 还原;源不变」「AddAmbience:追加恒等白;
 * invert 移除;重复 id 不动」「DeleteAmbience:零引用时删除;invert 按原索引恢复且源不变」
 * 「DeleteAmbience:脚本显式引用…」「DeleteAmbience:删除时重读独立脚本会话…」
 * 「DeleteAmbience:缺目标跳过 oracle…」、AmbienceTab.test.tsx 15 例——本文件只补冻结池内：
 * UpdateAmbience 缺席表/缺席 id/未 apply invert/二次 apply 首轮捕获、AddAmbience 缺席表追加
 * 与未添加 invert 原引用、DeleteAmbience 缺席表 apply、未 apply invert、二次 apply 首轮快照、
 * undo 重占用恰抛与缺席表插回。
 */
import { describe, expect, test } from 'vitest'
import {
  deepSnapshot,
  definitionState,
  expectExactError,
  expectInputsUnchanged,
  mkAmbience,
} from './__tests__/glm-state-commands-d.js'
import {
  AddAmbienceCommand,
  DeleteAmbienceCommand,
  UpdateAmbienceCommand,
} from './ambience-commands.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const realRefs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

const bareAmbiences = (): EditorState => {
  const state = definitionState()
  delete (state as { ambiences?: unknown }).ambiences
  return state
}

describe('D02 ambience-commands 残差', () => {
  test('UpdateAmbience：缺席表与缺席 id apply 原引用；未 apply invert 原引用', () => {
    const s0 = definitionState({ ambiences: [mkAmbience('day')] })
    const bare = bareAmbiences()
    const missing = new UpdateAmbienceCommand('night', { tint: [10, 20, 30] })
    expect(missing.apply(s0)).toBe(s0)
    expect(missing.apply(bare)).toBe(bare)
    expect(missing.invert(s0)).toBe(s0)
    expectInputsUnchanged(() => missing.apply(s0), [s0])
  })

  test('UpdateAmbience：二次 apply 保持首轮 oldPatch（undo 回首次前）', () => {
    const s0 = definitionState({ ambiences: [mkAmbience('day')] })
    const cmd = new UpdateAmbienceCommand('day', { tint: [10, 20, 30] })
    const s1 = cmd.apply(s0)
    const s2 = cmd.apply(s1)
    expect(s2.ambiences![0]!.tint).toEqual([10, 20, 30])
    expect(cmd.invert(s2).ambiences![0]!.tint).toEqual([255, 255, 255])
  })

  test('AddAmbience：缺席表追加成功 + invert 清空；未添加 invert 原引用', () => {
    const bare = bareAmbiences()
    const cmd = new AddAmbienceCommand('dusk', '黄昏')
    const s1 = cmd.apply(bare)
    expect(s1.ambiences).toEqual([mkAmbience('dusk', '黄昏')])
    expect(cmd.invert(s1).ambiences).toEqual([])
    const s0 = definitionState({ ambiences: [mkAmbience('day')] })
    const dup = new AddAmbienceCommand('day', '重复')
    expect(dup.apply(s0)).toBe(s0)
    expect(dup.invert(s0)).toBe(s0)
    expectInputsUnchanged(() => dup.apply(s0), [s0])
  })

  test('DeleteAmbience：缺席表 apply 原引用；未 apply invert 原引用；二次 apply 首轮快照原索引', () => {
    const bare = bareAmbiences()
    const cmd = new DeleteAmbienceCommand('day', realRefs)
    expect(cmd.apply(bare)).toBe(bare)
    const s0 = definitionState({
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
    expect(middle.apply(bare)).toBe(bare)
  })

  test('DeleteAmbience：undo 时 id 已被占用恰抛（整串）；缺席表 invert 仍插回', () => {
    const s0 = definitionState({ ambiences: [mkAmbience('day')] })
    const cmd = new DeleteAmbienceCommand('day', realRefs)
    const snap = deepSnapshot(s0)
    const removed = cmd.apply(s0)
    const reoccupied = new AddAmbienceCommand('day', '占位').apply(removed)
    expectExactError(() => cmd.invert(reoccupied), '无法撤销删除：氛围 id 已被占用 day')
    expect(cmd.invert(removed).ambiences!.map((ambience) => ambience.id)).toEqual(['day'])
    expect(s0).toEqual(snap)
  })
})
