import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'

export type ProjectSaveActivity =
  | { phase: 'choosing-directory' }
  | { phase: 'preparing' }
  | { phase: 'writing'; completed: number; total: number }
  | { phase: 'saving-as' }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * 工程落盘期间的顶层等待态。原生 modal dialog 把焦点和键盘一并圈住；写盘没有可回滚的取消契约，
 * 因此不提供“取消”按钮，也禁止 Esc 只关 UI、后台继续写文件。
 */
export function ProjectSaveDialog(props: {
  activity: Exclude<ProjectSaveActivity, { phase: 'choosing-directory' }>
}) {
  const { activity } = props
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const detailId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    returnFocusRef.current = document.activeElement as HTMLElement | null
    if (!dialog.open) dialog.showModal()
    dialog.focus()
    return () => {
      if (dialog.open) dialog.close()
      const target = returnFocusRef.current
      if (target?.isConnected && !(target instanceof HTMLButtonElement && target.disabled))
        target.focus()
    }
  }, [])

  const writing = activity.phase === 'writing'
  const determinate = writing && activity.total > 0
  const percent = determinate
    ? Math.min(100, Math.floor((activity.completed / activity.total) * 100))
    : undefined
  const title = activity.phase === 'saving-as' ? '正在另存工程…' : '正在保存工程…'
  const detail =
    activity.phase === 'preparing'
      ? '正在整理并校验工程内容，请勿关闭页面。'
      : activity.phase === 'saving-as'
        ? '正在复制素材并写入新目录，请勿关闭页面。'
        : '正在写入工程文件，请勿关闭页面。'

  return createPortal(
    <dialog
      ref={dialogRef}
      className="project-save-dialog"
      aria-labelledby={titleId}
      aria-describedby={detailId}
      aria-busy="true"
      aria-modal="true"
      tabIndex={-1}
      onCancel={(event) => event.preventDefault()}
    >
      <div
        className="project-save-dialog-content"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="project-save-spinner" aria-hidden="true" />
        <h2 id={titleId}>{title}</h2>
        <p id={detailId}>{detail}</p>
        <div
          className={`project-save-progress${determinate ? '' : ' indeterminate'}`}
          role="progressbar"
          aria-label="工程保存进度"
          aria-valuemin={determinate ? 0 : undefined}
          aria-valuemax={determinate ? 100 : undefined}
          aria-valuenow={percent}
        >
          <span style={determinate ? { width: `${percent}%` } : undefined} />
        </div>
        <output className="project-save-progress-label">
          {determinate
            ? `${percent}% · ${formatBytes(activity.completed)} / ${formatBytes(activity.total)}`
            : '正在处理，请稍候…'}
        </output>
      </div>
    </dialog>,
    document.body,
  )
}
