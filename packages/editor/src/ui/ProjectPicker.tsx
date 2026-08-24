import { DsPressable } from './design-system/index.js'
/**
 * 编辑器启动屏。只负责创建、选择和打开当前 canonical content17 项目；旧开发项目必须
 * 重新生成，不在产品启动流程中提供兼容工作台。
 */
import { useEffect, useState } from 'react'
import { currentDirectoryPickerAvailability } from '../core/file-system-access.js'
import {
  ensurePermission,
  listRecentWorkspaces,
  loadWorkspaceRecord,
} from '../core/handle-store.js'
import {
  finishOpen,
  newBlankProject,
  newFromPal,
  type Opened,
  pickDir,
} from '../core/open-actions.js'
import { type WorkspaceMode, workspaceModeLabel } from '../core/workspace-context.js'

const mb = (value: number): string => (value / 1024 / 1024).toFixed(1)

export function ProjectPicker(props: {
  onOpened: (opened: Opened) => void
  seedBaseUrl?: string
  forceSandbox?: boolean
}) {
  const { onOpened, seedBaseUrl = 'projects/pal', forceSandbox = false } = props
  const [recent, setRecent] = useState<
    Array<{
      workspaceId: string
      projectId: string
      name: string
      mode: WorkspaceMode
    }>
  >([])
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listRecentWorkspaces()
      .then(setRecent)
      .catch(() => {})
  }, [])

  const pickerAvailability = currentDirectoryPickerAvailability()
  const run = (label: string, action: () => Promise<Opened | null>) => async (): Promise<void> => {
    setError('')
    setBusy(label)
    try {
      const opened = await action()
      if (opened) onOpened(opened)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setBusy('')
      setProgress(null)
    }
  }

  const openProject = run('打开项目', async () => {
    const dir = await pickDir()
    return dir ? finishOpen(dir, { forceSandbox }) : null
  })
  // Creation commands always produce a new, explicitly selected local workspace. forceSandbox
  // only prevents an existing PAL/local directory from lending its write authority to ui_samples.
  const clonePal = run('从 pal 克隆', async () =>
    newFromPal(seedBaseUrl, (done, total) => setProgress({ done, total })),
  )
  const createBlank = run('创建空白项目', newBlankProject)
  const openRecent = (workspaceId: string): void => {
    void run('打开最近项目', async () => {
      const record = await loadWorkspaceRecord(workspaceId)
      if (!record) throw new Error('句柄已失效，请使用「打开项目」重新选择文件夹。')
      const permission = await ensurePermission(record.handle, { withRequest: true })
      if (permission !== 'granted') throw new Error('未授权访问该文件夹。')
      return finishOpen(record.handle, { expectedIdentity: record, forceSandbox })
    })()
  }

  if (!pickerAvailability.available) {
    return (
      <div className="picker">
        <div className="picker-card">
          <h1 className="picker-title">type-pal 编辑器</h1>
          <div className="picker-err">{pickerAvailability.message}</div>
        </div>
      </div>
    )
  }

  const percent =
    progress && progress.total > 0 ? Math.floor((progress.done / progress.total) * 100) : 0

  return (
    <div className="picker">
      <div className="picker-card">
        <h1 className="picker-title">type-pal 编辑器</h1>
        <p className="picker-sub">
          选择当前 canonical content17 项目开始编辑。旧开发项目请重新生成。
        </p>

        {busy ? (
          <div className="picker-busy" role="status" aria-live="polite">
            <div className="picker-busy-label">{busy}…</div>
            {progress ? (
              <>
                <div className="picker-bar">
                  <div className="picker-bar-fill" style={{ width: `${percent}%` }} />
                </div>
                <div className="picker-busy-sub">
                  下载项目 · {percent}% · {mb(progress.done)}/{mb(progress.total)} MB
                </div>
              </>
            ) : (
              <div className="picker-busy-sub">选择文件夹并授权…</div>
            )}
          </div>
        ) : (
          <>
            <div className="picker-actions">
              <DsPressable type="button" className="picker-act primary" onClick={clonePal}>
                <span className="picker-act-t">从 PAL 开发快照创建本地项目</span>
                <span className="picker-act-d">
                  当前快照仍随 E2E 持续完善，尚不是稳定用户种子。
                </span>
              </DsPressable>
              <DsPressable type="button" className="picker-act" onClick={openProject}>
                <span className="picker-act-t">打开项目</span>
                <span className="picker-act-d">选择一个当前 content17 本地项目继续编辑。</span>
              </DsPressable>
              <DsPressable type="button" className="picker-act" onClick={createBlank}>
                <span className="picker-act-t">新建空白项目</span>
                <span className="picker-act-d">创建包含起始场景与占位角色的 content17 项目。</span>
              </DsPressable>
            </div>

            {recent.length > 0 && (
              <div className="picker-recent">
                <div className="picker-recent-h">最近项目</div>
                {recent.map((entry) => (
                  <DsPressable
                    type="button"
                    key={entry.workspaceId}
                    className="picker-recent-item"
                    onClick={() => openRecent(entry.workspaceId)}
                  >
                    <span className="mono">{entry.projectId}</span>
                    <span className="picker-recent-name">{entry.name}</span>
                    <span className="picker-recent-mode">{workspaceModeLabel(entry)}</span>
                  </DsPressable>
                ))}
              </div>
            )}
          </>
        )}

        {error && (
          <div className="picker-err" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
