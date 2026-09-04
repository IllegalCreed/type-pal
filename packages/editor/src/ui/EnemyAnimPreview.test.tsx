// @vitest-environment jsdom

import type { BattleSpriteDef, EnemyDef } from '@type-pal/content'
import type { RleFrame } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { catalogControlsEditorState } from './catalog-controls-test-utils.js'
import { EnemyAnimPreview } from './EnemyAnimPreview.js'

const mocks = vi.hoisted(() => ({
  loadDefinition: vi.fn(),
  loadPalette: vi.fn(),
  bakeFrame: vi.fn(),
}))

vi.mock('@type-pal/reforge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@type-pal/reforge')>()),
  BattleSpriteAssetCache: class {},
  loadBattleSpriteDefinition: mocks.loadDefinition,
  loadStandardPalette: mocks.loadPalette,
  bakeFrame: mocks.bakeFrame,
}))

const sha256 = 'b'.repeat(64)
const definition: BattleSpriteDef = {
  id: 'battle.enemy.test',
  label: '测试敌人',
  asset: 'battle-sprite.test.enemy',
  profile: {
    kind: 'enemy',
    idle: { start: 0, count: 1 },
    magic: { start: 1, count: 0 },
    attack: { start: 1, count: 0 },
    idleTicksPerFrame: 1,
    actTicksPerFrame: 0,
  },
}
const enemy: EnemyDef = {
  id: 'enemy.test',
  name: 'enemy.test.name',
  battleSprite: definition.id,
  yPosOffset: 0,
  stats: {} as never,
  ai: {} as never,
  sounds: {} as never,
}

function frame(): RleFrame {
  return {
    width: 1,
    height: 1,
    pixels: new Uint8Array(1),
    opaque: new Uint8Array(1),
  }
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('EnemyAnimPreview field commit boundary', () => {
  let host: HTMLDivElement
  let root: Root
  let contextSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    contextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      imageSmoothingEnabled: true,
    } as unknown as CanvasRenderingContext2D)
    mocks.loadDefinition.mockReset().mockResolvedValue({ sprite: { frames: [frame()] } })
    mocks.loadPalette.mockReset().mockResolvedValue({ colors: [], cycles: [] })
    mocks.bakeFrame.mockReset().mockImplementation(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      return canvas
    })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    contextSpy.mockRestore()
    host.remove()
  })

  test('dispatch noop resyncs, while a later valid edit commits once and supports undo/redo', async () => {
    const state = catalogControlsEditorState({
      version: 1,
      assets: {
        [definition.asset]: {
          kind: 'battle-sprite',
          path: 'assets/authored/battle-sprites/enemy.rle',
          mediaType: 'application/vnd.type-pal.rle',
          bytes: 8,
          sha256,
          origin: { kind: 'authored' },
        },
      },
    })
    state.enemies = [enemy]
    state.battleSprites = []
    const session = new EditSession(state)
    const reader = {
      projectId: state.manifest.id,
      record: () => state.assetCatalog.assets[definition.asset]!,
      readBytes: async () => new ArrayBuffer(0),
      readRoleBytes: async () => new ArrayBuffer(0),
      urlFor: async () => '',
    }

    function Harness() {
      useSyncExternalStore(
        (listener) => session.subscribe(listener),
        () => session.getVersion(),
      )
      const current = session.getState()
      const referenceIndex = collectCurrentProjectReferenceIndex(current)
      return (
        <EnemyAnimPreview
          enemy={current.enemies?.[0] ?? enemy}
          definitions={current.battleSprites.length ? current.battleSprites : [definition]}
          assetBase={{} as never}
          assetReader={reader}
          session={session}
          referenceIndex={referenceIndex}
          referenceStatus="current"
          getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
        />
      )
    }

    await act(async () => root.render(<Harness />))
    await act(async () => Promise.resolve())
    const speed = host.querySelector<HTMLInputElement>('input[id$="-idle-speed"]')!
    expect(speed.disabled).toBe(false)

    await act(async () => speed.focus())
    for (let index = 0; index < 100; index++) await input(speed, String(index + 2))
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => speed.blur())
    expect(session.getHistoryVersion()).toBe(0)
    expect(speed.value).toBe('1')
    expect(host.textContent).toContain('战斗精灵定义已变化')

    const beforeAdd = session.getState()
    await act(async () => {
      session.dispatch({
        label: '补入战斗精灵定义',
        apply: (current) => ({
          ...current,
          battleSprites: [...current.battleSprites, definition],
        }),
        invert: () => beforeAdd,
      })
    })
    const beforeCommit = session.getHistoryVersion()
    await act(async () => speed.focus())
    await input(speed, '4')
    await act(async () => {
      speed.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      )
    })
    await act(async () => speed.blur())
    expect(session.getHistoryVersion()).toBe(beforeCommit + 1)
    expect(session.getState().battleSprites[0]?.profile).toMatchObject({ idleTicksPerFrame: 4 })

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(speed.value).toBe('1')
    await act(async () => {
      expect(session.redo()).toBe(true)
    })
    expect(speed.value).toBe('4')
  })
})
