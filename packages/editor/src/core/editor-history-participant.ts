/** Editor 内部的两阶段历史协议；不参与保存格式，也不从通知版本推导提交顺序。 */
export interface HistoryRecord<C> {
  readonly id: symbol
  readonly command: C
}

export interface PreparedHistoryChange {
  /** 在任何参与者提交之前统一检查；准备失败不写会话。 */
  validate(): void
  /** 只包含已准备好的内存赋值，不调用用户命令/订阅者。 */
  commit(): void
  publishReferences?(): void
}

export interface SessionHistoryRouter<C> {
  readonly owner: object
  dispatch(command: C): boolean
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  discardRedo(command: C): boolean
}

export interface SessionHistoryBinding<C> {
  readonly router: SessionHistoryRouter<C>
  active: boolean
}

/** 发布失败不是事务失败：继续通知其余观察者，不回滚已提交内容或历史。 */
export function notifyEditorObservers(listeners: ReadonlySet<() => void>): void {
  for (const listener of [...listeners]) {
    try {
      listener()
    } catch (error) {
      console.error('编辑器状态订阅更新失败（操作已提交）', error)
    }
  }
}
