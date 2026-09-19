/**
 * TEST-EDITOR-SCRIPT-HELPERS-1 S02（返工补齐）：场景 Hook 会话三轴。
 * 既有 script-editor.test 已覆盖选人/死人/载荷/取消/导航/刷新/单 undo 主干——不重复。
 * 本文件：SaveSceneHookDetails 的 default 隔离（取消当前 default 与修改非 default 区分）、
 * 缺 target 拒绝后 session/history 完整保真、最后未引用 hook 的 variant/channel/hooks
 * 逐层删除与 initial 引用拒删。状态由当前合法作者对象构造（构造期即过 validateState）。
 */
import { describe, expect, test } from 'vitest'
import {
  DeleteSceneHookCommand,
  SaveSceneHookDetailsCommand,
  type ScriptEditorState,
  ScriptEditSession,
  SetSceneHookInitialCommand,
} from './script-editor.js'

const emptyFlow = {
  kind: 'stages',
  initial: 'main',
  stages: [{ id: 'main', body: [] }],
} as const

function sessionState(): ScriptEditorState {
  return {
    scenes: [
      {
        id: 's1',
        mapId: 'map-1',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'e1', pos: { col: 0, row: 0, height: 0 }, zone: true }],
        hooks: {
          onEnter: {
            initial: 'hook-a',
            variants: {
              'hook-a': { label: '方案A', order: 10, flow: structuredClone(emptyFlow) },
              'hook-b': { label: '方案B', order: 20, flow: structuredClone(emptyFlow) },
            },
          },
        },
      },
    ],
    items: [],
    sharedScripts: {},
  } as unknown as ScriptEditorState
}

/** 拒绝见证取值形式：返回 dispatch 的返回值或错误消息。 */
function dispatchOf(session: ScriptEditSession, run: () => boolean): boolean | string {
  try {
    return run()
  } catch (error) {
    return (error as Error).message
  }
}

describe('S02 SaveSceneHookDetails default 隔离', () => {
  test('isDefault=true 换 default；修改非 default（isDefault=false）不动现有 default；取消当前 default 删 initial', () => {
    const session = new ScriptEditSession(sessionState())
    // 换 default：保存 hook-b 为 default → initial 变 b
    expect(
      session.dispatch(new SaveSceneHookDetailsCommand('s1', 'onEnter', 'hook-b', '方案B改', true)),
    ).toBe(true)
    let channel = session.getState().scenes[0]!.hooks!.onEnter!
    expect(channel.initial).toBe('hook-b')
    expect(channel.variants['hook-b']!.label).toBe('方案B改')

    // 修改非 default（hook-a 现在不是 initial）：isDefault=false 不清 initial
    expect(
      session.dispatch(new SaveSceneHookDetailsCommand('s1', 'onEnter', 'hook-a', '方案A改', false)),
    ).toBe(true)
    channel = session.getState().scenes[0]!.hooks!.onEnter!
    expect(channel.initial).toBe('hook-b') // 非 default 的保存不动现有 default
    expect(channel.variants['hook-a']!.label).toBe('方案A改')

    // 取消当前 default：保存 initial（hook-b）为 isDefault=false → initial 删除
    expect(
      session.dispatch(new SaveSceneHookDetailsCommand('s1', 'onEnter', 'hook-b', '方案B再改', false)),
    ).toBe(true)
    channel = session.getState().scenes[0]!.hooks!.onEnter!
    expect('initial' in channel).toBe(false)
    expect(channel.variants['hook-b']!.label).toBe('方案B再改')
    // 三步全部可 undo，undo 链回到初始
    session.undo()
    session.undo()
    session.undo()
    expect(session.getState().scenes[0]!.hooks!.onEnter!.initial).toBe('hook-a')
  })
})

