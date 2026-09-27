/**
 * TEST-GLM-STATE-COMMANDS-1 B03：enemy-team-commands 残差。
 * 去重：enemy-team-references.test.ts 五例（barrel/错误形状、引用收集、CRUD 五槽/null 洞
 * 与引用拒删、实时重读阻断、redo 重验）、commands.test.ts「Add/Delete:末尾增,原位删还原;
 * Teams 整表替换可逆」——本文件只补冻结池内：整表二次 apply 首轮捕获与构造期快照、
 * AddEnemyTeam 重复 no-op 与无条件按 id 剔除 invert、单队缺席 id no-op、DeleteEnemyTeam
 * 二次 apply 首轮快照与原索引。业务正例基座为正式空白项目（保存门自证）；
 * enemyTeams 缺席表的 `?? []` 回退轴属有意缺表防御输入，单列于文末防御 describe。
 */
import { describe, expect, test } from 'vitest'
import {
  defensiveCommandStateWithout,
  expectInputsUnchanged,
  legalCommandState,
  mkEnemy,
  mkTeam,
  realRefs,
} from './__tests__/glm-state-commands-b.js'
import {
  AddEnemyTeamCommand,
  DeleteEnemyTeamCommand,
  UpdateEnemyTeamCommand,
  UpdateEnemyTeamsCommand,
} from './enemy-team-commands.js'

describe('B03 enemy-team-commands 残差', () => {
  test('UpdateEnemyTeams：二次 apply 保持首轮旧表；未 apply 的新命令 invert 原引用', async () => {
    const s0 = await legalCommandState({
      enemies: [mkEnemy('e1')],
      enemyTeams: [mkTeam('t1', ['e1'])],
    })
    const next = [mkTeam('t1', ['e2'])]
    const cmd = new UpdateEnemyTeamsCommand(next)
    const s1 = cmd.apply(s0)
    const s2 = cmd.apply(s1)
    expect(s2.enemyTeams).toEqual(next)
    const undone = cmd.invert(s2)
    expect(undone.enemyTeams).toEqual([mkTeam('t1', ['e1'])])
    expect(new UpdateEnemyTeamsCommand(next).invert(s0)).toBe(s0)
  })

  test('UpdateEnemyTeams：构造期快照整表——构造后改源数组不泄漏', async () => {
    const s0 = await legalCommandState({ enemyTeams: [mkTeam('t1', [])] })
    const teams = [mkTeam('t1', [])]
    const cmd = new UpdateEnemyTeamsCommand(teams)
    teams.push(mkTeam('t9'))
    const s1 = cmd.apply(s0)
    expect(s1.enemyTeams).toEqual([mkTeam('t1', [])])
    expect(cmd.invert(s1).enemyTeams).toEqual([mkTeam('t1', [])])
    expectInputsUnchanged(() => cmd.apply(s0), [s0])
  })

  test('AddEnemyTeam：重复 id no-op 原引用；invert 无条件按 id 剔除', async () => {
    const s0 = await legalCommandState({ enemyTeams: [mkTeam('t1')] })
    const dup = new AddEnemyTeamCommand(mkTeam('t1', ['e9']))
    expect(dup.apply(s0)).toBe(s0)
    expect(dup.invert(s0).enemyTeams).toEqual([])
  })

  test('AddEnemyTeam：enemyTeams 缺席追加成功 + invert 清空', async () => {
    const s0 = await legalCommandState({ enemyTeams: [] })
    const added = new AddEnemyTeamCommand(mkTeam('t2', [null, 'e2']))
    const s1 = added.apply(s0)
    expect(s1.enemyTeams).toEqual([mkTeam('t2', [null, 'e2'])])
    expect(added.invert(s1).enemyTeams).toEqual([])
    expectInputsUnchanged(() => added.apply(s0), [s0])
  })

  test('UpdateEnemyTeam：缺席 id apply 原引用；未 apply invert 原引用', async () => {
    const s0 = await legalCommandState({ enemyTeams: [mkTeam('t1')] })
    const missing = new UpdateEnemyTeamCommand('gone', mkTeam('gone', ['e1']))
    expect(missing.apply(s0)).toBe(s0)
    expect(missing.invert(s0)).toBe(s0)
    expectInputsUnchanged(() => missing.apply(s0), [s0])
  })

  test('DeleteEnemyTeam：删除中位队按原索引恢复；二次 apply 首轮快照（真实引用索引）', async () => {
    const s0 = await legalCommandState({
      enemies: [mkEnemy('e1'), mkEnemy('e2'), mkEnemy('e3')],
      enemyTeams: [mkTeam('t1'), mkTeam('t2', ['e2']), mkTeam('t3')],
    })
    const cmd = new DeleteEnemyTeamCommand('t2', realRefs)
    const s1 = cmd.apply(s0)
    expect(s1.enemyTeams!.map((team) => team.id)).toEqual(['t1', 't3'])
    expect(cmd.invert(s1).enemyTeams!.map((team) => team.id)).toEqual(['t1', 't2', 't3'])
    const s2 = cmd.apply(s0)
    expect(s2.enemyTeams!.map((team) => team.id)).toEqual(['t1', 't3'])
    expect(cmd.invert(s2).enemyTeams!.map((team) => team.id)).toEqual(['t1', 't2', 't3'])
  })
})

describe('B03 enemy-team-commands 防御轴（有意缺表）', () => {
  test('UpdateEnemyTeam 与 DeleteEnemyTeam：enemyTeams 表缺席 → apply/invert 原引用', async () => {
    const bare = await defensiveCommandStateWithout(['enemyTeams'])
    const missing = new UpdateEnemyTeamCommand('gone', mkTeam('gone', ['e1']))
    expect(missing.apply(bare)).toBe(bare)
    const cmd = new DeleteEnemyTeamCommand('t1', realRefs)
    expect(cmd.apply(bare)).toBe(bare)
    expect(cmd.invert(bare)).toBe(bare)
  })

  test('UpdateEnemyTeams 与 DeleteEnemyTeam：缺席表下 apply/invert 语义', async () => {
    const bare = await defensiveCommandStateWithout(['enemyTeams'])
    const teams = [mkTeam('t9')]
    const replace = new UpdateEnemyTeamsCommand(teams)
    const s1 = replace.apply(bare)
    expect(s1.enemyTeams).toEqual(teams)
    expect(replace.invert(s1).enemyTeams).toEqual([])
    expect(new DeleteEnemyTeamCommand('gone', realRefs).invert(bare)).toBe(bare)
    const s0 = await legalCommandState({ enemyTeams: [mkTeam('t1'), mkTeam('t2')] })
    const cmd = new DeleteEnemyTeamCommand('t2', realRefs)
    const removed = cmd.apply(s0)
    const tableless: typeof s0 = { ...removed, enemyTeams: undefined }
    expect(cmd.invert(tableless).enemyTeams!.map((team) => team.id)).toEqual(['t2'])
  })
})
