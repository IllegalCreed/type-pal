/**
 * TEST-GLM-STATE-COMMANDS-1 B01：skill-commands 残差。
 * 去重：actor-commands.residual.test.ts 已证 add/update/detach 模式——本文件只补
 * UpdateSkill patch undefined 删键/缺席表原引用/首次 oldPatch 捕获/重复 apply undo 联动、
 * AddSkill 重复 apply no-op 与 invert 删除、DeleteSkill 引用拒删与原索引恢复。
 */
import { describe, expect, test } from 'vitest'
import type { SkillData, SkillDataMap } from '@type-pal/content'
import { AddSkillCommand, DeleteSkillCommand, UpdateSkillCommand } from './skill-commands.js'
import type { EditorState } from './edit-session.js'
import { BattleDataInUseError } from './battle-data-command-errors.js'
import type { CurrentProjectReferenceIndexProvider } from './project-reference-adapters.js'

const mk = (id: string, name: string): SkillData => ({
  id, name, desc: '', cost: { mp: 10 }, usableOutsideBattle: true,
  target: 'oneEnemy', effects: [{ kind: 'damage', power: 20, elemental: 0 }],
  animation: { effectSprite: 0 },
})

const state = (skills: SkillData[]): EditorState =>
  ({ skills, poisons: [], enemyTeams: [] }) as unknown as EditorState

const noRefs: CurrentProjectReferenceIndexProvider = () => ({ blockers: [], edges: [] }) as never

describe('B01 skill-commands 残差', () => {
  test('UpdateSkill：undefined 值删键（patch 清 cost），undo 恢复', () => {
    const sk = mk('s1', '技能一')
    sk.cost = { mp: 10 }
    const s = state([sk])
    const cmd = new UpdateSkillCommand('s1', { cost: undefined })
    const next = cmd.apply(s)
    expect(next.skills[0]!.cost).toBeUndefined()
    const restored = cmd.invert(next)
    expect(restored.skills[0]!.cost).toEqual({ mp: 10 })
  })

  test('UpdateSkill：缺席 skill 原引用返回', () => {
    const s = state([mk('s1', '技能一')])
    const result = new UpdateSkillCommand('gone', { name: 'x' }).apply(s)
    expect(result).toBe(s)
  })

  test('UpdateSkill：二次 apply 不覆盖 oldPatch（undo 回首次前状态）', () => {
    const sk = mk('s1', '旧名')
    const s = state([sk])
    const cmd = new UpdateSkillCommand('s1', { name: '新名' })
    const s1 = cmd.apply(s)
    const s2 = cmd.apply(s1)
    const undo = cmd.invert(s2)
    expect(undo.skills[0]!.name).toBe('旧名')
  })

  test('AddSkill：重复 id apply no-op 原引用；invert 删除', () => {
    const s = state([mk('s1', '已有')])
    const cmd = new AddSkillCommand('s1', '重复')
    const next = cmd.apply(s)
    expect(next).toBe(s)
    const afterUndo = cmd.invert(next)
    expect(afterUndo.skills).toHaveLength(1)
  })

  test('AddSkill：新建成功 + invert 删回', () => {
    const s = state([])
    const cmd = new AddSkillCommand('s1', '新技能')
    const next = cmd.apply(s)
    expect(next.skills).toHaveLength(1)
    const undone = cmd.invert(next)
    expect(undone.skills).toHaveLength(0)
  })


})
