/**
 * PreviewCanvas 合法挂载：真实 scene-stage 加载链 + Playback，不 mock 产品组件。
 */
import type { SceneDef, ScriptStage } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { act, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { Playback } from '../../core/playback.js'
import { PreviewCanvas } from '../../ui/PreviewCanvas.js'
import type { LegalProject } from './kit.js'

export interface MountedPreviewCanvas {
  legal: LegalProject
  sessionPlayback: Playback
  reader: EditorAssetReader
  host: HTMLDivElement
  root: Root
  scene: SceneDef
  canvas(): HTMLCanvasElement
}

function Harness(props: {
  legal: LegalProject
  scene: SceneDef
  stages: readonly ScriptStage[]
  sourceKey: string
  focusEntityId: string | undefined
  playback: Playback
  reader: EditorAssetReader
  hint?: string
  sceneFraming?: boolean
}) {
  const [, setUiTick] = useState(0)
  useEffect(() => {
    props.playback.onUi = () => setUiTick((value) => value + 1)
    return () => {
      props.playback.onUi = undefined
    }
  }, [props.playback])
  const state = props.legal.state
  return (
    <PreviewCanvas
      scene={props.scene}
      stages={props.stages}
      sourceKey={props.sourceKey}
      playIdentity={{
        projectId: state.manifest.id,
        workspaceId: '11111111-1111-4111-8111-111111111111',
        source: 'http',
      }}
      focusEntityId={props.focusEntityId}
      sprites={state.sprites ?? []}
      actorsById={Object.fromEntries((state.actors ?? []).map((actor) => [actor.id, actor]))}
      leaderSpriteId={undefined}
      assetBase={props.legal.assetBase}
      assetCatalog={state.assetCatalog}
      assetReader={props.reader}
      projectMaps={state.maps ?? {}}
      mapIndex={state.mapIndex}
      tilesets={state.tilesets ?? []}
      locale={state.locale ?? {}}
      playback={props.playback}
      hint={props.hint}
      sceneFraming={props.sceneFraming}
    />
  )
}

export async function mountPreviewCanvas(
  legal: LegalProject,
  input: {
    scene?: SceneDef
    stages?: readonly ScriptStage[]
    sourceKey?: string
    focusEntityId?: string
    source?: FileSource
    hint?: string
    sceneFraming?: boolean
  } = {},
): Promise<MountedPreviewCanvas> {
  const host = document.createElement('div')
  host.style.width = '640px'
  host.style.height = '480px'
  document.body.append(host)
  const root = createRoot(host)
  const scene = structuredClone(input.scene ?? legal.state.scenes![0]!)
  const playback = new Playback(scene)
  const reader = createEditorAssetReader(input.source ?? legal.source, () => legal.state)
  await act(async () => {
    root.render(
      <Harness
        legal={legal}
        scene={scene}
        stages={input.stages ?? []}
        sourceKey={input.sourceKey ?? `scene:${scene.id}:c06`}
        focusEntityId={input.focusEntityId}
        playback={playback}
        reader={reader}
        hint={input.hint}
        sceneFraming={input.sceneFraming}
      />,
    )
    await Promise.resolve()
  })
  return {
    legal,
    sessionPlayback: playback,
    reader,
    host,
    root,
    scene,
    canvas: () => {
      const canvas = host.querySelector<HTMLCanvasElement>('canvas.preview-canvas--interactive')
      if (!canvas) throw new Error('PreviewCanvas 主画布未挂载')
      return canvas
    },
  }
}

export async function unmountPreviewCanvas(mounted: MountedPreviewCanvas): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}

export async function pumpPreviewRaf(times = 4): Promise<void> {
  for (let step = 0; step < times; step++) {
    await act(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    })
  }
}
