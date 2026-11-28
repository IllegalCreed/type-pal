import type { AssetBase } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { type EditorState, EditSession } from '../core/edit-session.js'
import { SpriteUploadWizard } from '../ui/SpriteUploadWizard.js'
import { unmountHost } from './react-host-cleanup.js'
import { PaletteReadObserver } from './sprite-palette-read-observer.js'

export interface WizardScope {
  session: EditSession
  assetBase: AssetBase
}

export interface MountedWizard {
  host: HTMLDivElement
  root: Root
  scope: WizardScope
  /** onDone 回调实参按序记录（含 null）。 */
  done: Array<string | null>
  restoreResourceObservers(): void
  /** 受控宿主：换 scope（等价外壳换项目/会话）。 */
  setScope(next: WizardScope, waitForPalette?: boolean): Promise<void>
  /** 受控宿主：写入 sprites prop 的覆盖（模拟宿主传入过期 sprites 列表）。 */
  setSpritesOverride(next: WizardSpritesOverride): Promise<void>
}

export type WizardSpritesOverride = 'live' | 'empty'

interface WizardController {
  setScope?: (next: WizardScope) => void
  setOverride?: (next: WizardSpritesOverride) => void
}

const wizardPaletteWaiters = new WeakMap<HTMLElement, () => Promise<void>>()

/** Wait for the current scope's actual role read, preserving intentional pending IO. */
export async function waitForWizardPalette(host: HTMLElement): Promise<void> {
  const wait = wizardPaletteWaiters.get(host)
  if (!wait) throw new Error('SpriteUploadWizard host is not mounted')
  await wait()
}

function WizardHarness(props: {
  initial: WizardScope
  done: Array<string | null>
  controller: WizardController
}) {
  const [scope, setScope] = useState(props.initial)
  const [override, setOverride] = useState<WizardSpritesOverride>('live')
  props.controller.setScope = setScope
  props.controller.setOverride = setOverride
  useSyncExternalStore(
    (callback) => scope.session.subscribe(callback),
    () => scope.session.getVersion(),
  )
  return (
    <SpriteUploadWizard
      sprites={override === 'empty' ? [] : [...scope.session.getState().sprites]}
      assetBase={scope.assetBase}
      session={scope.session}
      onDone={(id) => props.done.push(id)}
    />
  )
}

export async function mountWizard(
  project: { state: EditorState; assetBase: AssetBase },
  input: { assetBase?: AssetBase; session?: EditSession; waitForPalette?: boolean } = {},
): Promise<MountedWizard> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const done: Array<string | null> = []
  const controller: WizardController = {}
  const scope: WizardScope = {
    session: input.session ?? new EditSession(project.state),
    assetBase: input.assetBase ?? project.assetBase,
  }
  const observations = new WeakMap<AssetBase, { base: AssetBase; reads: Promise<string>[] }>()
  let paletteReads: Promise<string>[] = []
  const observedScope = (next: WizardScope): WizardScope => {
    let observed = observations.get(next.assetBase)
    if (!observed) {
      const resolver = new PaletteReadObserver(next.assetBase)
      observed = { base: { ...next.assetBase, assetResolver: resolver }, reads: resolver.reads }
      observations.set(next.assetBase, observed)
    }
    paletteReads = observed.reads
    return { ...next, assetBase: observed.base }
  }
  const initial = observedScope(scope)
  const restoreResourceObservers = () => wizardPaletteWaiters.delete(host)
  wizardPaletteWaiters.set(host, async () => {
    await act(async () => {
      // The component owns error presentation; failure tests must still assert its UI.
      await Promise.allSettled(paletteReads)
    })
  })
  try {
    await act(async () => {
      root.render(<WizardHarness initial={initial} done={done} controller={controller} />)
    })
    if (input.waitForPalette !== false) await waitForWizardPalette(host)
  } catch (reason) {
    await unmountHost({ host, root, restoreResourceObservers })
    throw reason
  }
  const mounted: MountedWizard = {
    host,
    root,
    scope,
    done,
    restoreResourceObservers,
    async setScope(next, waitForPalette = true) {
      mounted.scope = next
      await act(async () => {
        controller.setScope?.(observedScope(next))
      })
      if (waitForPalette) await waitForWizardPalette(host)
    },
    async setSpritesOverride(next) {
      await act(async () => controller.setOverride?.(next))
    },
  }
  return mounted
}
