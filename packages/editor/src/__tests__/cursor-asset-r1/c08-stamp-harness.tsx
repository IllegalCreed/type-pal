/**
 * C08 组合叶组件挂载：StampLibraryTab / StampContentEditor / StampPreviewCanvas / StampTemplateDialog。
 */
import type { ProjectMap, StampTemplate } from '@type-pal/content'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { EditSession } from '../../core/edit-session.js'
import type { EditorAssetReader } from '../../core/editor-asset-reader.js'
import type { MapSelection } from '../../core/map-selection.js'
import { StampContentEditor } from '../../ui/StampContentEditor.js'
import { StampLibraryTab } from '../../ui/StampLibraryTab.js'
import { StampPreviewCanvas } from '../../ui/StampPreviewCanvas.js'
import { StampTemplateDialog } from '../../ui/StampTemplateDialog.js'
import { C08_TILESET, openC08Session, seedStamps } from './c08-fixtures.js'
import type { LegalProject } from './kit.js'

export interface MountedStampLibrary {
  legal: LegalProject
  session: EditSession
  reader: EditorAssetReader
  host: HTMLDivElement
  root: Root
  cleanup(): Promise<void>
}

function LibraryHarness(props: {
  legal: LegalProject
  session: EditSession
  reader: EditorAssetReader
  focusObjectId?: string
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  return (
    <StampLibraryTab
      stamps={state.stamps}
      tilesets={state.tilesets ?? []}
      assetCatalog={state.assetCatalog}
      assetReader={props.reader}
      assetBase={props.legal.assetBase}
      session={props.session}
      mapIndex={state.mapIndex}
      focusObjectId={props.focusObjectId}
    />
  )
}

export async function mountStampLibrary(
  name: string,
  stampIds: string[],
  focusObjectId?: string,
): Promise<MountedStampLibrary> {
  const opened = await openC08Session(name)
  seedStamps(opened.session, C08_TILESET, stampIds)
  const host = document.createElement('div')
  host.style.width = '1200px'
  host.style.height = '800px'
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(
      <LibraryHarness
        legal={opened.legal}
        session={opened.session}
        reader={opened.reader}
        focusObjectId={focusObjectId}
      />,
    )
    await Promise.resolve()
  })
  return {
    legal: opened.legal,
    session: opened.session,
    reader: opened.reader,
    host,
    root,
    async cleanup() {
      await act(async () => root.unmount())
      host.remove()
    },
  }
}

export async function mountStampContentEditor(
  template: StampTemplate,
  onChange: (next: StampTemplate, takeOwnership?: boolean) => void,
): Promise<{
  host: HTMLDivElement
  root: Root
  propertiesHost: HTMLDivElement
  cleanup(): Promise<void>
}> {
  const { legal, session, reader } = await openC08Session('c08-stamp-editor')
  const host = document.createElement('div')
  const propertiesHost = document.createElement('div')
  propertiesHost.setAttribute('data-ds-inspector-host', '')
  const layersHost = document.createElement('div')
  document.body.append(host, propertiesHost, layersHost)
  const root = createRoot(host)
  const state = session.getState()
  await act(async () => {
    root.render(
      <StampContentEditor
        template={template}
        tilesets={state.tilesets ?? []}
        assetCatalog={state.assetCatalog}
        assetReader={reader}
        assetBase={legal.assetBase}
        onOpenTilePalette={() => undefined}
        onChange={onChange}
        propertiesHost={propertiesHost}
        layersHost={layersHost}
      />,
    )
  })
  return {
    host,
    root,
    propertiesHost,
    async cleanup() {
      await act(async () => root.unmount())
      host.remove()
      propertiesHost.remove()
      layersHost.remove()
    },
  }
}

export async function mountStampPreview(template: StampTemplate): Promise<{
  host: HTMLDivElement
  root: Root
  canvas(): HTMLCanvasElement
  cleanup(): Promise<void>
}> {
  const { legal, session, reader } = await openC08Session('c08-stamp-preview')
  const host = document.createElement('div')
  host.style.width = '400px'
  host.style.height = '300px'
  document.body.append(host)
  const root = createRoot(host)
  const state = session.getState()
  await act(async () => {
    root.render(
      <StampPreviewCanvas
        template={template}
        tilesets={state.tilesets ?? []}
        assetCatalog={state.assetCatalog}
        assetReader={reader}
        assetBase={legal.assetBase}
      />,
    )
    await Promise.resolve()
  })
  return {
    host,
    root,
    canvas: () => {
      const canvas = host.querySelector('canvas')
      if (!canvas) throw new Error('StampPreviewCanvas 未渲染 canvas')
      return canvas
    },
    async cleanup() {
      await act(async () => root.unmount())
      host.remove()
    },
  }
}

function stubDialogElement(): void {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = true
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.open = false
    },
  })
}

export async function mountStampTemplateDialog(input: {
  map?: ProjectMap
  selection: Extract<MapSelection, { kind: 'cells' }>
  stampIds?: string[]
  initialMode?: 'create' | 'update'
  initialTargetId?: string
  onSaved?: (id: string, mode: 'create' | 'update') => void
}): Promise<{
  session: EditSession
  host: HTMLDivElement
  root: Root
  saved: Array<{ id: string; mode: 'create' | 'update' }>
  cleanup(): Promise<void>
}> {
  stubDialogElement()
  const opened = await openC08Session('c08-stamp-dialog')
  if (input.stampIds?.length) seedStamps(opened.session, C08_TILESET, input.stampIds)
  const map = input.map ?? buildBlankProjectMap(4, 3, C08_TILESET)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const saved: Array<{ id: string; mode: 'create' | 'update' }> = []
  await act(async () => {
    root.render(
      <StampTemplateDialog
        map={map}
        selection={input.selection}
        stamps={opened.session.getState().stamps}
        session={opened.session}
        initialMode={input.initialMode}
        initialTargetId={input.initialTargetId}
        onClose={() => undefined}
        onSaved={(id, mode) => {
          saved.push({ id, mode })
          input.onSaved?.(id, mode)
        }}
      />,
    )
  })
  return {
    session: opened.session,
    host,
    root,
    saved,
    async cleanup() {
      await act(async () => root.unmount())
      host.remove()
    },
  }
}
