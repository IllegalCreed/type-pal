/**
 * TEST-GLM-STATE-COMMANDS-1 B01：skill-commands 残差。
 * 去重：skill-commands.test.ts（barrel 身份、scaffold 缺省 damage、desc patch/invert、
 * 删除 happy）、battle-data-delete-commands.test.ts 六例（真实引用拒删、原索引删还原、
 * 缺目标跳过 oracle、oracle 失败零写、redo 重验）、actor-commands.residual.test.ts
 * 已证 add/update/detach 模式——本文件只补冻结池内：UpdateSkill 首轮捕获/三向缺席 no-op/
 * 可选键 undefined 删键与还原、AddSkill 重复 no-op、DeleteSkill 二次 apply 首轮快照、
 * 未 apply invert、undo 重占用恰抛。
 */
import { describe, expect, test } from 'vitest'
import {
  baseCommandState,
  deepSnapshot,
  expectExactError,
  expectInputsUnchanged,
  mkSkill,
  realRefs,
} from './__tests__/glm-state-commands-b.js'
import type { SkillPatch } from './skill-commands.js'
import { AddSkillCommand, DeleteSkillCommand, UpdateSkillCommand } from './skill-commands.js'

describe('B01 skill-commands 残差', () => {
  test('UpdateSkill：可选键 undefined 删键（清 cost）与精确还原；旁技能同引用', () => {
    const s0 = baseCommandState({ skills: [mkSkill('s0'), mkSkill('s1')] })
    const patch: SkillPatch = { cost: undefined }
    const cmd = new UpdateSkillCommand('s1', patch)
    const snap = deepSnapshot([s0, patch])
    const s1 = cmd.apply(s0)
    expect(s1.skills[1]!.cost).toBeUndefined()
    expect(s1.skills[1]!.name).toBe('技能s1')
    expect(s1.skills[0]).toBe(s0.skills[0])
    const restored = cmd.invert(s1)
    expect(restored.skills[1]!.cost).toEqual({ mp: 10 })
    expect([s0, patch]).toEqual(snap)
  })

  test('UpdateSkill：缺席 id apply 原引用；未 apply invert 原引用；undo 时 id 消失原引用', () => {
    const s0 = baseCommandState({ skills: [mkSkill('s1')] })
    const cmd = new UpdateSkillCommand('gone', { name: 'x' })
    expect(cmd.apply(s0)).toBe(s0)
    expect(cmd.invert(s0)).toBe(s0)
    const applied = new UpdateSkillCommand('s1', { name: '改' }).apply(s0)
    const vanished: typeof s0 = { ...applied, skills: [] }
    expect(new UpdateSkillCommand('s1', { name: '改' }).invert(vanished)).toBe(vanished)
    expectInputsUnchanged(() => cmd.apply(s0), [s0])
  })

  test('UpdateSkill：二次 apply 不覆盖首轮 oldPatch（undo 回首次前状态）', () => {
    const s0 = baseCommandState({ skills: [mkSkill('s1', '旧名')] })
    const cmd = new UpdateSkillCommand('s1', { name: '新名' })
    const s1 = cmd.apply(s0)
    const s2 = cmd.apply(s1)
    expect(s2.skills[0]!.name).toBe('新名')
    expect(cmd.invert(s2).skills[0]!.name).toBe('旧名')
  })

  test('AddSkill：重复 id apply no-op 原引用；未添加 invert 内容不变', () => {
    const s0 = baseCommandState({ skills: [mkSkill('s1')] })
    const cmd = new AddSkillCommand('s1', '重复')
    expect(cmd.apply(s0)).toBe(s0)
    const afterUndo = cmd.invert(s0)
    expect(afterUndo.skills.map((skill) => skill.id)).toEqual(['s1'])
    expectInputsUnchanged(() => cmd.apply(s0), [s0])
  })

  test('DeleteSkill：删除中位元素按原索引恢复；二次 apply 保持首轮快照', () => {
    const s0 = baseCommandState({ skills: [mkSkill('a'), mkSkill('b'), mkSkill('c')] })
    const cmd = new DeleteSkillCommand('b', realRefs)
    const s1 = cmd.apply(s0)
    expect(s1.skills.map((skill) => skill.id)).toEqual(['a', 'c'])
    expect(cmd.invert(s1).skills.map((skill) => skill.id)).toEqual(['a', 'b', 'c'])
    const s2 = cmd.apply(s0)
    expect(s2.skills.map((skill) => skill.id)).toEqual(['a', 'c'])
    expect(cmd.invert(s2).skills.map((skill) => skill.id)).toEqual(['a', 'b', 'c'])
  })

  test('DeleteSkill：未 apply invert 原引用；undo 时 id 已被占用恰抛（整串 message）', () => {
    const s0 = baseCommandState({ skills: [mkSkill('a'), mkSkill('b')] })
    const cmd = new DeleteSkillCommand('b', realRefs)
    expect(cmd.invert(s0)).toBe(s0)
    const removed = cmd.apply(s0)
    const reoccupied = new AddSkillCommand('b', '占位').apply(removed)
    expect(reoccupied.skills.map((skill) => skill.id)).toEqual(['a', 'b'])
    expectExactError(() => cmd.invert(reoccupied), '无法撤销删除：技能 id 已被占用 b')
  })
})
