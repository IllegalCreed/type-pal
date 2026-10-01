/** TEST-GLM-WAVE-O-1 O09：运行态 hostile/钩子与运行态场景入口残余合同。
 *  旧证：runtime-scene.wave2 / small-guards 覆盖基础入口；本卡按 gap-map 直击未覆盖臂：
 *  checkRuntimeHostileBehavior 胜利/逃跑策略、chase 形状、onLose 递归，
 *  validateRuntimeScenes onEnter/onTeleport 归置轴。
 */
import { describe, expect, test } from 'vitest'
import { checkRuntimeHostileBehavior } from './runtime-scene.js'
import { validateRuntimeScenes } from './validate-runtime.js'

const hostile = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  enemyTeamId: 't1',
  onVictory: { kind: 'remove' },
  onPlayerFlee: { kind: 'remain' },
  ...over,
})

describe('O09 checkRuntimeHostileBehavior：策略域', () => {
  test('合法最小 hostile 通过；victory hide 带 ticks 合法', () => {
    expect(() => checkRuntimeHostileBehavior(hostile())).not.toThrow()
    expect(() =>
      checkRuntimeHostileBehavior(hostile({ onVictory: { kind: 'hide', ticks: 30 } })),
    ).not.toThrow()
  })

  test('缺 onVictory / 缺 onPlayerFlee / victory 未知 kind 逐轴拒绝', () => {
    const missingVictory = hostile()
    delete (missingVictory as Record<string, unknown>).onVictory
    expect(() => checkRuntimeHostileBehavior(missingVictory)).toThrow(/缺键 "onVictory"/)
    expect(() => checkRuntimeHostileBehavior(hostile({ onPlayerFlee: undefined }))).toThrow(
      /onPlayerFlee/,
    )
    expect(() => checkRuntimeHostileBehavior(hostile({ onVictory: { kind: 'explode' } }))).toThrow(
      /期望 hide\|remove\|remain/,
    )
  })

  test('onLose 自定义命令递归校验（未知 kind 在子树报错）', () => {
    expect(() =>
      checkRuntimeHostileBehavior(
        hostile({ onLose: [{ kind: 'nope' }] }) as Record<string, unknown>,
      ),
    ).toThrow()
    expect(() => checkRuntimeHostileBehavior(hostile({ onLose: 'gameOver' }))).not.toThrow()
  })

  test('chase：非正 speed 拒绝；负 range 拒绝', () => {
    expect(() => checkRuntimeHostileBehavior(hostile({ chase: { range: 3, speed: 0 } }))).toThrow(
      /speed/,
    )
    expect(() => checkRuntimeHostileBehavior(hostile({ chase: { range: -1, speed: 2 } }))).toThrow(
      /range/,
    )
  })
})

describe('O09 validateRuntimeScenes：脚本归置轴', () => {
  const scene = (over: Record<string, unknown>): Record<string, unknown> => ({
    id: 's',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    ...over,
  })

  test('onEnter 平铺字段拒绝（必须位于 hooks）', () => {
    expect(() => validateRuntimeScenes([scene({ onEnter: [] })])).toThrow(
      'scenes[0].onEnter: current 作者态脚本必须位于 hooks',
    )
  })

  test('onTeleport 平铺字段拒绝（必须位于 hooks）', () => {
    expect(() => validateRuntimeScenes([scene({ onTeleport: [] })])).toThrow(
      'scenes[0].onTeleport: current 作者态脚本必须位于 hooks',
    )
  })

  test('entities 非数组拒绝', () => {
    expect(() => validateRuntimeScenes([scene({ entities: 'x' })])).toThrow(
      'scenes[0].entities: 期望数组',
    )
  })
})
