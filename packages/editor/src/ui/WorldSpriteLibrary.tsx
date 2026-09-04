import type { AssetCatalogV1, AssetId, SpriteDef, SpriteLayout } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { editorAssetCatalogTitle } from '../core/asset-diagnostics.js'
import {
  AddSpriteDefinitionCommand,
  DeleteUnusedSpriteAssetCommand,
  RemoveSpriteDefinitionCommand,
  SpriteInUseError,
  type SpriteLayoutEditProof,
  UpdateSpriteCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import type { CurrentProjectReferenceIndexProvider } from '../core/project-reference-adapters.js'
import { sortedSpriteActions } from '../core/sprite-actions.js'
import {
  type CanonicalSpritePreviewState,
  collectAutomaticScriptSpriteInstanceSites,
  describeSpriteReferenceBehavior,
  projectCanonicalSpritePreviewState,
  type SpriteAutomaticScriptInstanceSite,
} from '../core/world-sprite-behavior.js'
import {
  DsButton,
  DsCatalogControls,
  DsCatalogRow,
  DsDraftNumberInput,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsOverflowText,
  DsPropertyGrid,
  DsPropertyRow,
  DsReferenceGroup,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelect,
  DsTabs,
  DsTag,
  DsTextInput,
  DsVirtualList,
} from './design-system/index.js'
import { SpriteActionEditorDialog } from './SpriteActionEditorDialog.js'
import type { SpriteFrameView } from './SpriteFrameWorkbench.js'
import { type SpriteResourceLoadProof, SpriteResourceViewer } from './SpriteResourceViewer.js'
import { SpriteUploadWizard } from './SpriteUploadWizard.js'

type AuthorableLayoutKind = 'directional' | 'static'
type KindFilter = 'all' | AuthorableLayoutKind | 'actions' | 'looping' | 'scripted' | 'unconfigured'
type InspectorTab = 'layout' | 'references' | 'source'
type ActionDialogState = {
  revision: number
  kind: 'create' | 'edit'
  owner: 'browse' | 'route'
  definition: SpriteDef
  proof: SpriteLayoutEditProof
  frames: readonly SpriteFrameView[]
}

const KIND_LABEL: Record<SpriteLayout['kind'], string> = {
  directional: '四向',
  loop: '自动循环',
  static: '默认定格',
}

const KIND_FULL_LABEL: Record<SpriteLayout['kind'], string> = {
  directional: '四向行走',
  loop: '自动循环',
  static: '默认定格',
}

const KIND_FILTER_LABEL: Record<KindFilter, string> = {
  all: '全部',
  directional: '含四向',
  static: '含默认定格',
  actions: '含预制动作',
  looping: '含循环动作',
  scripted: '含自动脚本',
  unconfigured: '无用途',
}

function defaultLayout(kind: AuthorableLayoutKind, actualFrameCount: number): SpriteLayout {
  if (kind === 'directional')
    return { kind, framesPerDir: Math.max(1, Math.min(3, Math.floor(actualFrameCount / 4))) }
  return { kind: 'static' }
}

function definitionIdStem(value: string): string {
  const stem = value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return stem || 'sprite'
}

function nextDefinitionId(definitions: readonly SpriteDef[], value: string): string {
  const base = definitionIdStem(value)
  const ids = new Set(definitions.map((definition) => definition.id))
  if (!ids.has(base)) return base
  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}-${suffix}`
    if (!ids.has(candidate)) return candidate
  }
}

function layoutDescription(layout: SpriteLayout): string {
  if (layout.kind === 'directional') return `4 向 × ${layout.framesPerDir} 帧`
  if (layout.kind === 'loop') return `自动循环前 ${layout.frameCount} 帧`
  return '默认显示源帧 #0；场景脚本仍可切换其它帧'
}

export function WorldSpriteLibrary(props: {
  definitions: readonly SpriteDef[]
  catalog: AssetCatalogV1
  assetBase: AssetBase
  assetReader: EditorAssetReader
  session: EditSession
  tabBar: ReactNode
  focusObjectId?: string
  focusActionId?: string
  view: 'definition' | 'asset'
  onViewChange: (view: 'definition' | 'asset', objectId?: string) => void
  onObjectFocus?: (id: string | undefined) => void
  onActionFocus?: (spriteId: string, actionId: string) => void
  onBattleDomain: () => void
  referenceIndex?: ProjectReferenceIndex
  referenceStatus: EditorDerivedStatus
  getCurrentReferenceIndex: CurrentProjectReferenceIndexProvider
  onOpenReference?: (reference: ProjectReferenceEdge) => void
  onJumpAutomaticScriptInstance?: (site: SpriteAutomaticScriptInstanceSite) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
  onRequestSave?: () => void
  canonical?: CanonicalSpritePreviewState
}) {
  const assets = useMemo(
    () =>
      Object.entries(props.catalog.assets)
        .filter(([, record]) => record.kind === 'sprite')
        .sort(([left], [right]) => left.localeCompare(right)),
    [props.catalog],
  )
  const definitionsByAsset = useMemo(() => {
    const result = new Map<AssetId, SpriteDef[]>()
    for (const definition of props.definitions)
      result.set(definition.asset, [...(result.get(definition.asset) ?? []), definition])
    return result
  }, [props.definitions])
  const initialDefinition =
    props.view === 'definition'
      ? (props.definitions.find((definition) => definition.id === props.focusObjectId) ??
        props.definitions[0])
      : undefined
  const initialAsset =
    props.view === 'asset' && props.catalog.assets[props.focusObjectId ?? '']?.kind === 'sprite'
      ? (props.focusObjectId ?? '')
      : (initialDefinition?.asset ?? assets[0]?.[0] ?? '')
  const [selectedAsset, setSelectedAsset] = useState<AssetId>(initialAsset)
  const [selectedId, setSelectedId] = useState(
    props.view === 'definition' ? (initialDefinition?.id ?? '') : '',
  )
  const [filter, setFilter] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [uploading, setUploading] = useState(false)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>(
    props.view === 'asset' ? 'source' : 'layout',
  )
  const [resourceProof, setResourceProof] = useState<SpriteResourceLoadProof | undefined>()
  const [sourceFrames, setSourceFrames] = useState<readonly SpriteFrameView[]>([])
  const [selectedSourceFrame, setSelectedSourceFrame] = useState(0)
  const [showUsageMenu, setShowUsageMenu] = useState(false)
  const [creatingUsage, setCreatingUsage] = useState(false)
  const [draftId, setDraftId] = useState('')
  const [draftLabel, setDraftLabel] = useState('')
  const [draftKind, setDraftKind] = useState<AuthorableLayoutKind>('static')
  const [selectedActionId, setSelectedActionId] = useState<string | undefined>(props.focusActionId)
  const [referenceActionId, setReferenceActionId] = useState<string | undefined>(
    props.focusActionId,
  )
  const [actionDialog, setActionDialog] = useState<ActionDialogState | undefined>()
  const actionDialogRevisionRef = useRef(0)
  const previousFocusActionIdRef = useRef(props.focusActionId)
  const pendingActionRouteRef = useRef<{ actionId: string | undefined } | undefined>(undefined)
  const lastSyncedLocation = useRef(
    `${props.view}:${props.focusObjectId ?? ''}:${props.focusActionId ?? ''}`,
  )
  const pendingInspectorTab = useRef<
    { view: 'definition' | 'asset'; objectId: string; tab: InspectorTab } | undefined
  >(undefined)

  const consumers = useMemo(
    () => definitionsByAsset.get(selectedAsset) ?? [],
    [definitionsByAsset, selectedAsset],
  )
  const definition = consumers.find((entry) => entry.id === selectedId)
  const record = props.catalog.assets[selectedAsset]
  const editorState = props.session.getState()
  const spritePreviewState = useMemo(
    () =>
      props.canonical
        ? projectCanonicalSpritePreviewState(editorState, props.canonical)
        : editorState,
    [editorState, props.canonical],
  )
  const automaticScriptSites = useMemo(
    () => collectAutomaticScriptSpriteInstanceSites(spritePreviewState),
    [spritePreviewState],
  )
  const referenceReady = props.referenceStatus === 'current' && props.referenceIndex !== undefined
  const effectiveReferenceStatus =
    props.referenceStatus === 'current' && !props.referenceIndex ? 'failed' : props.referenceStatus
  const automaticScriptDefinitionIds = useMemo(
    () => new Set(automaticScriptSites.map((site) => site.spriteId)),
    [automaticScriptSites],
  )
  const automaticScriptSiteIndex = useMemo(
    () =>
      new Map(
        automaticScriptSites.map((site) => [
          `${site.spriteId}\0${site.sceneId}\0${site.entityId}`,
          site,
        ]),
      ),
    [automaticScriptSites],
  )
  const references = definition
    ? (props.referenceIndex?.referencesTo({ kind: 'world-sprite', id: definition.id }) ?? [])
    : []
  const blockingReferences =
    definition && props.referenceIndex
      ? props.referenceIndex.deletionImpact(
          { kind: 'world-sprite', id: definition.id },
          props.referenceIndex.deletionScopeFor([{ kind: 'world-sprite', id: definition.id }]),
        ).blockers
      : []
  const actionReferences = references.filter(
    (reference) => reference.relation.kind === 'world-sprite-action-use',
  )
  const definitionReferences = references.filter(
    (reference) => reference.relation.kind === 'world-sprite-use',
  )
  const automaticSitesForDefinition = definition
    ? automaticScriptSites.filter((site) => site.spriteId === definition.id)
    : []
  const automaticSiteKeys = new Set(
    automaticSitesForDefinition.map((site) => `${site.sceneId}\0${site.entityId}`),
  )
  const nonAutomaticReferences = definitionReferences.filter((reference) => {
    const owner = reference.source.owner
    return !(
      owner.kind === 'scene-entity' && automaticSiteKeys.has(`${owner.sceneId}\0${owner.entityId}`)
    )
  })
  const selectedActionReferences = referenceActionId
    ? actionReferences.filter(
        (reference) =>
          reference.target.kind === 'world-sprite-action' &&
          reference.target.actionId === referenceActionId,
      )
    : []
  const totalReferenceCount = references.length
  const loadedProof = useMemo<SpriteLayoutEditProof | undefined>(() => {
    if (record?.kind !== 'sprite') return undefined
    if (resourceProof?.asset === selectedAsset && resourceProof.revision === record.sha256)
      return {
        asset: selectedAsset,
        sha256: resourceProof.revision,
        actualFrameCount: resourceProof.actualFrameCount,
      }
    return undefined
  }, [record, resourceProof, selectedAsset])
  const actualFrameCount = loadedProof?.actualFrameCount
  useEffect(() => {
    if (!definition) {
      setSelectedActionId(undefined)
      setReferenceActionId(undefined)
      if (actionDialog?.kind === 'edit') setActionDialog(undefined)
      previousFocusActionIdRef.current = props.focusActionId
      return
    }
    if (actionDialog?.kind === 'create') {
      if (!props.focusActionId) previousFocusActionIdRef.current = undefined
      return
    }
    const pendingRoute = pendingActionRouteRef.current
    if (pendingRoute && props.focusActionId !== pendingRoute.actionId) return
    if (pendingRoute) pendingActionRouteRef.current = undefined
    if (props.focusActionId) {
      if (!definition.poses?.[props.focusActionId]) {
        setSelectedActionId(props.focusActionId)
        setActionDialog(undefined)
        props.onStatusNotice?.({
          kind: 'error',
          message: `预制动作 ${props.focusActionId} 不存在；未自动选择其它动作。`,
        })
        previousFocusActionIdRef.current = props.focusActionId
        return
      }
      setSelectedActionId(props.focusActionId)
      setReferenceActionId(props.focusActionId)
      if (loadedProof)
        setActionDialog((current) => {
          if (
            current?.kind === 'edit' &&
            current.definition.id === definition.id &&
            current.owner === 'route'
          )
            return current
          actionDialogRevisionRef.current += 1
          return {
            revision: actionDialogRevisionRef.current,
            kind: 'edit',
            owner: 'route',
            definition,
            proof: loadedProof,
            frames: sourceFrames,
          }
        })
      previousFocusActionIdRef.current = props.focusActionId
      return
    }
    if (
      previousFocusActionIdRef.current &&
      actionDialog?.kind === 'edit' &&
      actionDialog.owner === 'route'
    )
      setActionDialog(undefined)
    previousFocusActionIdRef.current = undefined
    if (selectedActionId && definition.poses?.[selectedActionId]) return
    const first = Object.entries(definition.poses ?? {}).sort(
      ([leftId, left], [rightId, right]) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
        leftId.localeCompare(rightId),
    )[0]?.[0]
    setSelectedActionId(first)
    setReferenceActionId((current) => (current && definition.poses?.[current] ? current : first))
  }, [
    actionDialog,
    definition,
    loadedProof,
    props.focusActionId,
    props.onStatusNotice,
    selectedActionId,
    sourceFrames,
  ])
  const handleResourceProof = useCallback((proof: SpriteResourceLoadProof | undefined) => {
    setResourceProof(proof)
  }, [])

  useEffect(() => {
    const objectId = props.focusObjectId
    if (!objectId) return
    const locationKey = `${props.view}:${objectId}:${props.focusActionId ?? ''}`
    if (lastSyncedLocation.current === locationKey) return
    const focused =
      props.view === 'definition'
        ? props.definitions.find((entry) => entry.id === objectId)
        : undefined
    if (props.view === 'definition') {
      if (!focused) return
      setSelectedAsset(focused.asset)
      setSelectedId(focused.id)
      const pending = pendingInspectorTab.current
      setInspectorTab(
        pending?.view === 'definition' && pending.objectId === objectId ? pending.tab : 'layout',
      )
    } else if (props.catalog.assets[objectId]?.kind === 'sprite') {
      setSelectedAsset(objectId)
      setSelectedId('')
      const pending = pendingInspectorTab.current
      setInspectorTab(
        pending?.view === 'asset' && pending.objectId === objectId ? pending.tab : 'source',
      )
    } else return
    lastSyncedLocation.current = locationKey
    pendingInspectorTab.current = undefined
    setUploading(false)
    setCreatingUsage(false)
    setShowUsageMenu(false)
    setSelectedActionId(
      props.view === 'definition' && props.focusActionId && focused?.poses?.[props.focusActionId]
        ? props.focusActionId
        : undefined,
    )
  }, [props.catalog, props.definitions, props.focusActionId, props.focusObjectId, props.view])

  useEffect(() => {
    if (record?.kind === 'sprite') return
    const nextAsset = assets[0]?.[0] ?? ''
    if (!nextAsset || nextAsset === selectedAsset) return
    const nextDefinition = definitionsByAsset.get(nextAsset)?.[0]
    setSelectedAsset(nextAsset)
    setSelectedId(nextDefinition?.id ?? '')
    props.onViewChange(nextDefinition ? 'definition' : 'asset', nextDefinition?.id ?? nextAsset)
    props.onObjectFocus?.(nextDefinition?.id ?? nextAsset)
  }, [assets, definitionsByAsset, props.onObjectFocus, props.onViewChange, record, selectedAsset])

  useEffect(() => {
    if (props.view === 'asset') return
    if (creatingUsage || consumers.some((entry) => entry.id === selectedId)) return
    const nextDefinition = consumers[0]
    if (!nextDefinition) return
    setSelectedId(nextDefinition.id)
    props.onViewChange('definition', nextDefinition.id)
    props.onObjectFocus?.(nextDefinition.id)
  }, [consumers, creatingUsage, props.onObjectFocus, props.onViewChange, props.view, selectedId])

  const shownAssets = assets.filter(([asset, assetRecord]) => {
    const entries = definitionsByAsset.get(asset) ?? []
    const matchesKind =
      kind === 'all' ||
      (kind === 'unconfigured'
        ? entries.length === 0
        : kind === 'scripted'
          ? entries.some((entry) => automaticScriptDefinitionIds.has(entry.id))
          : kind === 'actions'
            ? entries.some((entry) => Object.keys(entry.poses ?? {}).length > 0)
            : kind === 'looping'
              ? entries.some((entry) =>
                  Object.values(entry.poses ?? {}).some((action) => action.loopFrom !== undefined),
                )
              : entries.some((entry) => entry.layout.kind === kind))
    if (!matchesKind) return false
    const query = filter.trim().toLocaleLowerCase()
    if (!query) return true
    return [
      asset,
      assetRecord.label,
      assetRecord.path,
      ...entries.flatMap((entry) => [entry.id, entry.label]),
    ]
      .filter((value): value is string => !!value)
      .some((value) => value.toLocaleLowerCase().includes(query))
  })

  const reportError = (reason: unknown): void =>
    props.onStatusNotice?.({
      kind: 'error',
      message: reason instanceof Error ? reason.message : String(reason),
    })

  const focusResource = (asset: AssetId): void => {
    pendingInspectorTab.current = undefined
    setSelectedAsset(asset)
    setSelectedId('')
    setUploading(false)
    setCreatingUsage(false)
    setShowUsageMenu(false)
    setInspectorTab('source')
    setSelectedActionId(undefined)
    setReferenceActionId(undefined)
    setActionDialog(undefined)
    props.onViewChange('asset', asset)
    props.onObjectFocus?.(asset)
  }

  const focusDefinition = (next: SpriteDef): void => {
    pendingInspectorTab.current = undefined
    setSelectedAsset(next.asset)
    setSelectedId(next.id)
    setCreatingUsage(false)
    setShowUsageMenu(false)
    setInspectorTab('layout')
    setSelectedActionId(undefined)
    setReferenceActionId(Object.keys(next.poses ?? {})[0])
    setActionDialog(undefined)
    props.onViewChange('definition', next.id)
    props.onObjectFocus?.(next.id)
  }

  const openCreateAction = (): void => {
    if (!definition || !loadedProof) {
      props.onStatusNotice?.({ kind: 'error', message: '源帧尚未读取完成，不能新建动作。' })
      return
    }
    pendingActionRouteRef.current = { actionId: undefined }
    props.onViewChange('definition', definition.id)
    actionDialogRevisionRef.current += 1
    setActionDialog({
      revision: actionDialogRevisionRef.current,
      kind: 'create',
      owner: 'browse',
      definition,
      proof: loadedProof,
      frames: sourceFrames,
    })
  }

  const openEditAction = (next: SpriteDef, actionId?: string): void => {
    const targetId = actionId ?? sortedSpriteActions(next)[0]?.id
    if (!targetId || !next.poses?.[targetId]) {
      props.onStatusNotice?.({ kind: 'error', message: '当前用途尚无可编辑的预制动作。' })
      return
    }
    setSelectedAsset(next.asset)
    setSelectedId(next.id)
    setSelectedActionId(targetId)
    setReferenceActionId(targetId)
    if (!loadedProof) {
      props.onStatusNotice?.({ kind: 'error', message: '源帧尚未读取完成，不能编辑动作。' })
      return
    }
    actionDialogRevisionRef.current += 1
    setActionDialog({
      revision: actionDialogRevisionRef.current,
      kind: 'edit',
      owner: 'browse',
      definition: next,
      proof: loadedProof,
      frames: sourceFrames,
    })
    pendingActionRouteRef.current = { actionId: targetId }
    props.onViewChange('definition', next.id)
    props.onObjectFocus?.(next.id)
    props.onActionFocus?.(next.id, targetId)
  }

  const closeActionDialog = (): void => {
    const definitionId = actionDialog?.definition.id
    setActionDialog(undefined)
    if (definitionId && props.focusActionId) {
      pendingActionRouteRef.current = { actionId: undefined }
      props.onViewChange('definition', definitionId)
    }
  }

  const beginUsage = (nextKind: AuthorableLayoutKind): void => {
    if (!record || record.kind !== 'sprite') return
    const suffix = nextKind === 'directional' ? 'walk' : nextKind
    const id = nextDefinitionId(props.definitions, `${record.label ?? selectedAsset}-${suffix}`)
    setDraftId(id)
    setDraftLabel(`${record.label ?? selectedAsset} · ${KIND_LABEL[nextKind]}`)
    setDraftKind(nextKind)
    setCreatingUsage(true)
    setShowUsageMenu(false)
  }

  const applyUsage = (): void => {
    if (!loadedProof || !record || record.kind !== 'sprite') return
    try {
      const next: SpriteDef = {
        id: draftId,
        asset: selectedAsset,
        label: draftLabel.trim(),
        layout: defaultLayout(draftKind, loadedProof.actualFrameCount),
      }
      props.session.dispatch(new AddSpriteDefinitionCommand(next, loadedProof))
      setSelectedId(next.id)
      setCreatingUsage(false)
      props.onViewChange('definition', next.id)
      props.onObjectFocus?.(next.id)
      props.onStatusNotice?.(undefined)
    } catch (reason) {
      reportError(reason)
    }
  }

  const dispatchLayout = (layout: SpriteLayout): boolean => {
    if (!definition || !loadedProof) {
      props.onStatusNotice?.({ kind: 'error', message: '精灵帧尚未载入，不能修改布局。' })
      return false
    }
    try {
      if (
        !props.session.dispatch(
          new UpdateSpriteCommand(
            definition.id,
            { layout },
            loadedProof,
            props.getCurrentReferenceIndex,
          ),
        )
      ) {
        props.onStatusNotice?.({
          kind: 'error',
          message: '精灵用途定义已变化，请重新选择后再编辑。',
        })
        return false
      }
      props.onStatusNotice?.(undefined)
      return true
    } catch (reason) {
      reportError(reason)
      return false
    }
  }

  const deleteDefinition = (): void => {
    if (!definition || !referenceReady || blockingReferences.length) return
    if (!window.confirm(`删除用途“${definition.label}”（${definition.id}）？源资源会保留。`)) return
    try {
      const next = consumers.find((candidate) => candidate.id !== definition.id)
      if (
        !props.session.dispatch(
          new RemoveSpriteDefinitionCommand(definition.id, props.getCurrentReferenceIndex),
        )
      ) {
        props.onStatusNotice?.({ kind: 'error', message: '精灵用途定义已变化，未执行删除。' })
        return
      }
      setSelectedId(next?.id ?? '')
      setInspectorTab(next ? 'layout' : 'source')
      props.onViewChange(next ? 'definition' : 'asset', next?.id ?? selectedAsset)
      props.onObjectFocus?.(next?.id ?? selectedAsset)
      props.onStatusNotice?.({ kind: 'info', message: '用途已删除；源资源仍保留。' })
    } catch (reason) {
      reportError(
        reason instanceof SpriteInUseError
          ? `仍有 ${reason.references.length} 处引用，无法删除精灵用途。`
          : reason,
      )
    }
  }

  const deleteAsset = async (): Promise<void> => {
    if (!record || record.kind !== 'sprite' || consumers.length) return
    if (!window.confirm(`永久移除未使用源资源“${record.label ?? selectedAsset}”？此操作可撤销。`))
      return
    try {
      const bytes = await props.assetReader.readBytes(selectedAsset, 'sprite')
      props.session.dispatch(new DeleteUnusedSpriteAssetCommand(selectedAsset, bytes))
      const next = assets.find(([asset]) => asset !== selectedAsset)?.[0] ?? ''
      setSelectedAsset(next)
      setSelectedId('')
      setInspectorTab('source')
      props.onViewChange('asset', next)
      props.onObjectFocus?.(next || undefined)
      props.onStatusNotice?.({ kind: 'info', message: '未使用源资源已移除。' })
    } catch (reason) {
      reportError(reason)
    }
  }

  const displayLabel = record?.label ?? selectedAsset
  const inspectorHeading = definition ? '大世界精灵用途' : '大世界精灵资源'
  const inspectorLabel =
    definition?.label || displayLabel || (consumers.length ? '选择一个用途定义' : '未选择')

  const changeInspectorTab = (nextTab: InspectorTab): void => {
    setInspectorTab(nextTab)
    if (nextTab === 'source' || definition || creatingUsage) return
    const nextDefinition = consumers[0]
    if (!nextDefinition) return
    pendingInspectorTab.current = {
      view: 'definition',
      objectId: nextDefinition.id,
      tab: nextTab,
    }
    setSelectedId(nextDefinition.id)
    setSelectedActionId(undefined)
    props.onViewChange('definition', nextDefinition.id)
    props.onObjectFocus?.(nextDefinition.id)
  }

  const dialogLiveDefinition = actionDialog
    ? props.definitions.find((entry) => entry.id === actionDialog.definition.id)
    : undefined
  const dialogLiveProof =
    actionDialog && dialogLiveDefinition?.id === definition?.id ? loadedProof : undefined
  const dialogActionReferences = actionDialog
    ? (props.referenceIndex
        ?.referencesTo({ kind: 'world-sprite', id: actionDialog.definition.id })
        .filter((reference) => reference.relation.kind === 'world-sprite-action-use') ?? [])
    : []

  return (
    <>
      <div className="outliner outliner--split data-outliner battle-sprite-outliner world-sprite-outliner">
        {props.tabBar}
        <DsCatalogControls
          title="精灵库"
          count={assets.length}
          unit="项"
          actions={[
            {
              id: 'import-world-sprite',
              label: '导入源帧资源',
              icon: 'add',
              onClick: () => setUploading(true),
            },
          ]}
          scope={
            <DsTabs
              size="compact"
              label="精灵资源域"
              items={[
                { id: 'world', label: '大世界' },
                { id: 'battle', label: '战斗' },
              ]}
              activeId="world"
              onChange={(domain) => {
                if (domain === 'battle') props.onBattleDomain()
              }}
            />
          }
          search={{
            'aria-label': '过滤大世界精灵库',
            placeholder: '名称 / id',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
          filters={
            <DsSelect
              size="compact"
              aria-label="按用途与实例行为筛选源帧资源"
              value={kind}
              onValueChange={(value) => setKind(value as KindFilter)}
              options={(
                [
                  'all',
                  'directional',
                  'static',
                  'actions',
                  'looping',
                  'scripted',
                  'unconfigured',
                ] as const
              ).map((entry) => ({ value: entry, label: KIND_FILTER_LABEL[entry] }))}
            />
          }
        />
        {shownAssets.length ? (
          <DsVirtualList
            label="大世界精灵目录"
            items={shownAssets}
            itemHeight={68}
            height={720}
            fill
            overscan={5}
            getKey={([asset]) => asset}
            selectedKey={selectedAsset}
            onSelect={([asset]) => focusResource(asset)}
            renderItem={([asset, assetRecord], _index, control) => {
              const entries = definitionsByAsset.get(asset) ?? []
              const label = editorAssetCatalogTitle(assetRecord, entries[0]?.label)
              return (
                <DsCatalogRow
                  className="sprite-resource-row"
                  tabIndex={control.tabIndex}
                  onFocus={control.onFocus}
                  selected={asset === selectedAsset}
                  title={label}
                  meta={asset}
                  trailing={entries.length ? undefined : <DsTag tone="warning">待定义</DsTag>}
                  aria-label={`${label}，${asset}${entries.length ? '' : '，待定义'}`}
                  onClick={() => focusResource(asset)}
                />
              )
            }}
          />
        ) : (
          <div className="insp-empty">没有匹配的精灵。</div>
        )}
      </div>

      <div className="center actor-center battle-sprite-center world-sprite-center">
        {uploading ? (
          <SpriteUploadWizard
            sprites={[...props.definitions]}
            assetBase={props.assetBase}
            session={props.session}
            onDone={(id) => {
              setUploading(false)
              if (!id) return
              const next = props.session.getState().sprites.find((entry) => entry.id === id)
              if (!next) return
              setSelectedAsset(next.asset)
              setSelectedId(next.id)
              setInspectorTab('layout')
              props.onViewChange('definition', next.id)
              props.onObjectFocus?.(next.id)
            }}
          />
        ) : record?.kind === 'sprite' ? (
          <SpriteResourceViewer
            assetBase={props.assetBase}
            assetReader={props.assetReader}
            asset={selectedAsset}
            revision={record.sha256}
            label={displayLabel}
            consumers={consumers}
            activeDefinitionId={definition?.id}
            activeActionId={selectedActionId}
            session={props.session}
            headerActions={
              <>
                {definition ? (
                  <DsButton
                    size="compact"
                    variant="secondary"
                    disabled={!loadedProof}
                    onClick={openCreateAction}
                  >
                    新建预制动作
                  </DsButton>
                ) : null}
                {definition && Object.keys(definition.poses ?? {}).length ? (
                  <DsButton
                    size="compact"
                    variant="primary"
                    disabled={!loadedProof}
                    onClick={() => openEditAction(definition, selectedActionId)}
                  >
                    编辑预制动作（{Object.keys(definition.poses ?? {}).length}）
                  </DsButton>
                ) : null}
                {definition ? (
                  <DsButton
                    size="compact"
                    variant="danger"
                    disabled={!referenceReady || blockingReferences.length > 0}
                    title={
                      !referenceReady
                        ? '正在刷新精灵引用，暂不能删除'
                        : blockingReferences.length
                          ? `仍有 ${blockingReferences.length} 处用途引用，不能删除`
                          : '删除当前用途定义，保留共享源资源'
                    }
                    onClick={deleteDefinition}
                  >
                    删除用途
                  </DsButton>
                ) : null}
                {!consumers.length ? (
                  <DsButton size="compact" variant="danger" onClick={() => void deleteAsset()}>
                    删除源资源
                  </DsButton>
                ) : null}
              </>
            }
            onDefinitionSelect={(id) => {
              const next = consumers.find((entry) => entry.id === id)
              if (next) focusDefinition(next)
            }}
            onActionSelect={(definitionId, actionId) => {
              const next = consumers.find((entry) => entry.id === definitionId)
              if (!next) return
              openEditAction(next, actionId)
            }}
            onLoaded={handleResourceProof}
            onFramesLoaded={setSourceFrames}
            selectedFrame={selectedSourceFrame}
            onSelectedFrameChange={setSelectedSourceFrame}
            enableFrameDrag={false}
            onStatusNotice={props.onStatusNotice}
          />
        ) : (
          <div className="insp-empty">没有可预览的大世界精灵。</div>
        )}
      </div>

      <DsInspectorHost className="inspector inspector--tabbed battle-sprite-inspector world-sprite-inspector">
        <div className="insp-head">
          <div className="what">{inspectorHeading}</div>
          <div className="who" title={inspectorLabel || '未选择'}>
            {inspectorLabel || '未选择'}
          </div>
        </div>
        <DsInspectorTabs
          id="world-sprite-inspector"
          label="大世界精灵检查器"
          activeId={inspectorTab}
          onChange={(id) => changeInspectorTab(id as InspectorTab)}
          items={[
            {
              id: 'layout',
              label: '用途',
              panel: (
                <div className="world-sprite-inspector-content">
                  <DsInspectorSection
                    title="用途定义"
                    actions={
                      <DsButton
                        size="compact"
                        variant="secondary"
                        onClick={() => setShowUsageMenu((value) => !value)}
                      >
                        新增用途定义
                      </DsButton>
                    }
                  >
                    {consumers.length && !creatingUsage ? (
                      <div
                        className="ds-inspector-choice-list"
                        role="group"
                        aria-label="选择用途定义"
                      >
                        {consumers.map((entry) => (
                          <DsCatalogRow
                            key={entry.id}
                            selected={entry.id === definition?.id}
                            title={entry.label}
                            meta={entry.id}
                            trailing={KIND_LABEL[entry.layout.kind]}
                            onClick={() => focusDefinition(entry)}
                          />
                        ))}
                      </div>
                    ) : null}
                    {showUsageMenu ? (
                      <div
                        className="ds-inspector-option-row"
                        role="group"
                        aria-label="新增用途类型"
                      >
                        {(['directional', 'static'] as const).map((entry) => (
                          <DsButton
                            key={entry}
                            size="compact"
                            variant="secondary"
                            disabled={entry === 'directional' && (actualFrameCount ?? 0) < 4}
                            onClick={() => beginUsage(entry)}
                          >
                            {KIND_FULL_LABEL[entry]}
                          </DsButton>
                        ))}
                      </div>
                    ) : null}
                    {!definition && !creatingUsage ? (
                      <p className="ds-inspector-inline-empty">
                        {consumers.length
                          ? '选择上方某个用途定义进行编辑；用途布局不会反过来变成源帧资源的分类。'
                          : '尚未创建用途定义；源帧资源仍会保留，可随时添加定义。'}
                      </p>
                    ) : null}
                  </DsInspectorSection>

                  {creatingUsage ? (
                    <DsInspectorSection
                      title="新增用途定义"
                      description={`初始布局：${KIND_FULL_LABEL[draftKind]} · 源容器 ${actualFrameCount ?? '…'} 帧；应用后才会写入项目。`}
                    >
                      <DsPropertyGrid>
                        <DsPropertyRow label="名称" labelFor="world-sprite-new-usage-label">
                          <DsTextInput
                            id="world-sprite-new-usage-label"
                            name="world-sprite-new-usage-label"
                            autoComplete="off"
                            size="compact"
                            value={draftLabel}
                            onChange={(event) => setDraftLabel(event.target.value)}
                          />
                        </DsPropertyRow>
                        <DsPropertyRow label="ID" labelFor="world-sprite-new-usage-id">
                          <DsTextInput
                            id="world-sprite-new-usage-id"
                            name="world-sprite-new-usage-id"
                            autoComplete="off"
                            spellCheck={false}
                            size="compact"
                            monospace
                            value={draftId}
                            onChange={(event) => setDraftId(event.target.value)}
                          />
                        </DsPropertyRow>
                      </DsPropertyGrid>
                      <div className="ds-inspector-actions">
                        <DsButton
                          size="compact"
                          variant="secondary"
                          onClick={() => setCreatingUsage(false)}
                        >
                          取消
                        </DsButton>
                        <DsButton
                          size="compact"
                          variant="primary"
                          disabled={!loadedProof || !draftId.trim() || !draftLabel.trim()}
                          onClick={applyUsage}
                        >
                          应用
                        </DsButton>
                      </div>
                    </DsInspectorSection>
                  ) : definition ? (
                    <DsInspectorSection
                      title="帧布局"
                      description={`${definition.label} · ${definition.id}`}
                    >
                      <DsPropertyGrid>
                        <DsPropertyRow label="布局类型" labelFor="world-sprite-layout-kind">
                          <DsSelect
                            id="world-sprite-layout-kind"
                            size="compact"
                            value={definition.layout.kind}
                            disabled={!loadedProof}
                            options={[
                              {
                                value: 'directional',
                                label: '四向行走',
                                disabled: (actualFrameCount ?? 0) < 4,
                              },
                              {
                                value: 'static',
                                label: '默认定格（默认 #0，可由脚本切帧）',
                              },
                              ...(definition.layout.kind === 'loop'
                                ? [
                                    {
                                      value: 'loop',
                                      label: '旧定义级循环（请转换为预制动作）',
                                      disabled: true,
                                    },
                                  ]
                                : []),
                            ]}
                            onValueChange={(value) =>
                              loadedProof &&
                              dispatchLayout(
                                defaultLayout(
                                  value as AuthorableLayoutKind,
                                  loadedProof.actualFrameCount,
                                ),
                              )
                            }
                          />
                        </DsPropertyRow>
                        {definition.layout.kind === 'directional' ? (
                          <DsPropertyRow label="每向帧数" labelFor="world-sprite-frames-per-dir">
                            <DsDraftNumberInput
                              id="world-sprite-frames-per-dir"
                              name="world-sprite-frames-per-dir"
                              size="compact"
                              draftKey={`sprite:${definition.id}:layout:framesPerDir`}
                              syncToken={props.session.getHistoryVersion()}
                              min={1}
                              max={Math.max(1, Math.floor((actualFrameCount ?? 0) / 4))}
                              integer
                              disabled={!loadedProof}
                              value={definition.layout.framesPerDir}
                              onCommit={(value) => {
                                if (value !== undefined && Number.isInteger(value) && value > 0)
                                  return dispatchLayout({
                                    kind: 'directional',
                                    framesPerDir: value,
                                  })
                                return false
                              }}
                            />
                          </DsPropertyRow>
                        ) : null}
                      </DsPropertyGrid>
                      <p className="ds-inspector-supporting-copy">
                        {loadedProof
                          ? `${layoutDescription(definition.layout)} · 源帧容器共 ${loadedProof.actualFrameCount} 帧`
                          : '正在读取实际帧数；载入完成后可编辑。'}
                      </p>
                    </DsInspectorSection>
                  ) : null}
                </div>
              ),
            },
            {
              id: 'references',
              label: '引用',
              count: referenceReady ? totalReferenceCount : undefined,
              panel: (
                <div>
                  <div className="section sprite-definition-lifecycle">
                    <DsReferencePanel
                      state={
                        referenceReady
                          ? totalReferenceCount
                            ? 'ready'
                            : 'empty'
                          : effectiveReferenceStatus === 'failed'
                            ? 'error'
                            : effectiveReferenceStatus === 'stale'
                              ? 'partial'
                              : 'loading'
                      }
                      count={
                        referenceReady
                          ? { kind: 'exact', value: totalReferenceCount }
                          : { kind: 'unknown' }
                      }
                      impact={{
                        kind:
                          referenceReady && blockingReferences.length
                            ? 'blocking'
                            : 'informational',
                        description: !definition
                          ? consumers.length
                            ? '选择一个用途定义，查看它的引用与场景实例。'
                            : '这个源资源尚无用途定义，因此没有可追踪的使用位置。'
                          : !referenceReady
                            ? '引用结果尚非当前版本；刷新完成前删除已禁用。'
                            : blockingReferences.length
                              ? '用途引用会阻断删除；动作与实例行为仍按各自定位能力呈现。'
                              : '当前用途定义尚未被任何内容使用。',
                      }}
                      summary={
                        referenceReady && blockingReferences.length
                          ? `${blockingReferences.length} 处用途引用会阻断删除 · 共 ${totalReferenceCount} 处引用`
                          : undefined
                      }
                    >
                      {definition && Object.keys(definition.poses ?? {}).length ? (
                        <DsReferenceGroup title="动作引用" count={actionReferences.length}>
                          <div
                            className="ds-inspector-choice-list"
                            role="group"
                            aria-label="选择动作查看引用"
                          >
                            {Object.entries(definition.poses ?? {})
                              .sort(
                                ([leftId, left], [rightId, right]) =>
                                  (left.order ?? Number.MAX_SAFE_INTEGER) -
                                    (right.order ?? Number.MAX_SAFE_INTEGER) ||
                                  leftId.localeCompare(rightId),
                              )
                              .map(([actionId, action]) => (
                                <DsCatalogRow
                                  key={actionId}
                                  selected={referenceActionId === actionId}
                                  title={action.label}
                                  meta={actionId}
                                  onClick={() => setReferenceActionId(actionId)}
                                />
                              ))}
                          </div>
                          {referenceActionId ? (
                            selectedActionReferences.length ? (
                              <DsReferenceList>
                                {selectedActionReferences.map((reference) => (
                                  <DsReferenceRow
                                    key={reference.id}
                                    title={reference.source.label}
                                    path={reference.where}
                                    labels={[
                                      {
                                        label:
                                          reference.target.kind === 'world-sprite-action'
                                            ? (definition.poses?.[reference.target.actionId]
                                                ?.label ?? reference.target.actionId)
                                            : '动作引用',
                                      },
                                    ]}
                                    action={
                                      props.onOpenReference &&
                                      reference.locator.kind !== 'unavailable'
                                        ? {
                                            label: '打开引用',
                                            onActivate: () => props.onOpenReference?.(reference),
                                          }
                                        : undefined
                                    }
                                    status={
                                      props.onOpenReference &&
                                      reference.locator.kind !== 'unavailable'
                                        ? undefined
                                        : {
                                            label: '暂不可定位',
                                            reason:
                                              reference.locator.kind === 'unavailable'
                                                ? reference.locator.reason
                                                : '当前宿主没有提供动作引用定位能力。',
                                            tone: 'warning',
                                          }
                                    }
                                  />
                                ))}
                              </DsReferenceList>
                            ) : (
                              <p className="hint2">当前动作尚未被场景页或脚本命令引用。</p>
                            )
                          ) : (
                            <p className="hint2">选择一个动作查看精确引用。</p>
                          )}
                        </DsReferenceGroup>
                      ) : null}
                      {definition || consumers.length ? (
                        <DsReferenceGroup title="用途定义引用" count={definitionReferences.length}>
                          {consumers.length ? (
                            <div
                              className="ds-inspector-choice-list"
                              role="group"
                              aria-label="选择要查看的用途定义"
                            >
                              {consumers.map((entry) => (
                                <DsCatalogRow
                                  key={entry.id}
                                  selected={entry.id === definition?.id}
                                  title={entry.label}
                                  meta={entry.id}
                                  trailing={KIND_LABEL[entry.layout.kind]}
                                  onClick={() => {
                                    pendingInspectorTab.current = {
                                      view: 'definition',
                                      objectId: entry.id,
                                      tab: 'references',
                                    }
                                    setSelectedId(entry.id)
                                    setCreatingUsage(false)
                                    setShowUsageMenu(false)
                                    props.onViewChange('definition', entry.id)
                                    props.onObjectFocus?.(entry.id)
                                  }}
                                />
                              ))}
                            </div>
                          ) : null}
                          {definition ? (
                            <p className="hint2">
                              未迁移的移动、随机、状态或逐帧命令仍可打开真实脚本；已动作化的场景显示在动作引用组。
                            </p>
                          ) : (
                            <p className="hint2">选择上方某个用途定义，查看它的引用与场景实例。</p>
                          )}
                          {definition && definitionReferences.length ? (
                            <DsReferenceList>
                              {automaticSitesForDefinition.map((site) => (
                                <DsReferenceRow
                                  key={`automatic:${site.sceneId}:${site.entityId}`}
                                  title={`场景 ${site.sceneId} · 实体 ${site.entityId}`}
                                  detail="保留的真实场景脚本；可继续查看和编辑"
                                  path={site.where}
                                  labels={[{ label: '实例行为脚本' }]}
                                  action={
                                    props.onJumpAutomaticScriptInstance
                                      ? {
                                          label: '编辑自动脚本',
                                          onActivate: () =>
                                            props.onJumpAutomaticScriptInstance?.(site),
                                        }
                                      : undefined
                                  }
                                  status={
                                    props.onJumpAutomaticScriptInstance
                                      ? undefined
                                      : {
                                          label: '暂不可定位',
                                          reason: '当前宿主没有提供自动脚本定位能力。',
                                          tone: 'warning',
                                        }
                                  }
                                />
                              ))}
                              {nonAutomaticReferences.map((reference) => {
                                const behavior = describeSpriteReferenceBehavior(
                                  spritePreviewState,
                                  reference,
                                  definition,
                                  actualFrameCount,
                                )
                                const owner = reference.source.owner
                                const automaticSite =
                                  owner.kind === 'scene-entity'
                                    ? automaticScriptSiteIndex.get(
                                        `${definition.id}\0${owner.sceneId}\0${owner.entityId}`,
                                      )
                                    : undefined
                                const canOpenAutomatic =
                                  !!automaticSite && !!props.onJumpAutomaticScriptInstance
                                const canOpen =
                                  canOpenAutomatic ||
                                  (reference.locator.kind !== 'unavailable' &&
                                    !!props.onOpenReference)
                                return (
                                  <DsReferenceRow
                                    key={reference.id}
                                    title={reference.source.label}
                                    detail={behavior.detail}
                                    path={reference.where}
                                    labels={[{ label: behavior.label }]}
                                    action={
                                      canOpen
                                        ? {
                                            label: canOpenAutomatic ? '编辑自动脚本' : '打开',
                                            onActivate: () => {
                                              if (
                                                automaticSite &&
                                                props.onJumpAutomaticScriptInstance
                                              )
                                                props.onJumpAutomaticScriptInstance(automaticSite)
                                              else props.onOpenReference?.(reference)
                                            },
                                          }
                                        : undefined
                                    }
                                    status={
                                      canOpen
                                        ? undefined
                                        : {
                                            label: '暂不可定位',
                                            reason:
                                              reference.locator.kind === 'unavailable'
                                                ? reference.locator.reason
                                                : '当前宿主没有提供用途引用定位能力。',
                                            tone: 'warning',
                                          }
                                    }
                                  />
                                )
                              })}
                            </DsReferenceList>
                          ) : definition ? (
                            <p className="hint2">当前用途定义尚未被任何内容使用。</p>
                          ) : null}
                        </DsReferenceGroup>
                      ) : null}
                    </DsReferencePanel>
                  </div>
                </div>
              ),
            },
            {
              id: 'source',
              label: '源资源',
              panel: (
                <div>
                  {record?.kind === 'sprite' ? (
                    <DsInspectorSection title="资源信息">
                      <DsPropertyGrid>
                        <DsPropertyRow label="AssetId">
                          <DsOverflowText
                            as="code"
                            className="ds-inspector-readonly"
                            translate="no"
                          >
                            {selectedAsset}
                          </DsOverflowText>
                        </DsPropertyRow>
                        <DsPropertyRow label="路径">
                          <DsOverflowText
                            as="code"
                            className="ds-inspector-readonly"
                            translate="no"
                          >
                            {record.path}
                          </DsOverflowText>
                        </DsPropertyRow>
                        <DsPropertyRow label="源帧数">
                          {actualFrameCount ?? '读取中…'}
                        </DsPropertyRow>
                        <DsPropertyRow label="文件大小">
                          {record.bytes.toLocaleString()}
                        </DsPropertyRow>
                        <DsPropertyRow label="SHA-256">
                          <DsOverflowText
                            as="code"
                            className="ds-inspector-readonly"
                            translate="no"
                          >
                            {record.sha256}
                          </DsOverflowText>
                        </DsPropertyRow>
                        <DsPropertyRow label="来源">{record.origin.kind}</DsPropertyRow>
                      </DsPropertyGrid>
                    </DsInspectorSection>
                  ) : (
                    <div className="insp-empty">未选择源资源。</div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </DsInspectorHost>
      {actionDialog ? (
        <SpriteActionEditorDialog
          key={`${actionDialog.definition.id}:${actionDialog.revision}`}
          definition={actionDialog.definition}
          liveDefinition={dialogLiveDefinition}
          catalog={props.catalog}
          proof={actionDialog.proof}
          liveProof={dialogLiveProof}
          frames={actionDialog.frames}
          selectedSourceFrame={selectedSourceFrame}
          references={dialogActionReferences}
          referenceStatus={effectiveReferenceStatus}
          getCurrentReferenceIndex={props.getCurrentReferenceIndex}
          session={props.session}
          initialMode={actionDialog.kind}
          selectedActionId={selectedActionId}
          onSelectedActionChange={(actionId) => {
            setSelectedActionId(actionId)
            setReferenceActionId(actionId)
            pendingActionRouteRef.current = { actionId }
            if (actionId) {
              setActionDialog((current) =>
                current ? { ...current, kind: 'edit', owner: 'browse' } : current,
              )
              props.onActionFocus?.(actionDialog.definition.id, actionId)
            } else {
              setActionDialog((current) =>
                current?.kind === 'edit' ? { ...current, owner: 'browse' } : current,
              )
              props.onViewChange('definition', actionDialog.definition.id)
            }
          }}
          onSelectedSourceFrameChange={setSelectedSourceFrame}
          onRequestCreate={openCreateAction}
          onOpenReferences={(actionId) => {
            setReferenceActionId(actionId)
            setInspectorTab('references')
            setActionDialog(undefined)
            pendingActionRouteRef.current = { actionId: undefined }
            props.onViewChange('definition', actionDialog.definition.id)
          }}
          onRequestSave={props.onRequestSave}
          onClose={closeActionDialog}
          onStatusNotice={props.onStatusNotice}
        />
      ) : null}
    </>
  )
}
