import { type ReactNode, useMemo, useState } from 'react'
import { DsButton, DsIconButton } from './controls.js'

export type DsMediaBackground = 'checkerboard' | 'plain-dark' | 'black' | 'grid'

const STEPS = [0.25, 0.5, 1, 2, 4, 8, 16, 32] as const

function nearestStep(scale: number, direction: -1 | 1): number {
  const ordered = direction > 0 ? STEPS : [...STEPS].reverse()
  return ordered.find((step) => (direction > 0 ? step > scale : step < scale)) ?? scale
}

/**
 * Canonical media zoom controls. Image, animation and sprite workspaces must share this
 * component instead of defining page-local button, range and active-state skins.
 */
export function DsZoomToolbar(props: {
  label: string
  value: number
  fitted: boolean
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  onStep: (direction: -1 | 1) => void
  onFit: () => void
  onActualSize: () => void
}) {
  const percentage = Math.round(props.value * 100)
  return (
    <div className="ds-zoom-toolbar" role="toolbar" aria-label={props.label}>
      <DsIconButton
        variant="secondary"
        label="缩小"
        icon="zoom-out"
        disabled={!props.fitted && props.value <= props.min}
        onClick={() => props.onStep(-1)}
      />
      <input
        className="ds-zoom-toolbar__range"
        type="range"
        min={props.min * 100}
        max={props.max * 100}
        step={props.step ?? 5}
        value={Math.round(props.value * 100)}
        aria-label={`${props.label}比例`}
        onChange={(event) => props.onChange(Number(event.target.value) / 100)}
      />
      <output className="ds-zoom-toolbar__value" aria-live="polite">
        {percentage}%
      </output>
      <DsIconButton
        variant="secondary"
        label="放大"
        icon="zoom-in"
        disabled={!props.fitted && props.value >= props.max}
        onClick={() => props.onStep(1)}
      />
      <DsButton variant="secondary" aria-pressed={props.fitted} onClick={props.onFit}>
        适合
      </DsButton>
      <DsButton
        variant="secondary"
        aria-pressed={!props.fitted && props.value === 1}
        onClick={props.onActualSize}
      >
        1:1
      </DsButton>
    </div>
  )
}

export function DsMediaViewport(props: {
  label: string
  summary: string
  background?: DsMediaBackground
  children: ReactNode
  initialScale?: number
  onScaleChange?: (scale: number) => void
}) {
  const [scale, setScale] = useState(props.initialScale ?? 1)
  const [fitted, setFitted] = useState(true)
  const background = props.background ?? 'plain-dark'
  const percentage = Math.round(scale * 100)
  const contentStyle = useMemo(
    () => ({ '--ds-media-scale': fitted ? 1 : scale }) as React.CSSProperties,
    [fitted, scale],
  )
  function changeScale(next: number): void {
    const normalized = Math.max(0.05, Math.min(32, next))
    setScale(normalized)
    setFitted(false)
    props.onScaleChange?.(normalized)
  }
  return (
    <section
      className={`ds-media-viewport ds-media-viewport--${background}`}
      aria-label={props.label}
      aria-describedby={`${props.label.replace(/\s+/g, '-')}-summary`}
    >
      <div className="ds-media-viewport__toolbar">
        <DsZoomToolbar
          label={`${props.label}查看缩放`}
          value={scale}
          fitted={fitted}
          min={0.05}
          max={32}
          onChange={changeScale}
          onStep={(direction) => changeScale(nearestStep(scale, direction))}
          onFit={() => setFitted(true)}
          onActualSize={() => changeScale(1)}
        />
      </div>
      <div className="ds-media-viewport__content" style={contentStyle}>
        {props.children}
      </div>
      <span id={`${props.label.replace(/\s+/g, '-')}-summary`} className="ds-visually-hidden">
        {props.summary}；当前缩放 {fitted ? '适应窗口' : `${percentage}%`}
      </span>
    </section>
  )
}
