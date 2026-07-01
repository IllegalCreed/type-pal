/**
 * @type-pal/editor React 根(D-B0 脚手架占位壳)。
 *
 * B0 只证「editor → reforge import + /projects serveDir + loadProject」整条复用链通:
 * 载 demo 工程,把入口场景 id 打到 console。不画 canvas(画布视口是 B1)。
 *
 * 见 docs/phase2/editor/editor-b0-plan.md Task 5。
 */
import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { loadProject } from '@type-pal/reforge'

type Status = 'loading' | { sceneId: string } | { error: string }

function App() {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false
    loadProject('demo')
      .then((project) => {
        if (cancelled) return
        const sceneId = project.entryScene.id
        console.log('[editor] demo 入口场景 id:', sceneId)
        setStatus({ sceneId })
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[editor] loadProject 失败:', err)
        if (!cancelled) setStatus({ error: msg })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'loading') return <div>正在载入 demo 工程…</div>
  if ('error' in status) return <div>载入失败:{status.error}</div>
  return (
    <div>
      <h1>编辑器地基就位</h1>
      <p>
        已载 demo 工程,入口场景:<code>{status.sceneId}</code>(详见 console)
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
