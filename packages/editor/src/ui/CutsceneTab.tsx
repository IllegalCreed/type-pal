/**
 * 过场库页(数据模式·过场标签,P2 过场编排)—— 工程过场资产一览 + 预览:
 *   - mp4 视频(videos/{id}.mp4;1=开场 SOFTSTAR / 4-6=结局过场)→ playVideo 命令引用
 *   - RNG 序列图(rng-frames.json;开场梦境 / 剧情过场)→ playRng 命令引用
 *
 * 这是「编辑好后可以被一个指令引用」的**引用侧**:浏览 + 预览 + 亮出 id 供脚本里
 * playVideo/playRng 引用。**RNG 序列的创作(排帧成新序列)是另一件事**(动画时间轴,
 * 新 UI 形态待定),本页只做浏览/预览/引用,不做创作。预览复用引擎运行时(video/rng-player)。
 *
 * RNG 上色用**引擎内定死的正确调色盘**(rngPaletteId;每个 RNG 固定一份,从原版脚本扒出)——
 * **不暴露"调色盘"给使用者选**(清洁重写不把索引色概念带进新系统)。
 */
import type { AssetBase } from '@type-pal/reforge'
import { loadPalette, playRng, playVideo, rngPaletteId } from '@type-pal/reforge'
import { useEffect, useState } from 'react'

/** 原版 videos/{N}.mp4(avi-player 考证:1 商标 / 2 splash / 3 opening / 4-6 过场·结局)。 */
const VIDEOS: { id: number; note: string }[] = [
  { id: 1, note: '开场(SOFTSTAR 商标)' },
  { id: 2, note: 'splash' },
  { id: 3, note: 'opening' },
  { id: 4, note: '过场 / 结局' },
  { id: 5, note: '过场 / 结局' },
  { id: 6, note: '过场 / 结局' },
]

interface RngManifest {
  chunks: Array<{ chunkIndex: number; frameCount: number }>
}

export function CutsceneTab(props: { assetBase: AssetBase; tabBar?: React.ReactNode }) {
  const { assetBase, tabBar } = props
  const [rngChunks, setRngChunks] = useState<{ chunkIndex: number; frameCount: number }[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/extracted/data/rng-frames.json')
      .then((r) => (r.ok ? (r.json() as Promise<RngManifest>) : null))
      .then((m) => {
        if (alive && m) {
          setRngChunks(
            m.chunks
              .map((c) => ({ chunkIndex: c.chunkIndex, frameCount: c.frameCount }))
              .sort((a, b) => a.chunkIndex - b.chunkIndex),
          )
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const previewVideo = (id: number): void => {
    if (busy) return
    setBusy(true)
    void playVideo({ src: `/extracted/videos/${id}.mp4` }).finally(() => setBusy(false))
  }
  const previewRng = async (chunkIdx: number): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      // 用引擎内定死的该 RNG 正确调色盘上色(不让使用者选)
      const palette = await loadPalette(assetBase, rngPaletteId(chunkIdx))
      await playRng({ chunkIdx, palette })
    } catch (e) {
      console.warn('[cutscene] rng preview failed', e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">过场</span>
          <span className="spacer" />
          <span className="k">
            {VIDEOS.length} 视频 · {rngChunks.length} RNG
          </span>
        </div>
        <div className="insp-empty" style={{ marginTop: 8 }}>
          脚本里用 <span className="mono">playVideo(视频号)</span> /{' '}
          <span className="mono">playRng(RNG号)</span> 引用一段过场。视频/RNG 本体是只读提取资产,
          本页只浏览 + 预览(空格/Esc 跳过)。RNG 上色用引擎内定死的正确调色盘,**不用你选**。 RNG
          创作(排帧成新序列)另属动画编辑页(待做)。
        </div>
      </div>
      <div className="canvas-wrap data-body">
        <div className="et-scroll">
          <table className="music-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={{ width: 56 }}>视频号</th>
                <th>说明(mp4)</th>
                <th style={{ width: 56 }}>预览</th>
              </tr>
            </thead>
            <tbody>
              {VIDEOS.map((v) => (
                <tr key={v.id}>
                  <td className="mono">{v.id}</td>
                  <td>{v.note}</td>
                  <td>
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => previewVideo(v.id)}
                    >
                      ▶
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rngChunks.length === 0 ? (
            <div className="insp-empty">RNG 清单(rng-frames.json)未找到或为空。</div>
          ) : (
            <table className="music-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>RNG号</th>
                  <th>帧数</th>
                  <th style={{ width: 56 }}>预览</th>
                </tr>
              </thead>
              <tbody>
                {rngChunks.map((c) => (
                  <tr key={c.chunkIndex}>
                    <td className="mono">{c.chunkIndex}</td>
                    <td>{c.frameCount} 帧</td>
                    <td>
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={() => void previewRng(c.chunkIndex)}
                      >
                        ▶
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
