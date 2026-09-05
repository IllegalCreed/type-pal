import type { ComponentProps } from 'react'
import { useMemo } from 'react'
import type { EditorDerivedStoreSnapshot } from '../core/editor-derived-store.js'
import {
  type EditorDerivedStore,
  effectiveEditorDerivedStatus,
} from '../core/editor-derived-store.js'
import { createProjectReferenceIndex } from '../core/project-reference.js'
import type { ScriptEditSession } from '../core/script-editor.js'
import { projectActiveScriptEditorState } from '../core/script-editor-projection.js'
import { ActorMode } from './ActorMode.js'
import { DataMode } from './DataMode.js'
import { ProjectWorkbenchTab } from './ProjectWorkbenchTab.js'
import {
  useEditorDerivedSnapshotAfterPaint,
  useEditSessionSelector,
  useScriptEditSessionSelector,
} from './session-selector.js'

function lastKnownDerivedData(snapshot: EditorDerivedStoreSnapshot) {
  return snapshot.status === 'current'
    ? snapshot.data
    : snapshot.status === 'stale' || snapshot.status === 'failed'
      ? snapshot.lastKnown?.data
      : undefined
}

type ActorStateProps =
  | 'actors'
  | 'sprites'
  | 'battleSprites'
  | 'items'
  | 'skills'
  | 'locale'
  | 'levelUp'
  | 'assetCatalog'
  | 'referenceIndex'
  | 'referenceStatus'

export type ConnectedActorModeProps = Omit<ComponentProps<typeof ActorMode>, ActorStateProps> & {
  derivedStore: EditorDerivedStore
  scriptSession: ScriptEditSession
}

export function ConnectedActorMode(props: ConnectedActorModeProps) {
  const { derivedStore, scriptSession, session, ...staticProps } = props
  const state = useEditSessionSelector(session, (snapshot) => snapshot.state)
  useScriptEditSessionSelector(scriptSession, (snapshot) => snapshot.state)
  const derivedSnapshot = useEditorDerivedSnapshotAfterPaint(derivedStore)
  const derivedData = lastKnownDerivedData(derivedSnapshot)
  const referenceIndex = useMemo(
    () =>
      derivedData?.projectReferences
        ? createProjectReferenceIndex(derivedData.projectReferences)
        : undefined,
    [derivedData?.projectReferences],
  )
  const referenceStatus = effectiveEditorDerivedStatus(derivedSnapshot, {
    mainHistoryVersion: session.getHistoryVersion(),
    scriptHistoryVersion: scriptSession.getHistoryVersion(),
  })
  const items = useMemo(
    () => Object.fromEntries(state.items.map((item) => [item.id, item])),
    [state.items],
  )
  const skills = useMemo(
    () => Object.fromEntries(state.skills.map((skill) => [skill.id, skill])),
    [state.skills],
  )

  return (
    <ActorMode
      {...staticProps}
      session={session}
      referenceIndex={referenceIndex}
      referenceStatus={referenceStatus}
      actors={state.actors}
      sprites={state.sprites}
      battleSprites={state.battleSprites}
      items={items}
      skills={skills}
      locale={state.locale}
      levelUp={state.levelUp}
      assetCatalog={state.assetCatalog}
    />
  )
}

type ProjectStateProps =
  | 'manifest'
  | 'scenes'
  | 'sceneIndex'
  | 'actors'
  | 'items'
  | 'poisons'
  | 'locale'
  | 'assetCatalog'
  | 'issues'
  | 'diagnosticsStatus'

export type ConnectedProjectWorkbenchProps = Omit<
  ComponentProps<typeof ProjectWorkbenchTab>,
  ProjectStateProps
> & {
  derivedStore: EditorDerivedStore
  scriptSession: ScriptEditSession
}

export function ConnectedProjectWorkbench(props: ConnectedProjectWorkbenchProps) {
  const { derivedStore, scriptSession, session, page, ...staticProps } = props
  const state = useEditSessionSelector(session, (snapshot) => snapshot.state)
  useScriptEditSessionSelector(scriptSession, (snapshot) => snapshot.state)
  const derivedSnapshot = useEditorDerivedSnapshotAfterPaint(derivedStore)
  const derivedData = lastKnownDerivedData(derivedSnapshot)
  const derivedStatus = effectiveEditorDerivedStatus(derivedSnapshot, {
    mainHistoryVersion: session.getHistoryVersion(),
    scriptHistoryVersion: scriptSession.getHistoryVersion(),
  })

  return (
    <ProjectWorkbenchTab
      {...staticProps}
      page={page}
      session={session}
      manifest={state.manifest}
      scenes={state.scenes}
      sceneIndex={state.sceneIndex}
      actors={state.actors}
      items={state.items}
      poisons={state.poisons ?? []}
      locale={state.locale}
      assetCatalog={state.assetCatalog}
      issues={derivedData?.projectIssues ?? []}
      diagnosticsStatus={derivedStatus}
    />
  )
}

