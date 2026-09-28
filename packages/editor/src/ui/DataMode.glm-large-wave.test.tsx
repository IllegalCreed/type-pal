// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A03（DataMode 对）：数据页路由的委派合同。
 * 去重：DataMode.glm-ui-wave 已证 scripts 空态、events 页、敌人试打与战斗域深链；
 * item-alchemy 已证双炼化页。本文件只补：scripts 页带真实 canonical 脚本会话时挂载
 * 可复用脚本目录、sprite 域切换回调的世界/战斗 id 与视图回退（含无 onSpriteLocation 的
 * onObjectFocus 兜底）、shop 页 isProjectDirty 对主会话与脚本会话脏态的合成。
 * 库组件仅做 props 探针替身；项目、会话与命令全部真实。
 */
import type { ComponentProps } from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AddAmbienceCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import {
  AddSharedScriptCommand,
  type ScriptEditorState,
  ScriptEditSession,
} from '../core/script-editor.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { DataMode } from './DataMode.js'

const probes = vi.hoisted(() => ({
  world: [] as Array<Record<string, unknown>>,
  battle: [] as Array<Record<string, unknown>>,
  shop: [] as Array<Record<string, unknown>>,
}))

vi.mock('./WorldSpriteLibrary.js', () => ({
  WorldSpriteLibrary: (props: Record<string, unknown>) => {
    probes.world.push(props)
    return <div data-testid="world-library" />
  },
}))
vi.mock('./BattleSpriteLibrary.js', () => ({
  BattleSpriteLibrary: (props: Record<string, unknown>) => {
    probes.battle.push(props)
    return <div data-testid="battle-library" />
  },
}))
vi.mock('./ShopTab.js', () => ({
  ShopTab: (props: Record<string, unknown>) => {
    probes.shop.push(props)
    return <div data-testid="shop-tab" />
  },
}))

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  await stubNodeTestHost()
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

const scriptState: ScriptEditorState = {
  scenes: [],
  items: [],
  sharedScripts: {
    'shared/user/chest': { name: '开宝箱', self: 'none', body: [] },
  },
}

async function baseProps(): Promise<
  Omit<ComponentProps<typeof DataMode>, 'tab' | 'session' | 'script'>
> {
  const { state } = await loadLegalUiProject('glm-large-wave-datamode')
  return {
    playIdentity: {
      projectId: 'test',
      workspaceId: '11111111-1111-4111-8111-111111111111',
      source: 'http',
    },
    sprites: state.sprites ?? [],
    battleSprites: state.battleSprites ?? [],
    skills: {},
    itemList: state.items ?? [],
    locale: state.locale ?? {},
    assetBase: {} as never,
    enemies: state.enemies ?? [],
    enemyTeams: state.enemyTeams ?? [],
    assetCatalog: state.assetCatalog,
    assetReader: {} as never,
    audioResolver: {} as never,
    tilesets: state.tilesets ?? [],
    tilesetBlobs: state.tilesetBlobs ?? {},
    stamps: state.stamps ?? [],
    mapIndex: state.mapIndex,
    battleFields: state.battleFields ?? [],
    poisons: state.poisons ?? [],
    ambiences: state.ambiences ?? [],
    shops: state.shops ?? [],
    skillList: state.skills ?? [],
    scenes: state.scenes ?? [],
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
    projectReferenceStatus: 'current',
    getCurrentProjectReferenceIndex: undefined as never,
    onOpenProjectReference: vi.fn(),
    actors: [],
    onJumpToEvent: vi.fn(),
    tabBar: <div data-testid="tab-bar" />,
  }
}

describe('A03 DataMode 委派', () => {
  test('scripts 页在真实脚本会话下挂载可复用脚本目录与工作区', async () => {
    const session = new EditSession((await loadLegalUiProject('glm-large-wave-scripts')).state)
    await act(async () =>
      root.render(
        <DataMode
          {...(await baseProps())}
          tab="scripts"
          session={session}
          script={{
            state: scriptState,
            session: new ScriptEditSession(scriptState),
          }}
        />,
      ),
    )
    expect(host.querySelector('[data-testid="tab-bar"]')).not.toBeNull()
    expect(host.textContent).toContain('开宝箱')
    expect(host.textContent).toContain('shared/user/chest')
    expect(host.textContent).not.toContain('无法加载可复用脚本')
  })

  test('sprite 战斗域切回世界域时回退到首个定义与 definition 视图', async () => {
    const onSpriteLocation = vi.fn()
    const props = await baseProps()
    const battleFirst = props.battleSprites[0]?.id
    const worldFirst = props.sprites[0]?.id
    expect(battleFirst, 'fixture requires battle sprites').toBeDefined()
    expect(worldFirst, 'fixture requires world sprites').toBeDefined()
    await act(async () =>
      root.render(
        <DataMode
          {...props}
          tab="sprite"
          session={new EditSession((await loadLegalUiProject('glm-large-wave-sprite')).state)}
          onSpriteLocation={onSpriteLocation}
        />,
      ),
    )
    expect(host.querySelector('[data-testid="world-library"]')).not.toBeNull()
    const worldProps = probes.world.at(-1)! as { onBattleDomain: () => void }
    worldProps.onBattleDomain()
    expect(onSpriteLocation).toHaveBeenCalledWith('battle', 'definition', battleFirst)
    await act(async () => {})
    const battleProps = probes.battle.at(-1)! as { onWorldDomain: () => void }
    battleProps.onWorldDomain()
    expect(onSpriteLocation).toHaveBeenLastCalledWith('world', 'definition', worldFirst)
  })

  test('sprite 域切换在无 onSpriteLocation 时兜底 onObjectFocus', async () => {
    const onObjectFocus = vi.fn()
    await act(async () =>
      root.render(
        <DataMode
          {...(await baseProps())}
          tab="sprite"
          session={new EditSession((await loadLegalUiProject('glm-large-wave-focus')).state)}
          onObjectFocus={onObjectFocus}
        />,
      ),
    )
    const worldProps = probes.world.at(-1)! as { onBattleDomain: () => void }
    await act(async () => worldProps.onBattleDomain())
    expect(onObjectFocus).toHaveBeenCalledWith(expect.any(String))
  })

  test('shop 页 isProjectDirty 合成主会话与脚本会话脏态', async () => {
    const session = new EditSession((await loadLegalUiProject('glm-large-wave-shop')).state)
    const scriptSession = new ScriptEditSession(scriptState)
    await act(async () =>
      root.render(
        <DataMode
          {...(await baseProps())}
          tab="shop"
          session={session}
          script={{ state: scriptState, session: scriptSession }}
        />,
      ),
    )
    const shopProps = probes.shop.at(-1)! as { isProjectDirty: () => boolean }
    expect(shopProps.isProjectDirty()).toBe(false)
    scriptSession.dispatch(
      new AddSharedScriptCommand('shared/user/more', { name: '追加', self: 'none', body: [] }),
    )
    expect(shopProps.isProjectDirty()).toBe(true)

    const fresh = new EditSession((await loadLegalUiProject('glm-large-wave-shop')).state)
    await act(async () =>
      root.render(
        <DataMode
          {...(await baseProps())}
          tab="shop"
          session={fresh}
          script={{ state: scriptState, session: new ScriptEditSession(scriptState) }}
        />,
      ),
    )
    const freshShopProps = probes.shop.at(-1)! as { isProjectDirty: () => boolean }
    fresh.dispatch(new AddAmbienceCommand('dusk', '黄昏'))
    expect(freshShopProps.isProjectDirty()).toBe(true)
    expect(fresh.isDirty()).toBe(true)
  })
})
