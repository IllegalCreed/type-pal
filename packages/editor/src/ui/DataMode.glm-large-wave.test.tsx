// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A03（DataMode 对）：数据页路由的委派合同（R2 全真实挂载）。
 * 去重：DataMode.glm-ui-wave 已证 scripts 空态、events 页、敌人试打与战斗域深链；
 * item-alchemy 已证双炼化页。本文件只补：scripts 页带真实 canonical 脚本会话时的目录
 * 挂载、sprite 页经真实大世界/战斗精灵库域切换回调（含视图回退与 onObjectFocus 兜底）、
 * shop 页 isProjectDirty 对主会话与脚本会话脏态的真实合成显示。
 * 无任何组件替身：项目、会话、命令、资产端口与页内子组件全部真实；
 * 仅 Node 测试宿主桥（Blob/crypto）与 requestAnimationFrame 属硬件端口替身。
 */

import { validateShops } from '@type-pal/content'
import { act, type ComponentProps } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AddAmbienceCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  AddSharedScriptCommand,
  type ScriptEditorState,
  ScriptEditSession,
} from '../core/script-editor.js'
import { stubNodeTestHost } from './__tests__/glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { DataMode } from './DataMode.js'

let root: Root
let host: HTMLDivElement

beforeEach(async () => {
  await stubNodeTestHost()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
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

async function mounted(): Promise<{
  props: Omit<ComponentProps<typeof DataMode>, 'tab'>
  session: EditSession
  scriptSession: ScriptEditSession
}> {
  const legal = await loadLegalUiProject('glm-large-wave-datamode')
  const state = legal.state
  const session = new EditSession(state)
  const scriptSession = new ScriptEditSession(scriptState)
  const reader = createEditorAssetReader(legal.source, state)
  const props: Omit<ComponentProps<typeof DataMode>, 'tab'> = {
    playIdentity: {
      projectId: state.manifest.id,
      workspaceId: '11111111-1111-4111-8111-111111111111',
      source: 'http',
    },
    sprites: state.sprites ?? [],
    battleSprites: state.battleSprites ?? [],
    skills: {},
    itemList: state.items ?? [],
    locale: state.locale ?? {},
    assetBase: legal.assetBase,
    session,
    enemies: state.enemies ?? [],
    enemyTeams: state.enemyTeams ?? [],
    assetCatalog: state.assetCatalog,
    assetReader: reader,
    audioResolver: reader,
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
    manifest: state.manifest,
    projectIssues: [],
    projectDiagnosticsStatus: 'current',
    projectReferenceStatus: 'current',
    getCurrentProjectReferenceIndex: collectCurrentProjectReferenceIndex,
    onOpenProjectReference: vi.fn(),
    actors: [],
    onJumpToEvent: vi.fn(),
    tabBar: <div data-testid="tab-bar" />,
  }
  return { props, session, scriptSession }
}

async function rerender(props: ComponentProps<typeof DataMode>): Promise<void> {
  await act(async () => root.render(<DataMode {...props} />))
}

describe('A03 DataMode 委派（真实挂载）', () => {
  test('scripts 页在真实脚本会话下挂载可复用脚本目录与工作区', async () => {
    const { props, scriptSession } = await mounted()
    await rerender({
      ...props,
      tab: 'scripts',
      script: { state: scriptState, session: scriptSession },
    })
    expect(host.querySelector('[data-testid="tab-bar"]')).not.toBeNull()
    expect(host.textContent).toContain('开宝箱')
    expect(host.textContent).toContain('shared/user/chest')
    expect(host.textContent).not.toContain('无法加载可复用脚本')
  })

  test('sprite 页经真实大世界库切到战斗域，再切回世界域，回调带稳定 id', async () => {
    const { props } = await mounted()
    const battleFirst = props.battleSprites[0]?.id
    const worldFirst = props.sprites[0]?.id
    expect(battleFirst, 'fixture requires battle sprites').toBeDefined()
    expect(worldFirst, 'fixture requires world sprites').toBeDefined()
    const onSpriteLocation = vi.fn()
    await rerender({ ...props, tab: 'sprite', onSpriteLocation })
    expect(host.textContent).toContain('大世界精灵')
    const battleTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.trim() === '战斗',
    )
    expect(battleTab, 'world library exposes the battle domain tab').toBeDefined()
    await act(async () => battleTab!.click())
    expect(onSpriteLocation).toHaveBeenCalledWith('battle', 'definition', battleFirst)
    await act(async () => {})
    expect(host.textContent).toContain('战斗精灵')
    const worldTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.trim() === '大世界',
    )
    expect(worldTab, 'battle library exposes the world domain tab').toBeDefined()
    await act(async () => worldTab!.click())
    expect(onSpriteLocation).toHaveBeenLastCalledWith('world', 'definition', worldFirst)
  })

  test('sprite 域切换在无 onSpriteLocation 时兜底 onObjectFocus', async () => {
    const { props } = await mounted()
    const onObjectFocus = vi.fn()
    await rerender({ ...props, tab: 'sprite', onObjectFocus })
    const battleTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (candidate) => candidate.textContent?.trim() === '战斗',
    )
    await act(async () => battleTab!.click())
    expect(onObjectFocus).toHaveBeenCalledWith(expect.any(String))
  })

  test('shop 页经真实试买弹窗合成主会话与脚本会话脏态为保存提示', async () => {
    const { props, session, scriptSession } = await mounted()
    const shopProps = { ...props, shops: validateShops([{ id: 2, items: [] }]) }
    const renderShop = (): Promise<void> =>
      rerender({
        ...shopProps,
        tab: 'shop',
        script: { state: scriptState, session: scriptSession },
      })
    await renderShop()
    await act(async () => host.querySelector<HTMLButtonElement>('.ds-catalog-row')!.click())
    const trial = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent === '独立试买',
    )
    expect(trial, 'selected shop exposes the trial-buy action').toBeDefined()
    await act(async () => trial!.click())
    expect(host.textContent).not.toContain('请先保存项目，再试买。')
    scriptSession.dispatch(
      new AddSharedScriptCommand('shared/user/more', { name: '追加', self: 'none', body: [] }),
    )
    await renderShop()
    expect(host.textContent).toContain('请先保存项目，再试买。')
    scriptSession.markSaved()
    await renderShop()
    expect(host.textContent).not.toContain('请先保存项目，再试买。')
    session.dispatch(new AddAmbienceCommand('dusk', '黄昏'))
    await renderShop()
    expect(host.textContent).toContain('请先保存项目，再试买。')
  })
})
