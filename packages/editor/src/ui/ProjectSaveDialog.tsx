import type { SaveAsProgress } from '../core/open-actions.js'
import type { ProjectWriteActivity } from '../core/project-io.js'
import { DsDialog } from './design-system/index.js'

export type ProjectSaveActivity =
  | { phase: 'choosing-directory' }
  | { phase: 'preparing' }
  | { phase: 'recovering' }
  | ProjectWriteActivity
  | { phase: 'saving-as'; progress?: SaveAsProgress }

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
  const progress = activity.phase === 'saving-as' ? activity.progress : activity
  const measured =
    progress && (progress.phase === 'writing' || progress.phase === 'staging')
      ? progress
      : undefined
  const determinate = !!measured && measured.total > 0
  const percent = determinate
    ? Math.min(100, Math.floor((measured.completed / measured.total) * 100))
    : undefined
  const stageLabel = progress?.phase === 'staging' ? '复制与暂存文件' : '写入并核验文件'
  const pendingLabel =
    progress?.phase === 'validating'
      ? '正在校验暂存内容与来源…'
      : progress?.phase === 'reopening'
        ? '正在重新打开已保存工程…'
        : activity.phase === 'recovering'
          ? '正在恢复上次保存…'
          : '正在准备工程文件…'
  const title =
    activity.phase === 'recovering'
      ? '正在完成上次保存…'
      : activity.phase === 'saving-as'
        ? '正在另存项目…'
        : '正在保存项目…'
  const detail =
    activity.phase === 'recovering'
      ? '正在恢复已暂存的项目内容，请勿关闭页面。'
      : activity.phase === 'preparing'
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
          {determinate && <span style={{ width: `${percent}%` }} />}
        </div>
        <output className="project-save-progress-label">
          {determinate
            ? measured.phase === 'staging'
              ? `${stageLabel} ${percent}% · ${measured.completed} / ${measured.total} 个文件`
              : `${stageLabel} ${percent}% · ${formatBytes(measured.completed)} / ${formatBytes(measured.total)}`
            : pendingLabel}
        </output>
      </div>
    </DsDialog>
  )
}
