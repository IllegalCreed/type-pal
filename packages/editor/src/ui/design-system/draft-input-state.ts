import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

export type DsDraftInputState = {
  source: string
  value: string
  error?: string
}

export type DsDraftInputContract = {
  /** Stable object + field identity. Changing it cancels the previous object's draft. */
  draftKey: string
  /** Optional external transaction version used to resync after undo/redo. */
  syncToken?: string | number
  validate?: (value: string) => string | undefined
  /** Return false when the canonical mutation was rejected so the draft resyncs. */
  onCommit: (value: string) => void | boolean
  onCancel?: () => void
}

export function draftSource(
  draftKey: string,
  syncToken: string | number | undefined,
  value: string,
): string {
  return `${draftKey}\0${syncToken ?? ''}\0${value}`
}

export function useDsDraftController(props: DsDraftInputContract & { value: string }): {
  value: string
  error?: string
  change(value: string): void
  replaceAndCommit(value: string): boolean
  blur(): void
  keyDown(event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void
  compositionStart(): void
  compositionEnd(value: string): void
} {
  const { draftKey, syncToken, value: canonicalValue, validate, onCommit, onCancel } = props
  const source = draftSource(draftKey, syncToken, canonicalValue)
  const [draft, setDraft] = useState<DsDraftInputState>({ source, value: canonicalValue })
  const current = draft.source === source ? draft : { source, value: canonicalValue }
  const currentRef = useRef<DsDraftInputState>(current)
  const composingRef = useRef(false)
  const blurredWhileComposingRef = useRef(false)
  const committedRef = useRef<string | undefined>(undefined)
  const suppressNextBlurRef = useRef(false)

  currentRef.current = current

  useEffect(() => {
    if (draft.source !== source) setDraft({ source, value: canonicalValue })
  }, [canonicalValue, draft.source, source])

  const commitDraft = useCallback(
    (next: DsDraftInputState): boolean => {
      if (next.source !== source) return true
      const signature = `${source}\0${next.value}`
      if (committedRef.current === signature) return true
      const error = validate?.(next.value)
      if (error) {
        const invalidDraft = { ...next, error }
        currentRef.current = invalidDraft
        setDraft(invalidDraft)
        return false
      }
      const accepted = next.value === canonicalValue ? true : onCommit(next.value)
      if (accepted === false) {
        committedRef.current = undefined
        const cleanDraft = { source, value: canonicalValue }
        currentRef.current = cleanDraft
        setDraft(cleanDraft)
        return false
      }
      committedRef.current = signature
      const cleanDraft = { source, value: next.value }
      currentRef.current = cleanDraft
      setDraft(cleanDraft)
      return true
    },
    [canonicalValue, onCommit, source, validate],
  )

  const commit = useCallback((): boolean => commitDraft(currentRef.current), [commitDraft])

  return {
    value: current.value,
    error: current.error,
    change: (value) => {
      const next = { source, value }
      committedRef.current = undefined
      currentRef.current = next
      setDraft(next)
    },
    replaceAndCommit: (value) => {
      const next = { source, value }
      committedRef.current = undefined
      currentRef.current = next
      setDraft(next)
      return commitDraft(next)
    },
    blur: () => {
      if (suppressNextBlurRef.current) {
        suppressNextBlurRef.current = false
        return
      }
      if (composingRef.current) {
        blurredWhileComposingRef.current = true
        return
      }
      commit()
    },
    keyDown: (event) => {
      if (
        (event.key === 'Enter' || event.key === 'Escape') &&
        (composingRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
      )
        return
      if (event.key === 'Enter') {
        event.preventDefault()
        if (commit()) event.currentTarget.blur()
        return
      }
      if (event.key !== 'Escape') return
      event.preventDefault()
      blurredWhileComposingRef.current = false
      committedRef.current = undefined
      const cleanDraft = { source, value: canonicalValue }
      currentRef.current = cleanDraft
      setDraft(cleanDraft)
      onCancel?.()
      event.currentTarget.blur()
    },
    compositionStart: () => {
      composingRef.current = true
    },
    compositionEnd: (value) => {
      composingRef.current = false
      const next = { source, value }
      currentRef.current = next
      setDraft(next)
      if (blurredWhileComposingRef.current) {
        blurredWhileComposingRef.current = false
        queueMicrotask(commit)
      }
    },
  }
}
