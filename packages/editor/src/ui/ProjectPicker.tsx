/**
 * 编辑器启动屏。只负责创建、选择和打开当前 canonical content16 工程；旧开发工程必须
 * 重新生成，不在产品启动流程中提供兼容工作台。
 */
import { useEffect, useState } from 'react'
import { currentDirectoryPickerAvailability } from '../core/file-system-access.js'
import { ensurePermission, listRecent, loadHandle } from '../core/handle-store.js'
import {
  finishOpen,
  newBlankProject,
  newFromPal,
  type Opened,
  pickDir,
} from '../core/open-actions.js'

const mb = (value: number): string => (value / 1024 / 1024).toFixed(1)

export function ProjectPicker(props: { onOpened: (opened: Opened) => void; seedBaseUrl?: string }) {
  const { onOpened, seedBaseUrl = 'projects/pal' } = props
  const [recent, setRecent] = useState<{ id: string; name: string }[]>([])
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    listRecent()
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

  const openProject = run('打开工程', async () => {
    const dir = await pickDir()
    return dir ? finishOpen(dir) : null
  })
  const clonePal = run('从 pal 克隆', () =>
    newFromPal(seedBaseUrl, (done, total) => setProgress({ done, total })),
  )
  const createBlank = run('创建空白工程', newBlankProject)
  const openRecent = (id: string): void => {
    void run('打开最近工程', async () => {
      const dir = await loadHandle(id)
      if (!dir) throw new Error('句柄已失效，请使用「打开工程」重新选择文件夹。')
      const permission = await ensurePermission(dir, { withRequest: true })
      if (permission !== 'granted') throw new Error('未授权访问该文件夹。')
      return finishOpen(dir)
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
          选择当前 canonical content16 工程开始编辑。旧开发工程请重新生成。
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
                  下载工程 · {percent}% · {mb(progress.done)}/{mb(progress.total)} MB
                </div>
              </>
            ) : (
              <div className="picker-busy-sub">选择文件夹并授权…</div>
            )}
          </div>
        ) : (
          <>
            <div className="picker-actions">
              <button type="button" className="picker-act primary" onClick={clonePal}>
                <span className="picker-act-t">从仙剑（pal）克隆</span>
                <span className="picker-act-d">下载整套原版到本地工程，直接开始改版。</span>
              </button>
              <button type="button" className="picker-act" onClick={openProject}>
                <span className="picker-act-t">打开工程</span>
                <span className="picker-act-d">选择一个当前 content16 本地工程继续编辑。</span>
              </button>
              <button type="button" className="picker-act" onClick={createBlank}>
                <span className="picker-act-t">新建空白工程</span>
                <span className="picker-act-d">创建包含起始场景与占位角色的 content16 工程。</span>
              </button>
            </div>

            {recent.length > 0 && (
              <div className="picker-recent">
                <div className="picker-recent-h">最近工程</div>
                {recent.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    className="picker-recent-item"
                    onClick={() => openRecent(entry.id)}
                  >
                    <span className="mono">{entry.id}</span>
                    <span className="picker-recent-name">{entry.name}</span>
                  </button>
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
