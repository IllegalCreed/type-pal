/**
 * ProjectPicker —— 启动屏(P4)。真实用户入口:从 pal 克隆 / 打开本地 / 新建空白 / 最近工程。
 * 动作逻辑在 core/open-actions(与编辑器内「工程」菜单共享);此处只管 UI + 进度/错误态。
 * FSA 选夹是浏览器原生弹窗(须用户手势);非 Chromium 无 showDirectoryPicker → 提示换浏览器。
 */
import { useEffect, useState } from 'react'
import { currentDirectoryPickerAvailability } from '../core/file-system-access.js'
import { ensurePermission, listRecent, loadHandle } from '../core/handle-store.js'
import {
  finishOpen,
  newBlankProject,
  newFromPal,
  type Opened,
  openExistingProject,
} from '../core/open-actions.js'

const mb = (n: number): string => (n / 1024 / 1024).toFixed(1)

export function ProjectPicker(props: { onOpened: (o: Opened) => void; seedBaseUrl?: string }) {
  const { onOpened, seedBaseUrl = 'projects/pal' } = props
  const [recent, setRecent] = useState<{ id: string; name: string }[]>([])
  const [busy, setBusy] = useState('')
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    listRecent()
      .then(setRecent)
      .catch(() => {})
  }, [])

  const pickerAvailability = currentDirectoryPickerAvailability()

  const run = (label: string, fn: () => Promise<Opened | null>) => async (): Promise<void> => {
    setErr('')
    setBusy(label)
    try {
      const o = await fn()
      if (o) onOpened(o)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy('')
      setProgress(null)
    }
  }

  const onCloneFromPal = run('从 pal 克隆', () =>
    newFromPal(seedBaseUrl, (done, total) => setProgress({ done, total })),
  )
  const onNewBlank = run('创建空白工程', newBlankProject)
  const onOpen = run('打开工程', openExistingProject)
  const onRecent = (id: string) =>
    run('打开最近工程', async () => {
      const dir = await loadHandle(id)
      if (!dir) throw new Error('句柄已失效,请「打开工程」重新选文件夹')
      const perm = await ensurePermission(dir, { withRequest: true })
      if (perm !== 'granted') throw new Error('未授权访问该文件夹')
      return finishOpen(dir)
    })()

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

  const pct =
    progress && progress.total > 0 ? Math.floor((progress.done / progress.total) * 100) : 0

  return (
    <div className="picker">
      <div className="picker-card">
        <h1 className="picker-title">type-pal 编辑器</h1>
        <p className="picker-sub">
          选一个工程开始 —— 改版仙剑,或从头做个新游戏。工程存在你本地文件夹。
        </p>

        {busy ? (
          <div className="picker-busy">
            <div className="picker-busy-label">{busy}…</div>
            {progress ? (
              <>
                <div className="picker-bar">
                  <div className="picker-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="picker-busy-sub">
                  {pct}% · {mb(progress.done)}/{mb(progress.total)} MB
                </div>
              </>
            ) : (
              <div className="picker-busy-sub">选择文件夹并授权…</div>
            )}
          </div>
        ) : (
          <>
            <div className="picker-actions">
              <button type="button" className="picker-act primary" onClick={onCloneFromPal}>
                <span className="picker-act-t">🗡 从仙剑(pal)克隆</span>
                <span className="picker-act-d">
                  下载整套原版到本地工程,直接改版(约 200MB,一次性)
                </span>
              </button>
              <button type="button" className="picker-act" onClick={onOpen}>
                <span className="picker-act-t">📂 打开工程</span>
                <span className="picker-act-d">选一个已有的本地工程文件夹继续编辑</span>
              </button>
              <button type="button" className="picker-act" onClick={onNewBlank}>
                <span className="picker-act-t">✨ 新建空白工程</span>
                <span className="picker-act-d">
                  从零做新游戏;自带一间起始草地房和占位主角,开箱即玩,素材逐步换成你自己的
                </span>
              </button>
            </div>

            {recent.length > 0 && (
              <div className="picker-recent">
                <div className="picker-recent-h">最近工程</div>
                {recent.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    className="picker-recent-item"
                    onClick={() => onRecent(r.id)}
                  >
                    <span className="mono">{r.id}</span>
                    <span className="picker-recent-name">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {err && <div className="picker-err">{err}</div>}
      </div>
    </div>
  )
}
