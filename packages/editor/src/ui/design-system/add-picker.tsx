import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DS_OPTION_VIRTUALIZE_ABOVE, filterDsCollection } from './collection-search.js'
import { DsButton, DsTextInput } from './controls.js'
import { DsDialog } from './overlays.js'
import { DsVirtualListbox } from './virtual-list.js'

export interface DsAddPickerOption {
  id: string
  label: string
  description?: string
  searchText?: string | readonly string[]
  leading?: ReactNode
  trailing?: ReactNode
  disabledReason?: string
}

export interface DsAddPickerDialogProps {
  adoptionId: string
  triggerLabel: string
  title: string
  description?: string
  confirmLabel: string
  options: readonly DsAddPickerOption[]
  scopeKey: string
  revision: unknown
  readOnly?: boolean
  loading?: boolean
  error?: string
  emptyMessage?: string
  searchLabel?: string
  fallbackFocusRef?: RefObject<HTMLElement | null>
  onConfirm: (id: string) => void | false | Promise<void | false>
}

function searchParts(option: DsAddPickerOption): readonly (string | undefined)[] {
  return [
    option.label,
    option.id,
    option.description,
    option.disabledReason,
    ...(Array.isArray(option.searchText) ? option.searchText : [option.searchText]),
  ]
}

export function DsAddPickerDialog(props: DsAddPickerDialogProps) {
  const instanceId = useId().replace(/:/g, '')
  const searchId = `ds-add-picker-${instanceId}-search`
  const unavailableId = `ds-add-picker-${instanceId}-unavailable`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const submittingRef = useRef(false)
  const cycleRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resultsOpen, setResultsOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const filteredOptions = useMemo(
    () => filterDsCollection(props.options, query, searchParts),
    [props.options, query],
  )
  const selectedOption = filteredOptions.find((option) => option.id === selectedId)
  const filteredEnabledCount = filteredOptions.filter((option) => !option.disabledReason).length
  const allDisabled =
    props.options.length > 0 && props.options.every((option) => option.disabledReason)
  const confirmable = Boolean(
    selectedOption &&
      !selectedOption.disabledReason &&
      !props.readOnly &&
      !props.loading &&
      !props.error &&
      !busy,
  )
  const unavailableMessage = props.loading
    ? '正在加载候选…'
    : props.error
      ? props.error
      : props.options.length === 0
        ? (props.emptyMessage ?? '没有可添加的候选。')
        : null
  const ownerStatusMessage =
    unavailableMessage ??
    (allDisabled ? `${props.options.length} 项候选当前均不可添加；打开查看原因。` : null)

  const resetDraft = useCallback(() => {
    cycleRef.current += 1
    submittingRef.current = false
    setQuery('')
    setSelectedId(null)
    setResultsOpen(true)
    setBusy(false)
    setLocalError(null)
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    resetDraft()
  }, [resetDraft])

  const openDialog = () => {
    if (props.readOnly || props.loading || props.error || props.options.length === 0) return
    resetDraft()
    setOpen(true)
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: scope/revision/readOnly are explicit external resync signals; depending on open would close every newly opened dialog.
  useEffect(() => {
    if (!open) return
    close()
  }, [props.readOnly, props.revision, props.scopeKey])

  // biome-ignore lint/correctness/useExhaustiveDependencies: availability changes are explicit external resync signals; depending on open would close every newly opened dialog.
  useEffect(() => {
    if (!open || (!props.loading && !props.error && props.options.length > 0)) return
    close()
  }, [props.error, props.loading, props.options.length])

  useEffect(() => {
    if (selectedId == null) return
    const current = props.options.find((option) => option.id === selectedId)
    if (current && !current.disabledReason) return
    setSelectedId(null)
    setLocalError('候选已发生变化，请重新选择。')
  }, [props.options, selectedId])

  useEffect(() => {
    if (selectedId == null) return
    if (filteredOptions.some((option) => option.id === selectedId)) return
    setSelectedId(null)
  }, [filteredOptions, selectedId])

  const confirm = async () => {
    if (submittingRef.current || !selectedId || props.readOnly || props.loading || props.error)
      return
    const latest = filteredOptions.find((option) => option.id === selectedId)
    if (!latest || latest.disabledReason) {
      setSelectedId(null)
      setLocalError('候选已发生变化，请重新选择。')
      return
    }
    submittingRef.current = true
    setBusy(true)
    setLocalError(null)
    const cycle = cycleRef.current
    try {
      const result = await props.onConfirm(latest.id)
      if (cycle !== cycleRef.current) return
      if (result === false) {
        submittingRef.current = false
        setBusy(false)
        setLocalError('未能添加所选对象，请检查当前状态后重试。')
        return
      }
      close()
    } catch (error) {
      if (cycle !== cycleRef.current) return
      submittingRef.current = false
      setBusy(false)
      setLocalError(error instanceof Error ? error.message : '添加失败，请重试。')
    }
  }

  return (
    <span
      className="ds-add-picker-owner"
      data-ds-add-picker-adoption={props.adoptionId}
      data-scope-key={props.scopeKey}
    >
      <DsButton
        ref={triggerRef}
        icon="add"
        size="compact"
        disabled={Boolean(props.readOnly || unavailableMessage)}
        aria-describedby={ownerStatusMessage ? unavailableId : undefined}
        onClick={openDialog}
      >
        {props.triggerLabel}
      </DsButton>
      {ownerStatusMessage ? (
        <span
          id={unavailableId}
          className="ds-add-picker-owner__status"
          role={props.error ? 'alert' : 'status'}
        >
          {ownerStatusMessage}
        </span>
      ) : null}
      <DsDialog
        open={open}
        title={props.title}
        description={props.description}
        className="ds-add-picker-dialog"
        dismissible={!busy}
        ariaBusy={busy}
        fallbackFocusRef={props.fallbackFocusRef ?? triggerRef}
        onClose={close}
        footer={
          <>
            <DsButton disabled={busy} onClick={close}>
              取消
            </DsButton>
            <DsButton
              variant="primary"
              busy={busy}
              disabled={!confirmable}
              onClick={() => void confirm()}
            >
              {props.confirmLabel}
            </DsButton>
          </>
        }
      >
        <div className="ds-add-picker">
          <label className="ds-field__label" htmlFor={searchId}>
            {props.searchLabel ?? '搜索候选'}
          </label>
          <DsTextInput
            ref={searchRef}
            id={searchId}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={resultsOpen && filteredOptions.length > 0}
            autoFocus
            value={query}
            placeholder={`搜索 ${props.options.length} 项`}
            onChange={(event) => {
              setQuery(event.currentTarget.value)
              setResultsOpen(true)
              setLocalError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                if (resultsOpen) {
                  setResultsOpen(false)
                  setSelectedId(null)
                } else if (!busy) {
                  close()
                }
                return
              }
              if (!resultsOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
                event.preventDefault()
                setResultsOpen(true)
              }
            }}
          />
          <div className="ds-add-picker__summary" role="status" aria-live="polite">
            {filteredOptions.length > 0
              ? `找到 ${filteredOptions.length} 项，${filteredEnabledCount} 项可添加`
              : '没有找到匹配项。'}
          </div>
          {localError ? (
            <div className="ds-add-picker__error" role="alert">
              {localError}
            </div>
          ) : null}
          {resultsOpen && filteredOptions.length > 0 ? (
            <DsVirtualListbox
              label={props.title}
              items={filteredOptions}
              itemHeight={60}
              height={336}
              fill
              overscan={4}
              virtualizeAbove={DS_OPTION_VIRTUALIZE_ABOVE}
              keyboardOwnerRef={searchRef}
              getKey={(option) => option.id}
              getDisabled={(option) => Boolean(option.disabledReason)}
              selectedKey={selectedId}
              onSelect={(option) => {
                setSelectedId(option.id)
                setLocalError(null)
              }}
              renderItem={(option) => (
                <div className="ds-add-picker-option" data-option-id={option.id}>
                  {option.leading ? (
                    <span className="ds-add-picker-option__leading">{option.leading}</span>
                  ) : null}
                  <span className="ds-add-picker-option__content">
                    <strong>{option.label}</strong>
                    <span
                      className={`ds-add-picker-option__identity${option.disabledReason ? ' ds-add-picker-option__reason' : ''}`}
                    >
                      <span className="ds-control--monospace">{option.id}</span>
                      {option.disabledReason || option.description ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="ds-add-picker-option__detail">
                            {option.disabledReason ?? option.description}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </span>
                  {option.trailing ? (
                    <span className="ds-add-picker-option__trailing">{option.trailing}</span>
                  ) : null}
                </div>
              )}
            />
          ) : resultsOpen ? (
            <div className="ds-add-picker__empty">没有找到匹配项。</div>
          ) : (
            <div className="ds-add-picker__empty">结果已收起；继续输入或按方向键重新展开。</div>
          )}
        </div>
      </DsDialog>
    </span>
  )
}
