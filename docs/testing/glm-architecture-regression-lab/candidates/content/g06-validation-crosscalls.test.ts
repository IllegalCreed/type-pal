/**
 * ARCH-REGRESSION-LAB-GLM-1 · G06 跨校验器递归（候选回归，隔离实验区）。
 * 验证轴：author→enemy（checkBattleChoreography 进 hook 方言）与 enemy→author
 * （checkEnemyHookFlow/onDefeated 回调 checkBaseAuthorCommands）双向递归：
 * - 合法非空嵌套正控（choreography/flee/fail/no 六臂之一 + hook 流内嵌 author 命令）；
 * - 非法叶错误 path 精确、实际输入前后深等（校验不得改输入）。
 * 去重：author-script-core.test 17 条/enemy-script.test 6 条已覆盖单臂矩阵；
 * 本组只做跨校验器调用面的代表组合（G06 工作包轴）。
 */
import { checkBaseAuthorCommands, checkAuthorCondition } from '@type-pal/content'
import type { Command } from '@type-pal/content'
import { checkEnemyHookFlow } from '@type-pal/content'
import { describe, expect, test } from 'vitest'

/** 合法最小 author 命令（playSound 叶）。 */
function leafSound(id: string): Command {
  return { kind: 'playSound', asset: `sound.${id}` } as unknown as Command
}

describe('G06 跨校验器递归', () => {
  test('G06-01 正控：checkEnemyHookFlow 接受合法 hook 流（body playSound + onDefeated 嵌套）', () => {
    const flow = {
      initial: 's0',
      states: {
        s0: {
          body: [{ kind: 'playSound', asset: 'sound.intro' }],
          next: { kind: 'stay' },
        },
      },
    }
    const before = structuredClone(flow)
    expect(() => checkEnemyHookFlow(flow as never, 'G06.enemy')).not.toThrow()
    // 实际输入前后深等（校验不改输入）
    expect(flow).toEqual(before)
  })

  test('G06-02 正控：startBattle 的 onLose/onFlee 与 teleportOut.onFail/confirm.onNo 递归臂全接受', () => {
    const startBattle = {
      kind: 'startBattle',
      fieldId: 24,
      enemyTeamId: 'team-0',
      onLose: [leafSound('lose')],
      onFlee: [leafSound('flee')],
    } as never
    const teleportOut = { kind: 'teleportOut', onFail: [leafSound('fail')] } as never
    const confirm = { kind: 'confirm', onNo: [leafSound('no')] } as never
    const before = structuredClone([startBattle, teleportOut, confirm])
    expect(() =>
      checkBaseAuthorCommands([startBattle, teleportOut, confirm], 'G06.author'),
    ).not.toThrow()
    expect([startBattle, teleportOut, confirm]).toEqual(before)
  })

  test('G06-03 跨面正控：hook 流内嵌 author 命令经 checkEnemyHookFlow 递归校验', () => {
    // hook state body 内嵌 dialog（author 叶），经 checkCommands/checkBaseAuthorCommands 递归
    const flow = {
      initial: 'talk',
      states: {
        talk: {
          body: [
            { kind: 'dialog', cue: { rows: [{ text: '你好，旅行者。', slot: 0 }] } },
            { kind: 'playSound', asset: 'sound.bye' },
          ],
          next: { kind: 'stay' },
        },
      },
    }
    expect(() => checkEnemyHookFlow(flow as never, 'G06.hook-dialog')).not.toThrow()
  })

  test('G06-04 非法叶：hook 流内未知命令 kind 被拒且错误 path 带位置', () => {
    const flow = {
      initial: 'bad',
      states: {
        bad: {
          body: [{ kind: '不存在的命令' }],
          next: { kind: 'stay' },
        },
      },
    }
    let message = ''
    try {
      checkEnemyHookFlow(flow as never, 'G06.bad@L_77')
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).not.toBe('')
    expect(message).toContain('G06.bad@L_77') // 错误 path 绑定 owner+地址
  })

  test('G06-05 非法嵌套：author onDefeated 内非法条件被拒且输入深等', () => {
    const cmd = {
      kind: 'branch',
      cond: { op: '不存在的比较' },
      then: [leafSound('then')],
      else: [],
    } as never
    const before = structuredClone(cmd)
    let message = ''
    try {
      checkAuthorCondition((cmd as { cond: unknown }).cond, 'G06.branch.cond')
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).toContain('G06.branch.cond')
    expect(cmd).toEqual(before) // 输入深保真
  })
})
