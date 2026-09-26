/**
 * ARCH-REGRESSION-LAB-GLM-1 · G06 跨校验器递归（正式跨校验器回归）。
 * 验证轴：**author→enemy 合法生产 caller** —— 内容校验入口 `validateEnemies`
 * （validate.ts:1442）经 `checkEnemyAi`（enemy-script.ts:556 checkEnemyHookFlow）与
 * `checkEnemyOnDefeatedCommands`（validate.ts:1473）双向递归到 author 命令校验
 * （hook body 的 dialog/playSound 是 author Command 叶，enemy→author 递归）。
 * 输入全部按 `EnemyDef`/`EnemyHookFlow`/`EnemyOnDefeatedCommand` 真实类型构造；
 * 非法叶仅在「故意非法」案例里对单个字段做收窄突变（类型域之外才允许），并断言
 * 生产错误 path 精确到叶 + 输入前后深等（校验不得改输入）。
 * 去重：author-script-core.test 17 条/enemy-script.test 6 条已覆盖单臂矩阵；
 * 本组只做跨校验器调用面的代表组合（G06 工作包轴）。
 */

import { describe, expect, test } from 'vitest'
import type { EnemyDef } from './enemy.js'
import { validateEnemies } from './validate.js'

/** 合法最小 EnemyDef（stats/ai/sounds 全真实类型域，无强转）。 */
function labEnemy(): EnemyDef {
  return {
    id: 'enemy-lab-0',
    name: 'lab.enemy.0',
    battleSprite: 'battle.lab.001',
    yPosOffset: 0,
    stats: {
      health: 100,
      level: 1,
      exp: 2,
      cash: 3,
      attackStrength: 10,
      magicStrength: 4,
      defense: 8,
      dexterity: 6,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: {
      resistanceToSorcery: 0,
    },
    sounds: {},
  }
}

describe('G06 跨校验器递归', () => {
  test('G06-01 正控：validateEnemies 接受 hooks.ready 合法 hook 流（author 入口 → enemy 校验）', () => {
    const enemy = labEnemy()
    enemy.ai.hooks = {
      ready: {
        initial: 's0',
        states: {
          s0: {
            body: [{ kind: 'playSound', asset: 'sound.intro' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const before = JSON.parse(JSON.stringify(enemy)) as unknown
    const result = validateEnemies([enemy])
    expect(result).toHaveLength(1)
    // 实际输入前后深等（校验不改输入）
    expect(enemy).toEqual(before)
  })

  test('G06-02 正控：validateEnemies 接受 onDefeated branch+dialog（enemy→author 递归）', () => {
    const enemy = labEnemy()
    enemy.onDefeated = [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'lab-flag', is: true },
        then: [{ kind: 'playSound', asset: 'sound.then' }],
        else: [],
      },
      { kind: 'dialog', cue: { rows: [{ text: '你赢了，旅行者。' }] } },
    ]
    const before = JSON.parse(JSON.stringify(enemy)) as unknown
    expect(() => validateEnemies([enemy])).not.toThrow()
    expect(enemy).toEqual(before)
  })

  test('G06-03 跨面正控：hook state body 内嵌 author dialog 叶，经生产链递归校验通过', () => {
    const enemy = labEnemy()
    enemy.ai.hooks = {
      ready: {
        initial: 'talk',
        states: {
          talk: {
            body: [
              { kind: 'dialog', cue: { rows: [{ text: '你好，旅行者。' }], slot: 'bottom' } },
              { kind: 'playSound', asset: 'sound.bye' },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    expect(() => validateEnemies([enemy])).not.toThrow()
  })

  test('G06-04 非法叶：hook body 未知命令 kind 被拒，生产错误 path 精确到叶且输入深等', () => {
    const enemy = labEnemy()
    enemy.ai.hooks = {
      ready: {
        initial: 'bad',
        states: {
          bad: { body: [{ kind: 'playSound', asset: 'sound.x' }], next: { kind: 'stay' } },
        },
      },
    }
    // 故意非法输入必须落到类型域之外：仅对这一个叶做收窄突变（合法路径全程零强转）
    const broken = JSON.parse(JSON.stringify(enemy)) as EnemyDef
    const leaf = broken.ai.hooks!.ready!.states.bad!.body[0]! as { kind: string }
    leaf.kind = '不存在的命令'
    const before = JSON.parse(JSON.stringify(broken)) as unknown
    let message = ''
    try {
      validateEnemies([broken])
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).not.toBe('')
    expect(message).toContain('enemies[0].ai.hooks.ready.states.bad.body[0]') // 生产 path 带 owner+位置
    expect(broken).toEqual(before) // 输入深保真
  })

  test('G06-05 跨面非法：onDefeated branch 非法 cond 经 enemy→author 递归被拒且输入深等', () => {
    const enemy = labEnemy()
    enemy.onDefeated = [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'lab-flag', is: true },
        then: [{ kind: 'playSound', asset: 'sound.then' }],
        else: [],
      },
    ]
    // 故意非法 cond：同上，单字段收窄突变
    const broken = JSON.parse(JSON.stringify(enemy)) as EnemyDef
    const cond = (broken.onDefeated![0] as { cond: Record<string, unknown> }).cond
    delete cond.is
    cond.op = '不存在的比较'
    const before = JSON.parse(JSON.stringify(broken)) as unknown
    let message = ''
    try {
      validateEnemies([broken])
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).toContain('enemies[0].onDefeated[0]') // 错误 path 绑定（enemy→author 递归方向）
    expect(broken).toEqual(before) // 输入深保真
  })

  test('G06-06 正控：choreography 战斗演出钩子（author 命令叶）经 validateEnemies 递归通过', () => {
    // 工作包另一方向：author→enemy 的 choreography 入口（validate.ts → checkBattleChoreography）
    const enemy = labEnemy()
    enemy.choreography = [
      {
        at: 'battleStart',
        once: true,
        body: [
          { kind: 'dialog', cue: { rows: [{ text: '哈哈哈哈，就凭你们？' }] } },
          { kind: 'playSound', asset: 'sound.taunt' },
        ],
      },
    ]
    const before = JSON.parse(JSON.stringify(enemy)) as unknown
    expect(() => validateEnemies([enemy])).not.toThrow()
    expect(enemy).toEqual(before) // 输入深保真
  })

  test('G06-07 非法 choreography 叶：未知命令 kind 被拒且生产 path 精确到叶', () => {
    const enemy = labEnemy()
    enemy.choreography = [
      {
        at: 'turnStart',
        body: [{ kind: 'playSound', asset: 'sound.x' }],
      },
    ]
    // 故意非法叶：同 G06-04 口径，单字段收窄突变
    const broken = JSON.parse(JSON.stringify(enemy)) as EnemyDef
    const leaf = broken.choreography![0]!.body[0]! as { kind: string }
    leaf.kind = '不存在的命令'
    const before = JSON.parse(JSON.stringify(broken)) as unknown
    let message = ''
    try {
      validateEnemies([broken])
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).toContain('enemies[0].choreography[0].body[0]') // 生产 path 精确到叶
    expect(broken).toEqual(before) // 输入深保真
  })

  test('G06-08 正控：hooks.turnStart 频道（第二频道）经 validateEnemies 递归通过且输入深等', () => {
    // 去重矩阵补口：lab 既有例只走 hooks.ready；turnStart 是 checkEnemyAi 的第二合法频道
    //（enemy-script.ts:556，exactKeys 只允许 ready/turnStart——频道键拒绝由官方 boundaries 覆盖）
    const enemy = labEnemy()
    enemy.ai.hooks = {
      turnStart: {
        initial: 's0',
        states: {
          s0: {
            body: [{ kind: 'playSound', asset: 'sound.turn' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const before = JSON.parse(JSON.stringify(enemy)) as unknown
    expect(() => validateEnemies([enemy])).not.toThrow()
    expect(enemy).toEqual(before)
  })

  test('G06-09 正控：onDefeated branch 嵌套 branch（then/else 递归 589/591）经 validateEnemies 通过', () => {
    // 去重矩阵补口：onDefeated 的 then/else 递归（enemy-script.ts:589/591）既有例只走一层；
    // 官方 wave2:178 证 nonempty 臂与计数错误——此处补合法嵌套 typed 组合
    const enemy = labEnemy()
    enemy.onDefeated = [
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'lab-a', is: true },
        then: [
          {
            kind: 'branch',
            cond: { kind: 'all', of: [{ kind: 'flag', flag: 'lab-b', is: false }] },
            then: [{ kind: 'playSound', asset: 'sound.deep' }],
            else: [],
          },
        ],
        else: [{ kind: 'wait', ms: 120 }],
      },
    ]
    const before = JSON.parse(JSON.stringify(enemy)) as unknown
    expect(() => validateEnemies([enemy])).not.toThrow()
    expect(enemy).toEqual(before)
  })

  test('G06-10 options 透传：checkDialogueCue 经 hooks/onDefeated/choreography 三路递归拒绝非法 cue', () => {
    // 去重矩阵补口：dialog 臂的 options.checkDialogueCue 优先路径（enemy-script.ts:286-287）
    // 与 onDefeated 叶的 599 兜底是真实变体——校验选项沿 enemy→author 递归整链透传
    const cueGate = (cue: unknown, path: string): void => {
      const rows = (cue as { rows?: unknown[] }).rows
      if (!Array.isArray(rows) || rows.length === 0)
        throw new Error(`${path}.cue: 实验门要求非空 rows`)
    }
    const options = { checkDialogueCue: cueGate }
    /** route 决定非法 cue 挂在哪个入口；其余入口挂合法 cue 以隔离证明单路透传。 */
    const mkEnemy = (route: 'hooks' | 'onDefeated' | 'choreography', bad: boolean): EnemyDef => {
      const cue = bad ? { rows: [] } : { rows: [{ text: '合法台词' }] }
      const enemy = labEnemy()
      enemy.ai.hooks =
        route === 'hooks'
          ? {
              ready: {
                initial: 's0',
                states: { s0: { body: [{ kind: 'dialog', cue }], next: { kind: 'stay' } } },
              },
            }
          : {
              ready: {
                initial: 's0',
                states: {
                  s0: { body: [{ kind: 'playSound', asset: 'sound.ok' }], next: { kind: 'stay' } },
                },
              },
            }
      enemy.onDefeated = route === 'onDefeated' ? [{ kind: 'dialog', cue }] : []
      enemy.choreography =
        route === 'choreography'
          ? [{ at: 'battleStart', body: [{ kind: 'dialog', cue }] }]
          : undefined
      return enemy
    }
    // 三路独立证明：非法 cue 只挂在被测入口时，同一选项沿该路递归拒绝
    expect(() => validateEnemies([mkEnemy('hooks', true)], options)).toThrowError(
      /实验门要求非空 rows/,
    )
    expect(() => validateEnemies([mkEnemy('onDefeated', true)], options)).toThrowError(
      /实验门要求非空 rows/,
    )
    expect(() => validateEnemies([mkEnemy('choreography', true)], options)).toThrowError(
      /实验门要求非空 rows/,
    )
    // 正控：三路合法 cue 在同一 options 下整链通过（拒绝来自 cue 内容而非选项误伤）
    expect(() => validateEnemies([mkEnemy('hooks', false)], options)).not.toThrow()
    expect(() => validateEnemies([mkEnemy('onDefeated', false)], options)).not.toThrow()
    expect(() => validateEnemies([mkEnemy('choreography', false)], options)).not.toThrow()
  })
})
