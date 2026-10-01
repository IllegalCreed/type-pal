/**
 * C09 合法挂载：MusicTab / SoundTab / 带 strategy 的 AudioAssetWorkbench。
 */
import type { AssetId } from '@type-pal/content'
import { act, type ReactNode, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { stopEditorAudioPreview } from '../../core/audio-preview-session.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../../core/editor-derived-contract.js'
import type { ProjectReferenceEdge } from '../../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import {
  AudioAssetWorkbench,
  type AudioAssetWorkbenchStrategy,
  type AudioWorkbenchTransport,
} from '../../ui/AudioAssetWorkbench.js'
import {
  catalogControlsAssetCatalog,
  catalogControlsEditorState,
  catalogControlsReader,
} from '../../ui/catalog-controls-test-utils.js'
import { MusicTab } from '../../ui/MusicTab.js'
import { SoundTab } from '../../ui/SoundTab.js'
import { type LegalProject, loadLegalProject } from './kit.js'

export interface MountedAudioTab {
  host: HTMLDivElement
  root: Root
  session: EditSession
  reader: EditorAssetReader
  source: LegalProject['source']
  focusLog: Array<string | undefined>
  openedReferences: ProjectReferenceEdge[]
  cleanup(): Promise<void>
}

async function mountHarness(
  render: (
    session: EditSession,
    reader: EditorAssetReader,
    focusLog: Array<string | undefined>,
    openedReferences: ProjectReferenceEdge[],
  ) => ReactNode,
): Promise<MountedAudioTab> {
  stopEditorAudioPreview()
  const legal = await loadLegalProject('c09-audio')
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const focusLog: Array<string | undefined> = []
  const openedReferences: ProjectReferenceEdge[] = []
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)

  function Shell() {
    useSyncExternalStore(
      (callback) => session.subscribe(callback),
      () => session.getVersion(),
    )
    return render(session, reader, focusLog, openedReferences) as ReactNode
  }

  await act(async () => {
    root.render(<Shell />)
    await Promise.resolve()
  })

  return {
    host,
    root,
    session,
    reader,
    source: legal.source,
    focusLog,
    openedReferences,
    async cleanup() {
      stopEditorAudioPreview()
      await act(async () => root.unmount())
      host.remove()
    },
  }
}

function sharedTabProps(
  session: EditSession,
  reader: EditorAssetReader,
  focusLog: Array<string | undefined>,
  openedReferences: ProjectReferenceEdge[],
  focusObjectId?: AssetId,
) {
  const current = session.getState()
  return {
    catalog: current.assetCatalog,
    reader,
    session,
    focusObjectId,
    onObjectFocus: (id: string | undefined) => {
      focusLog.push(id)
    },
    assetDiagnostics: [],
    referenceIndex: collectCurrentProjectReferenceIndex(current),
    referenceStatus: 'current' as const,
    getCurrentReferenceIndex: (state: Parameters<typeof collectCurrentProjectReferenceIndex>[0]) =>
      collectCurrentProjectReferenceIndex(state),
    onOpenReference: (reference: ProjectReferenceEdge) => openedReferences.push(reference),
  }
}

export async function mountMusicTab(focusObjectId?: AssetId): Promise<MountedAudioTab> {
  return mountHarness((session, reader, focusLog, openedReferences) => (
    <MusicTab {...sharedTabProps(session, reader, focusLog, openedReferences, focusObjectId)} />
  ))
}

export async function mountSoundTab(focusObjectId?: AssetId): Promise<MountedAudioTab> {
  return mountHarness((session, reader, focusLog, openedReferences) => (
    <SoundTab {...sharedTabProps(session, reader, focusLog, openedReferences, focusObjectId)} />
  ))
}

export async function mountAudioWorkbench(
  strategy: AudioAssetWorkbenchStrategy,
  options: {
    focusObjectId?: AssetId
    catalog?: typeof catalogControlsAssetCatalog
    session?: EditSession
    reader?: typeof catalogControlsReader
    referenceIndex?: ReturnType<typeof collectCurrentProjectReferenceIndex>
    referenceStatus?: EditorDerivedStatus
  } = {},
): Promise<MountedAudioTab & { strategy: AudioAssetWorkbenchStrategy }> {
  const session = options.session ?? new EditSession(catalogControlsEditorState(options.catalog))
  const reader = options.reader ?? catalogControlsReader
  const focusLog: Array<string | undefined> = []
  const openedReferences: ProjectReferenceEdge[] = []
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const referenceIndex =
    options.referenceIndex ?? collectCurrentProjectReferenceIndex(session.getState())

  await act(async () => {
    root.render(
      <AudioAssetWorkbench
        assetDiagnostics={[]}
        referenceIndex={referenceIndex}
        referenceStatus={options.referenceStatus ?? 'current'}
        getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
        catalog={options.catalog ?? catalogControlsAssetCatalog}
        reader={reader}
        session={session}
        strategy={strategy}
        focusObjectId={options.focusObjectId ?? 'sound.hit'}
        onObjectFocus={(id) => focusLog.push(id)}
      />,
    )
  })

  return {
    host,
    root,
    session,
    reader: reader as EditorAssetReader,
    source: (await loadLegalProject('c09-workbench')).source,
    focusLog,
    openedReferences,
    strategy,
    async cleanup() {
      stopEditorAudioPreview()
      await act(async () => root.unmount())
      host.remove()
    },
  }
}

export function mockSoundStrategy(
  transportFactory: () => AudioWorkbenchTransport,
): AudioAssetWorkbenchStrategy {
  return {
    kind: 'sound',
    title: '音效',
    unit: '项',
    formatLabel: 'WAV',
    importLabel: '导入 WAV',
    accept: '.wav,audio/wav',
    emptyLabel: '没有音效。',
    prepareImport: async () => {
      throw new Error('C09 mock strategy 未接线 prepareImport')
    },
    allocateId: () => 'sound.authored.c09mock',
    createTransport: (_reader: EditorAssetReader) => transportFactory(),
  }
}
