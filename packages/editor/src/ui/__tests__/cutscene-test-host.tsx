import type { AssetId } from '@type-pal/content'
import { type AssetBase, AssetResolver } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, vi } from 'vitest'
import { installReactActEnvironment, waitForReact } from '../../__tests__/react-io-wait.js'
import { collectEditorAssetDiagnostics } from '../../core/asset-diagnostics.js'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { collectEditorAssetReferences } from '../../core/editor-asset-references.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import { CutsceneTab } from '../CutsceneTab.js'
import {
  type CutsceneAnimationSeed,
  installCutsceneHardwarePorts,
  loadCutsceneFixtureProject,
  type ObjectUrlWitness,
  restoreCutsceneHardwarePorts,
} from './cutscene-resource-fixtures.js'
import { type GatedFileSource, gatedFileSource } from './kimi-editor-workflows/kit.js'

interface Mounted {
  session: EditSession
  gate: GatedFileSource
  reader: EditorAssetReader
  assetBase: AssetBase
  focusLog: Array<string | undefined>
}

function Harness(props: {
  session: EditSession
  reader: EditorAssetReader
  assetBase: AssetBase
  initialFocus?: AssetId
  setFocusPort(setFocus: (value: string | undefined) => void): void
  focusLog: Array<string | undefined>
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [focus, setFocus] = useState<string | undefined>(props.initialFocus)
  props.setFocusPort(setFocus)
  return (
    <CutsceneTab
      assetBase={props.assetBase}
      catalog={current.assetCatalog}
      reader={props.reader}
      session={props.session}
      assetDiagnostics={collectEditorAssetDiagnostics(
        current.assetCatalog,
        collectEditorAssetReferences(current),
      )}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        props.focusLog.push(id)
        setFocus(id)
      }}
    />
  )
}

export function installCutsceneTestHost() {
  const host = document.createElement('div')
  let root: Root | undefined
  let witness: ObjectUrlWitness
  let restoreAct: () => void
  let setParentFocus: ((value: string | undefined) => void) | undefined
  beforeEach(() => {
    restoreAct = installReactActEnvironment()
    witness = installCutsceneHardwarePorts()
    document.body.append(host)
    root = createRoot(host)
  })

  async function unmount() {
    const current = root
    root = undefined
    if (current) await act(async () => current.unmount())
  }

  afterEach(async () => {
    try {
      await unmount()
    } finally {
      host.remove()
      setParentFocus = undefined
      restoreCutsceneHardwarePorts()
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
      restoreAct()
    }
  })

  async function mountTab(
    options: {
      focus?: AssetId
      videos?: readonly { id: AssetId; label: string; bytes: Uint8Array }[]
      animations?: readonly CutsceneAnimationSeed[]
      prepareGates?: (gate: GatedFileSource) => void
    } = {},
  ): Promise<Mounted> {
    const legal = await loadCutsceneFixtureProject('cutscene-library', {
      videos: options.videos,
      animations: options.animations,
    })
    const gate = gatedFileSource(legal.source)
    options.prepareGates?.(gate)
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(gate.source, () => session.getState())
    // 与 project.assetBase 同数据、仅磁盘端口换成闸门包裹的 source。
    const assetBase: AssetBase = {
      source: gate.source,
      assetResolver: new AssetResolver(
        legal.manifest.id,
        legal.catalog,
        legal.manifest.assets.roles,
        gate.source,
      ),
    }
    const focusLog: Array<string | undefined> = []
    const current = root
    if (!current) throw new Error('Mount the cutscene test host before rendering')
    await act(async () => {
      current.render(
        <Harness
          session={session}
          reader={reader}
          assetBase={assetBase}
          initialFocus={options.focus}
          setFocusPort={(setFocus) => {
            setParentFocus = setFocus
          }}
          focusLog={focusLog}
        />,
      )
      await Promise.resolve()
    })
    return { session, gate, reader, assetBase, focusLog }
  }

  function openDialogByTitle(title: string): HTMLDialogElement {
    const dialog = host.querySelector<HTMLDialogElement>(`dialog[aria-label="${title}"]`)
    expect(dialog, `弹窗 ${title}`).not.toBeNull()
    expect(dialog!.open, `弹窗 ${title} 处于打开`).toBe(true)
    return dialog!
  }

  function catalogRow(label: string): HTMLElement {
    const row = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find(
      (candidate) => candidate.querySelector('.ds-catalog-row__title')?.textContent === label,
    )
    expect(row, `目录行 ${label}`).toBeDefined()
    return row!
  }

  function propertyRowValue(label: string): string | null {
    return (
      host.querySelector(`[data-property-label="${label}"] .ds-property-row__value`)?.textContent ??
      null
    )
  }

  async function currentVideoElement(): Promise<HTMLVideoElement> {
    let video: HTMLVideoElement | null = null
    await waitForReact(() => {
      video = host.querySelector<HTMLVideoElement>('video')
      expect(video, '视频元素已挂载').not.toBeNull()
    })
    return video!
  }

  /**
   * 真实视频解码器不可用，jsdom 的 HTMLMediaElement 硬件端口由本函数按协议喂元数据。
   * jsdom 的 video 自带空 audioTracks（恒 no），会盖住产品的容器解析回退；
   * audio='container'（默认）按协议模拟「浏览器不上报音轨轨道」（audioTracks 不存在），
   * 让产品回退到 mp4HasAudioTrack 的真实盒级解析；audio='reported' 模拟浏览器上报有音轨，
   * 证明元素上报优先于容器解析的分支序。观测范围仅协议级，不宣称解码/音质保真。
   */
  async function fireLoadedMetadata(
    video: HTMLVideoElement,
    metadata: { width: number; height: number; duration: number; audio?: 'container' | 'reported' },
  ): Promise<void> {
    Object.defineProperty(video, 'videoWidth', { configurable: true, value: metadata.width })
    Object.defineProperty(video, 'videoHeight', { configurable: true, value: metadata.height })
    Object.defineProperty(video, 'duration', { configurable: true, value: metadata.duration })
    Object.defineProperty(video, 'audioTracks', {
      configurable: true,
      value: metadata.audio === 'reported' ? { length: 1 } : undefined,
    })
    await act(async () => {
      video.dispatchEvent(new Event('loadedmetadata'))
    })
  }

  return {
    host,
    mountTab,
    unmount,
    catalogRow,
    propertyRowValue,
    currentVideoElement,
    fireLoadedMetadata,
    openDialogByTitle,
    objectUrls: () => witness,
    focusAsset: async (id: string) => {
      if (!setParentFocus) throw new Error('Cutscene test host does not have a parent focus setter')
      await act(async () => setParentFocus?.(id))
    },
  }
}
