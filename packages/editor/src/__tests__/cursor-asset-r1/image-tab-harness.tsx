/**
 * C07 ImageTab 合法挂载：blank 项目 + 合成 PNG 字节，真实 EditSession / EditorAssetReader。
 */
import type { AssetId, AssetRecordV1 } from '@type-pal/content'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { UpsertAssetCommand } from '../../core/asset-commands.js'
import type { EditorAssetDiagnostic } from '../../core/asset-diagnostics.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../../core/editor-derived-contract.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import type { StaticImageKind } from '../../core/static-image.js'
import { ImageTab } from '../../ui/ImageTab.js'
import type { LegalProject } from './kit.js'

export interface SeededImage {
  id: AssetId
  kind: StaticImageKind
  label: string
  bytes: ArrayBuffer
  sha256: string
}

export interface MountedImageTab {
  legal: LegalProject
  session: EditSession
  reader: EditorAssetReader
  host: HTMLDivElement
  root: Root
  focusLog: Array<string | undefined>
  setFocusObjectId(id: string | undefined): Promise<void>
}

function recordFor(seed: SeededImage): AssetRecordV1 {
  return {
    kind: seed.kind,
    path: `assets/authored/${seed.kind}/${seed.sha256}.png`,
    mediaType: 'image/png',
    bytes: seed.bytes.byteLength,
    sha256: seed.sha256,
    label: seed.label,
    origin: { kind: 'authored', ref: `${seed.id}.png` },
  }
}

function Harness(props: {
  legal: LegalProject
  session: EditSession
  reader: EditorAssetReader
  focusObjectId?: string
  assetDiagnostics: EditorAssetDiagnostic[]
  referenceStatus: EditorDerivedStatus
  focusLog: Array<string | undefined>
}) {
  const [focus, setFocus] = useState<string | undefined>(props.focusObjectId)
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <ImageTab
      assetBase={props.legal.assetBase}
      catalog={current.assetCatalog}
      reader={props.reader}
      session={props.session}
      assetDiagnostics={props.assetDiagnostics}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus={props.referenceStatus}
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        props.focusLog.push(id)
        setFocus(id)
      }}
    />
  )
}

async function renderHarness(
  mounted: {
    legal: LegalProject
    session: EditSession
    reader: EditorAssetReader
    host: HTMLDivElement
    root: Root
    focusLog: Array<string | undefined>
  },
  options: {
    focusObjectId?: string
    assetDiagnostics?: EditorAssetDiagnostic[]
    referenceStatus?: EditorDerivedStatus
  },
): Promise<void> {
  await act(async () => {
    mounted.root.render(
      <Harness
        legal={mounted.legal}
        session={mounted.session}
        reader={mounted.reader}
        focusObjectId={options.focusObjectId}
        assetDiagnostics={options.assetDiagnostics ?? []}
        referenceStatus={options.referenceStatus ?? 'current'}
        focusLog={mounted.focusLog}
      />,
    )
    await Promise.resolve()
  })
}

export async function mountImageTab(
  legal: LegalProject,
  input: {
    seeds?: SeededImage[]
    focusObjectId?: string
    assetDiagnostics?: EditorAssetDiagnostic[]
    referenceStatus?: EditorDerivedStatus
  } = {},
): Promise<MountedImageTab> {
  const session = new EditSession(structuredClone(legal.state))
  for (const seed of input.seeds ?? []) {
    session.dispatch(new UpsertAssetCommand(seed.id, recordFor(seed), seed.bytes))
  }
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const focusLog: Array<string | undefined> = []
  const shell = { legal, session, reader, host, root, focusLog }
  await renderHarness(shell, input)
  return {
    ...shell,
    async setFocusObjectId(id) {
      await renderHarness(shell, { ...input, focusObjectId: id })
    },
  }
}

export async function unmountImageTab(mounted: MountedImageTab): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}
