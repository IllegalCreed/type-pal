// @vitest-environment jsdom

import {
  type Command,
  type SceneDef,
  type ScriptCondition,
  validateScenes,
} from '@type-pal/content'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { CanonicalScriptBodyEditor } from './ScriptEditor.js'
import { describeScriptCommand } from './ScriptTree.js'

const names = new Map([
  ['item:potion', '止血草'],
  ['actor:hero', '逍遥'],
  ['sprite:hero-walk', '逍遥行走'],
  ['skill:heal', '气疗术'],
  ['asset:video.1', '开场影片'],
  ['authorScript:shared/user/help', '帮忙脚本'],
])
const refs: ScriptReferenceCatalog = {
  choices: () => [],
  has: (kind, id) => names.has(`${kind}:${id}`),
  label: (kind, id) => names.get(`${kind}:${id}`) ?? `⚠未知${kind}:${id}`,
}
const describeCommand = (cmd: Command) => describeScriptCommand(cmd, {}, undefined, refs)

describe('当前脚本摘要的独立业务合同', () => {
  test('战斗/场景/音乐与角色指令保留目标身份、选项和具体结果', () => {
    const cases: { command: Command; label: string; detail?: string }[] = [
      { command: { kind: 'chasePlayer' }, label: '追逐玩家(范围 8 格 · 速度 4)' },
      {
        command: { kind: 'chasePlayer', range: 3, speed: 2, floating: true },
        label: '追逐玩家(范围 3 格 · 速度 2 · 忽略障碍)',
      },
      { command: { kind: 'vanishEntity' }, label: '自身 消失 2s(重生)' },
      {
        command: { kind: 'vanishEntity', entity: 'guard', seconds: 7 },
        label: 'guard 消失 7s(重生)',
      },
      { command: { kind: 'loadLastSave' }, label: '读最近存档' },
      { command: { kind: 'gameOver' }, label: '战败流程(渐红 + 文案 + 读档)' },
      { command: { kind: 'fade', dir: 'out' }, label: '淡出（黑）' },
      { command: { kind: 'fade', dir: 'in' }, label: '淡入' },
      {
        command: { kind: 'holdScreen', color: 'black', token: 'pause' },
        label: '保持黑屏',
        detail: '迁移演出事务',
      },
      {
        command: { kind: 'revealScreen', token: 'pause' },
        label: '恢复画面',
        detail: '迁移演出事务',
      },
      { command: { kind: 'ditherScreen', ms: 480 }, label: '逐像素渐变 480ms' },
      { command: { kind: 'playVideo', asset: 'video.1' }, label: '播放视频 开场影片' },
      { command: { kind: 'wait', ms: 160 }, label: '等待 160ms' },
      {
        command: { kind: 'teleportParty', pos: { col: 3, row: -2, height: 0 } },
        label: '队伍瞬移',
        detail: '(3,-2)',
      },
      { command: { kind: 'setPartyFacing', facing: 'up' }, label: '队伍转向 up' },
      {
        command: { kind: 'setActorSprite', actor: 'hero', sprite: 'hero-walk' },
        label: '逍遥 换精灵',
        detail: '逍遥行走',
      },
      { command: { kind: 'fleeBattle' }, label: '敌人逃离战场' },
      { command: { kind: 'endBattle', result: 'won' }, label: '战斗结束(判胜)' },
      { command: { kind: 'endBattle', result: 'lost' }, label: '战斗结束(判负)' },
      { command: { kind: 'endBattle', result: 'terminate' }, label: '战斗结束(终止无奖励)' },
      { command: { kind: 'setEntityState', entity: 'aunt', state: 0 }, label: 'aunt → 隐藏' },
      {
        command: { kind: 'setEntityPos', entity: 'aunt', pos: { col: 2, row: 4, height: 0 } },
        label: 'aunt 定位',
        detail: '(2,4)',
      },
      { command: { kind: 'shakeScreen', frames: 4, level: 3 }, label: '震屏 4 帧 · 幅 3' },
      { command: { kind: 'increaseHpMp', pools: 'mp', delta: -10 }, label: '全队 MP -10' },
      { command: { kind: 'increaseHpMp', pools: 'hp', delta: 5 }, label: '全队 HP +5' },
      {
        command: { kind: 'learnSkill', role: 0, skill: 'heal' },
        label: '原版角色槽位 0 习得 气疗术',
      },
      { command: { kind: 'setFollowers', sprites: [] }, label: '清跟随者' },
      { command: { kind: 'setFollowers', sprites: ['hero-walk'] }, label: '编外跟随者 逍遥行走' },
      { command: { kind: 'giveItem', itemId: 'potion', count: 2 }, label: '获得物品 止血草 ×2' },
      { command: { kind: 'loseItem', itemId: 'potion' }, label: '失去物品 止血草' },
      { command: { kind: 'giveMoney', delta: -20 }, label: '扣除 20 钱' },
      { command: { kind: 'setFlag', flag: 'opened', value: false }, label: '旗标 opened = 假' },
      { command: { kind: 'setVar', var: 'doors', value: 3 }, label: '变量 doors = 3' },
      { command: { kind: 'addVar', var: 'doors', delta: 2 }, label: '变量 doors +2' },
      { command: { kind: 'takeEntity', entity: 'aunt' }, label: '接管 aunt' },
      { command: { kind: 'releaseEntity' }, label: '归还 (全部)' },
      {
        command: {
          kind: 'moveEntity',
          entity: 'aunt',
          to: { col: 5, row: 6, height: 0 },
          speed: 'normal',
        },
        label: 'aunt 走到',
        detail: '(5,6) normal',
      },
      {
        command: { kind: 'nudgeEntity', entity: 'aunt', dx: 4, dy: -2 },
        label: 'aunt 位移',
        detail: '(4,-2)px',
      },
      {
        command: { kind: 'moveParty', to: { col: 5, row: 6, height: 0 }, speed: 'slow' },
        label: '队伍走到',
        detail: '(5,6) slow',
      },
      {
        command: { kind: 'nudgeParty', dx: 4, dy: -2, layer: 1 },
        label: '队伍位移',
        detail: '(4,-2)px · 层1',
      },
      {
        command: {
          kind: 'startBattle',
          enemyTeamId: '3',
          auto: true,
          onLose: [{ kind: 'wait', ms: 40 }],
        },
        label: '战斗 敌队 3 · 自动',
      },
      { command: { kind: 'openShop', shop: 4, mode: 'buy' }, label: '商店 4', detail: '买' },
    ]
    for (const { command, label, detail } of cases) {
      const original = structuredClone(command)
      const actual = describeCommand(command)
      expect(actual.label, command.kind).toBe(label)
      expect(actual.detail, command.kind).toBe(detail)
      expect(actual.icon, command.kind).not.toBe('')
      expect(command).toEqual(original)
    }
    expect(describeCommand(cases.at(-2)!.command).blocks).toEqual([
      { title: '战败', seg: 'onLose', body: [{ kind: 'wait', ms: 40 }] },
    ])
  })

  test('条件组合保留逻辑关系与引用身份，不把空值当数值门槛', () => {
    const conditions: [ScriptCondition, string][] = [
      [{ kind: 'flag', flag: 'opened', is: false }, '旗标 opened 为假'],
      [{ kind: 'var', var: 'doors', op: '>=', value: 2 }, '变量 doors >= 2'],
      [{ kind: 'currentScene', scene: 'room' }, '当前场景是 room'],
      [{ kind: 'entityState', entity: 'aunt', is: 1 }, 'aunt 状态 = 1'],
      [{ kind: 'entityInScene', entity: 'aunt' }, 'aunt 在本场景'],
      [{ kind: 'chance', percent: 25 }, '25% 概率'],
      [{ kind: 'hasItem', itemId: 'potion' }, '持有物品 止血草'],
      [{ kind: 'hasItem', itemId: 'potion', atLeast: 2 }, '持有物品 止血草≥2'],
      [{ kind: 'ownsItem', itemId: 'potion', atLeast: 2 }, '拥有物品 止血草≥2（背包与装备合计）'],
      [{ kind: 'itemEquipped', itemId: 'potion', atLeast: 1 }, '装备物品 止血草'],
      [{ kind: 'itemEquipped', itemId: 'potion', atLeast: 3 }, '装备物品 止血草≥3'],
      [{ kind: 'facingEntity', entity: 'aunt' }, '面向实体 aunt'],
      [{ kind: 'facingEntity', entity: 'aunt', range: 2 }, '面向实体 aunt（2 格内）'],
      [{ kind: 'allFullHp' }, '全队满血'],
      [{ kind: 'hasMoney', atLeast: 10 }, '钱 ≥ 10'],
      [{ kind: 'inParty', actorId: 'hero' }, '队伍含 逍遥'],
      [
        { kind: 'all', of: [{ kind: 'allFullHp' }, { kind: 'hasMoney', atLeast: 10 }] },
        '全队满血 且 钱 ≥ 10',
      ],
      [
        { kind: 'any', of: [{ kind: 'allFullHp' }, { kind: 'hasMoney', atLeast: 10 }] },
        '全队满血 或 钱 ≥ 10',
      ],
      [{ kind: 'not', cond: { kind: 'allFullHp' } }, '非(全队满血)'],
    ]
    for (const [cond, expected] of conditions) {
      const original = structuredClone(cond)
      const result = describeCommand({ kind: 'branch', cond, then: [] })
      expect(result.label).toBe(`如果 ${expected}`)
      expect(result.blocks).toEqual([{ title: '则', seg: 'then', body: [] }])
      expect(cond).toEqual(original)
    }
  })

  test('切场景与对话的不同目标模式、页身份和可选资源仍能在摘要中辨认', () => {
    const scene: SceneDef = {
      id: 'room',
      mapId: 'map',
      entry: { pos: { col: 4, row: 3, height: 0 }, facing: 'down' },
      entries: { door: { label: '正门', pos: { col: 1, row: 2, height: 3 } } },
      entities: [],
    }
    validateScenes([scene])
    const cases: Array<{ command: Command; label: string; detail?: string }> = [
      {
        command: { kind: 'loadScene', scene: 'room' },
        label: '切到场景 room',
        detail: '默认落点 · 现代过渡',
      },
      {
        command: { kind: 'loadScene', scene: 'room', entryId: 'door' },
        label: '切到场景 room',
        detail: '正门 · door · (1,2,h3) · 现代过渡',
      },
      {
        command: { kind: 'loadScene', scene: 'room', pos: { col: 7, row: 8, height: 0 } },
        label: '切到场景 room',
        detail: '临时坐标 (7,8,h0) · 现代过渡',
      },
      {
        command: { kind: 'loadScene', scene: 'room', entryId: 'missing' },
        label: '切到场景 room',
        detail: 'missing (落点缺失) · 现代过渡',
      },
      {
        command: { kind: 'setPartyFacing', facing: 'left', gesture: 6, member: 1 },
        label: '队伍姿势帧 6(向 left)',
        detail: '队员 1',
      },
      {
        command: { kind: 'playFrameAnimation', asset: 'video.1' },
        label: '播放帧动画 开场影片',
        detail: '0..末帧',
      },
      {
        command: {
          kind: 'playFrameAnimation',
          asset: 'video.1',
          startFrame: 2,
          endFrame: 4,
          frameRate: 12,
        },
        label: '播放帧动画 开场影片',
        detail: '2..4 · 12fps',
      },
      {
        command: { kind: 'setActorAppearance', actor: 'hero', spriteId: 'hero-walk' },
        label: '逍遥 换形象',
        detail: '逍遥行走',
      },
      {
        command: { kind: 'setActorAppearance', actor: 'hero', portrait: 'video.1' },
        label: '逍遥 换形象',
        detail: '立绘 开场影片',
      },
      { command: { kind: 'setActorAppearance', actor: 'hero' }, label: '逍遥 换形象', detail: '' },
    ]
    for (const { command, label, detail } of cases) {
      const before = structuredClone(command)
      const result = describeScriptCommand(command, {}, [scene], refs)
      expect(result.label, command.kind).toBe(label)
      expect(result.detail, command.kind).toBe(detail)
      expect(command).toEqual(before)
    }
  })

  test('分支、可复用脚本与终态的路径段使用当前作者身份', () => {
    const authorRef = { chunk: 'shared', id: 'shared/user/help' }
    const internalRef = { chunk: 'shared', id: 'shared/internal/old' }
    const branch = describeCommand({
      kind: 'branch',
      cond: { kind: 'allFullHp' },
      then: [{ kind: 'wait', ms: 40 }],
      else: [{ kind: 'wait', ms: 80 }],
    })
    expect(branch.blocks).toEqual([
      { title: '则', seg: 'then', body: [{ kind: 'wait', ms: 40 }] },
      { title: '否则', seg: 'else', body: [{ kind: 'wait', ms: 80 }] },
    ])
    expect(
      describeCommand({ kind: 'teleportOut', onFail: [{ kind: 'wait', ms: 40 }] }).blocks,
    ).toEqual([{ title: '不灵(无出口)', seg: 'onFail', body: [{ kind: 'wait', ms: 40 }] }])
    expect(describeCommand({ kind: 'confirm', onNo: [] }).blocks).toEqual([
      { title: '选「否」', seg: 'onNo', body: [] },
    ])
    for (const kind of ['callScript', 'jumpScript'] as const) {
      expect(describeCommand({ kind, ref: authorRef })).toMatchObject({
        label: kind === 'callScript' ? '调用可复用脚本' : '跳转可复用脚本',
        detail: '帮忙脚本',
      })
      expect(describeCommand({ kind, ref: internalRef })).toMatchObject({
        label: kind === 'callScript' ? '调用迁移内部实现' : '跳转迁移内部实现',
        detail: 'shared · shared/internal/old',
      })
    }
    expect(
      describeCommand({ kind: 'startBattle', enemyTeamId: 'team', onFlee: [] }).blocks,
    ).toEqual([{ title: '逃跑', seg: 'onFlee', body: [] }])
  })

  test('当前作者脚本列表的摘要来自实际展示函数，命令输入保持不变', () => {
    const body = [
      { kind: 'wait', ms: 80 },
      { kind: 'setPartyFacing', facing: 'up' },
      {
        kind: 'moveEntity',
        target: { scene: 'room', entity: 'aunt' },
        to: { col: 3, row: 4, height: 0 },
        speed: 'normal',
      },
      { kind: 'giveItem', itemId: 'potion', count: 2 },
    ] as const
    const before = structuredClone(body)
    const html = renderToStaticMarkup(
      createElement(CanonicalScriptBodyEditor, { body, onChange: () => undefined }),
    )
    for (const visible of ['等待', '队伍转向', 'aunt 走到', '获得物品']) {
      expect(html).toContain(visible)
    }
    expect(body).toEqual(before)
  })
})
