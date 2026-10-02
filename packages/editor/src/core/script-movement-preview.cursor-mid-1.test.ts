import type { AuthorCommand, AuthorScriptLibrary } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  cols,
  flowOf,
  foreign,
  ghost,
  move,
  nodeCols,
  other,
  pos,
  preview,
  scene,
  target,
} from './__tests__/cursor-preview-mid-1/fixtures.js'
import { collectScriptMovementPreview } from './script-movement-preview.js'

describe('C2 cursor-mid-1 分支合流知识', () => {
  test('C2-01 两臂同落点但不同 node 时后续从合成起点连线，不跨回分支前', () => {
    const result = preview([
      move(2),
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'choice', is: true },
        then: [move(5)],
        else: [{ kind: 'setEntityPos', target, pos: pos(5) }],
      },
      move(6),
    ])
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 5, true],
      [5, 6, false],
    ])
    expect(nodeCols(result)).toEqual([
      [undefined, 1, 'start'],
      [1, 2, 'move'],
      [2, 5, 'move'],
      [3, 5, 'teleport'],
      [undefined, 5, 'start'],
      [4, 6, 'move'],
    ])
    expect(result.notes.join(' ')).toContain('虚线表示条件或循环路线')
  })

  test('C2-02 两臂都不改位置时保留分支前 node，后续实线直接衔接', () => {
    const noop: AuthorCommand = { kind: 'animEntity', target }
    const result = preview([
      move(2),
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'choice', is: true },
        then: [noop],
        else: [noop],
      },
      move(6),
    ])
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 6, false],
    ])
    expect(result.tracks[0]?.nodes.filter((node) => node.pos.col === 2)).toHaveLength(1)
  })

  test('C2-03 两臂同列 move 仍因 node 引用不同而清零起点，后续合成起点', () => {
    const result = preview([
      move(2),
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'choice', is: true },
        then: [move(5)],
        else: [move(5)],
      },
      move(8),
    ])
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 5, true],
      [2, 5, true],
      [5, 8, false],
    ])
    const startsAtFive = result.tracks[0]?.nodes.filter(
      (node) => node.pos.col === 5 && node.kind === 'start',
    )
    expect(startsAtFive).toHaveLength(1)
  })
})

describe('C3 cursor-mid-1 挂载与追逐动态边界', () => {
  test('C3-01 ride 标载具目标虚线，队伍位置清空且无队伍连线', () => {
    const result = preview([
      { kind: 'ride', target, to: pos(4), speed: 'normal' },
      { kind: 'moveParty', to: pos(7), speed: 'normal' },
    ])
    const party = result.tracks.find((track) => track.target.kind === 'party')!
    expect(party.segments).toEqual([])
    expect(party.nodes.map((node) => [node.kind, node.pos.col])).toEqual([['move', 7]])
    expect(cols(result)).toEqual([[1, 4, true]])
    expect(result.tracks[0]?.nodes.at(-1)).toMatchObject({
      pos: pos(4),
      kind: 'move',
      label: '骑行目标',
      conditional: true,
    })
    expect(result.notes.join(' ')).toContain('骑行只标出载具目标')
    expect(result.notes.join(' ')).toContain('队伍挂载位置不作固定路径预测')
  })

  test('C3-02 mountParty 清空队伍知识，后续绝对 moveParty 仅孤立节点不连旧位', () => {
    const result = preview([
      { kind: 'mountParty', target },
      { kind: 'moveParty', to: pos(7), speed: 'normal' },
      move(3),
    ])
    const party = result.tracks.find((track) => track.target.kind === 'party')!
    expect(party.segments).toEqual([])
    expect(party.nodes.map((node) => [node.kind, node.pos.col, node.number])).toEqual([
      ['move', 7, 1],
    ])
    expect(result.notes.join(' ')).toContain('挂载后的队伍位置由载具决定')
    const aunt = result.tracks.find(
      (track) => track.target.kind === 'entity' && track.target.address.entity === 'aunt',
    )!
    expect(
      aunt.segments.map((segment) => [
        segment.from.pos.col,
        segment.to.pos.col,
        segment.conditional,
      ]),
    ).toEqual([[1, 3, false]])
  })

  test('C3-03 顶层 chasePlayer 无 owner 时不绘制 dynamic，仅记缺少触发实体', () => {
    const result = collectScriptMovementPreview({
      scene,
      flow: flowOf([{ kind: 'chasePlayer' }, move(4)]),
    })
    expect(result.tracks[0]?.nodes.some((node) => node.kind === 'dynamic')).toBe(false)
    expect(cols(result)).toEqual([[1, 4, false]])
    expect(result.notes.join(' ')).toContain('追逐缺少当前场景的触发实体')
  })

  test('C3-04 mount 后 setEntityPosRelParty 因队伍未知而清空实体位，不伪造落点', () => {
    const result = preview([
      { kind: 'mountParty', target },
      { kind: 'setEntityPosRelParty', target, dcol: 2, drow: 3 },
      move(6),
    ])
    expect(result.notes.join(' ')).toContain('队伍位置不确定，未猜测相对摆位落点')
    expect(result.tracks[0]?.nodes.some((node) => node.pos.col === 2 && node.pos.row === 3)).toBe(
      false,
    )
    expect(cols(result)).toEqual([])
    expect(result.tracks[0]?.nodes.map((node) => [node.kind, node.pos.col])).toEqual([['move', 6]])
  })

  test('C3-05 ride 后其它实体仍可独立绝对移动', () => {
    const result = preview([{ kind: 'ride', target, to: pos(4), speed: 'normal' }, move(11, other)])
    const aunt = result.tracks.find(
      (track) => track.target.kind === 'entity' && track.target.address.entity === 'aunt',
    )!
    const guest = result.tracks.find(
      (track) => track.target.kind === 'entity' && track.target.address.entity === 'guest',
    )!
    expect(
      aunt.segments.map((segment) => [
        segment.from.pos.col,
        segment.to.pos.col,
        segment.conditional,
      ]),
    ).toEqual([[1, 4, true]])
    expect(
      guest.segments.map((segment) => [
        segment.from.pos.col,
        segment.to.pos.col,
        segment.conditional,
      ]),
    ).toEqual([[9, 11, false]])
  })
})

