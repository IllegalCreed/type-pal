/**
 * 脚本路径编辑纯函数(C-track v1)—— 按 ScriptRunner onStep 同款路径寻址,
 * 对 stages 做不可变的 改/插/删/移。路径形如 [0, 12, 'then', 3]。
 */
import type { Command, ScriptStage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  addStageAfter,
  getCommandAt,
  insertAfterAt,
  insertAtHead,
  moveAt,
  parsePath,
  removeAt,
  removeStage,
  setStageNext,
  updateCommandAt,
} from './script-edit.js'

const dlg = (t: string): Command => ({ kind: 'dialog', cue: { rows: [{ text: t }] } })
const stages = (): ScriptStage[] => [
  {
    body: [
      dlg('a'),
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 50 },
        then: [dlg('t0'), dlg('t1')],
        else: [dlg('e0')],
      },
      dlg('b'),
    ],
  },
  { body: [dlg('s1-0')] },
]

describe('parsePath', () => {
  test('字符串路径 → 段数组(数字/臂名混合)', () => {
    expect(parsePath('0/1/then/1')).toEqual([0, 1, 'then', 1])
    expect(parsePath('1/0')).toEqual([1, 0])
  })
})

describe('getCommandAt', () => {
  test('顶层与臂内寻址', () => {
    const s = stages()
    expect(getCommandAt(s, [0, 0])).toEqual(dlg('a'))
    expect(getCommandAt(s, [0, 1, 'then', 1])).toEqual(dlg('t1'))
    expect(getCommandAt(s, [0, 1, 'else', 0])).toEqual(dlg('e0'))
    expect(getCommandAt(s, [1, 0])).toEqual(dlg('s1-0'))
    expect(getCommandAt(s, [0, 9])).toBeUndefined()
  })
})

describe('updateCommandAt(不可变)', () => {
  test('替换臂内命令;旁路径同引用,源不变', () => {
    const s = stages()
    const out = updateCommandAt(s, [0, 1, 'then', 0], dlg('T0!'))
    expect(getCommandAt(out, [0, 1, 'then', 0])).toEqual(dlg('T0!'))
    expect(getCommandAt(s, [0, 1, 'then', 0])).toEqual(dlg('t0')) // 源不变
    expect(out[1]).toBe(s[1]) // 旁 stage 同引用
    expect(getCommandAt(out, [0, 1, 'else', 0])).toBe(getCommandAt(s, [0, 1, 'else', 0])) // 旁臂同引用
  })
})

describe('insertAfterAt / removeAt / moveAt', () => {
  test('插入到目标命令之后', () => {
    const out = insertAfterAt(stages(), [0, 0], dlg('new'))
    expect(out[0]!.body.map((c) => (c.kind === 'dialog' ? c.cue.rows[0]?.text : c.kind))).toEqual([
      'a',
      'new',
      'branch',
      'b',
    ])
  })
  test('臂内插入', () => {
    const out = insertAfterAt(stages(), [0, 1, 'then', 0], dlg('mid'))
    const arm = (getCommandAt(out, [0, 1]) as Extract<Command, { kind: 'branch' }>).then
    expect(arm.map((c) => (c as Extract<Command, { kind: 'dialog' }>).cue.rows[0]?.text)).toEqual([
      't0',
      'mid',
      't1',
    ])
  })
  test('删除(返回新数组,源不变)', () => {
    const s = stages()
    const out = removeAt(s, [0, 1, 'then', 0])
    const arm = (getCommandAt(out, [0, 1]) as Extract<Command, { kind: 'branch' }>).then
    expect(arm).toHaveLength(1)
    expect(s[0]!.body).toHaveLength(3)
  })
  test('上移/下移(边界原样返回)', () => {
    const s = stages()
    const up = moveAt(s, [0, 2], -1)
    expect(up[0]!.body[1]).toEqual(dlg('b'))
    expect(moveAt(s, [0, 0], -1)).toBe(s) // 顶端上移 = 原样
    const down = moveAt(s, [0, 1, 'then', 0], 1)
    const arm = (getCommandAt(down, [0, 1]) as Extract<Command, { kind: 'branch' }>).then
    expect(arm.map((c) => (c as Extract<Command, { kind: 'dialog' }>).cue.rows[0]?.text)).toEqual([
      't1',
      't0',
    ])
  })
})

