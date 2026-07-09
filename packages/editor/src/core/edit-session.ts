/**
 * EditSession + 撤销/重做核(D-B0 第二根地基,最大防返工点)。
 *
 * 持有工程的不可变工作副本;所有改动经 dispatch(Command) —— 统一驱动 undo/redo + 通知。
 * 铁律:命令不得原地 mutate 数据(命令返回新态)。React 经 subscribe + useSyncExternalStore
 * 订阅(B1 接),状态变 → 重渲染。
 *
 * 纯 TS + 无 React → 重度单测。见 docs/phase2/editor/editor-design.md §4。
 */
import type { ContentBundle, LoadedManifest } from '@type-pal/content'
import type { Tilemap } from '@type-pal/reforge'
import type { Command } from './commands.js'

// commands.ts 引 EditorState(type),本文件引 Command(type) —— 仅类型,运行期无环。
export { MoveEntityCommand } from './commands.js'
export type { Command } from './commands.js'

/** 被编辑的内容工作副本(ContentBundle + manifest)。命令 apply/invert 收/返它(不可变)。 */
export interface EditorState extends ContentBundle {
  manifest: LoadedManifest
  /**
   * 自有地图(W7)工作副本:键 = 工程内相对路径(scene.map.ownMap 指向它)→ Tilemap。
   * 编辑器画布渲染读此实时态(非磁盘,创建后未存磁盘上没有);保存序列化成 content/maps/<id>.json。
   */
  maps: Record<string, Tilemap>
}

/** 编辑会话:不可变工作副本 + undo/redo 栈 + 订阅 + 脏标记。 */
export class EditSession {
  private state: EditorState
  private past: Command[] = []
  private future: Command[] = []
  /** 有未保存改动(自上次 markSaved 后 dispatch/undo/redo 过)。保存按钮据此亮 ●。 */
  private dirty = false
  /** 每次 notify 自增。useSyncExternalStore 的 snapshot 用它 —— 因为 markSaved/undo 等
   *  「非内容态」变化不改 state 引用,单靠 getState 当 snapshot 会漏掉这些变化不重渲染。 */
  private version = 0
  private readonly listeners = new Set<() => void>()

  constructor(initial: EditorState) {
    this.state = initial
  }

  /** 当前状态(返回引用;调用方不得 mutate —— 要改发 Command)。 */
  getState(): EditorState {
    return this.state
  }

  /** 是否有未保存的改动(保存 UI 据此亮 ●)。 */
  isDirty(): boolean {
    return this.dirty
  }

  /** 标记已保存:清脏标记并通知(保存按钮 ● 要刷新成已保存态)。 */
  markSaved(): void {
    this.dirty = false
    this.notify()
  }

  /** 派发命令:apply → 入 past → 清 future → 置脏 → 通知。 */
  dispatch(cmd: Command): void {
    this.state = cmd.apply(this.state)
    this.past.push(cmd)
    this.future = []
    this.dirty = true
    this.notify()
  }

  /** 撤销:past 栈顶 invert。空栈 noop。 */
  undo(): void {
    const cmd = this.past.pop()
    if (!cmd) return
    this.state = cmd.invert(this.state)
    this.future.push(cmd)
    this.dirty = true
    this.notify()
  }

  /** 重做:future 栈顶 apply。空栈 noop。 */
  redo(): void {
    const cmd = this.future.pop()
    if (!cmd) return
    this.state = cmd.apply(this.state)
    this.past.push(cmd)
    this.dirty = true
    this.notify()
  }

  /** 变更版本号(每次 notify 自增);useSyncExternalStore 的 getSnapshot 用它。 */
  getVersion(): number {
    return this.version
  }

  canUndo(): boolean {
    return this.past.length > 0
  }

  canRedo(): boolean {
    return this.future.length > 0
  }

  /** 订阅状态变化(React 用 useSyncExternalStore);返回退订。 */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  private notify(): void {
    this.version++
    for (const fn of this.listeners) fn()
  }
}