describe('C4 cursor-mid-1 条件结果族', () => {
  test('C4-01 confirm 空同意臂与 onNo 虚线臂并存，分歧后单步无连入段', () => {
    const result = preview([
      move(2),
      {
        kind: 'confirm',
        id: 'ask',
        onNo: [move(4)],
      },
      move(9),
    ])
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 4, true],
    ])
    expect(result.tracks[0]?.nodes.some((node) => node.pos.col === 9 && node.kind === 'move')).toBe(
      true,
    )
    expect(result.notes.join(' ')).toContain('虚线表示条件或循环路线')
    expect(result.notes.join(' ')).toContain('分支后的未知位置')
  })

  test('C4-02 startBattle 缺省胜利空臂，仅 onLose/onFlee 有虚线落点', () => {
    const result = preview([
      move(2),
      {
        kind: 'startBattle',
        enemyTeamId: 'bandits',
        onLose: [move(4)],
        onFlee: [move(7)],
      },
      move(10),
      move(11),
    ])
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 4, true],
      [2, 7, true],
      [10, 11, false],
    ])
    expect(nodeCols(result)).toEqual([
      [undefined, 1, 'start'],
      [1, 2, 'move'],
      [2, 4, 'move'],
      [3, 7, 'move'],
      [4, 10, 'move'],
      [5, 11, 'move'],
    ])
  })

  test('C4-03 startBattle 三结果臂从同一已知点发散，不含胜利实线拼接', () => {
    const result = preview([
      move(2),
      {
        kind: 'startBattle',
        enemyTeamId: 'boss',
        onLose: [move(3)],
        onFlee: [move(5)],
      },
    ])
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 3, true],
      [2, 5, true],
    ])
    expect(
      result.tracks[0]?.segments.every(
        (segment) => !segment.conditional || segment.from.pos.col === 2,
      ),
    ).toBe(true)
    expect(result.notes.join(' ')).toContain('虚线表示条件或循环路线')
  })

  test('C4-04 teleportOut 展开 onFail 后 boundary，后续绝对移动不绘制', () => {
    const result = preview([
      move(2),
      {
        kind: 'teleportOut',
        onFail: [move(4)],
      },
      move(99),
    ])
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 4, true],
    ])
    expect(result.tracks[0]?.nodes.some((node) => node.pos.col === 99)).toBe(false)
    expect(result.notes.join(' ')).toContain('传送结果不确定')
    expect(result.notes.join(' ')).toContain('后续轨迹不在当前地图继续绘制')
  })

  test('C4-05 confirm 同意保留原位、拒绝瞬移导致分歧，后续孤立节点无假连线', () => {
    const result = preview([
      move(2),
      {
        kind: 'confirm',
        onNo: [{ kind: 'setEntityPos', target, pos: pos(5) }],
      },
      move(6),
      move(7),
    ])
    expect(cols(result)).toEqual([
      [1, 2, false],
      [6, 7, false],
    ])
    expect(
      result.tracks[0]?.nodes.some((node) => node.pos.col === 5 && node.kind === 'teleport'),
    ).toBe(true)
    expect(result.notes.join(' ')).toContain('分支后的未知位置')
  })
})

