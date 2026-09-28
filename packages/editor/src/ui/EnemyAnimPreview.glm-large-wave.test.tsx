// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A06（EnemyAnimPreview 对）：加载失败面与在途换选归属。
 * 去重：EnemyAnimPreview.test 已证 noop 重同步、有效编辑一次提交与 undo/redo。
 * 本文件只补：定义缺失/资产记录缺失的可见失败、动作模式提示（无施法帧/0 tick 末帧）、
 * 在途换定义时旧加载不得以旧帧数覆盖新选（asset+sha 双重归属门）。
 * 资产 IO 走端口替身（延迟可控的 loader），与既有夹具同界；会话与命令真实。
 */
import type { BattleSpriteDef, EnemyDef } from '@type-pal/content'
import type { RleFrame } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
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

const sha256 = 'c'.repeat(64)

function definition(id: string, asset: string): BattleSpriteDef {
  return {
    id,
    label: id,
    asset,
    profile: {
      kind: 'enemy',
      idle: { start: 0, count: 1 },
      magic: { start: 1, count: 0 },
      attack: { start: 1, count: 0 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 0,
    },
  }
}

function enemyFor(battleSprite: string): EnemyDef {
  return {
    id: 'enemy.test',
    name: 'enemy.test.name',
    battleSprite,
    yPosOffset: 0,
    stats: {} as never,
    ai: {} as never,
    sounds: {} as never,
  }
}

function frame(count: number): RleFrame[] {
  return Array.from({ length: count }, () => ({
    width: 1,
    height: 1,
    pixels: new Uint8Array(1),
    opaque: new Uint8Array(1),
  }))
}

const first = definition('battle.enemy.a', 'battle-sprite.a')
const second = definition('battle.enemy.b', 'battle-sprite.b')

function harnessEnv() {
  const state = catalogControlsEditorState({
    version: 1,
    assets: {
      'battle-sprite.a': {
        kind: 'battle-sprite',
        path: 'assets/authored/battle-sprites/a.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: 8,
        sha256,
        origin: { kind: 'authored' },
      },
      'battle-sprite.b': {
        kind: 'battle-sprite',
        path: 'assets/authored/battle-sprites/b.rle',
        mediaType: 'application/vnd.type-pal.rle',
        bytes: 8,
        sha256: 'd'.repeat(64),
        origin: { kind: 'authored' },
      },
    },
  })
  const session = new EditSession(state)
  const reader = {
    projectId: state.manifest.id,
    record: (asset: string) => {
      const found = state.assetCatalog.assets[asset]
      if (!found) throw new Error(`asset 记录不存在: ${asset}`)
      return found
    },
    readBytes: async () => new ArrayBuffer(0),
    readRoleBytes: async () => new ArrayBuffer(0),
    urlFor: async () => '',
  }
  function Harness(props: { enemy: EnemyDef; definitions: BattleSpriteDef[] }) {
    useSyncExternalStore(
      (listener) => session.subscribe(listener),
      () => session.getVersion(),
    )
    return (
      <EnemyAnimPreview
        enemy={props.enemy}
        definitions={props.definitions}
        assetBase={{} as never}
        assetReader={reader}
        session={session}
        referenceIndex={undefined}
        referenceStatus="current"
        getCurrentReferenceIndex={() => {
          throw new Error('not used')
        }}
      />
    )
  }
  return { Harness, session, reader }
}

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  mocks.loadDefinition.mockReset()
  mocks.loadPalette.mockReset().mockResolvedValue({ colors: [], cycles: [] })
  mocks.bakeFrame.mockReset().mockImplementation(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

const frameTag = (): string =>
  [...host.querySelectorAll('.ds-tag')].map((tag) => tag.textContent).join(' ')

describe('A06 敌人动画预览', () => {
  test('定义缺失给出显式失败而不是空白画布', async () => {
    const { Harness } = harnessEnv()
    await act(async () =>
      root.render(<Harness enemy={enemyFor('battle.enemy.missing')} definitions={[first]} />),
    )
    await act(async () => Promise.resolve())
    const error = host.querySelector('.err')
    expect(error?.textContent).toContain(
      '战斗精灵定义“battle.enemy.missing”不存在或不是 enemy profile',
    )
    expect(error?.getAttribute('role')).toBe('status')
  })

  test('资产记录缺失给出 AssetId 修复上下文', async () => {
    const { Harness } = harnessEnv()
    const orphan = definition('battle.enemy.c', 'battle-sprite.missing')
    await act(async () =>
      root.render(<Harness enemy={enemyFor('battle.enemy.c')} definitions={[orphan]} />),
    )
    await act(async () => Promise.resolve())
    expect(mocks.loadDefinition).not.toHaveBeenCalled()
    expect(host.querySelector('.err')?.textContent).toContain('battle-sprite.missing')
    expect(host.querySelector('.err')?.textContent).toContain('不存在')
  })

  test('无施法帧与 0 tick 动作给出对应提示', async () => {
    const { Harness } = harnessEnv()
    mocks.loadDefinition.mockResolvedValue({ sprite: { frames: frame(2) } })
    await act(async () => root.render(<Harness enemy={enemyFor(first.id)} definitions={[first]} />))
    await act(async () => Promise.resolve())
    const modeButton = (label: string): HTMLButtonElement =>
      [...host.querySelectorAll<HTMLButtonElement>('.ea-modes button')].find(
        (button) => button.textContent === label,
      )!
    await act(async () => modeButton('施法').click())
    expect(host.textContent).toContain('（该定义无施法帧）')
    expect(host.textContent).toContain('（0 tick：瞬时显示该动作末帧）')
    await act(async () => modeButton('待机').click())
    expect(host.textContent).not.toContain('（该定义无施法帧）')
  })

  test('在途换定义时旧加载完成不得以旧帧数覆盖新选', async () => {
    const { Harness } = harnessEnv()
    let releaseFirst!: (value: { sprite: { frames: RleFrame[] } }) => void
    const firstLoad = new Promise<{ sprite: { frames: RleFrame[] } }>((done) => {
      releaseFirst = done
    })
    mocks.loadDefinition.mockImplementation((_cache, _reader, definitionArg) =>
      (definitionArg as BattleSpriteDef).id === first.id
        ? firstLoad
        : Promise.resolve({ sprite: { frames: frame(3) } }),
    )
    await act(async () =>
      root.render(<Harness enemy={enemyFor(first.id)} definitions={[first, second]} />),
    )
    await act(async () => Promise.resolve())
    expect(frameTag()).not.toContain('帧')
    await act(async () =>
      root.render(<Harness enemy={enemyFor(second.id)} definitions={[first, second]} />),
    )
    await act(async () => Promise.resolve())
    // 旧加载此刻才完成：其 2 帧结果不得覆盖 second 的 3 帧归属。
    releaseFirst({ sprite: { frames: frame(2) } })
    await act(async () => Promise.resolve())
    expect(frameTag()).toContain('3 帧')
  })
})
