import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AssetRecordV1 } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { act, StrictMode, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { fileOfBytes } from '../../__tests__/audio-fixtures.js'
import { installReactActEnvironment, waitForReact } from '../../__tests__/react-io-wait.js'
import { stopEditorAudioPreview } from '../../core/audio-preview-session.js'
import { sha256Hex } from '../../core/binary-signature.js'
import { UpdateManifestAssetRolesCommand, UpsertAssetCommand } from '../../core/commands.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../../core/editor-derived-contract.js'
import type { ProjectReferenceEdge } from '../../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import { MusicTab } from '../MusicTab.js'
import { authoredWaveRecord, SoundTab } from '../SoundTab.js'
import { loadLegalUiProject } from './glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './kimi-editor-workflows/kit.js'

interface ProjectBase {
  session: EditSession
  source: FileSource
}

interface Mounted extends ProjectBase {
  reader: EditorAssetReader
  focusLog: Array<string | undefined>
  openedReferences: ProjectReferenceEdge[]
}

function Harness(props: {
  tab: 'music' | 'sound'
  session: EditSession
  reader: EditorAssetReader
  initialFocus?: string
  referenceStatus: EditorDerivedStatus
  focusLog: Array<string | undefined>
  openedReferences: ProjectReferenceEdge[]
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [focus, setFocus] = useState<string | undefined>(props.initialFocus)
  const shared = {
    catalog: current.assetCatalog,
    reader: props.reader,
    session: props.session,
    focusObjectId: focus,
    onObjectFocus: (id: string | undefined) => {
      props.focusLog.push(id)
      setFocus(id)
    },
    assetDiagnostics: [],
    referenceIndex: collectCurrentProjectReferenceIndex(current),
    referenceStatus: props.referenceStatus,
    getCurrentReferenceIndex: (state: Parameters<typeof collectCurrentProjectReferenceIndex>[0]) =>
      collectCurrentProjectReferenceIndex(state),
    onOpenReference: (reference: ProjectReferenceEdge) => props.openedReferences.push(reference),
  }
  return props.tab === 'music' ? <MusicTab {...shared} /> : <SoundTab {...shared} />
}

export async function blankProjectBase(name: string): Promise<ProjectBase> {
  const legal = await loadLegalUiProject(name)
  return { session: new EditSession(legal.state), source: legal.source }
}

/** 真实命令播种音效：真实 WAV 字节 → authoredWaveRecord → UpsertAssetCommand。 */
export async function seedSound(
  base: ProjectBase,
  id: string,
  label: string,
  wav: Uint8Array,
): Promise<AssetRecordV1> {
  const prepared = await authoredWaveRecord(fileOfBytes(`${label}.wav`, 'audio/wav', wav), label)
  base.session.dispatch(new UpsertAssetCommand(id, prepared.record, prepared.bytes, undefined))
  return prepared.record
}

export async function seedMusic(base: ProjectBase, id: string, label: string, midi: Uint8Array) {
  const bytes = Uint8Array.from(midi).buffer
  const hash = await sha256Hex(bytes)
  base.session.dispatch(
    new UpsertAssetCommand(
      id,
      {
        kind: 'music',
        path: `assets/authored/${hash}.mid`,
        mediaType: 'audio/midi',
        bytes: bytes.byteLength,
        sha256: hash,
        label,
        origin: { kind: 'authored', ref: `${label}.mid` },
      },
      bytes,
    ),
  )
}

/** Bind a complete role set using the shipped SF3 and a score already in this test project. */
export async function bindMusicRoles(base: ProjectBase, music: string): Promise<void> {
  const testUrl = new URL(import.meta.url)
  const path =
    testUrl.protocol === 'file'
      ? fileURLToPath(testUrl)
      : decodeURIComponent(testUrl.pathname.replace(/^\/@fs(?=\/)/, ''))
  const { readFile } = createRequire(path)('node:fs/promises')
  const bytes = Uint8Array.from(
    await readFile(join(dirname(path), '../../../../reforge/public/soundfont.sf3')),
  )
  const sha256 = await sha256Hex(bytes)
  const id = 'soundfont.standard'
  base.session.dispatch(
    new UpsertAssetCommand(
      id,
      {
        kind: 'soundfont',
        path: 'assets/authored/soundfont.sf3',
        mediaType: 'audio/sf3',
        sha256,
        bytes: bytes.byteLength,
        origin: { kind: 'authored' },
      },
      bytes.buffer,
    ),
  )
  base.session.dispatch(
    new UpdateManifestAssetRolesCommand({
      'audio.midiSoundfont': id,
      'audio.defaultBattleMusic': music,
      'audio.bossVictoryMusic': music,
      'audio.normalVictoryMusic': music,
      'audio.openingMenuMusic': music,
    }),
  )
}

export async function blobSha(session: EditSession, path: string): Promise<string> {
  const blob = session.getState().assetBlobs[path]
  expect(blob, `blob ${path}`).toBeDefined()
  return sha256Hex(blob!.slice(0))
}

/** Mounts the actual resource tab around a disposable, live EditSession. */
export function installAudioWorkbenchTestHost() {
  let root: Root | undefined
  const host = document.createElement('div')
  let restoreAct: () => void

  beforeEach(() => {
    restoreAct = installReactActEnvironment()
    installBrowserHardwarePorts()
    stopEditorAudioPreview()
    document.body.append(host)
    root = createRoot(host)
  })

  async function unmountHost(): Promise<void> {
    const current = root
    root = undefined
    try {
      if (current) await act(async () => current.unmount())
    } finally {
      host.remove()
    }
  }

  afterEach(async () => {
    try {
      await act(async () => {
        stopEditorAudioPreview()
      })
      await unmountHost()
    } finally {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
      restoreAct()
    }
  })

  async function renderTab(
    tab: 'music' | 'sound',
    base: ProjectBase,
    focus?: string,
    options: { strict?: boolean; referenceStatus?: EditorDerivedStatus } = {},
  ): Promise<Mounted> {
    const reader = createEditorAssetReader(base.source, () => base.session.getState())
    const focusLog: Array<string | undefined> = []
    const openedReferences: ProjectReferenceEdge[] = []
    const current = root
    expect(current, 'root 已初始化').toBeDefined()
    await act(async () => {
      const tabView = (
        <Harness
          tab={tab}
          session={base.session}
          reader={reader}
          initialFocus={focus}
          referenceStatus={options.referenceStatus ?? 'current'}
          focusLog={focusLog}
          openedReferences={openedReferences}
        />
      )
      current!.render(options.strict ? <StrictMode>{tabView}</StrictMode> : tabView)
    })
    return { session: base.session, source: base.source, reader, focusLog, openedReferences }
  }

  function catalogRow(id: string): HTMLElement {
    const row = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find(
      (candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === id,
    )
    expect(row, `目录行 ${id}`).toBeDefined()
    return row!
  }

  async function selectRow(id: string): Promise<void> {
    await act(async () => {
      catalogRow(id).click()
    })
  }

  async function waitPlayerState(text: string): Promise<void> {
    await waitForReact(() => {
      expect(host.querySelector('.audio-player__state')?.textContent).toBe(text)
    })
  }

  function playerTime(): string {
    return host.querySelector('.audio-player__time')?.textContent ?? ''
  }

  function deleteDialog(): HTMLDialogElement {
    const dialog = host.querySelector<HTMLDialogElement>('dialog[aria-label="删除音效"]')
    expect(dialog, '删除音效对话框').not.toBeNull()
    return dialog!
  }

  /** PCM 峰值线（排除进度线）。 */
  function peakLines(): NodeListOf<Element> {
    return host.querySelectorAll('.audio-timeline__graphic line:not(.audio-timeline__progress)')
  }

  return {
    host,
    renderTab,
    unmountHost,
    catalogRow,
    selectRow,
    waitPlayerState,
    playerTime,
    deleteDialog,
    peakLines,
  }
}
