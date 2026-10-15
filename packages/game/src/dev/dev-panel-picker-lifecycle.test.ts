/** CODE81 — picker-owned observer/thumbnail work must obey the picker lifetime. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeRole } from '../__tests__/coverage85-glm-game/harness.js'
import { SceneAssetsCache } from '../assets/loader.js'
import { createInitialGameState, hydratePlayerRolesRuntime } from '../core/game-state.js'
import type { DevPanelDeps, SceneJump } from './dev-panel.js'
import { setupDevPanel } from './dev-panel.js'
import sceneJumpsData from './fixtures/scene-jumps.json' with { type: 'json' }

const thumbnailUrl = 'data:image/png;base64,iVBORw0KGgo='

type ListenerCall = Parameters<typeof window.addEventListener>

let listenerCalls: ListenerCall[] = []

class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = []
  readonly root: Element | Document | null
  readonly rootMargin: string
  readonly scrollMargin = ''
  readonly thresholds: readonly number[]
  readonly observed = new Set<Element>()
  disconnectCalls = 0

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.root = options?.root ?? null
    this.rootMargin = options?.rootMargin ?? ''
    this.thresholds = Array.isArray(options?.threshold)
      ? options.threshold
      : [options?.threshold ?? 0]
    FakeIntersectionObserver.instances.push(this)
  }

  observe(target: Element): void {
    this.observed.add(target)
  }

  unobserve(target: Element): void {
    this.observed.delete(target)
  }

  disconnect(): void {
    this.disconnectCalls++
    this.observed.clear()
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  emit(target: Element): void {
    // Deliberately deliver even after disconnect: this models a queued browser
    // callback and makes the generation/closed guards observable.
    const rect = target.getBoundingClientRect()
    const entry = {
      boundingClientRect: rect,
      intersectionRatio: 1,
      intersectionRect: rect,
      isIntersecting: true,
      rootBounds: null,
      target,
      time: 0,
    } satisfies IntersectionObserverEntry
    this.callback([entry], this)
  }
}

function fixtureJump(sceneId: number): SceneJump {
  const jump = sceneJumpsData.jumps.find((entry) => entry.sceneId === sceneId)
  if (!jump) throw new Error(`scene fixture missing: ${sceneId}`)
  return jump
}

function makeDeps(
  jumps: SceneJump[],
  renderSceneThumbnail: DevPanelDeps['renderSceneThumbnail'],
): DevPanelDeps {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  const playerRoles = {
    roles: Array.from({ length: 6 }, (_, id) => makeRole(id)),
  }
  hydratePlayerRolesRuntime(gs.PlayerRolesRuntime, playerRoles)
  return {
    gs,
    fixtures: { fixtures: [] },
    sceneJumps: { jumps },
    sceneAssetsCache: new SceneAssetsCache(() => Promise.reject(new Error('scene load not used'))),
    renderSceneThumbnail,
    resources: {
      enemies: [],
      enemyObjects: [],
      enemyTeams: [],
      battleFields: [],
      playerRoles,
      levelUpExp: [],
      levelUpMagic: [],
      items: [],
      spells: [],
      magics: [],
      objectMagics: [],
      objectPoisons: [],
      objectPlayers: [],
      commands: [],
      enemyPos: { layouts: [] },
      battleEffectIndex: [],
      magicSpriteFrameCounts: new Map(),
    },
  }
}

function openSceneTab(deps: DevPanelDeps): HTMLElement {
  deps.gs.mode = 'explore'
  const listenerSpy = vi.spyOn(window, 'addEventListener')
  setupDevPanel(deps)
  listenerCalls.push(...listenerSpy.mock.calls)
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true }))
  const panel = document.querySelector<HTMLElement>('.tp-dev-panel')
  if (!panel) throw new Error('picker did not open')
  const tab = Array.from(panel.querySelectorAll<HTMLButtonElement>('.tp-dev-tab')).find((button) =>
    button.textContent?.includes('场景'),
  )
  if (!tab) throw new Error('scene tab missing')
  tab.click()
  const sceneList = Array.from(panel.querySelectorAll<HTMLElement>('div')).find(
    (element) =>
      element.style.gridTemplateColumns.includes('repeat(3') && element.style.maxHeight === '360px',
  )
  if (!sceneList) throw new Error('scene list missing')
  return sceneList
}

function closePicker(): void {
  document.querySelector<HTMLButtonElement>('.tp-dev-panel button[title="Close (Esc)"]')?.click()
}

afterEach(() => {
  closePicker()
  for (const [type, listener, options] of listenerCalls)
    window.removeEventListener(type, listener, options)
  listenerCalls = []
  document.querySelector<HTMLElement>('.tp-dev-panel')?.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  FakeIntersectionObserver.instances = []
})

describe('Dev Panel picker lifecycle', () => {
  it('disconnects on close, fences queued work, and reuses a successful cache entry', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    let resolveThumbnail!: (value: string | null) => void
    const deferred = new Promise<string | null>((resolve) => {
      resolveThumbnail = resolve
    })
    const render = vi.fn(() => deferred)
    const deps = makeDeps([fixtureJump(1), fixtureJump(2)], render)

    const sceneList = openSceneTab(deps)
    const oldCard = sceneList.firstElementChild
    if (!oldCard) throw new Error('scene card missing')
    const oldImage = oldCard.querySelector<HTMLImageElement>('img')
    if (!oldImage) throw new Error('thumbnail image missing')
    const oldObserver = FakeIntersectionObserver.instances.at(-1)
    if (!oldObserver) throw new Error('observer missing')
    expect(oldObserver.root).toBe(sceneList)
    expect(oldObserver.rootMargin).toBe('150px')

    oldObserver.emit(oldCard)
    expect(render).toHaveBeenCalledWith(1, 12)
    closePicker()
    expect(oldObserver.disconnectCalls).toBe(1)
    oldObserver.emit(oldCard)
    expect(render).toHaveBeenCalledOnce()

    resolveThumbnail(thumbnailUrl)
    await Promise.resolve()
    expect(oldImage.style.display).toBe('none')

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true }))
    const reopenedPanel = document.querySelector<HTMLElement>('.tp-dev-panel')
    if (!reopenedPanel) throw new Error('picker did not reopen')
    const reopenedTab = Array.from(
      reopenedPanel.querySelectorAll<HTMLButtonElement>('.tp-dev-tab'),
    ).find((button) => button.textContent?.includes('场景'))
    if (!reopenedTab) throw new Error('scene tab missing after reopen')
    reopenedTab.click()
    const reopenedList = Array.from(reopenedPanel.querySelectorAll<HTMLElement>('div')).find(
      (element) =>
        element.style.gridTemplateColumns.includes('repeat(3') &&
        element.style.maxHeight === '360px',
    )
    if (!reopenedList) throw new Error('scene list missing after reopen')
    const reopenedCard = reopenedList.firstElementChild
    if (!reopenedCard) throw new Error('reopened scene card missing')
    const reopenedImage = reopenedCard.querySelector<HTMLImageElement>('img')
    if (!reopenedImage) throw new Error('reopened thumbnail image missing')
    const reopenedObserver = FakeIntersectionObserver.instances.at(-1)
    if (!reopenedObserver) throw new Error('reopened observer missing')
    reopenedObserver.emit(reopenedCard)
    expect(render).toHaveBeenCalledOnce()
    expect(reopenedImage.style.display).toBe('block')
    expect(reopenedImage.src).toContain(thumbnailUrl)
  })

  it('disconnects a filtered generation and ignores its late fulfillment', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    let resolveOld!: (value: string | null) => void
    const oldResult = new Promise<string | null>((resolve) => {
      resolveOld = resolve
    })
    const render = vi.fn((sceneId: number) =>
      sceneId === 3 ? oldResult : Promise.resolve(thumbnailUrl),
    )
    const deps = makeDeps([fixtureJump(3), fixtureJump(9)], render)

    const sceneList = openSceneTab(deps)
    const oldCard = sceneList.firstElementChild
    if (!oldCard) throw new Error('scene card missing')
    const oldImage = oldCard.querySelector<HTMLImageElement>('img')
    if (!oldImage) throw new Error('old thumbnail image missing')
    const oldObserver = FakeIntersectionObserver.instances.at(-1)
    if (!oldObserver) throw new Error('old observer missing')
    oldObserver.emit(oldCard)

    const filter = document.querySelector<HTMLInputElement>(
      '.tp-dev-panel input[placeholder*="场景 id"]',
    )
    if (!filter) throw new Error('scene filter missing')
    filter.value = '13'
    filter.dispatchEvent(new Event('input', { bubbles: true }))
    expect(oldObserver.disconnectCalls).toBe(1)
    oldObserver.emit(oldCard)
    expect(render).toHaveBeenCalledOnce()

    const currentObserver = FakeIntersectionObserver.instances.at(-1)
    if (!currentObserver || currentObserver === oldObserver) throw new Error('new observer missing')
    const currentCard = sceneList.firstElementChild
    if (!currentCard) throw new Error('filtered scene card missing')
    currentObserver.emit(currentCard)
    resolveOld(thumbnailUrl)
    await Promise.resolve()
    await Promise.resolve()
    expect(oldImage.style.display).toBe('none')
    expect(render).toHaveBeenCalledWith(9, 13)
    const currentImage = currentCard.querySelector<HTMLImageElement>('img')
    if (!currentImage) throw new Error('filtered thumbnail image missing')
    await Promise.resolve()
    expect(currentImage.style.display).toBe('block')
  })

  it('keeps the existing map placeholder for a renderer with no result', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    const render = vi.fn(() => Promise.resolve(null))
    const deps = makeDeps([fixtureJump(4)], render)
    const sceneList = openSceneTab(deps)
    const card = sceneList.firstElementChild
    if (!card) throw new Error('scene card missing')
    const observer = FakeIntersectionObserver.instances.at(-1)
    if (!observer) throw new Error('observer missing')
    const placeholder = card.querySelector<HTMLElement>('[data-ph]')
    if (!placeholder) throw new Error('thumbnail placeholder missing')
    observer.emit(card)
    await Promise.resolve()
    await Promise.resolve()
    expect(render).toHaveBeenCalledWith(4, 1)
    expect(placeholder.textContent).toBe('map 1')
  })

  it('loads through the direct fallback when IntersectionObserver is unavailable', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const render = vi.fn(() => Promise.resolve(thumbnailUrl))
    const deps = makeDeps([fixtureJump(5)], render)
    const sceneList = openSceneTab(deps)
    const card = sceneList.firstElementChild
    if (!card) throw new Error('scene card missing')
    await Promise.resolve()
    await Promise.resolve()
    expect(render).toHaveBeenCalledWith(5, 2)
    const image = card.querySelector<HTMLImageElement>('img')
    if (!image) throw new Error('thumbnail image missing')
    expect(image.style.display).toBe('block')
  })

  it('converts an injected callback rejection into the existing placeholder state', async () => {
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver)
    const render = vi.fn(() => Promise.reject(new Error('injected renderer failure')))
    const deps = makeDeps([fixtureJump(6)], render)
    const sceneList = openSceneTab(deps)
    const card = sceneList.firstElementChild
    if (!card) throw new Error('scene card missing')
    const observer = FakeIntersectionObserver.instances.at(-1)
    if (!observer) throw new Error('observer missing')
    observer.emit(card)
    await Promise.resolve()
    await Promise.resolve()
    const placeholder = card.querySelector<HTMLElement>('[data-ph]')
    if (!placeholder) throw new Error('thumbnail placeholder missing')
    expect(placeholder.textContent).toBe('map 4')
  })
})
