/**
 * 氛围滤镜工作台：左侧管理定义，中间编辑名称/乘色并在真实场景上 A/B 预览，
 * 右侧只承载引用与说明。预览上下文属于会话状态，不进入撤销或保存。
 */
import { AMBIENCE_IDENTITY, type AmbienceDef, isIdentityTint } from '@type-pal/content'
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  type BlockingAmbienceReference,
  collectAmbienceReferenceIndex,
} from '../core/ambience-references.js'
import {
  AddAmbienceCommand,
  AmbienceInUseError,
  DeleteAmbienceCommand,
  UpdateAmbienceCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type {
  CanonicalScriptReference,
  ScriptEditorState,
  ScriptEditSession,
} from '../core/script-editor.js'
import { AmbienceScenePreview, type AmbienceScenePreviewProps } from './AmbienceScenePreview.js'
import {
  DsButton,
  DsCatalogRow,
  DsDialog,
  DsField,
  DsInspectorSection,
  DsInspectorTabs,
  DsListHeader,
  DsNumberInput,
  DsObjectHero,
  DsObjectWorkspace,
  DsPropertyGrid,
  DsPropertyRow,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsStatus,
  DsTag,
  DsTextField,
  DsTextInput,
  DsWorkbenchSection,
} from './design-system/index.js'

type Tint = AmbienceDef['tint']
type InspectorTab = 'references' | 'description'
type PreviewProps = Omit<AmbienceScenePreviewProps, 'session' | 'tint'>

const WHITE_TINT: Tint = AMBIENCE_IDENTITY

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function sameTint(left: Tint, right: Tint): boolean {
  return left[0] === right[0] && left[1] === right[1] && left[2] === right[2]
}

function toHex(tint: Tint): string {
  return `#${tint.map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`
}

function parseHex(value: string): [number, number, number] | undefined {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(value.trim())
  if (!match) return undefined
  return [
    Number.parseInt(match[1]!, 16),
    Number.parseInt(match[2]!, 16),
    Number.parseInt(match[3]!, 16),
  ]
}

function AmbienceNameField(props: { ambience: AmbienceDef; session: EditSession }) {
  const { ambience, session } = props
  const [draft, setDraft] = useState(ambience.name)
  const cancelBlurRef = useRef(false)

  useEffect(() => setDraft(ambience.name), [ambience.name])

  const commit = (): void => {
    if (cancelBlurRef.current) {
      cancelBlurRef.current = false
      setDraft(ambience.name)
      return
    }
    const name = draft.trim() || ambience.id
    setDraft(name)
    if (name !== ambience.name) session.dispatch(new UpdateAmbienceCommand(ambience.id, { name }))
  }

  return (
    <DsTextField
      label="名称"
      value={draft}
      autoComplete="off"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          cancelBlurRef.current = true
          setDraft(ambience.name)
          event.currentTarget.blur()
        }
      }}
    />
  )
}

