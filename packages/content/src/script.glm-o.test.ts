/** TEST-GLM-WAVE-O-1 O07：运行态脚本命令表与 entry prepare 安全域残余合同。
 *  旧证：script.cursor-pure-wave2 / guard-residual 覆盖执行器；本卡按 gap-map 直击
 *  未覆盖臂：sceneEntryPrepareSafety 命令域、stageIndexFor/applyStageNext 游标语义、
 *  emptyProjectedWorldScriptState 形状。
 */
import { describe, expect, test } from 'vitest'
import {
  applyStageNext,
  type Command,
  emptyProjectedWorldScriptState,
  type ProjectedWorldScriptState,
  type ScriptStage,
  sceneEntryPrepareSafety,
  stageIndexFor,
} from './script.js'

describe('O07 sceneEntryPrepareSafety：进场 prepare 命令域', () => {
  test('纯摆位/外观类命令安全（safe）', () => {
    const commands: Command[] = [
      { kind: 'setEntityState', entity: 'e', state: 1 },
      { kind: 'setEntityFacing', entity: 'e', facing: 'down' },
      { kind: 'setEntityPos', entity: 'e', pos: { col: 0, row: 0, height: 0 } },
    ]
    for (const command of commands) expect(sceneEntryPrepareSafety(command)).toBe('safe')
  })

  test('loadScene / fade / startBattle / openShop 等阻断（blocked）', () => {
    expect(
      sceneEntryPrepareSafety({ kind: 'loadScene', scene: 's', entryId: 'default' } as Command),
    ).toBe('blocked')
    expect(sceneEntryPrepareSafety({ kind: 'fade', dir: 'out' } as Command)).toBe('blocked')
    expect(sceneEntryPrepareSafety({ kind: 'startBattle', enemyTeamId: 't1' } as Command)).toBe(
      'blocked',
    )
    expect(sceneEntryPrepareSafety({ kind: 'openShop', shop: 1, mode: 'buy' } as Command)).toBe(
      'blocked',
    )
  })

  test('wait 因不读取目标世界而安全（PAL 入场等待数帧合同）', () => {
    expect(sceneEntryPrepareSafety({ kind: 'wait', ms: 100 } as Command)).toBe('safe')
  })

  test('giveItem/mountParty/teleportParty/setFlag 资源与摆位类 safe', () => {
    expect(sceneEntryPrepareSafety({ kind: 'giveItem', itemId: '1', count: 1 } as Command)).toBe(
      'safe',
    )
    expect(sceneEntryPrepareSafety({ kind: 'setFlag', flag: 'f', value: true } as Command)).toBe(
      'safe',
    )
    expect(
      sceneEntryPrepareSafety({
        kind: 'teleportParty',
        pos: { col: 0, row: 0, height: 0 },
      } as Command),
    ).toBe('safe')
  })
})

describe('O07 stage 游标：stageIndexFor / applyStageNext', () => {
  const stages: ScriptStage[] = [
    { body: [], next: 'advance' },
    { body: [], next: 0 },
  ]
  let world: ProjectedWorldScriptState

  test('stageIndexFor：默认 0、钳制到 stages 上限', () => {
    world = emptyProjectedWorldScriptState()
    expect(stageIndexFor(world, 'k', stages)).toBe(0)
    world.entityStage.k = 99
    expect(stageIndexFor(world, 'k', stages)).toBe(1)
  })

  test('applyStageNext：advance 递增 / 数字重置 / undefined 不变', () => {
    world = emptyProjectedWorldScriptState()
    applyStageNext(world, 'k', 0, 'advance')
    expect(world.entityStage.k).toBe(1)
    applyStageNext(world, 'k', 1, 0)
    expect(world.entityStage.k).toBe(0)
    applyStageNext(world, 'k', 0, undefined)
    expect(world.entityStage.k).toBe(0)
  })
})

describe('O07 emptyProjectedWorldScriptState：初始形状', () => {
  test('flags/vars/entityState/stages 初始为空域', () => {
    const state = emptyProjectedWorldScriptState()
    expect(state.flags).toEqual({})
    expect(Object.keys(state).length).toBeGreaterThan(0)
    for (const value of Object.values(state)) {
      if (value && typeof value === 'object') expect(Object.keys(value)).toEqual([])
    }
  })
})
