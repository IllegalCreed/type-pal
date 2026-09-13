/**
 * 一个项目只有一个提交时间线。session的局部栈只是带事务ID的执行索引；
 * 所有普通dispatch与成对操作均在准备成功后原子提交，最后才发布通知。
 */
import type { Command } from './commands.js'
import type { EditSession } from './edit-session.js'
import { notifyEditorObservers, type PreparedHistoryChange } from './editor-history-participant.js'
import type { ScriptEditorCommand, ScriptEditSession } from './script-editor.js'

interface HistoryEntry {
  readonly id: symbol
  readonly main?: Command
  readonly script?: ScriptEditorCommand
}

export class EditorHistoryCoordinator {
  private past: HistoryEntry[] = []
  private future: HistoryEntry[] = []
  private connected = false
  private busy = false
  private version = 0
  private readonly listeners = new Set<() => void>()

  /** 在项目会话装配时创建，不在React render中创建或订阅。 */
  constructor(
    private readonly mainSession: EditSession,
    private readonly scriptSession: ScriptEditSession,
  ) {
    this.connect()
  }

  assertSessions(main: EditSession, script: ScriptEditSession): void {
    if (this.mainSession !== main || this.scriptSession !== script)
      throw new Error('项目历史与当前编辑会话不匹配')
  }

  /** 同Owner重连保留有效历史；两次连接幂等，不创建第二份订阅或日志。 */
  connect(): void {
    if (this.connected) return
    this.mainSession.assertCanAttachHistory(this)
    this.scriptSession.assertCanAttachHistory(this)
    this.mainSession.attachHistory({
      owner: this,
      dispatch: (command) => this.transact(() => this.commitNew({ main: command })),
      undo: () => this.undo(),
      redo: () => this.redo(),
      canUndo: () => this.canUndo(),
      canRedo: () => this.canRedo(),
      discardRedo: (command) =>
        this.transact(
          () => this.mainSession.isHistoryRedoCommand(command, this) && this.discardFuture(),
        ),
    })
    this.scriptSession.attachHistory({
      owner: this,
      dispatch: (command) => this.transact(() => this.commitNew({ script: command })),
      undo: () => this.undo(),
      redo: () => this.redo(),
      canUndo: () => this.canUndo(),
      canRedo: () => this.canRedo(),
      discardRedo: (command) =>
        this.transact(
          () => this.scriptSession.isHistoryRedoCommand(command, this) && this.discardFuture(),
        ),
    })
    this.connected = true
  }

  /** 界面卸载时停止路由；保留日志以供同对象重连，禁止断开期形成未记账分支。 */
  dispose(): void {
    if (this.busy) throw new Error('历史操作期间不能断开协调器')
    if (!this.connected) return
    this.mainSession.detachHistory(this)
    this.scriptSession.detachHistory(this)
    this.connected = false
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getVersion = (): number => this.version
  /** Chrome只订阅有效动作元数据；同名连续编辑不能让已优化页面整页重渲染。 */
  getToolbarSnapshot = (): string =>
    JSON.stringify([this.getUndoLabel(), this.getRedoLabel(), this.canUndo(), this.canRedo()])
  canUndo(): boolean {
    return this.past.length > 0
  }
  canRedo(): boolean {
    return this.future.length > 0
  }
  getUndoLabel(): string | undefined {
    return this.label(this.past.at(-1))
  }
  getRedoLabel(): string | undefined {
    return this.label(this.future.at(-1))
  }

  dispatch(script: ScriptEditorCommand, main: Command): void {
    this.transact(() => {
      this.commitNew({ script, main })
    })
  }

  undo(): boolean {
    return this.transact(() => {
      const entry = this.past.at(-1)
      if (!entry) return false
      const changes = this.prepareEntry(entry, 'undo')
      this.commit(changes, () => {
        this.past.pop()
        this.future.push(entry)
      })
      return true
    })
  }

  redo(): boolean {
    return this.transact(() => {
      const entry = this.future.at(-1)
      if (!entry) return false
      const changes = this.prepareEntry(entry, 'redo')
      this.commit(changes, () => {
        this.future.pop()
        this.past.push(entry)
      })
      return true
    })
  }

  private label(entry: HistoryEntry | undefined): string | undefined {
    return entry?.main?.label ?? entry?.script?.label
  }

  private transact<T>(operation: () => T): T {
    if (!this.connected) throw new Error('项目历史已断开')
    if (this.busy) throw new Error('历史操作不能重入')
    this.busy = true
    try {
      return operation()
    } finally {
      this.busy = false
    }
  }

  private commitNew(commands: { main?: Command; script?: ScriptEditorCommand }): boolean {
    const entry: HistoryEntry = { ...commands, id: Symbol('editor-transaction') }
    const changes: PreparedHistoryChange[] = []
    if (entry.script) {
      const prepared = this.scriptSession.prepareHistoryChange(
        'dispatch',
        entry.script,
        entry.id,
        this,
      )
      if (!prepared) {
        if (entry.main) throw new Error('跨会话事务未修改脚本工作副本')
        return false
      }
      changes.push(prepared)
    }
    if (entry.main) {
      const prepared = this.mainSession.prepareHistoryChange('dispatch', entry.main, entry.id, this)
      if (!prepared) {
        if (entry.script) throw new Error('跨会话事务未修改主编辑工作副本')
        return false
      }
      changes.push(prepared)
    }
    // 参与者dispatch各自一次性清future；只为未参与的一侧补行政失效，不产生新作者动作。
    const other =
      entry.main && !entry.script
        ? this.scriptSession.prepareHistoryDiscard(this)
        : entry.script && !entry.main
          ? this.mainSession.prepareHistoryDiscard(this)
          : undefined
    if (other) changes.push(other)
    this.commit(changes, () => {
      this.past.push(entry)
      this.future = []
    })
    return true
  }

  private prepareEntry(entry: HistoryEntry, direction: 'undo' | 'redo'): PreparedHistoryChange[] {
    const main = () =>
      entry.main
        ? this.mainSession.prepareHistoryChange(direction, entry.main, entry.id, this)
        : undefined
    const script = () =>
      entry.script
        ? this.scriptSession.prepareHistoryChange(direction, entry.script, entry.id, this)
        : undefined
    // 命令运算仍尊重逆序/正序；运算期间两侧公开状态均保持完整的旧态。
    return (direction === 'undo' ? [main(), script()] : [script(), main()]).filter(
      (change): change is PreparedHistoryChange => change !== undefined,
    )
  }

  private discardFuture(): boolean {
    if (!this.future.length) return false
    const changes = [
      this.mainSession.prepareHistoryDiscard(this),
      this.scriptSession.prepareHistoryDiscard(this),
    ].filter((change): change is PreparedHistoryChange => change !== undefined)
    this.commit(changes, () => {
      this.future = []
    })
    return true
  }

  private commit(changes: readonly PreparedHistoryChange[], updateLog: () => void): void {
    for (const change of changes) change.validate()
    for (const change of changes) change.commit()
    updateLog()
    this.mainSession.advanceHistoryNotification(this)
    this.scriptSession.advanceHistoryNotification(this)
    this.version++
    for (const change of changes) change.publishReferences?.()
    this.mainSession.publishHistoryNotification(this)
    this.scriptSession.publishHistoryNotification(this)
    notifyEditorObservers(this.listeners)
  }
}