function AmbienceTintFields(props: {
  ambience: AmbienceDef
  session: EditSession
  onPreviewChange: (tint: Tint) => void
}) {
  const { ambience, session, onPreviewChange } = props
  const [draft, setDraft] = useState<Tint>(ambience.tint)
  const [hexDraft, setHexDraft] = useState(toHex(ambience.tint))
  const [hexError, setHexError] = useState('')
  const cancelBlurRef = useRef(false)

  useEffect(() => {
    setDraft(ambience.tint)
    setHexDraft(toHex(ambience.tint))
    setHexError('')
    onPreviewChange(ambience.tint)
  }, [ambience.tint, onPreviewChange])

  const preview = (next: Tint): void => {
    setDraft(next)
    setHexDraft(toHex(next))
    setHexError('')
    onPreviewChange(next)
  }

  const commit = (next: Tint = draft): void => {
    if (cancelBlurRef.current) {
      cancelBlurRef.current = false
      preview(ambience.tint)
      return
    }
    const canonical: Tint = [clampChannel(next[0]), clampChannel(next[1]), clampChannel(next[2])]
    preview(canonical)
    if (!sameTint(canonical, ambience.tint))
      session.dispatch(new UpdateAmbienceCommand(ambience.id, { tint: canonical }))
  }

  const updateChannel = (index: 0 | 1 | 2, value: string): void => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return
    const next: [number, number, number] = [...draft]
    next[index] = clampChannel(parsed)
    preview(next)
  }

  return (
    <div className="ambience-tint-fields">
      <div className="ambience-tint-fields__primary">
        <DsField label="颜色" className="ambience-color-field">
          {(control) => (
            <span className="ambience-color-control">
              <span
                className="ambience-color-control__swatch"
                style={{ backgroundColor: toHex(draft) }}
                aria-hidden="true"
              />
              <input
                {...control}
                className="ambience-color-control__input"
                type="color"
                aria-label="氛围乘色"
                value={toHex(draft)}
                title="选择全帧乘法色"
                onInput={(event) => {
                  const next = parseHex(event.currentTarget.value)
                  if (next) preview(next)
                }}
                onBlur={() => commit()}
                onKeyDown={(event) => {
                  if (event.key !== 'Escape') return
                  cancelBlurRef.current = true
                  preview(ambience.tint)
                  event.currentTarget.blur()
                }}
              />
            </span>
          )}
        </DsField>
        <DsField label="HEX" error={hexError || undefined} className="ambience-hex-field">
          {(control) => (
            <DsTextInput
              {...control}
              value={hexDraft}
              monospace
              invalid={Boolean(hexError)}
              aria-label="氛围颜色 HEX"
              onChange={(event) => {
                const value = event.target.value
                setHexDraft(value)
                const next = parseHex(value)
                if (next) {
                  setDraft(next)
                  setHexError('')
                  onPreviewChange(next)
                }
              }}
              onBlur={() => {
                if (cancelBlurRef.current) {
                  commit()
                  return
                }
                const next = parseHex(hexDraft)
                if (!next) {
                  setHexError('请输入 6 位十六进制颜色。')
                  return
                }
                commit(next)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
                if (event.key === 'Escape') {
                  cancelBlurRef.current = true
                  preview(ambience.tint)
                  event.currentTarget.blur()
                }
              }}
            />
          )}
        </DsField>
        <div className="ambience-tint-fields__status">
          {isIdentityTint(draft) ? (
            <DsTag tone="neutral">不染色</DsTag>
          ) : (
            <DsButton variant="secondary" onClick={() => commit(WHITE_TINT)}>
              恢复不染色
            </DsButton>
          )}
        </div>
      </div>
      <fieldset className="ambience-rgb-fields">
        <legend className="ds-visually-hidden">RGB 通道</legend>
        {(['R', 'G', 'B'] as const).map((label, index) => (
          <DsField key={label} label={label}>
            {(control) => (
              <DsNumberInput
                {...control}
                min={0}
                max={255}
                value={draft[index]}
                aria-label={`${label} 通道`}
                onChange={(event) => updateChannel(index as 0 | 1 | 2, event.target.value)}
                onBlur={() => commit()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur()
                  if (event.key === 'Escape') {
                    cancelBlurRef.current = true
                    preview(ambience.tint)
                    event.currentTarget.blur()
                  }
                }}
              />
            )}
          </DsField>
        ))}
      </fieldset>
    </div>
  )
}

