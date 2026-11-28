import type { AssetBase } from '@type-pal/reforge'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BattleSpriteUploader } from '../ui/BattleSpriteUploader.js'
import { unmountHost } from './react-host-cleanup.js'

export interface MountedUploader {
  host: HTMLDivElement
  root: Root
  applies: Array<{ blob: ArrayBuffer; frameCount: number }>
  cancels: number[]
  setAssetBase(next: AssetBase): Promise<void>
}

interface UploaderController {
  setBase?: (next: AssetBase) => void
}

function UploaderHarness(props: {
  initial: AssetBase
  controller: UploaderController
  onApply: (blob: ArrayBuffer, frameCount: number) => void | Promise<void>
  onCancel: () => void
}) {
  const [base, setBase] = useState(props.initial)
  props.controller.setBase = setBase
  return <BattleSpriteUploader assetBase={base} onApply={props.onApply} onCancel={props.onCancel} />
}

export async function mountUploader(
  assetBase: AssetBase,
  impl?: (blob: ArrayBuffer, frameCount: number) => void | Promise<void>,
): Promise<MountedUploader> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const applies: MountedUploader['applies'] = []
  const cancels: number[] = []
  const controller: UploaderController = {}
  const onApply = (blob: ArrayBuffer, frameCount: number): void | Promise<void> => {
    applies.push({ blob, frameCount })
    return impl?.(blob, frameCount)
  }
  try {
    await act(async () => {
      root.render(
        <UploaderHarness
          initial={assetBase}
          controller={controller}
          onApply={onApply}
          onCancel={() => cancels.push(Date.now())}
        />,
      )
    })
  } catch (reason) {
    await unmountHost({ host, root })
    throw reason
  }
  return {
    host,
    root,
    applies,
    cancels,
    async setAssetBase(next) {
      await act(async () => controller.setBase?.(next))
    },
  }
}