describe('C5 cursor-mid-1 共享调用域', () => {
  test('C5-01 缺失共享脚本 invalidate 后后续绝对移动仅孤立节点，不伪造连线', () => {
    const result = preview([move(2), { kind: 'callScript', script: 'missing' }, move(8), move(9)])
    expect(result.notes.join(' ')).toContain('共享脚本 missing 缺失')
    expect(cols(result)).toEqual([
      [1, 2, false],
      [8, 9, false],
    ])
    expect(result.tracks[0]?.nodes.map((node) => node.pos.col)).toEqual([1, 2, 8, 9])
  })

  test('C5-02 32 层嵌套共享调用触达上限后不再展开，末段列精确', () => {
    const shared: AuthorScriptLibrary = {}
    for (let index = 0; index < 33; index++) {
      shared[`s${index}`] = {
        name: `s${index}`,
        self: 'none',
        body: [{ kind: 'callScript', script: `s${index + 1}` }],
      }
    }
    shared.s33 = { name: 's33', self: 'none', body: [move(7)] }
    const result = preview([{ kind: 'callScript', script: 's0' }, move(9), move(10)], {
      sharedScripts: shared,
    })
    expect(result.notes.join(' ')).toContain('递归共享脚本未展开')
    expect(cols(result)).toEqual([[9, 10, false]])
    expect(result.tracks[0]?.nodes.some((node) => node.pos.col === 7)).toBe(false)
  })

  test('C5-03 self none 库被显式 self 调用时记不合法并 boundary，截断后续', () => {
    const shared: AuthorScriptLibrary = {
      none: { name: '无触发者', self: 'none', body: [move(3)] },
    }
    const result = preview([{ kind: 'callScript', script: 'none', self: target }, move(8)], {
      sharedScripts: shared,
    })
    expect(result.notes.join(' ')).toContain('触发实体参数不合法')
    expect(result.tracks).toEqual([])
    expect(result.tracks.some((track) => track.nodes.some((node) => node.pos.col === 3))).toBe(
      false,
    )
    expect(result.tracks.some((track) => track.nodes.some((node) => node.pos.col === 8))).toBe(
      false,
    )
  })

  test('C5-04 两个独立 sibling 共享脚本依次展开，轨迹不串台', () => {
    const shared: AuthorScriptLibrary = {
      local: { name: '局部', self: 'none', body: [move(2)] },
      otherArm: { name: '另一库', self: 'none', body: [move(8, other)] },
    }
    const result = preview(
      [
        { kind: 'callScript', script: 'local' },
        { kind: 'callScript', script: 'otherArm' },
        move(4),
      ],
      { sharedScripts: shared },
    )
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 4, false],
    ])
    const guest = result.tracks.find(
      (track) => track.target.kind === 'entity' && track.target.address.entity === 'guest',
    )!
    expect(guest.segments.map((segment) => [segment.from.pos.col, segment.to.pos.col])).toEqual([
      [9, 8],
    ])
  })
})

