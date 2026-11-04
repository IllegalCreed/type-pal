import type { ActorDef, AuthorSceneDef, SceneDef } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import type { EditorState, EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  applySceneInitialState,
  emptyScriptPreviewLibrary,
  type PreviewEntityState,
  type ScriptPreviewState,
  type ScriptPreviewUsage,
  SetScriptPreviewLibraryCommand,
  scriptPreviewEntryKey,
  scriptPreviewSchemeKey,
  scriptPreviewStateUsages,
} from '../core/script-preview-library.js'
import {
  DsAddPickerDialog,
  DsButton,
  DsDraftTextField,
  DsFieldGroup,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsMultiSelect,
  DsPressable,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsTabs,
  DsTextInput,
} from './design-system/index.js'
import { PanelResizeHandle, useStoredPanelNumber } from './PanelResizeHandle.js'
import { clampPanelSize } from './panel-layout.js'
import { SceneCanvas } from './SceneCanvas.js'
import { previewEntityName, SceneInitialStateInspector } from './SceneInitialStateEditor.js'
import { previewEntryDetails, previewUsageExists } from './script-preview-navigation.js'

export function InitialStateWorkspace(props: {
  state: EditorState
  session: EditSession
  authorScenes: readonly AuthorSceneDef[]
  actorsById: Record<string, ActorDef>
  assetBase: AssetBase
  assetReader: EditorAssetReader
  leaderSpriteId?: string
  stateId?: string
  onSelectState(id: string | undefined): void
  onOpenUsage(usage: ScriptPreviewUsage): void
  focus?: { sceneId: string; entityId?: string }
  returnLabel?: string
  onReturn?(): void
}) {
  const library = props.state.scriptPreview ?? emptyScriptPreviewLibrary()
  const selected = library.states.find((state) => state.id === props.stateId)
  const [search, setSearch] = useState('')
  const [inspectorTab, setInspectorTab] = useState('properties')
  const scenePanelRef = useRef<HTMLElement>(null)
  const focusAddScene = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (focusAddScene.current !== selected?.id || selected?.scenes.length) return
    focusAddScene.current = undefined
    scenePanelRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [selected])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [selection, setSelection] = useState<
    | {
        stateId: string
        sceneId: string
        entityId?: string
      }
    | undefined
  >(() => {
    const slice = selected?.scenes.find((slice) => slice.sceneId === props.focus?.sceneId)
    return selected && slice
      ? {
          stateId: selected.id,
          sceneId: slice.sceneId,
          entityId: slice.entities.some((entity) => entity.entityId === props.focus?.entityId)
            ? props.focus?.entityId
            : slice.entities[0]?.entityId,
        }
      : undefined
  })
  const sceneId =
    selection?.stateId === selected?.id &&
    selected?.scenes.some((slice) => slice.sceneId === selection?.sceneId)
      ? selection?.sceneId
      : selected?.scenes[0]?.sceneId
  const slice = selected?.scenes.find((candidate) => candidate.sceneId === sceneId)
  const scene = props.state.scenes.find((candidate) => candidate.id === sceneId)
  const entityId =
    selection && selection.stateId === selected?.id && selection.sceneId === sceneId
      ? selection.entityId
      : slice?.entities[0]?.entityId
  const entity = scene?.entities.find((candidate) => candidate.id === entityId)
  const usage = useMemo(
    () => scriptPreviewStateUsages(library, props.authorScenes),
    [library, props.authorScenes],
  )
  const references = selected ? (usage.get(selected.id) ?? []) : []
  const sceneName = (id: string) =>
    props.state.sceneIndex.scenes.find((entry) => entry.id === id)?.name || '未命名场景'
  const [listHeight, setListHeight] = useStoredPanelNumber(
    'type-pal:editor:initial-state-entities-height',
    240,
  )
  const entitiesRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!selected?.id || !sceneId || !entityId) return
    entitiesRef.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [selected?.id, sceneId, entityId])
  const centerRef = useRef<HTMLDivElement>(null)
  const [centerHeight, setCenterHeight] = useState(600)
  useEffect(() => {
    if (!centerRef.current) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setCenterHeight(entry.contentRect.height)
    })
    observer.observe(centerRef.current)
    return () => observer.disconnect()
  }, [])
  const expandedSelection = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (expandedSelection.current === selected?.id) return
    expandedSelection.current = selected?.id
    if (!selected) return
    setExpanded(
      (current) =>
        new Set([
          ...current,
          ...(selected.scenes.length ? selected.scenes.map((slice) => slice.sceneId) : ['']),
        ]),
    )
  }, [selected])
  const update = (next: ScriptPreviewState) =>
    props.session.dispatch(
      new SetScriptPreviewLibraryCommand({
        ...library,
        states: library.states.map((state) => (state.id === next.id ? next : state)),
      }),
    )
  const updateEntities = (entities: PreviewEntityState[]) => {
    if (selected && slice)
      update({
        ...selected,
        scenes: selected.scenes.map((candidate) =>
          candidate.sceneId === slice.sceneId ? { ...slice, entities } : candidate,
        ),
      })
  }
  const selectEntity = (id: string) => {
    if (selected && sceneId) setSelection({ stateId: selected.id, sceneId, entityId: id })
  }
  const changeEntity = (next: PreviewEntityState) => {
    if (!slice) return
    updateEntities(
      slice.entities.some((entry) => entry.entityId === next.entityId)
        ? slice.entities.map((entry) => (entry.entityId === next.entityId ? next : entry))
        : [...slice.entities, next],
    )
  }
  const create = (copy?: ScriptPreviewState) => {
    const next: ScriptPreviewState = {
      id: crypto.randomUUID(),
      name: copy ? `${copy.name} 副本` : `初始状态 ${library.states.length + 1}`,
      scenes: copy ? structuredClone(copy.scenes) : [],
    }
    props.session.dispatch(
      new SetScriptPreviewLibraryCommand({ ...library, states: [...library.states, next] }),
    )
    props.onSelectState(next.id)
  }
  const groups = new Map<string, ScriptPreviewState[]>()
  for (const state of library.states) {
    if (!state.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) continue
    for (const id of state.scenes.length ? state.scenes.map((slice) => slice.sceneId) : [''])
      groups.set(id, [...(groups.get(id) ?? []), state])
  }
  let projected: SceneDef | undefined
  let projectionError: string | undefined
  try {
    if (scene) projected = applySceneInitialState(scene, selected)
  } catch (error) {
    projectionError = error instanceof Error ? error.message : String(error)
  }
  const maximumListHeight = Math.max(140, centerHeight - 180)
  return (
    <>
      <aside className="outliner initial-state-outliner">
        <header>
          <strong>初始状态 · {library.states.length}</strong>
          <DsButton size="compact" icon="add" onClick={() => create()}>
            新建初始状态
          </DsButton>
        </header>
        <DsTextInput
          aria-label="搜索初始状态名称"
          placeholder="按名称搜索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <nav className="initial-state-groups" aria-label="工程初始状态">
          {[...groups].map(([id, states]) => (
            <details
              key={id}
              open={!!search || expanded.has(id)}
              onToggle={(event) => {
                const open = event.currentTarget.open
                setExpanded((current) => {
                  if (current.has(id) === open) return current
                  const next = new Set(current)
                  if (open) next.add(id)
                  else next.delete(id)
                  return next
                })
              }}
            >
              <summary>
                {id ? sceneName(id) : '未添加场景'} · {states.length}
              </summary>
              {states.map((state) => (
                <DsPressable
                  key={state.id}
                  className="initial-state-row"
                  aria-pressed={selected?.id === state.id}
                  onClick={() => {
                    props.onSelectState(state.id)
                    if (id)
                      setSelection({
                        stateId: state.id,
                        sceneId: id,
                        entityId: state.scenes.find((slice) => slice.sceneId === id)?.entities[0]
                          ?.entityId,
                      })
                  }}
                >
                  <strong>{state.name}</strong>
                  <span>
                    {state.scenes.length} 个场景 ·{' '}
                    {state.scenes.reduce((count, slice) => count + slice.entities.length, 0)}{' '}
                    个角色/物件
                  </span>
                </DsPressable>
              ))}
            </details>
          ))}
        </nav>
      </aside>
      <div
        className="center initial-state-workspace"
        ref={centerRef}
        style={
          {
            '--initial-state-list-height': `${clampPanelSize(listHeight, 140, maximumListHeight)}px`,
          } as CSSProperties
        }
      >
        {props.onReturn ? (
          <div className="initial-state-return">
            <DsButton size="compact" onClick={props.onReturn}>
              返回脚本详情
            </DsButton>
            <span>{props.returnLabel}</span>
          </div>
        ) : null}
        {selected ? (
          <>
            <header className="initial-state-workspace-heading">
              <DsFieldGroup>
                <DsDraftTextField
                  label="名称"
                  aria-label="初始状态名称"
                  value={selected.name}
                  draftKey={`initial-state:${selected.id}:name`}
                  syncToken={JSON.stringify(library)}
                  validate={(name) => (name.trim() ? undefined : '名称不能为空')}
                  onCommit={(name) => update({ ...selected, name: name.trim() })}
                />
              </DsFieldGroup>
              <DsButton size="compact" onClick={() => create(selected)}>
                复制
              </DsButton>
              <DsButton
                size="compact"
                disabled={references.length > 0}
                title={references.length ? '仍被脚本引用，请先更改引用' : '删除此初始状态，可撤销'}
                onClick={() => {
                  props.session.dispatch(
                    new SetScriptPreviewLibraryCommand({
                      ...library,
                      states: library.states.filter((state) => state.id !== selected.id),
                    }),
                  )
                  props.onSelectState(undefined)
                }}
              >
                删除
              </DsButton>
            </header>
            <div className="initial-state-workspace-canvas">
              {projectionError ? (
                <p role="alert">{projectionError}</p>
              ) : projected ? (
                <SceneCanvas
                  key={sceneId}
                  scene={projected}
                  sprites={props.state.sprites}
                  actorsById={props.actorsById}
                  locale={props.state.locale}
                  leaderSpriteId={props.leaderSpriteId}
                  assetBase={props.assetBase}
                  assetCatalog={props.state.assetCatalog}
                  assetReader={props.assetReader}
                  projectMaps={props.state.maps}
                  mapIndex={props.state.mapIndex}
                  tilesets={props.state.tilesets ?? []}
                  selectedEntityId={entityId ?? null}
                  focusRegion={
                    entityId
                      ? {
                          key: JSON.stringify([selected.id, sceneId, entityId]),
                          positions: projected.entities
                            .filter((entity) => entity.id === entityId)
                            .map((entity) => entity.pos),
                        }
                      : undefined
                  }
                  placingEntity={false}
                  layers={{
                    base: true,
                    cover: true,
                    entities: true,
                    entries: false,
                    grid: false,
                    blocked: false,
                    ghosts: true,
                  }}
                  onSelectEntity={selectEntity}
                  onMoveEntity={(id, cell) => {
                    const target = projected.entities.find((entity) => entity.id === id)
                    if (target) {
                      changeEntity({
                        ...slice?.entities.find((entry) => entry.entityId === id),
                        entityId: id,
                        pos: { ...target.pos, ...cell },
                      })
                      selectEntity(id)
                    }
                  }}
                  onSelectAnchor={() => {}}
                  onMoveAnchor={() => {}}
                  onAddAt={() => {}}
                  onClearSelection={() => {
                    if (sceneId) setSelection({ stateId: selected.id, sceneId })
                  }}
                />
              ) : (
                <p className="hint2">
                  {sceneId
                    ? '此场景已不存在，请移除此场景配置。'
                    : '在下方添加场景，开始布置人物与物件。'}
                </p>
              )}
            </div>
            <PanelResizeHandle
              orientation="horizontal"
              value={listHeight}
              min={140}
              max={maximumListHeight}
              resizeLabel="调整初态画布与人物列表高度"
              onReset={() => setListHeight(240)}
              onResize={(delta) =>
                setListHeight((value) => clampPanelSize(value - delta, 140, maximumListHeight))
              }
            />
            <section ref={scenePanelRef} className="initial-state-scene-panel">
              <header className="initial-state-scene-tabs">
                <DsTabs
                  label="初态涉及场景"
                  activeId={sceneId ?? ''}
                  items={selected.scenes.map((slice) => ({
                    id: slice.sceneId,
                    label: sceneName(slice.sceneId),
                    remove: {
                      label: `移除场景：${sceneName(slice.sceneId)}`,
                      onRemove: () => {
                        const next = selected.scenes.filter(
                          (candidate) => candidate.sceneId !== slice.sceneId,
                        )
                        update({ ...selected, scenes: next })
                        if (slice.sceneId === sceneId) {
                          const first = next[0]
                          setSelection(
                            first
                              ? {
                                  stateId: selected.id,
                                  sceneId: first.sceneId,
                                  entityId: first.entities[0]?.entityId,
                                }
                              : undefined,
                          )
                          if (!first) focusAddScene.current = selected.id
                        }
                      },
                    },
                  }))}
                  onChange={(id) =>
                    setSelection({
                      stateId: selected.id,
                      sceneId: id,
                      entityId: selected.scenes.find((slice) => slice.sceneId === id)?.entities[0]
                        ?.entityId,
                    })
                  }
                />
                <DsAddPickerDialog
                  adoptionId="scene/initial-state-scene"
                  triggerLabel="添加场景"
                  title="添加场景"
                  description="为这份初始状态添加场景，不修改工程场景或脚本引用。"
                  confirmLabel="添加所选场景"
                  scopeKey={selected.id}
                  revision={JSON.stringify([
                    library,
                    props.state.sceneIndex,
                    props.state.scenes.map((scene) => scene.id),
                  ])}
                  options={props.state.scenes
                    .filter((scene) => !selected.scenes.some((slice) => slice.sceneId === scene.id))
                    .map((scene) => ({ id: scene.id, label: sceneName(scene.id) }))}
                  emptyMessage="所有工程场景都已加入这份初始状态。"
                  onConfirm={(id) => {
                    const current = props.session.getState()
                    const currentLibrary = current.scriptPreview
                    const target = currentLibrary?.states.find((state) => state.id === selected.id)
                    if (
                      !target ||
                      !currentLibrary ||
                      target.scenes.some((slice) => slice.sceneId === id) ||
                      !current.scenes.some((scene) => scene.id === id)
                    )
                      return false
                    const added = props.session.dispatch(
                      new SetScriptPreviewLibraryCommand({
                        ...currentLibrary,
                        states: currentLibrary.states.map((state) =>
                          state.id === target.id
                            ? { ...state, scenes: [...state.scenes, { sceneId: id, entities: [] }] }
                            : state,
                        ),
                      }),
                    )
                    if (!added) return false
                    setSelection({ stateId: target.id, sceneId: id })
                  }}
                />
              </header>
              {scene && slice ? (
                <>
                  <div className="initial-state-entity-heading">
                    <strong>角色与物件 · {slice.entities.length}</strong>
                    <DsMultiSelect
                      label="添加或移出角色与物件"
                      summaryMode="count"
                      size="compact"
                      options={scene.entities.map((entity) => ({
                        value: entity.id,
                        label: previewEntityName(entity, props.actorsById, props.state.locale),
                      }))}
                      value={slice.entities.map((entry) => entry.entityId)}
                      onChange={(ids) =>
                        updateEntities(
                          ids.map(
                            (id) =>
                              slice.entities.find((entry) => entry.entityId === id) ?? {
                                entityId: id,
                              },
                          ),
                        )
                      }
                    />
                  </div>
                  <section
                    ref={entitiesRef}
                    className="initial-state-entities"
                    aria-label="开场时的角色与物件"
                  >
                    {slice.entities.map((entry) => {
                      const target = scene.entities.find((entity) => entity.id === entry.entityId)
                      const pos = entry.pos ?? target?.pos
                      return (
                        <DsPressable
                          key={entry.entityId}
                          className="initial-state-entity"
                          aria-pressed={entityId === entry.entityId}
                          onClick={() => selectEntity(entry.entityId)}
                        >
                          <strong>
                            {target
                              ? previewEntityName(target, props.actorsById, props.state.locale)
                              : '已移除的角色或物件'}
                          </strong>
                          <span>
                            {pos ? `位置 ${pos.col}, ${pos.row}, ${pos.height}` : '引用失效'} ·{' '}
                            {(entry.hidden ?? target?.hidden) ? '隐藏' : '显示'}
                          </span>
                        </DsPressable>
                      )
                    })}
                  </section>
                  {!slice.entities.length ? (
                    <p className="hint2">只加入需要调整的角色或物件，其他对象沿用场景摆放。</p>
                  ) : null}
                </>
              ) : null}
            </section>
          </>
        ) : (
          <p className="initial-state-empty">
            {props.stateId
              ? '所选初始状态已不存在，请重新选择。'
              : '从左侧选择或新建一份初始状态。'}
          </p>
        )}
      </div>
      <DsInspectorHost className="inspector inspector--tabbed">
        <DsInspectorTabs
          id="initial-state-inspector"
          label="初始状态检查器"
          activeId={inspectorTab}
          onChange={setInspectorTab}
          items={[
            {
              id: 'properties',
              label: '属性',
              panel: (
                <SceneInitialStateInspector
                  state={selected}
                  sceneId={sceneId ?? ''}
                  entity={entity}
                  entityId={entityId}
                  actorsById={props.actorsById}
                  locale={props.state.locale}
                  revision={JSON.stringify(library)}
                  onChange={changeEntity}
                  onRemove={(id) => {
                    if (slice)
                      updateEntities(slice.entities.filter((entry) => entry.entityId !== id))
                  }}
                />
              ),
            },
            {
              id: 'references',
              label: '引用',
              count: references.length,
              panel: (
                <DsInspectorSection
                  title="整份初态的引用"
                  description={selected?.name ?? '先选择一份初始状态。'}
                >
                  <DsReferencePanel
                    state={references.length ? 'ready' : 'empty'}
                    count={{ kind: 'exact', value: references.length }}
                    impact={{
                      kind: 'blocking',
                      description: references.length
                        ? '这些脚本使用整份初态，与当前选中的场景或人物无关。解除全部引用后才能删除初态。'
                        : '尚未被脚本使用。请在方案或步骤详情选择这份初始状态。',
                    }}
                  >
                    {references.length ? (
                      <DsReferenceList>
                        {references.map((reference) => {
                          const entry = reference.entry
                          const detail = previewEntryDetails(
                            entry,
                            props.authorScenes.find((scene) => scene.id === entry.sceneId),
                            props.actorsById,
                            props.state.locale,
                          )
                          const label = [detail.scheme, detail.step].filter(Boolean).join(' / ')
                          const source = [
                            sceneName(entry.sceneId),
                            detail.owner,
                            detail.channel,
                          ].join(' / ')
                          const exists = previewUsageExists(reference, props.authorScenes)
                          const key =
                            reference.kind === 'scheme-default'
                              ? scriptPreviewSchemeKey(entry)
                              : scriptPreviewEntryKey(reference.entry)
                          return (
                            <DsReferenceRow
                              key={`${reference.kind}:${key}`}
                              title={detail.step ?? detail.scheme}
                              detail={detail.step ? detail.scheme : undefined}
                              path={source}
                              labels={[
                                {
                                  label: {
                                    'scheme-default': '方案默认',
                                    'step-direct': '直接步骤',
                                    'step-inherited': '继承步骤',
                                  }[reference.kind],
                                },
                              ]}
                              action={
                                exists
                                  ? {
                                      label: '打开',
                                      ariaLabel: `打开引用：${source} / ${label}`,
                                      onActivate: () => props.onOpenUsage(reference),
                                    }
                                  : undefined
                              }
                              status={
                                exists
                                  ? undefined
                                  : {
                                      label: '暂不可定位',
                                      reason:
                                        '来源场景、角色、脚本方案或步骤已不存在；引用仍保留，需修复或解除。',
                                      tone: 'warning',
                                    }
                              }
                            />
                          )
                        })}
                      </DsReferenceList>
                    ) : null}
                  </DsReferencePanel>
                </DsInspectorSection>
              ),
            },
          ]}
        />
      </DsInspectorHost>
    </>
  )
}
