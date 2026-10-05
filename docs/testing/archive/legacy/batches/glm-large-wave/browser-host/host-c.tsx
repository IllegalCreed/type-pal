/**
 * TEST-GLM-LARGE-WAVE-4 C 批隔离功能视觉宿主（端口 6088，严格端口）。
 * 直挂范围：真实 DialogBox 槽位模型（bottom→top 异槽共存推进/关闭）。
 * 字形为固定 8×8 点阵替身（与 dialog-box 观察测试同界）：证明槽位推进与文本排版行为，
 * 不证明真实字体渲染；光标帧为空数组（不演示箭头）。
 */
import type { Dialogue } from '@type-pal/content'
import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { DialogBox } from '../../../../../../../packages/reforge/src/dialog/dialog-box.js'
import { startDialogue } from '../../../../../../../packages/reforge/src/dialogue.js'
import type { GlyphTable } from '../../../../../../../packages/reforge/src/text/glyph.js'

const dialogue: Dialogue = {
  id: 'glw-c',
  cues: [
    { slot: 'bottom', speaker: 'name.hero', rows: [{ text: 'BOTTOM LINE 1', speed: 10 }] },
    { slot: 'top', rows: [{ text: 'TOP LINE', speed: 10 }] },
  ],
}

function Host() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef(0)
  const stateRef = useRef<{
    ui: DialogBox
    state: ReturnType<typeof startDialogue> | null
  } | null>(null)
  const [status, setStatus] = useState('closed')
  const [observeText, setObserveText] = useState('(closed)')

  const ensure = (): DialogBox => {
    if (stateRef.current) return stateRef.current.ui
    const context = canvasRef.current?.getContext('2d')
    if (!context) throw new Error('canvas 2d unavailable')
    const glyph = { width: 8, height: 8, bitmap: new Uint8Array(64).fill(255) }
    const glyphs = { has: () => true, get: () => glyph } as unknown as GlyphTable
    stateRef.current = { ui: new DialogBox(context, glyphs, [], new Map(), {}), state: null }
    return stateRef.current.ui
  }
  const refresh = (): void => {
    const entry = stateRef.current
    const observation = entry?.ui.observe()
    setObserveText(observation ? JSON.stringify(observation, null, 1) : '(closed)')
    setStatus(entry?.ui.active ? 'active' : 'closed')
  }

  const open = (): void => {
    const ui = ensure()
    const state = startDialogue(dialogue)
    stateRef.current!.state = state
    ui.open(state, performance.now())
    // 引擎模型：每帧整屏重绘，DialogBox 只负责对话层。宿主用 rAF 循环模拟该契约。
    const context = canvasRef.current!.getContext('2d')!
    const tick = (): void => {
      context.clearRect(0, 0, 320, 200)
      ui.render(performance.now())
      rafRef.current = requestAnimationFrame(tick)
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
    refresh()
  }
  const advance = (): void => {
    const entry = stateRef.current
    if (!entry?.ui.active) return
    entry.ui.advance(performance.now())
    refresh()
  }
  const close = (): void => {
    const entry = stateRef.current
    if (!entry) return
    cancelAnimationFrame(rafRef.current)
    entry.ui.close()
    canvasRef.current!.getContext('2d')!.clearRect(0, 0, 320, 200)
    refresh()
  }

  return (
    <main style={{ display: 'grid', gap: 16, padding: 24, maxWidth: 760 }}>
      <h2>DialogBox 槽位共存（C 批隔离视觉）</h2>
      <canvas
        ref={canvasRef}
        width={320}
        height={200}
        style={{
          width: 640,
          height: 400,
          imageRendering: 'pixelated',
          background: '#204060',
        }}
        aria-label="对话槽位演示画布"
      />
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" data-action="open" onClick={open}>
          打开对话
        </button>
        <button type="button" data-action="advance" onClick={advance}>
          推进下一段
        </button>
        <button type="button" data-action="close" onClick={close}>
          关闭
        </button>
        <output data-status>{status}</output>
      </div>
      <pre data-observe style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {observeText}
      </pre>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Host />)
