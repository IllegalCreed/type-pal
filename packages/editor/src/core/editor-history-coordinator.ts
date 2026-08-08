/**
 * 只协调当前唯一的跨 session 作者动作（canonical 私有正文 + legacy shell ref）。
 * 两个既有 session 仍各自持栈；本类只记录成对命令身份，并在全局 undo/redo 前优先配对。
 */
import type { Command } from './commands.js'
import type { EditSession } from './edit-session.js'
import type { ScriptEditorCommandV5, ScriptV5EditSession } from './script-v5-editor.js'

interface HistoryPair {
  legacy: Command
  scriptV5: ScriptEditorCommandV5
}

export class EditorHistoryCoordinator {
  private past: HistoryPair[] = []
  private future: HistoryPair[] = []

  constructor(
    private readonly legacySession: EditSession,
    private readonly scriptV5Session: ScriptV5EditSession,
  ) {}

  /** 两边都成功才登记；第二笔失败会用 receipt 原样回滚第一笔且不产生 redo。 */
  dispatch(scriptV5: ScriptEditorCommandV5, legacy: Command): void {
    const scriptReceipt = this.scriptV5Session.dispatchForTransaction(scriptV5)
    try {
      const legacyReceipt = this.legacySession.dispatchForTransaction(legacy)
      if (!legacyReceipt) throw new Error(`跨会话事务「${legacy.label}」未修改 legacy 作者态`)
    } catch (cause) {
      scriptReceipt.rollback()
      throw cause
    }
    this.past.push({ legacy, scriptV5 })
    this.future = []
  }

  /** 必须在普通 historyOwnerRef 分发前调用。 */
  undo(): boolean {
    const pair = this.past.at(-1)
    if (
      !pair ||
      !this.legacySession.isUndoTop(pair.legacy) ||
      !this.scriptV5Session.isUndoTop(pair.scriptV5)
    )
      return false
    // 应用顺序 script-v5 -> legacy；撤销严格反序。
    if (!this.legacySession.undo()) throw new Error('跨会话撤销 legacy 失败')
    try {
      if (!this.scriptV5Session.undo()) throw new Error('跨会话撤销 script-v5 失败')
    } catch (cause) {
      if (!this.legacySession.redo())
        throw new Error('跨会话撤销失败且 legacy 补偿重做失败', { cause })
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
    if (!this.scriptV5Session.redo()) throw new Error('跨会话重做 script-v5 失败')
    try {
      if (!this.legacySession.redo()) throw new Error('跨会话重做 legacy 失败')
    } catch (cause) {
      if (!this.scriptV5Session.undo())
        throw new Error('跨会话重做失败且 script-v5 补偿撤销失败', { cause })
      throw cause
    }
    this.future.pop()
    this.past.push(pair)
    return true
  }

  private discardInvalidRedoPairs(): void {
    while (this.future.length) {
      const pair = this.future.at(-1)!
      const legacyReady = this.legacySession.isRedoTop(pair.legacy)
      const scriptReady = this.scriptV5Session.isRedoTop(pair.scriptV5)
      if (legacyReady && scriptReady) return
      if (legacyReady) this.legacySession.discardRedo(pair.legacy)
      if (scriptReady) this.scriptV5Session.discardRedo(pair.scriptV5)
      this.future.pop()
    }
  }
}
