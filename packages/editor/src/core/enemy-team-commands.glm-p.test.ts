// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P04（enemy-team-commands.glm-p）：敌队修改命令的稳定 id 合同。
 * 去重（真实旧 fullName 锚）：
 * - enemy-team-references.test.ts › enemy team authoring commands and references › keeps
 *   enemy-team constructors and in-use error on the old commands barrel（已证 slots 截断
 *   slice(0,5) 与 label；传入 id:'other' 但只断言 slots——id 稳定臂未断言）；
 *   本合同核 next.id 被强制回 teamId（创建后稳定 id 不可修改）。
 * - enemy-team-commands.glm-boundaries.test.ts › UpdateEnemyTeam：缺席 id apply 原引用；
 *   未 apply invert 原引用（已证缺席臂）——本合同为在场成功 apply 的 id 覆写臂。
 * 合法输入：EnemyTeamDef typed 夹具（无强转）。
 */
import { describe, expect, test } from 'vitest'
import { pEditorState } from '../__tests__/glm-p/kit.js'
import type { EditorState } from './edit-session.js'
import { UpdateEnemyTeamCommand } from './enemy-team-commands.js'

describe('P04-G06 UpdateEnemyTeam 稳定 id 合同', () => {
  test('patch 携带 id:other → 应用后队 id 仍为 teamId，other 不入表', () => {
    const state: EditorState = pEditorState({
      enemyTeams: [{ id: 'team-c1', slots: ['a', null] }],
    })
    const command = new UpdateEnemyTeamCommand('team-c1', {
      id: 'other',
      slots: ['x', 'y', null, 'z'],
    })
    const applied = command.apply(state)
    expect(applied.enemyTeams).toEqual([{ id: 'team-c1', slots: ['x', 'y', null, 'z'] }])
    expect(applied.enemyTeams?.some((team) => team.id === 'other')).toBe(false)
  })
})