describe('C6 cursor-mid-1 地图与可见目标', () => {
  test('C6-01 setSceneMapOverride 当前场景 boundary，后续移动不进 segments', () => {
    const result = preview([move(2), { kind: 'setSceneMapOverride', mapId: 'night-inn' }, move(5)])
    expect(cols(result)).toEqual([[1, 2, false]])
    expect(result.tracks[0]?.nodes.some((node) => node.pos.col === 5)).toBe(false)
    expect(result.notes.join(' ')).toContain('地图更换之后的轨迹不在当前底图显示')
  })

  test('C6-02 setSceneMapOverride 显式当前 scene id 同样 boundary', () => {
    const result = preview([
      move(2),
      { kind: 'setSceneMapOverride', scene: 'inn', mapId: 'alt' },
      move(5),
    ])
    expect(cols(result)).toEqual([[1, 2, false]])
    expect(result.notes.join(' ')).toContain('地图更换')
  })

  test('C6-03 setSceneMapOverride 仅其它 scene 不 boundary，后续本图移动照常', () => {
    const result = preview([
      move(2),
      { kind: 'setSceneMapOverride', scene: 'forest', mapId: 'forest-night' },
      move(5),
    ])
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 5, false],
    ])
    expect(result.notes.join(' ')).not.toContain('地图更换')
  })

  test('C6-04 当前 scene 无该实体时记不在当前场景，不建 track', () => {
    const result = preview([move(2, ghost), move(4)])
    expect(result.notes.join(' ')).toContain('移动目标 ghost 不在当前场景')
    expect(
      result.tracks.some(
        (track) => track.target.kind === 'entity' && track.target.address.entity === 'ghost',
      ),
    ).toBe(false)
    expect(cols(result)).toEqual([[1, 4, false]])
  })

  test('C6-05 跨 scene 实体坐标不绘制，且不依赖 loadScene', () => {
    const result = preview([
      move(2),
      {
        kind: 'moveEntity',
        target: foreign,
        to: pos(40),
        speed: 'normal',
      },
      move(5),
    ])
    expect(result.notes.join(' ')).toContain('跨场景实体的移动不在当前地图绘制')
    expect(result.tracks).toHaveLength(1)
    expect(cols(result)).toEqual([
      [1, 2, false],
      [2, 5, false],
    ])
    expect(result.tracks[0]?.nodes.some((node) => node.pos.col === 40)).toBe(false)
  })
})

describe('C7 cursor-mid-1 显示容量与步号', () => {
  test('C7-01 第 10001 条命令触发脚本过长 boundary，末列停在上限前最后一次 move', () => {
    const body: AuthorCommand[] = []
    for (let index = 0; index < 9999; index++) body.push({ kind: 'animEntity', target })
    body.push(move(3))
    body.push(move(4))
    body.push(move(5))
    const result = preview(body)
    expect(result.notes.join(' ')).toContain('脚本过长，轨迹仅显示前面的编排')
    expect(cols(result)).toEqual([[1, 3, false]])
    expect(result.tracks[0]?.nodes.some((node) => node.pos.col === 4 || node.pos.col === 5)).toBe(
      false,
    )
  })

  test('C7-02 重复瞬移文案经 Set 去重，notes 数组仅一份', () => {
    const result = preview([
      { kind: 'teleportParty', pos: pos(10) },
      { kind: 'teleportParty', pos: pos(20) },
      { kind: 'setEntityPos', target, pos: pos(30) },
    ])
    const diamond = result.notes.filter((note) => note.includes('菱形节点表示瞬移'))
    expect(diamond).toHaveLength(1)
    expect(result.notes.filter((note) => note === diamond[0])).toHaveLength(1)
  })

  test('C7-03 segment.from/to 引用同 track.nodes 内对象，非拷贝值相等', () => {
    const result = preview([move(2), move(3), move(4)])
    const track = result.tracks[0]!
    for (const segment of track.segments) {
      expect(track.nodes).toContain(segment.from)
      expect(track.nodes).toContain(segment.to)
      expect(track.nodes.indexOf(segment.from)).toBeGreaterThanOrEqual(0)
      expect(track.nodes.indexOf(segment.to)).toBeGreaterThanOrEqual(0)
    }
  })

  test('C7-04 条件臂内 move 的 segment.conditional 为 true，且与实体轨独立编号', () => {
    const result = preview([
      {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'go', is: true },
        then: [move(4), { kind: 'moveParty', to: pos(6), speed: 'normal' }],
        else: [],
      },
    ])
    const aunt = result.tracks[0]!
    const party = result.tracks.find((track) => track.target.kind === 'party')!
    expect(aunt.segments.every((segment) => segment.conditional)).toBe(true)
    expect(aunt.nodes.map((node) => node.number)).toEqual([undefined, 1])
    expect(party.nodes.map((node) => [node.number, node.pos.col])).toEqual([
      [undefined, 0],
      [1, 6],
    ])
  })
})