describe('S02 缺 target 拒绝后 session/history 保真', () => {
  test('不存在的 hook/通道拒绝；拒绝后 state/undo/redo/version/dirty 全部不变', () => {
    const session = new ScriptEditSession(sessionState())
    expect(
      session.dispatch(new SaveSceneHookDetailsCommand('s1', 'onEnter', 'hook-a', '方案A先改', false)),
    ).toBe(true) // 先落一笔合法编辑（hook-a 为 initial → 同时清 initial），构造有历史的会话
    const before = {
      state: session.getState(),
      canUndo: session.canUndo(),
      canRedo: session.canRedo(),
      version: session.getVersion(),
      dirty: session.isDirty(),
    }
    expect(
      dispatchOf(
        session,
        () => session.dispatch(new SaveSceneHookDetailsCommand('s1', 'onEnter', 'ghost', '名', false)),
      ),
    ).toBe('hook 不存在 s1/onEnter/ghost')
    expect(
      dispatchOf(
        session,
        () =>
          session.dispatch(new DeleteSceneHookCommand('s1', 'onTeleport' as 'onEnter', 'hook-a')),
      ),
    ).toBe('hook 不存在 s1/onTeleport/hook-a')
    // 拒绝后一切保真：状态、历史栈、版本、dirty 均与拒绝前一致
    expect(session.getState()).toEqual(before.state)
    expect(session.canUndo()).toBe(before.canUndo)
    expect(session.canRedo()).toBe(before.canRedo)
    expect(session.getVersion()).toBe(before.version)
    expect(session.isDirty()).toBe(before.dirty)
    expect(session.undo()).toBe(true) // 拒绝未污染历史：undo 回到初始（label/initial 全恢复）
    const restored = session.getState().scenes[0]!.hooks!.onEnter!
    expect(restored.variants['hook-a']!.label).toBe('方案A')
    expect(restored.initial).toBe('hook-a')
  })
})

describe('S02 最后未引用 hook 的逐层删除', () => {
  test('删非 initial 未引用 variant → 只删该变体；删 initial 引用的 hook 先拒绝、清 initial 后可删 → channel/hooks 逐层清理', () => {
    const session = new ScriptEditSession(sessionState())
    // hook-b 非 initial、无命令引用 → 直接删除，channel 仍在（还有 hook-a）
    expect(session.dispatch(new DeleteSceneHookCommand('s1', 'onEnter', 'hook-b'))).toBe(true)
    let scene = session.getState().scenes[0]!
    expect(Object.keys(scene.hooks!.onEnter!.variants)).toEqual(['hook-a'])

    // hook-a 是 initial（自身就是引用）→ 拒绝删除并点名引用
    const refused = dispatchOf(
      session,
      () => session.dispatch(new DeleteSceneHookCommand('s1', 'onEnter', 'hook-a')),
    )
    expect(refused).toContain('hook-a 仍有 1 个引用')
    expect(refused).toContain('scenes.s1.hooks.onEnter.initial')

    // 清 initial（SetSceneHookInitial undefined）后 → 最后一个 hook 可删：channel 一并删
    expect(session.dispatch(new SetSceneHookInitialCommand('s1', 'onEnter', undefined))).toBe(true)
    expect(session.dispatch(new DeleteSceneHookCommand('s1', 'onEnter', 'hook-a'))).toBe(true)
    scene = session.getState().scenes[0]!
    expect(scene.hooks?.onEnter).toBeUndefined() // channel 层清理
    expect(scene.hooks).toBeUndefined() // 最后一个通道 → hooks 整键清理
    expect('hooks' in scene).toBe(false)
    // undo 链完整：两次 undo 恢复双变体
    expect(session.undo()).toBe(true)
    expect(session.undo()).toBe(true)
    expect(Object.keys(session.getState().scenes[0]!.hooks!.onEnter!.variants)).toEqual(['hook-a'])
    expect(session.undo()).toBe(true)
    expect(Object.keys(session.getState().scenes[0]!.hooks!.onEnter!.variants)).toEqual([
      'hook-a',
      'hook-b',
    ])
  })
})