type DataStateProps =
  | 'itemList'
  | 'sprites'
  | 'battleSprites'
  | 'skills'
  | 'locale'
  | 'enemies'
  | 'enemyTeams'
  | 'assetCatalog'
  | 'tilesets'
  | 'tilesetBlobs'
  | 'stamps'
  | 'mapIndex'
  | 'sceneIndex'
  | 'script'
  | 'battleFields'
  | 'poisons'
  | 'ambiences'
  | 'shops'
  | 'scenes'
  | 'manifest'
  | 'projectIssues'
  | 'projectDiagnosticsStatus'
  | 'derivedData'
  | 'derivedDiagnosticsMessage'
  | 'projectReferenceIndex'
  | 'projectReferenceStatus'
  | 'actors'
  | 'skillList'

export type ConnectedDataModeProps = Omit<ComponentProps<typeof DataMode>, DataStateProps> & {
  derivedStore: EditorDerivedStore
  scriptSession: ScriptEditSession
}

export function ConnectedDataMode(props: ConnectedDataModeProps) {
  const { derivedStore, scriptSession, session, tab, ...staticProps } = props
  const state = useEditSessionSelector(session, (snapshot) => snapshot.state)
  const canonical = useScriptEditSessionSelector(scriptSession, (snapshot) => snapshot.state)
  const derivedSnapshot = useEditorDerivedSnapshotAfterPaint(derivedStore)
  const derivedData = lastKnownDerivedData(derivedSnapshot)
  const projectReferenceIndex = useMemo(
    () =>
      derivedData?.projectReferences
        ? createProjectReferenceIndex(derivedData.projectReferences)
        : undefined,
    [derivedData?.projectReferences],
  )
  const derivedStatus = effectiveEditorDerivedStatus(derivedSnapshot, {
    mainHistoryVersion: session.getHistoryVersion(),
    scriptHistoryVersion: scriptSession.getHistoryVersion(),
  })
  const skills = useMemo(
    () => Object.fromEntries(state.skills.map((skill) => [skill.id, skill])),
    [state.skills],
  )
  const scriptState = useMemo(() => {
    if (tab === 'scripts') return canonical
    // ItemTab reads canonical private-script bodies directly. Projecting every shell item here
    // cloned the full 234-item table for a description-only commit.
    if (tab === 'item') return canonical
    if (tab === 'crafting' || tab === 'spirit-gourd') return undefined
    if (tab === 'poison') return undefined
    return projectActiveScriptEditorState(canonical, state.items)
  }, [canonical, state.items, tab])

  return (
    <DataMode
      {...staticProps}
      tab={tab}
      session={session}
      itemList={state.items}
      sprites={state.sprites}
      battleSprites={state.battleSprites}
      skills={skills}
      locale={state.locale}
      enemies={state.enemies ?? []}
      enemyTeams={state.enemyTeams ?? []}
      assetCatalog={state.assetCatalog}
      tilesets={state.tilesets ?? []}
      tilesetBlobs={state.tilesetBlobs}
      stamps={state.stamps}
      mapIndex={state.mapIndex}
      sceneIndex={state.sceneIndex}
      script={scriptState ? { state: scriptState, session: scriptSession } : undefined}
      battleFields={state.battleFields ?? []}
      poisons={state.poisons ?? []}
      ambiences={state.ambiences ?? []}
      shops={state.shops ?? []}
      scenes={state.scenes}
      manifest={state.manifest}
      projectIssues={derivedData?.projectIssues ?? []}
      projectDiagnosticsStatus={derivedStatus}
      derivedData={derivedData}
      derivedDiagnosticsMessage={
        derivedSnapshot.status === 'failed' ? derivedSnapshot.message : undefined
      }
      projectReferenceIndex={projectReferenceIndex}
      projectReferenceStatus={derivedStatus}
      actors={state.actors}
      skillList={state.skills}
    />
  )
}
