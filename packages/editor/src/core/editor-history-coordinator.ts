/**
 * 只协调当前唯一的跨 session 作者动作（脚本正文 + 主编辑工作副本引用）。
 * 两个既有 session 仍各自持栈；本类只记录成对命令身份，并在全局 undo/redo 前优先配对。
 */
import type { Command } from './commands.js'
import type { EditSession } from './edit-session.js'
import type { ScriptEditorCommand, ScriptEditSession } from './script-editor.js'

interface HistoryPair {
  main: Command
  script: ScriptEditorCommand
}

export class EditorHistoryCoordinator {
  private past: HistoryPair[] = []
  private future: HistoryPair[] = []

  constructor(
    private readonly mainSession: EditSession,
    private readonly scriptSession: ScriptEditSession,
  ) {}

  /** 两边都成功才登记；第二笔失败会用 receipt 原样回滚第一笔且不产生 redo。 */
  dispatch(script: ScriptEditorCommand, main: Command): void {
    const scriptReceipt = this.scriptSession.dispatchForTransaction(script)
    try {
      const mainReceipt = this.mainSession.dispatchForTransaction(main)
      if (!mainReceipt) throw new Error(`跨会话事务「${main.label}」未修改主编辑工作副本`)
    } catch (cause) {
      scriptReceipt.rollback()
      throw cause
    }
    this.past.push({ main, script })
    this.future = []
  }

  /** 必须在普通 historyOwnerRef 分发前调用。 */
  undo(): boolean {
    const pair = this.past.at(-1)
    if (
      !pair ||
      !this.mainSession.isUndoTop(pair.main) ||
      !this.scriptSession.isUndoTop(pair.script)
    )
      return false
    // 应用顺序 script -> main；撤销严格反序。
    if (!this.mainSession.undo()) throw new Error('跨会话撤销主编辑工作副本失败')
    try {
      if (!this.scriptSession.undo()) throw new Error('跨会话撤销 script 失败')
    } catch (cause) {
      if (!this.mainSession.redo())
        throw new Error('跨会话撤销失败且主编辑工作副本补偿重做失败', { cause })
      throw cause
    }
    this.past.pop()
    this.future.push(pair)
    return true
  }

  /** 必须在普通 historyOwnerRef 分发前调用；先清掉失去另一半的孤儿 redo。 */
  redo(): boolean {
    this.discardInvalidRedoPairs()
    const pair = this.future.at(-1)
    if (!pair) return false
    if (!this.scriptSession.redo()) throw new Error('跨会话重做 script 失败')
    try {
      if (!this.mainSession.redo()) throw new Error('跨会话重做主编辑工作副本失败')
    } catch (cause) {
      if (!this.scriptSession.undo())
        throw new Error('跨会话重做失败且 script 补偿撤销失败', { cause })
      throw cause
    }
    this.future.pop()
    this.past.push(pair)
    return true
  }

  private discardInvalidRedoPairs(): void {
    while (this.future.length) {
      const pair = this.future.at(-1)!
      const mainReady = this.mainSession.isRedoTop(pair.main)
      const scriptReady = this.scriptSession.isRedoTop(pair.script)
      if (mainReady && scriptReady) return
      if (mainReady) this.mainSession.discardRedo(pair.main)
      if (scriptReady) this.scriptSession.discardRedo(pair.script)
      this.future.pop()
    }
  }
}