export function AmbienceTab(props: {
  ambiences: AmbienceDef[]
  session: EditSession
  preview?: PreviewProps
  script?: { state?: ScriptEditorState; session: ScriptEditSession }
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenReference?: (reference: CanonicalScriptReference) => void
  tabBar?: ReactNode
}) {
  const {
    ambiences,
    session,
    preview,
    script,
    focusObjectId,
    onObjectFocus,
    onOpenReference,
    tabBar,
  } = props
  const createFormId = useId()
  const createIdFieldId = useId()
  const [selectedId, setSelectedId] = useState(focusObjectId ?? ambiences[0]?.id ?? '')
  const [previewTint, setPreviewTint] = useState<Tint>(ambiences[0]?.tint ?? WHITE_TINT)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('references')
  const [createOpen, setCreateOpen] = useState(false)
  const [createId, setCreateId] = useState('')
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    references: BlockingAmbienceReference[]
    scanError?: string
  }>()
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null)
  const rowRefs = useRef(new Map<string, HTMLButtonElement>())
  const outlinerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (focusObjectId !== undefined) setSelectedId(focusObjectId)
  }, [focusObjectId])

  useEffect(() => {
    if (focusObjectId !== undefined) return
    if (selectedId && ambiences.some((ambience) => ambience.id === selectedId)) return
    setSelectedId(ambiences[0]?.id ?? '')
  }, [ambiences, focusObjectId, selectedId])

  const selected = ambiences.find((ambience) => ambience.id === selectedId)
  const missingFocusedId =
    focusObjectId !== undefined && !ambiences.some((ambience) => ambience.id === focusObjectId)
      ? focusObjectId
      : undefined

  useEffect(() => {
    if (selected) setPreviewTint(selected.tint)
  }, [selected])

  const editorState = session.getState()
  const scriptState = script?.state ?? script?.session.getState()
  const referenceScan = useMemo(() => {
    try {
      return {
        index: collectAmbienceReferenceIndex(editorState, scriptState),
        error: '',
      }
    } catch (cause) {
      return {
        index: new Map<string, BlockingAmbienceReference[]>(),
        error: cause instanceof Error ? cause.message : String(cause),
      }
    }
  }, [editorState, scriptState])

  const selectAmbience = (id: string | undefined): void => {
    setSelectedId(id ?? '')
    onObjectFocus?.(id)
  }

  const openCreate = (): void => {
    setCreateId('')
    setCreateName('')
    setCreateError('')
    setCreateOpen(true)
  }

  const createAmbience = (): void => {
    const id = createId.trim()
    if (!id) {
      setCreateError('请输入稳定 ID。')
      document.getElementById(createIdFieldId)?.focus()
      return
    }
    if (ambiences.some((ambience) => ambience.id === id)) {
      setCreateError(`稳定 ID“${id}”已存在。`)
      document.getElementById(createIdFieldId)?.focus()
      return
    }
    session.dispatch(new AddAmbienceCommand(id, createName.trim() || id))
    selectAmbience(id)
    setCreateOpen(false)
  }

  const beginDelete = (ambience: AmbienceDef, trigger: HTMLButtonElement): void => {
    deleteTriggerRef.current = trigger
    setDeleteTarget({
      id: ambience.id,
      name: ambience.name,
      references: referenceScan.index.get(ambience.id) ?? [],
      scanError: referenceScan.error || undefined,
    })
  }

  const closeDelete = (): void => {
    setDeleteTarget(undefined)
    requestAnimationFrame(() => deleteTriggerRef.current?.focus())
  }

  const confirmDelete = (): void => {
    if (!deleteTarget || deleteTarget.scanError || deleteTarget.references.length) return
    const targetIndex = ambiences.findIndex((ambience) => ambience.id === deleteTarget.id)
    const nextId = ambiences[targetIndex + 1]?.id ?? ambiences[targetIndex - 1]?.id
    try {
      session.dispatch(
        new DeleteAmbienceCommand(
          deleteTarget.id,
          script ? () => script.session.getState() : undefined,
        ),
      )
      setDeleteTarget(undefined)
      selectAmbience(nextId)
      requestAnimationFrame(() => {
        if (nextId) rowRefs.current.get(nextId)?.focus()
        else
          outlinerRef.current
            ?.querySelector<HTMLButtonElement>('button[aria-label="新建氛围"]')
            ?.focus()
        deleteTriggerRef.current = null
      })
    } catch (error) {
      if (!(error instanceof AmbienceInUseError)) throw error
      setDeleteTarget((current) =>
        current ? { ...current, references: [...error.references] } : current,
      )
    }
  }

  const selectedReferences = selected ? (referenceScan.index.get(selected.id) ?? []) : []

  return (
    <>
      <div ref={outlinerRef} className="outliner data-outliner ambience-library-outliner">
        {tabBar}
        <DsListHeader
          title="氛围"
          count={ambiences.length}
          unit="条"
          actions={[
            {
              id: 'create-ambience',
              label: '新建氛围',
              icon: 'add',
              onClick: openCreate,
            },
          ]}
        />
        <section className="ambience-library-outliner__list" aria-label="氛围目录">
          {ambiences.map((ambience) => {
            const count = referenceScan.index.get(ambience.id)?.length ?? 0
            return (
              <DsCatalogRow
                key={ambience.id}
                ref={(node) => {
                  if (node) rowRefs.current.set(ambience.id, node)
                  else rowRefs.current.delete(ambience.id)
                }}
                selected={selected?.id === ambience.id}
                leading={
                  <span
                    className="ambience-swatch"
                    style={{
                      backgroundColor: toHex(
                        selected?.id === ambience.id ? previewTint : ambience.tint,
                      ),
                    }}
                    aria-hidden="true"
                  />
                }
                title={ambience.name}
                meta={ambience.id}
                trailing={<DsTag tone="neutral">{count}</DsTag>}
                onClick={() => selectAmbience(ambience.id)}
              />
            )
          })}
          {!ambiences.length ? <div className="insp-empty">项目中还没有氛围定义。</div> : null}
        </section>
      </div>

      <DsObjectWorkspace
        label="氛围工作区"
        className="canvas-wrap data-body ambience-workspace"
        contentClassName="ambience-workspace__scroll"
        hero={
          selected ? (
            <DsObjectHero
              eyebrow="氛围滤镜"
              title={selected.name}
              objectId={selected.id}
              summary="全帧乘法色调；白色表示不染色。"
              media={
                <span
                  className="ambience-hero-swatch"
                  role="img"
                  style={{ backgroundColor: toHex(previewTint) }}
                  aria-label={`当前乘色 ${toHex(previewTint)}`}
                />
              }
              meta={<DsTag tone="neutral">{selectedReferences.length} 处引用</DsTag>}
              actions={
                <DsButton
                  size="compact"
                  variant="danger"
                  icon="delete"
                  aria-label={`删除氛围 ${selected.name}`}
                  onClick={(event) => beginDelete(selected, event.currentTarget)}
                >
                  删除
                </DsButton>
              }
            />
          ) : undefined
        }
      >
        {missingFocusedId ? (
          <DsStatus tone="error">
            引用目标氛围“{missingFocusedId}”不在当前项目；不会跳到其他氛围。
          </DsStatus>
        ) : selected ? (
          <>
            <DsWorkbenchSection
              title="基本信息"
              description="名称可修改；稳定 ID 创建后保持不变，供剧情脚本长期引用。"
            >
              <AmbienceNameField key={selected.id} ambience={selected} session={session} />
              <DsPropertyGrid>
                <DsPropertyRow label="稳定 ID">
                  <code>{selected.id}</code>
                </DsPropertyRow>
                <DsPropertyRow label="滤镜语义">全帧乘法</DsPropertyRow>
              </DsPropertyGrid>
            </DsWorkbenchSection>
            <DsWorkbenchSection
              title="滤镜颜色"
              description="RGB、HEX 与取色器保持同步；连续取色只在确认时产生一条可撤销修改。"
            >
              <AmbienceTintFields
                key={selected.id}
                ambience={selected}
                session={session}
                onPreviewChange={setPreviewTint}
              />
            </DsWorkbenchSection>
            <DsWorkbenchSection
              title="场景效果"
              description="使用当前作者快照中的真实场景，只预览静态初始帧；场景选择和视图操作不会保存。"
            >
              {preview ? (
                <AmbienceScenePreview {...preview} session={session} tint={previewTint} />
              ) : (
                <DsStatus>当前宿主未提供场景预览上下文。</DsStatus>
              )}
            </DsWorkbenchSection>
          </>
        ) : (
          <div className="insp-empty">选择一个氛围，或点击“新建氛围”。</div>
        )}
      </DsObjectWorkspace>

      <aside className="inspector inspector--tabbed ambience-inspector">
        <div className="insp-head">
          <div className="what">氛围</div>
          <div className="who">{selected?.name ?? '未选择'}</div>
        </div>
        {selected ? (
          <DsInspectorTabs
            id="ambience-inspector"
            label="氛围检查器"
            activeId={inspectorTab}
            onChange={(id) => setInspectorTab(id as InspectorTab)}
            items={[
              {
                id: 'references',
                label: '引用',
                count: referenceScan.error ? undefined : selectedReferences.length,
                panel: (
                  <DsInspectorSection title="引用">
                    <DsReferencePanel
                      state={
                        referenceScan.error
                          ? 'error'
                          : selectedReferences.length
                            ? 'ready'
                            : 'empty'
                      }
                      count={
                        referenceScan.error
                          ? { kind: 'unknown' }
                          : { kind: 'exact', value: selectedReferences.length }
                      }
                      impact={{
                        kind: 'blocking',
                        description: referenceScan.error
                          ? `引用扫描失败：${referenceScan.error}。为防止误删，删除已关闭。`
                          : selectedReferences.length
                            ? '这些脚本或运行态正在使用当前稳定 ID；解除全部引用后才能删除。'
                            : '当前作者快照没有引用这个氛围。',
                      }}
                    >
                      {selectedReferences.length ? (
                        <DsReferenceList>
                          {selectedReferences.map((reference, index) => (
                            <DsReferenceRow
                              key={`${reference.kind}:${reference.where}:${index}`}
                              title={reference.label}
                              path={reference.where}
                              labels={[
                                {
                                  label:
                                    reference.kind === 'world-state'
                                      ? '运行态'
                                      : reference.kind === 'toggle-day-night'
                                        ? '昼夜切换'
                                        : '剧情脚本',
                                },
                              ]}
                              action={
                                reference.locator && onOpenReference
                                  ? {
                                      label: '打开 ↗',
                                      ariaLabel: `打开引用：${reference.label}`,
                                      onActivate: () => onOpenReference(reference.locator!),
                                    }
                                  : undefined
                              }
                              status={
                                reference.locator && onOpenReference
                                  ? undefined
                                  : {
                                      label: '只读',
                                      reason: '当前引用没有可编辑的精确位置。',
                                    }
                              }
                            />
                          ))}
                        </DsReferenceList>
                      ) : null}
                    </DsReferencePanel>
                  </DsInspectorSection>
                ),
              },
              {
                id: 'description',
                label: '说明',
                panel: (
                  <>
                    <DsInspectorSection title="滤镜语义">
                      <p>
                        氛围色在场景完成绘制后以 multiply 合成；白色和未知 ID
                        都保持原图。当前氛围跨场景保留，并随存档恢复。
                      </p>
                    </DsInspectorSection>
                    <DsInspectorSection title="预览边界">
                      <p>
                        预览只核对静态场景初始帧，不执行脚本、实体行为或时间推进，也不覆盖
                        UI、战斗、过场和转场效果。
                      </p>
                    </DsInspectorSection>
                  </>
                ),
              },
            ]}
          />
        ) : (
          <div className="insp-empty">未选择氛围。</div>
        )}
      </aside>

      <DsDialog
        open={createOpen}
        title="新建氛围"
        description="稳定 ID 供脚本引用；新建氛围默认为白色（不染）。"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <DsButton onClick={() => setCreateOpen(false)}>取消</DsButton>
            <DsButton type="submit" form={createFormId} variant="primary">
              创建氛围
            </DsButton>
          </>
        }
      >
        <form
          id={createFormId}
          className="ambience-create-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            createAmbience()
          }}
        >
          <DsTextField
            id={createIdFieldId}
            name="ambience-id"
            label="稳定 ID"
            required
            monospace
            autoFocus
            autoComplete="off"
            spellCheck={false}
            translate="no"
            placeholder="例如：dusk"
            value={createId}
            help={createError ? undefined : '创建后不可修改。'}
            error={createError || undefined}
            onChange={(event) => {
              setCreateId(event.target.value)
              setCreateError('')
            }}
          />
          <DsTextField
            name="ambience-name"
            label="显示名称"
            autoComplete="off"
            placeholder="留空则使用稳定 ID"
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
          />
        </form>
      </DsDialog>

      <DsDialog
        open={Boolean(deleteTarget)}
        title={`删除氛围“${deleteTarget?.name ?? ''}”？`}
        description={
          deleteTarget?.scanError
            ? '引用扫描失败；为防止误删，当前不可删除。'
            : deleteTarget?.references.length
              ? `仍有 ${deleteTarget.references.length} 处引用；请先处理引用后再删除。`
              : '删除后定义将从氛围表移除；可通过撤销恢复。'
        }
        onClose={closeDelete}
        footer={
          <>
            <DsButton onClick={closeDelete}>取消</DsButton>
            <DsButton
              variant="danger"
              disabled={
                !deleteTarget ||
                Boolean(deleteTarget.scanError) ||
                deleteTarget.references.length > 0
              }
              onClick={confirmDelete}
            >
              确认删除
            </DsButton>
          </>
        }
      >
        {deleteTarget?.scanError ? (
          <DsStatus tone="error">引用扫描失败：{deleteTarget.scanError}</DsStatus>
        ) : deleteTarget?.references.length ? (
          <DsReferencePanel
            className="ambience-delete-references"
            state="ready"
            count={{ kind: 'exact', value: deleteTarget.references.length }}
            impact={{ kind: 'blocking', description: '删除会使稳定 ID 失去定义。' }}
          >
            <DsReferenceList initialVisibleCount={3}>
              {deleteTarget.references.map((reference, index) => (
                <DsReferenceRow
                  key={`${reference.kind}:${reference.where}:${index}`}
                  title={reference.label}
                  path={reference.where}
                  labels={[{ label: reference.kind === 'world-state' ? '运行态' : '剧情脚本' }]}
                  action={
                    reference.locator && onOpenReference
                      ? {
                          label: '打开 ↗',
                          ariaLabel: `打开引用：${reference.label}`,
                          onActivate: () => {
                            setDeleteTarget(undefined)
                            deleteTriggerRef.current = null
                            onOpenReference(reference.locator!)
                          },
                        }
                      : undefined
                  }
                />
              ))}
            </DsReferenceList>
          </DsReferencePanel>
        ) : (
          <p className="ds-field__help ambience-delete-help">
            当前作者快照未发现脚本、昼夜切换或运行态引用。
          </p>
        )}
      </DsDialog>
    </>
  )
}
