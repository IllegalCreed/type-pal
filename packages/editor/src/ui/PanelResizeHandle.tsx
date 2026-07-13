import {
  type Dispatch,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react'

type Orientation = 'vertical' | 'horizontal'

function readStoredValue<T>(key: string, fallback: T, parse: (raw: string) => T | undefined): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : (parse(raw) ?? fallback)
  } catch {
    return fallback
  }
}

function useStoredPanelState<T>(
  key: string,
  fallback: T,
  parse: (raw: string) => T | undefined,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readStoredValue(key, fallback, parse))
  useEffect(() => {
    try {
      window.localStorage.setItem(key, String(value))
    } catch {
      // 隐私模式或存储禁用时只保留当前会话状态。
    }
  }, [key, value])
  return [value, setValue]
}

export function useStoredPanelNumber(
  key: string,
  fallback: number,
): [number, Dispatch<SetStateAction<number>>] {
  return useStoredPanelState(key, fallback, (raw) => {
    const value = Number(raw)
    return Number.isFinite(value) ? value : undefined
  })
}

export function useStoredPanelBoolean(
  key: string,
  fallback: boolean,
): [boolean, Dispatch<SetStateAction<boolean>>] {
  return useStoredPanelState(key, fallback, (raw) => {
    if (raw === 'true') return true
    if (raw === 'false') return false
    return undefined
  })
}

export function PanelResizeHandle(props: {
  orientation: Orientation
  value: number
  min: number
  max: number
  resizeLabel: string
  onResize: (delta: number) => void
  onReset: () => void
  className?: string
  disabled?: boolean
  toggleIcon?: string
  toggleLabel?: string
  onToggle?: () => void
}) {
  const pointer = useRef<{ id: number; coordinate: number } | null>(null)
  const coordinateOf = (event: ReactPointerEvent): number =>
    props.orientation === 'vertical' ? event.clientX : event.clientY

  const clearResizeState = (): void => {
    pointer.current = null
    document.documentElement.removeAttribute('data-panel-resize')
  }

  useEffect(
    () => () => {
      pointer.current = null
      document.documentElement.removeAttribute('data-panel-resize')
    },
    [],
  )

  const endPointer = (event: ReactPointerEvent<HTMLElement>): void => {
    if (pointer.current?.id !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    clearResizeState()
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Home') {
      event.preventDefault()
      props.onReset()
      return
    }
    if ((event.key === 'Enter' || event.key === ' ') && props.onToggle) {
      event.preventDefault()
      props.onToggle()
      return
    }
    const delta =
      props.orientation === 'vertical'
        ? event.key === 'ArrowLeft'
          ? -16
          : event.key === 'ArrowRight'
            ? 16
            : 0
        : event.key === 'ArrowUp'
          ? -16
          : event.key === 'ArrowDown'
            ? 16
            : 0
    if (delta === 0 || props.disabled) return
    event.preventDefault()
    props.onResize(delta)
  }

  return (
    <div
      className={`panel-resizer panel-resizer-${props.orientation}${props.className ? ` ${props.className}` : ''}`}
    >
      <hr
        className="panel-resizer-hit"
        aria-label={props.resizeLabel}
        aria-orientation={props.orientation}
        aria-valuemin={Math.round(props.min)}
        aria-valuemax={Math.round(props.max)}
        aria-valuenow={Math.round(props.value)}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onDoubleClick={() => props.onReset()}
        onPointerDown={(event) => {
          if (props.disabled || event.button !== 0) return
          pointer.current = { id: event.pointerId, coordinate: coordinateOf(event) }
          event.currentTarget.setPointerCapture(event.pointerId)
          document.documentElement.setAttribute('data-panel-resize', props.orientation)
          event.preventDefault()
        }}
        onPointerMove={(event) => {
          if (pointer.current?.id !== event.pointerId) return
          const coordinate = coordinateOf(event)
          const delta = coordinate - pointer.current.coordinate
          if (delta === 0) return
          pointer.current.coordinate = coordinate
          props.onResize(delta)
        }}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      />
      {props.onToggle && props.toggleIcon && props.toggleLabel ? (
        <button
          type="button"
          className="panel-resizer-toggle"
          title={props.toggleLabel}
          aria-label={props.toggleLabel}
          onPointerDown={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onClick={props.onToggle}
        >
          {props.toggleIcon}
        </button>
      ) : null}
    </div>
  )
}