describe('scene entry prepare 路径', () => {
  const entryStages = (): ScriptStage[] => [
    {
      entry: {
        prepare: [
          { kind: 'playMusic', asset: 'music.pal.031' },
          { kind: 'teleportParty', pos: { col: 59, row: -23, height: 0 } },
        ],
        reveal: { kind: 'dither', ms: 2160, source: 'previousPresentedFrame' },
      },
      body: [dlg('after')],
    },
  ]

  test('读取、修改、插入、移动和删除均只重建 prepare', () => {
    const source = entryStages()
    const path = [0, 'entry', 'prepare', 0] as const
    expect(getCommandAt(source, path)).toEqual({ kind: 'playMusic', asset: 'music.pal.031' })
    const updated = updateCommandAt(source, path, {
      kind: 'playMusic',
      asset: 'music.pal.049',
    })
    expect(getCommandAt(updated, path)).toEqual({ kind: 'playMusic', asset: 'music.pal.049' })
    expect(updated[0]?.body).toBe(source[0]?.body)

    const inserted = insertAfterAt(updated, path, { kind: 'playSound', soundId: 1 })
    expect(inserted[0]?.entry?.prepare.map((command) => command.kind)).toEqual([
      'playMusic',
      'playSound',
      'teleportParty',
    ])
    const moved = moveAt(inserted, [0, 'entry', 'prepare', 1], 1)
    expect(moved[0]?.entry?.prepare.map((command) => command.kind)).toEqual([
      'playMusic',
      'teleportParty',
      'playSound',
    ])
    const removed = removeAt(moved, [0, 'entry', 'prepare', 2])
    expect(removed[0]?.entry?.prepare).toHaveLength(2)
  })

  test('空 prepare 可从头插入', () => {
    const source: ScriptStage[] = [{ entry: { prepare: [], reveal: { kind: 'cut' } }, body: [] }]
    const out = insertAtHead(
      source,
      0,
      { kind: 'playMusic', asset: 'music.pal.001' },
      'entryPrepare',
    )
    expect(out[0]?.entry?.prepare).toEqual([{ kind: 'playMusic', asset: 'music.pal.001' }])
    expect(out[0]?.body).toEqual([])
  })
})

describe('段管理 —— addStageAfter/removeStage/setStageNext(next 下标重映射)', () => {
  const st = (n: number, next?: ScriptStage['next']): ScriptStage =>
    ({ body: [{ kind: 'wait', ms: n }], ...(next === undefined ? {} : { next }) }) as ScriptStage

  test('加段:插入点之后的数字 next 整体 +1,之前的不动', () => {
    const stages = [st(0, 2), st(1, 0), st(2)]
    const out = addStageAfter(stages, 0) // 在段0后插空段
    expect(out).toHaveLength(4)
    expect(out[1]?.body).toEqual([]) // 新空段
    expect(out[0]?.next).toBe(3) // 2 → 3(被插入点推移)
    expect(out[2]?.next).toBe(0) // 指向段0,在插入点之前 → 不动
  })

  test('删段:指向被删段的 next 清除;其后数字 -1;至少保 1 段', () => {
    const stages = [st(0, 1), st(1, 2), st(2, 0)]
    const out = removeStage(stages, 1)
    expect(out).toHaveLength(2)
    expect(out[0]?.next).toBeUndefined() // 指向被删段 → 停
    expect(out[1]?.next).toBe(0) // 2 → 1?否:原段2 next=0,0<1 不动
    const solo = removeStage([st(0)], 0)
    expect(solo).toHaveLength(1) // 保底
  })

  test('删段:大于删除点的数字引用 -1', () => {
    const stages = [st(0, 2), st(1), st(2)]
    const out = removeStage(stages, 1)
    expect(out[0]?.next).toBe(1) // 2 → 1
  })

  test('setStageNext:设数字/advance/清除', () => {
    const stages = [st(0), st(1)]
    expect(setStageNext(stages, 0, 'advance')[0]?.next).toBe('advance')
    expect(setStageNext(stages, 0, 1)[0]?.next).toBe(1)
    const cleared = setStageNext([st(0, 1), st(1)], 0, undefined)
    expect('next' in (cleared[0] as object)).toBe(false)
  })
})
