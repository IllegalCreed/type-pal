// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-UI-WAVE-1 U4c：DataMode 残差。
 * 去重：DataMode.item-alchemy.test.tsx 已证双炼化机制页挂载；editor-navigation/target 已证
 * 注册表与 URL 层；App 级测试 mock DataMode——本文件只补当前公开入口仍未证明的业务交互：
 * scripts 页无脚本会话的空态、sprite 页战斗域深链与跨域切换回调、敌人/技能试打回调整形、
 * events 页最小挂载。
 */
import type { BattleSpriteDef } from '@type-pal/content'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type EditorState, EditSession } from '../core/edit-session.js'
import {
  buildProjectReferenceSnapshot,
  createProjectReferenceIndex,
} from '../core/project-reference.js'
import { DataMode } from './DataMode.js'

const routeProbe = vi.hoisted(() => ({
  enemyProps: [] as Array<Record<string, unknown>>,
}))

vi.mock('./EnemyTab.js', () => ({
  EnemyTab: (props: Record<string, unknown>) => {
    routeProbe.enemyProps.push(props)
    return null
  },
}))
vi.mock('./WorldSpriteLibrary.js', () => ({
  WorldSpriteLibrary: (props: Record<string, unknown>) => {
    ;(globalThis as { __waveWorldProps?: unknown }).__waveWorldProps = props
    return <div data-testid="world-library" />
  },
}))
vi.mock('./BattleSpriteLibrary.js', () => ({
  BattleSpriteLibrary: () => <div data-testid="battle-library" />,
}))

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  routeProbe.enemyProps.length = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function baseProps(): Omit<ComponentProps<typeof DataMode>, 'tab' | 'focusObjectId'> {
  const session = new EditSession({
    items: [],
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
  } as unknown as EditorState)
  return {
    playIdentity: {
      projectId: 'test',
      workspaceId: '11111111-1111-4111-8111-111111111111',
      source: 'http',
    },
    sprites: [],
    battleSprites: [],
    skills: {},
    itemList: [],
    locale: {},
    assetBase: {} as never,
    session,
    enemies: [],
    enemyTeams: [],
    assetCatalog: { version: 1, assets: {} },
    assetReader: {} as never,
    audioResolver: {} as never,
    tilesets: [],
    tilesetBlobs: {},
    stamps: [],
    mapIndex: { version: 1, maps: [] },
    battleFields: [],
    poisons: [],
    ambiences: [],
    shops: [],
    skillList: [],
    scenes: [],
    manifest: {
      id: 'test',
      name: 'test',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 'scene-a',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    projectIssues: [],
    projectDiagnosticsStatus: 'current',
    projectReferenceIndex: createProjectReferenceIndex(buildProjectReferenceSnapshot([])),
    projectReferenceStatus: 'current',
    getCurrentProjectReferenceIndex: undefined as never,
    onOpenProjectReference: vi.fn(),
    actors: [],
    onJumpToEvent: vi.fn(),
    tabBar: <div data-testid="tab-bar" />,
  }
}

describe('U4c DataMode 残差', () => {
  test('scripts 页无脚本会话 → 明确空态而非崩溃', async () => {
    await act(async () => root.render(<DataMode {...baseProps()} tab="scripts" />))
    const alert = host.querySelector('[role="alert"]')
    expect(alert, 'scripts empty alert').not.toBeNull()
    expect(alert?.textContent).toContain('无法加载可复用脚本')
  })

  test('events 页最小挂载只消费 tabBar', async () => {
    await act(async () => root.render(<DataMode {...baseProps()} tab="events" />))
    expect(host.querySelector('[data-testid="tab-bar"]')).not.toBeNull()
  })

  test('敌人试打经 onBattleTrial 传出 {kind:"enemy", id}', async () => {
    const onBattleTrial = vi.fn()
    await act(async () =>
      root.render(<DataMode {...baseProps()} tab="enemy" onBattleTrial={onBattleTrial} />),
    )
    expect(routeProbe.enemyProps.length).toBeGreaterThan(0)
    const onTrial = routeProbe.enemyProps.at(-1)!.onTrial as (id: string) => void
    onTrial('enemy-a')
    expect(onBattleTrial).toHaveBeenCalledWith({ kind: 'enemy', id: 'enemy-a' })
  })

  test('sprite 页战斗域深链挂载战斗精灵库，跨域切换传出 onSpriteLocation', async () => {
    const battleSprites: BattleSpriteDef[] = [
      {
        id: 'fighter-x',
        label: '战斗精灵甲',
        asset: 'battle-sprite.x',
        profile: {
          kind: 'enemy',
          idle: { start: 0, count: 1 },
          magic: { start: 1, count: 0 },
          attack: { start: 1, count: 0 },
          idleTicksPerFrame: 1,
          actTicksPerFrame: 0,
        },
      },
    ]
    const onSpriteLocation = vi.fn()
    await act(async () =>
      root.render(
        <DataMode
          {...baseProps()}
          tab="sprite"
          focusObjectId="fighter-x"
          battleSprites={battleSprites}
          onSpriteLocation={onSpriteLocation}
        />,
      ),
    )
    expect(host.querySelector('[data-testid="battle-library"]')).not.toBeNull()
    const worldProps = (globalThis as { __waveWorldProps?: Record<string, unknown> })
      .__waveWorldProps as { onBattleDomain?: () => void } | undefined
    expect(worldProps, 'world library not mounted').toBeUndefined()
  })
})
