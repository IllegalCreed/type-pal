// @vitest-environment jsdom
/**
 * TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1（DataMode）：本卡数据/战斗页的路由委派合同。
 * 去重（旧证据锚点）：
 * - DataMode.glm-ui-wave.test.tsx 已证 scripts 空态、events 页、敌人试打 {kind:"enemy"}、
 *   sprite 战斗域深链（EnemyTab/两库为路由探针替身）。
 * - DataMode.glm-large-wave.test.tsx 已证 scripts 真实挂载、sprite 域切换与 onObjectFocus
 *   兜底、shop 脏态合成。
 * - DataMode.item-alchemy.test.tsx 已证双炼化机制页挂载（手搓最小 state）。
 * - ConnectedEditorPages.test.tsx 的 tab="poison" 只探针 DataMode 本体，不构成页面证明。
 * 缺口（本文件）：battlefield/poison/enemy-team 三页从未被真实挂载证明——
 * 深链 focus 经路由下穿选中、目录选择经路由回报 onObjectFocus、复制战场经路由回报
 * 新副本 focus、敌队试打整形 {kind:"enemy-team"}、页面切换不残留前一页 DOM。
 * 全真实挂载（无组件替身）：项目/会话/命令/资产端口/页内组件全部真实。
 */
import { act, type ComponentProps } from 'react'
import type { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AddBattleFieldCommand, AddEnemyTeamCommand, AddPoisonCommand } from '../core/commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  buttonByText,
  catalogRowByTitle,
  createDataBattleHost,
  type DataBattleHost,
  destroyDataBattleHost,
  undoInAct,
} from './__tests__/glm-data-battle-kit.js'
import { loadLegalUiProject } from './__tests__/glm-ui-wave-kit.js'
import { DataMode } from './DataMode.js'

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(async () => {
  const mounted = await createDataBattleHost()
  host = mounted.host
  root = mounted.root
})

afterEach(async () => {
  await destroyDataBattleHost({ host, root } satisfies DataBattleHost)
})

/** 合法 blank 项目 + 本卡域实体真实命令播种（战场/毒/敌队）。 */
async function mountedProps(): Promise<{
  props: Omit<ComponentProps<typeof DataMode>, 'tab'>
  session: EditSession
}> {
  const legal = await loadLegalUiProject('glm-data-battle-datamode')
  let state = legal.state
  state = new AddBattleFieldCommand({
    id: 6,
    name: '云海',
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }).apply(state)
  state = new AddPoisonCommand(1, '赤蝎粉').apply(state)
  state = new AddPoisonCommand(2, '无影毒').apply(state)
  state = new AddEnemyTeamCommand({ id: 'team-c1', slots: [] }).apply(state)
  assertProjectSaveValid(state)
  const session = new EditSession(state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const snapshot = session.getState()
  const props: Omit<ComponentProps<typeof DataMode>, 'tab'> = {
    playIdentity: {
      projectId: snapshot.manifest.id,
      workspaceId: '11111111-1111-4111-8111-111111111111',
      source: 'http',
    },
    sprites: snapshot.sprites ?? [],
    battleSprites: snapshot.battleSprites ?? [],
    skills: {},
    itemList: snapshot.items ?? [],
    locale: snapshot.locale ?? {},
    assetBase: legal.assetBase,
    session,
    enemies: snapshot.enemies ?? [],
    enemyTeams: snapshot.enemyTeams ?? [],
    assetCatalog: snapshot.assetCatalog,
    assetReader: reader,
    audioResolver: reader,
    tilesets: snapshot.tilesets ?? [],
    tilesetBlobs: snapshot.tilesetBlobs ?? {},
    stamps: snapshot.stamps ?? [],
    mapIndex: snapshot.mapIndex,
    battleFields: snapshot.battleFields ?? [],
    poisons: snapshot.poisons ?? [],
    ambiences: snapshot.ambiences ?? [],
    shops: snapshot.shops ?? [],
    skillList: snapshot.skills ?? [],
    scenes: snapshot.scenes ?? [],
    manifest: snapshot.manifest,
    projectIssues: [],
    projectDiagnosticsStatus: 'current',
    projectReferenceIndex: collectCurrentProjectReferenceIndex(snapshot),
    projectReferenceStatus: 'current',
    getCurrentProjectReferenceIndex: (next) => collectCurrentProjectReferenceIndex(next),
    onOpenProjectReference: vi.fn(),
    actors: snapshot.actors ?? [],
    onJumpToEvent: vi.fn(),
    tabBar: <div data-testid="tab-bar" />,
  }
  return { props, session }
}

async function renderDataMode(props: ComponentProps<typeof DataMode>): Promise<void> {
  await act(async () => {
    root.render(<DataMode {...props} />)
    await Promise.resolve()
  })
}

describe('TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 DataMode 路由委派', () => {
  test('battlefield 页深链选中战场，复制经路由回报新副本 focus，undo 还原', async () => {
    const { props, session } = await mountedProps()
    const onObjectFocus = vi.fn()
    await renderDataMode({ ...props, tab: 'battlefield', focusObjectId: '6', onObjectFocus })
    expect(host.querySelector('main')?.getAttribute('aria-label')).toBe('战场工作区')
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#006')

    const historyBefore = session.getHistoryVersion()
    await act(async () => {
      buttonByText(host, '复制当前战场').click()
    })
    expect(session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(session.getState().battleFields?.map((entry) => entry.id)).toEqual([6, 7])
    // selectField 经路由把新副本 id 回报父级（深链回路）；父级深链 '6' 未变，
    // sorted 变化后 focus effect 把选中重新拉回 #006（深链权威在父级）。
    expect(onObjectFocus).toHaveBeenCalledWith('7')
    expect(host.querySelector('.ds-object-hero__id')?.textContent).toBe('#006')

    expect(undoInAct(session)).toBe(true)
    expect(session.getState().battleFields?.map((entry) => entry.id)).toEqual([6])
    assertProjectSaveValid(session.getState())
  })

  test('poison 页深链选中并回报目录选择；切换 enemy-team 页不残留、试打整形 {kind:"enemy-team"}', async () => {
    const { props } = await mountedProps()
    const onObjectFocus = vi.fn()
    const onBattleTrial = vi.fn()
    await renderDataMode({ ...props, tab: 'poison', focusObjectId: '2', onObjectFocus })
    expect(host.querySelector('[aria-label="毒工作区"]')).not.toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('无影毒')

    // 目录行点击经路由回报 focus（选择零命令）。
    const historySteady = props.session.getHistoryVersion()
    await act(async () => {
      catalogRowByTitle(host, '赤蝎粉').click()
    })
    expect(onObjectFocus).toHaveBeenCalledWith('1')
    expect(host.querySelector('h1')?.textContent).toBe('赤蝎粉')
    expect(props.session.getHistoryVersion()).toBe(historySteady)

    // 切页：battle/poison DOM 卸载，敌队工作区挂载；试打回调按敌队整形。
    await renderDataMode({ ...props, tab: 'enemy-team', onBattleTrial })
    expect(host.querySelector('.bf-catalog')).toBeNull()
    expect(host.querySelector('main')?.getAttribute('aria-label')).toBe('敌队工作区')
    expect(host.querySelector('h1')?.textContent).toBe('team-c1')
    await act(async () => {
      buttonByText(host, '试打').click()
    })
    expect(onBattleTrial).toHaveBeenCalledTimes(1)
    expect(onBattleTrial).toHaveBeenCalledWith({ kind: 'enemy-team', id: 'team-c1' })
    assertProjectSaveValid(props.session.getState())
  })
})
