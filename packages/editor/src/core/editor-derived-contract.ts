import type { AssetReference } from '@type-pal/content'
import type { ActorReference } from './actor-references.js'
import type { EditorAssetDiagnostic } from './asset-diagnostics.js'
import type { BattleDataReference } from './battle-data-references.js'
import type { EditorState } from './edit-session.js'
import type { ItemReference } from './item-references.js'
import type { EditorStatusIssue, ProjectIssue } from './project-diagnostics.js'
import type { ProjectReferenceSnapshotV1 } from './project-reference.js'
import type { CanonicalScriptReference, ScriptEditorState } from './script-editor.js'
import type { WorldVariableReferenceIndexV1 } from './world-variable-references.js'

export interface EditorDerivedRevision {
  mainHistoryVersion: number
  scriptHistoryVersion: number
}

export type EditorDerivedStatus = 'checking' | 'stale' | 'current' | 'failed'

export type EditorDiagnosticState = Omit<EditorState, 'maps' | 'assetBlobs' | 'tilesetBlobs'>

export interface EditorDerivedInput {
  state: EditorDiagnosticState
  canonical: ScriptEditorState
}

export interface IdArrayPatch<T extends { id: string }> {
  order: string[]
  upserts: T[]
}

export interface RecordPatch<T> {
  keys: string[]
  upserts: Record<string, T>
}

export interface EditorDiagnosticStatePatch {
  replace: Partial<Omit<EditorDiagnosticState, 'scenes' | 'items'>>
  removeKeys?: Array<keyof Omit<EditorDiagnosticState, 'scenes' | 'items'>>
  scenes?: IdArrayPatch<EditorState['scenes'][number]>
  items?: IdArrayPatch<EditorState['items'][number]>
}

export interface ScriptEditorStatePatch {
  scenes?: IdArrayPatch<ScriptEditorState['scenes'][number]>
  items?: IdArrayPatch<ScriptEditorState['items'][number]>
  sharedScripts?: RecordPatch<ScriptEditorState['sharedScripts'][string]>
}

export interface EditorDerivedData {
  statusIssues: EditorStatusIssue[]
  projectIssues: ProjectIssue[]
  projectReferences: ProjectReferenceSnapshotV1
  assetReferences: AssetReference[]
  assetDiagnostics: EditorAssetDiagnostic[]
  actorReferenceIndex: Array<[string, ActorReference[]]>
  itemReferenceIndex: Array<[string, ItemReference[]]>
  poisonReferenceIndex: Array<[string, BattleDataReference[]]>
  worldVariableReferences: WorldVariableReferenceIndexV1
  canonicalBehaviorReferences: Array<[string, CanonicalScriptReference[]]>
  canonicalSceneHookReferences: Array<[string, CanonicalScriptReference[]]>
}

interface EditorDerivedRequestBase {
  epoch: number
  jobId: number
  revision: EditorDerivedRevision
}

export type EditorDerivedRequest =
  | (EditorDerivedRequestBase & { kind: 'init'; input: EditorDerivedInput })
  | (EditorDerivedRequestBase & {
      kind: 'patch'
      baseRevision: EditorDerivedRevision
      main: EditorDiagnosticStatePatch
      script: ScriptEditorStatePatch
    })
  | (EditorDerivedRequestBase & {
      kind: 'advance'
      baseRevision: EditorDerivedRevision
    })

export type EditorDerivedReply =
  | {
      kind: 'ready'
      epoch: number
      jobId: number
      revision: EditorDerivedRevision
      data: EditorDerivedData
    }
  | {
      kind: 'failed'
      epoch: number
      jobId: number
      revision: EditorDerivedRevision
      message: string
    }

export function sameEditorDerivedRevision(
  left: EditorDerivedRevision,
  right: EditorDerivedRevision,
): boolean {
  return (
    left.mainHistoryVersion === right.mainHistoryVersion &&
    left.scriptHistoryVersion === right.scriptHistoryVersion
  )
}
