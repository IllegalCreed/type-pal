import { describe, expect, test, vi } from 'vitest'
import { EditSession, MoveEntityCommand } from './edit-session.js'

// 最小 EditorState fixture(字段不全,as 断言 —— 测的是 command/undo 引擎,不是数据形状)。
function mkState() {
  return {
    manifest: {} as never,
    scenes: [
      {
        id: 's',
        map: {} as never,
        entry: {} as never,
        entities: [{ id: 'e', pos: { col: 1, row: 1, height: 0 }, sprite: 'ghost' }],
        dialogues: [],
      },
    ],
    characters: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
  } as never
}
const entPos = (s: { scenes: { entities: { pos: { col: number; row: number; height: number } }[] }[] }): {
  col: number
  row: number
  height: number
} => s.scenes[0]!.entities[0]!.pos

test('dispatch 改状态;原状态不被 mutate(不可变)', () => {
  const s0 = mkState()
  const sess = new EditSession(s0)
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  expect(entPos(sess.getState())).toEqual({ col: 5, row: 6, height: 0 })
  expect(entPos(s0)).toEqual({ col: 1, row: 1, height: 0 }) // 源不变
})

test('undo 回退、redo 重做', () => {
  const sess = new EditSession(mkState())
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  expect(entPos(sess.getState())).toEqual({ col: 1, row: 1, height: 0 })
  sess.redo()
  expect(entPos(sess.getState())).toEqual({ col: 5, row: 6, height: 0 })
})

test('undo 后 dispatch 清空 redo 分支', () => {
  const sess = new EditSession(mkState())
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 9, row: 9, height: 0 }))
  expect(sess.canUndo()).toBe(true)
  expect(sess.canRedo()).toBe(false)
  expect(entPos(sess.getState())).toEqual({ col: 9, row: 9, height: 0 })
})

test('空栈 undo/redo 安全(noop,不改状态)', () => {
  const sess = new EditSession(mkState())
  expect(sess.canUndo()).toBe(false)
  expect(sess.canRedo()).toBe(false)
  sess.undo() // 不应崩
  sess.redo()
  expect(entPos(sess.getState())).toEqual({ col: 1, row: 1, height: 0 })
})

test('subscribe 在每次状态变化时触发,退订后不再触发', () => {
  const sess = new EditSession(mkState())
  const fn = vi.fn()
  const off = sess.subscribe(fn)
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.undo()
  expect(fn).toHaveBeenCalledTimes(2)
  off()
  sess.redo()
  expect(fn).toHaveBeenCalledTimes(2)
})

// ── 脏标记(L2)──────────────────────────────────────────────
test('脏标记:初始干净;dispatch 置脏;markSaved 清脏且通知', () => {
  const sess = new EditSession(mkState())
  expect(sess.isDirty()).toBe(false)
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  expect(sess.isDirty()).toBe(true)
  const fn = vi.fn()
  sess.subscribe(fn)
  sess.markSaved()
  expect(sess.isDirty()).toBe(false)
  expect(fn).toHaveBeenCalledTimes(1) // markSaved 触发订阅(保存按钮要刷新)
})

test('脏标记:undo/redo 也置脏(撤销到原点仍视为有未保存改动)', () => {
  const sess = new EditSession(mkState())
  sess.dispatch(new MoveEntityCommand('s', 'e', { col: 5, row: 6, height: 0 }))
  sess.markSaved()
  expect(sess.isDirty()).toBe(false)
  sess.undo()
  expect(sess.isDirty()).toBe(true)
  sess.markSaved()
  sess.redo()
  expect(sess.isDirty()).toBe(true)
})
