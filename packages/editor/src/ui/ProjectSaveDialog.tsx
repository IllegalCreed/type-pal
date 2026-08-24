import { DsDialog } from './design-system/index.js'

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
 * 项目落盘期间的顶层等待态。共享 DsDialog 把焦点和键盘一并圈住；写盘没有可回滚的取消契约，
 * 因此不提供“取消”按钮，也禁止 Esc 只关 UI、后台继续写文件。
 */
export function ProjectSaveDialog(props: {
  activity: Exclude<ProjectSaveActivity, { phase: 'choosing-directory' }>
}) {
  const { activity } = props
  const writing = activity.phase === 'writing'
  const determinate = writing && activity.total > 0
  const percent = determinate
    ? Math.min(100, Math.floor((activity.completed / activity.total) * 100))
    : undefined
  const title = activity.phase === 'saving-as' ? '正在另存项目…' : '正在保存项目…'
  const detail =
    activity.phase === 'preparing'
      ? '正在整理并校验项目内容，请勿关闭页面。'
      : activity.phase === 'saving-as'
        ? '正在复制素材并写入新目录，请勿关闭页面。'
        : '正在写入项目文件，请勿关闭页面。'

  return (
    <DsDialog
      open
      title={title}
      description={detail}
      className="project-save-dialog"
      dismissible={false}
      ariaBusy
      onClose={() => undefined}
    >
      <div
        className="project-save-dialog-content"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="project-save-spinner" aria-hidden="true" />
        <div
          className={`project-save-progress${determinate ? '' : ' indeterminate'}`}
          role="progressbar"
          aria-label="项目保存进度"
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
    </DsDialog>
  )
}
