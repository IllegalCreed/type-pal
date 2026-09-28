// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K11（批C）：EnemyTeamTab 敌队预制真实业务工作流补测。
 * 目标源 EnemyTeamTab.tsx（锚 104 组件）。
 *
 * 旧断言去重（旧 file/title → 已证合同 → 本组缺口；只测缺口）：
 * - EnemyTeamTab.test.tsx（手工 state）：
 *   - 'selected、creating 与 empty 共用唯一 canonical main owner' → 工作区结构；不重复。
 *   - '目录以成员派生标题分组重复项，第二行保留精确 EnemyTeamId' → 目录标题 ×N 分组/空队/
 *     缺失敌回退 id；不重复（本组 test 1 只把目录标题当作槽位编辑的联动见证）。
 *   - 'renders five semantic slots, duplicate-member totals, full stable trial id and blocking
 *     reference' → 五槽静态渲染/重复成员 totals/试打回调/阻断禁用；缺口：槽位 DsSelect 编辑、
 *     空洞保留与尾部 null 裁剪、totals 随槽位编辑联动（本组 test 1）。
 *   - '重复敌槽逐行显示同一击败后语义摘要…'、'偷取摘要使用字面量道具名…' → 成员行摘要形态；
 *     缺口：汇总/摘要跟踪真实敌人定义变更（UpdateEnemyCommand 后重算，本组 test 5）。
 *   - 'copies the current preset and creates an arbitrary stable id through the workbench' →
 *     复制与自定义 id 创建；缺口：空 ID/重名守卫零提交 + notice、创建取消、创建后 focus
 *     （本组 test 3）。
 *   - '[reorder-family:enemy-team-fixed-slots] handle swaps with an empty slot without
 *     compression in one command' → 键盘拖拽 swap + undo/redo + 同值按钮零命令；
 *     缺口：上移/下移按钮 commit（reorder.tsx move() 的 input:'button' 路径）到 session、
 *     aria-live 通报、首槽上移边界禁用（本组 test 2）。
 *   - 引用快照 checking/stale/failed/缺索引 fail-closed、live oracle 阻断与报错四条 → 不重复；
 *     缺口：删除成功链（confirm 取消零提交 → 解除场景引用 → 确认删除 → 选中回退 → undo 原位，
 *     本组 test 4）。旧测试从未成功删除过敌队。
 * - core/enemy-team-commands.ts 与 battle-data-delete-commands.test.ts：命令层 fail-closed 与
 *   invert 原位直测，未经组件 DOM；本组只证 DOM→命令→UI 环。
 * - EnemyTab 侧敌队成员编辑入口按设计不存在（EnemyTab.tsx:1407 注释：敌队成员统一在敌队
 *   工作台编辑），跨页引用跳转属 EnemyTab 已证范围。
 *
 * 主动放弃分支（举证）：
 * - updateSlots 的同值早退（EnemyTeamTab.tsx:266-270）：DsSelect chooseValue 对同值不回调
 *   （design-system/select.tsx:244），重排路径在 reorderDsItems 同序时已先返回；UI 不可达。
 * - 槽位 DsSelect 的 invalid 缺失标记（EnemyTeamTab.tsx:483）：悬空敌引用被保存门判 error
 *   （packages/content/src/validate-refs.ts:1378-1384），合法 fixture 不可达。
 * - create 的 AddEnemyTeamCommand 重复 id 早退（enemy-team-commands.ts:49）：组件 create 已在
 *   上行拦截重名（本组 test 3 证守卫本身），命令层静默无操作由命令直测覆盖。
 *
 * 本文件全部走真实组件 DOM → 真实 EditSession/commands/collectCurrentProjectReferenceIndex
 * + loadLegalUiProject 合法项目（assertProjectSaveValid 自证）。唯一替身：kit 浏览器硬件端口
 * （Node Blob/crypto；本组件不触发图像/音频解码）。场景敌对实体的播种与撤销用真实
 * AddEntityCommand/UpdateEntityCommand 经 session.dispatch，等价场景工作台操作，不 mock
 * 被测函数。保持敌方五语义槽现状，不测实际战斗。
 */
import type { EnemyDef, EnemyTeamDef, HostileBehavior, ItemData } from '@type-pal/content'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { withSharedEnemyBattleSprite } from '../core/__tests__/cursor-command-boundary-fixtures.js'
import {
  AddEnemyCommand,
  AddEnemyTeamCommand,
  AddEntityCommand,
  AddItemCommand,
  UpdateEnemyCommand,
  UpdateEntityCommand,
  UpdateLocaleCommand,
} from '../core/commands.js'
import { type EditorState, EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  buttonByLabel,
  clickButton,
  comboboxByAriaLabel,
  deepSnapshot,
  loadLegalUiProject,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { EnemyTeamTab } from './EnemyTeamTab.js'

const ENEMY_A = 'enemy-k11-a'
const ENEMY_B = 'enemy-k11-b'
const ENEMY_C = 'enemy-k11-c'
const ITEM_A = 'item-k11-a'
const ITEM_B = 'item-k11-b'
const ENEMY_SPRITE_ID = 'enemy-k11-shape'

function makeEnemy(
  id: string,
  stats?: Partial<EnemyDef['stats']>,
  rest?: Partial<EnemyDef>,
): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: ENEMY_SPRITE_ID,
    yPosOffset: 0,
    stats: {
      health: 50,
      level: 1,
      exp: 5,
      cash: 10,
      attackStrength: 20,
      magicStrength: 10,
      defense: 10,
      dexterity: 10,
      fleeRate: 10,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 15,
      ...stats,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {},
    ...rest,
  }
}

function makeItem(id: string, name: string): ItemData {
  return { id, name, desc: [], buyPrice: 10, sellPrice: 5, sellable: true }
}

interface Mounted {
  session: EditSession
  focusLog: Array<string | undefined>
  openedEnemies: string[]
  trials: string[]
}

function Harness(props: {
  session: EditSession
  initialFocus?: string
  focusLog: Array<string | undefined>
  openedEnemies: string[]
  trials: string[]
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  // 模拟真实父级深链回路：onObjectFocus 上报后 focusObjectId 回喂（同 DataMode 调用域）。
  const [focus, setFocus] = useState<string | undefined>(props.initialFocus)
  const current = props.session.getState()
  return (
    <EnemyTeamTab
      enemyTeams={current.enemyTeams ?? []}
      enemies={current.enemies ?? []}
      items={current.items ?? []}
      locale={current.locale ?? {}}
      assetCatalog={current.assetCatalog}
      worldVariables={current.worldVariables ?? {}}
      actors={current.actors ?? []}
      scenes={current.scenes ?? []}
      session={props.session}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        props.focusLog.push(id)
        setFocus(id)
      }}
      onOpenEnemy={(id) => props.openedEnemies.push(id)}
      onTrial={(id) => props.trials.push(id)}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
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

async function mountTeamTab(options: {
  name: string
  enemies?: EnemyDef[]
  enemyTeams?: EnemyTeamDef[]
  items?: ItemData[]
  locale?: Record<string, string>
  /** 在 start 场景播种一个引用该敌队的敌对实体（真实 AddEntityCommand）。 */
  hostileTeamId?: string
  initialFocus?: string
}): Promise<Mounted> {
  const legal = await loadLegalUiProject(options.name)
  let seeded: EditorState = await withSharedEnemyBattleSprite(
    legal.source,
    legal.state,
    ENEMY_SPRITE_ID,
  )
  for (const enemy of options.enemies ?? []) seeded = new AddEnemyCommand(enemy).apply(seeded)
  for (const [key, text] of Object.entries(options.locale ?? {}))
    seeded = new UpdateLocaleCommand(key, text).apply(seeded)
  for (const team of options.enemyTeams ?? []) seeded = new AddEnemyTeamCommand(team).apply(seeded)
  for (const item of options.items ?? []) seeded = new AddItemCommand(item).apply(seeded)
  if (options.hostileTeamId)
    seeded = new AddEntityCommand('start', {
      id: 'e-k11-guard',
      sprite: 'hero',
      pos: { col: 2, row: 2, height: 0 },
      // 与场景编辑器「遇敌开战」勾选写入的生产默认形状一致（App.tsx:3948-3955）；
      // 作者态 hostile 三键齐备，经 HostileBehavior 既存类型债窄转入命令（同 App.tsx:3654）。
      hostile: {
        enemyTeamId: options.hostileTeamId,
        onVictory: { kind: 'remove' },
        onPlayerFlee: { kind: 'remain' },
      } as HostileBehavior,
    }).apply(seeded)
  // 合法 fixture 自证：播种后仍过当前保存门。
  assertProjectSaveValid(seeded)
  const session = new EditSession(seeded)
  const mounted: Mounted = { session, focusLog: [], openedEnemies: [], trials: [] }
  await act(async () => {
    root.render(
      <Harness
        session={session}
        initialFocus={options.initialFocus}
        focusLog={mounted.focusLog}
        openedEnemies={mounted.openedEnemies}
        trials={mounted.trials}
      />,
    )
    await Promise.resolve()
  })
  return mounted
}

/** 撤销/重做纳入 act：订阅通知触发的组件更新不逃逸 act 域。 */
function undo(session: EditSession): boolean {
  let result = false
  act(() => {
    result = session.undo()
  })
  return result
}

function redo(session: EditSession): boolean {
  let result = false
  act(() => {
    result = session.redo()
  })
  return result
}

/** DsSelect 驱动：点击触发器后在 aria-controls listbox 内按选项标签文本选择。 */
async function chooseOption(trigger: HTMLElement, label: string): Promise<void> {
  await act(async () => {
    trigger.click()
  })
  const controls = trigger.getAttribute('aria-controls')
  const scope = (controls ? document.getElementById(controls) : null) ?? document
  const option = [...scope.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) =>
      candidate.querySelector('.ds-select-option__label')?.textContent?.trim() === label ||
      candidate.textContent?.trim() === label,
  )
  expect(option, `下拉选项「${label}」`).toBeDefined()
  await act(async () => {
    option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** 重排 settling 经由真实 rAF 双帧收尾；按钮 commit 本身同步落 session。 */
async function settleReorder(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })
}

function teamsOf(mounted: Mounted): EnemyTeamDef[] {
  return mounted.session.getState().enemyTeams ?? []
}

function teamSlots(mounted: Mounted, teamId: string): Array<string | null> | undefined {
  return teamsOf(mounted).find((team) => team.id === teamId)?.slots
}

/** 战后结算汇总（经验/金钱/收妖值三个 strong 数值）。 */
function totals(): string[] {
  const scope = host.querySelector('.enemy-team-totals')
  expect(scope, '战后结算汇总').not.toBeNull()
  return [...scope!.querySelectorAll('strong')].map((node) => node.textContent)
}

function memberRows(): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('.enemy-team-member-summary > button')]
}

function catalogRows(): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('.enemy-team-catalog .ds-catalog-row')]
}

function catalogTitles(): (string | undefined)[] {
  return catalogRows().map((row) => row.querySelector('.ds-catalog-row__title')?.textContent)
}

function noticeText(): string | null {
  return host.querySelector('.enemy-team-notice')?.textContent ?? null
}

describe('K11 EnemyTeamTab 敌队预制真实业务工作流', () => {
  test('槽位选择：空洞保留不挤压、尾部空槽裁剪、汇总与目录标题联动，undo/redo 逐格对称', async () => {
    const mounted = await mountTeamTab({
      name: 'k11-team-slots',
      enemies: [
        makeEnemy(ENEMY_A, { exp: 5, cash: 10, collectValue: 15 }),
        makeEnemy(ENEMY_B, { exp: 7, cash: 14, collectValue: 21 }),
      ],
      enemyTeams: [{ id: 'team-c1', slots: [ENEMY_A] }],
      locale: { [`name.${ENEMY_A}`]: '赤鬼', [`name.${ENEMY_B}`]: '青鬼' },
      initialFocus: 'team-c1',
    })
    // 前提：五槽常驻（旧已证），初始汇总只含赤鬼。
    expect(host.querySelectorAll('.enemy-team-slot')).toHaveLength(5)
    expect(totals()).toEqual(['5', '10', '15'])
    expect(memberRows().map((row) => row.querySelector('strong')?.textContent)).toEqual(['赤鬼'])
    expect(catalogTitles()).toEqual(['赤鬼'])
    const historyAtMount = mounted.session.getHistoryVersion()

    // 槽 3 放入青鬼：中间槽 2 空洞保留，尾部空槽裁剪掉。
    await chooseOption(comboboxByAriaLabel(host, 'team-c1 槽 3'), `青鬼 · ${ENEMY_B}`)
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(teamSlots(mounted, 'team-c1')).toEqual([ENEMY_A, null, ENEMY_B])
    expect(totals()).toEqual(['12', '24', '36'])
    expect(memberRows().map((row) => row.querySelector('strong')?.textContent)).toEqual([
      '赤鬼',
      '青鬼',
    ])
    expect(catalogTitles()).toEqual(['赤鬼、青鬼'])

    // 槽 1 改空槽：前导空洞保留，青鬼不被挤压前移。
    await chooseOption(comboboxByAriaLabel(host, 'team-c1 槽 1'), '空槽')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 2)
    expect(teamSlots(mounted, 'team-c1')).toEqual([null, null, ENEMY_B])
    expect(totals()).toEqual(['7', '14', '21'])
    expect(memberRows().map((row) => row.querySelector('strong')?.textContent)).toEqual(['青鬼'])
    expect(catalogTitles()).toEqual(['青鬼'])

    // 槽 3 改空槽：清空后 slots 为空数组（尾部裁剪到底），空队提示出现。
    await chooseOption(comboboxByAriaLabel(host, 'team-c1 槽 3'), '空槽')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 3)
    expect(teamSlots(mounted, 'team-c1')).toEqual([])
    expect(totals()).toEqual(['0', '0', '0'])
    expect(memberRows()).toEqual([])
    expect(host.textContent).toContain('当前敌队为空；可保存为占位预制')
    expect(catalogTitles()).toEqual(['空敌队'])
    assertProjectSaveValid(mounted.session.getState())

    // undo 逐格还原（含空洞形态）；redo 回到空队。
    expect(undo(mounted.session)).toBe(true)
    expect(teamSlots(mounted, 'team-c1')).toEqual([null, null, ENEMY_B])
    expect(undo(mounted.session)).toBe(true)
    expect(teamSlots(mounted, 'team-c1')).toEqual([ENEMY_A, null, ENEMY_B])
    expect(undo(mounted.session)).toBe(true)
    expect(teamSlots(mounted, 'team-c1')).toEqual([ENEMY_A])
    expect(totals()).toEqual(['5', '10', '15'])
    expect(redo(mounted.session)).toBe(true)
    expect(redo(mounted.session)).toBe(true)
    expect(redo(mounted.session)).toBe(true)
    expect(teamSlots(mounted, 'team-c1')).toEqual([])
    assertProjectSaveValid(mounted.session.getState())
  })

  test('槽位上移/下移按钮真实交换到 session 并通报，首槽上移边界禁用零命令', async () => {
    const mounted = await mountTeamTab({
      name: 'k11-team-move',
      enemies: [makeEnemy(ENEMY_A), makeEnemy(ENEMY_B), makeEnemy(ENEMY_C)],
      enemyTeams: [{ id: 'team-c1', slots: [ENEMY_A, ENEMY_B, ENEMY_C] }],
      locale: {
        [`name.${ENEMY_A}`]: '赤鬼',
        [`name.${ENEMY_B}`]: '青鬼',
        [`name.${ENEMY_C}`]: '蓝鬼',
      },
      initialFocus: 'team-c1',
    })
    const live = () => host.querySelector('.ds-reorder-live[aria-live="polite"]')?.textContent ?? ''
    const historyAtMount = mounted.session.getHistoryVersion()

    // 槽 3 上移：swap 槽 2/3，单命令落 session，aria-live 通报实际移动。
    await act(async () => {
      buttonByLabel(host, '槽 3 上移').click()
    })
    await settleReorder()
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(teamSlots(mounted, 'team-c1')).toEqual([ENEMY_A, ENEMY_C, ENEMY_B])
    expect(live()).toBe('已移动蓝鬼到第 2 项，共 5 项。')

    // 槽 1 下移：swap 槽 1/2。
    await act(async () => {
      buttonByLabel(host, '槽 1 下移').click()
    })
    await settleReorder()
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 2)
    expect(teamSlots(mounted, 'team-c1')).toEqual([ENEMY_C, ENEMY_A, ENEMY_B])
    expect(live()).toBe('已移动赤鬼到第 2 项，共 5 项。')
    expect(host.querySelectorAll('.enemy-team-slot')).toHaveLength(5)
    assertProjectSaveValid(mounted.session.getState())

    // 边界：首槽上移按钮禁用（moveTargetIndex 夹回），点击零命令。
    const upFirst = buttonByLabel(host, '槽 1 上移')
    expect(upFirst.disabled).toBe(true)
    await act(async () => {
      upFirst.click()
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 2)
    expect(teamSlots(mounted, 'team-c1')).toEqual([ENEMY_C, ENEMY_A, ENEMY_B])

    // undo/redo 对称还原两次交换。
    expect(undo(mounted.session)).toBe(true)
    expect(teamSlots(mounted, 'team-c1')).toEqual([ENEMY_A, ENEMY_C, ENEMY_B])
    expect(undo(mounted.session)).toBe(true)
    expect(teamSlots(mounted, 'team-c1')).toEqual([ENEMY_A, ENEMY_B, ENEMY_C])
    expect(redo(mounted.session)).toBe(true)
    expect(redo(mounted.session)).toBe(true)
    expect(teamSlots(mounted, 'team-c1')).toEqual([ENEMY_C, ENEMY_A, ENEMY_B])
    assertProjectSaveValid(mounted.session.getState())
  })

  test('新建敌队：预选下一个稳定 ID，空 ID 与重名守卫零提交报 notice，取消与创建后的选择联动', async () => {
    const mounted = await mountTeamTab({
      name: 'k11-team-create',
      enemies: [makeEnemy(ENEMY_A)],
      enemyTeams: [{ id: 'team-c1', slots: [ENEMY_A] }],
      locale: { [`name.${ENEMY_A}`]: '赤鬼' },
      initialFocus: 'team-c1',
    })
    const historyAtMount = mounted.session.getHistoryVersion()

    await act(async () => {
      buttonByLabel(host, '新建敌队').click()
    })
    // 预选 nextTeamId 并交出 focus（创建未定前不属于任何敌队）。
    const idInput = host.querySelector<HTMLInputElement>('.enemy-team-create-card input')!
    expect(idInput.value).toBe('team-c2')
    expect(mounted.focusLog.at(-1)).toBeUndefined()
    expect(noticeText()).toBeNull()

    // 空 ID 守卫：零提交，notice 落在 role=alert。
    await setInputValue(idInput, '   ')
    await clickButton(host, '创建敌队')
    expect(noticeText()).toBe('稳定 ID 不能为空。')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
    expect(teamsOf(mounted).map((team) => team.id)).toEqual(['team-c1'])

    // 重名守卫：零提交。
    await setInputValue(idInput, 'team-c1')
    await clickButton(host, '创建敌队')
    expect(noticeText()).toBe('敌队 team-c1 已存在。')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)

    // 合法创建：单命令、notice 清除、选中新队并交出 focus。
    await setInputValue(idInput, 'team-k11-boss')
    await clickButton(host, '创建敌队')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(teamsOf(mounted)).toEqual([
      { id: 'team-c1', slots: [ENEMY_A] },
      { id: 'team-k11-boss', slots: [] },
    ])
    expect(noticeText()).toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('team-k11-boss')
    expect(mounted.focusLog.at(-1)).toBe('team-k11-boss')
    assertProjectSaveValid(mounted.session.getState())

    expect(undo(mounted.session)).toBe(true)
    expect(teamsOf(mounted).map((team) => team.id)).toEqual(['team-c1'])
    expect(redo(mounted.session)).toBe(true)
    expect(teamsOf(mounted).map((team) => team.id)).toEqual(['team-c1', 'team-k11-boss'])

    // 取消：创建卡关闭，零提交，选中保持 team-c1。
    await act(async () => {
      catalogRows()[0]!.click()
    })
    expect(mounted.focusLog.at(-1)).toBe('team-c1')
    await act(async () => {
      buttonByLabel(host, '新建敌队').click()
    })
    const historyBeforeCancel = mounted.session.getHistoryVersion()
    await clickButton(host, '取消')
    expect(host.querySelector('.enemy-team-create-card')).toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('team-c1')
    expect(mounted.session.getHistoryVersion()).toBe(historyBeforeCancel)
  })

  test('删除敌队：场景引用阻断 → 真实命令解除 → confirm 取消零提交 → 确认删除选中回退 → undo 全链还原', async () => {
    const mounted = await mountTeamTab({
      name: 'k11-team-delete',
      enemies: [makeEnemy(ENEMY_A)],
      enemyTeams: [
        { id: 'team-c1', slots: [ENEMY_A] },
        { id: 'team-c2', slots: [] },
        { id: 'team-c3', slots: [] },
      ],
      locale: { [`name.${ENEMY_A}`]: '赤鬼' },
      hostileTeamId: 'team-c1',
      initialFocus: 'team-c1',
    })
    const teamsBefore = deepSnapshot(teamsOf(mounted))
    // 前提：start 场景敌对实体引用 team-c1，删除禁用。
    expect(host.querySelector('.ds-reference-panel')?.getAttribute('data-state')).toBe('ready')
    expect(host.textContent).toContain('敌对实体')
    const removeButton = () => buttonByLabel(host, '删除敌队')
    expect(removeButton().disabled).toBe(true)
    expect(removeButton().title).toBe('仍有 1 处引用')

    // 解除引用：真实 UpdateEntityCommand 撤销敌对（场景工作台等价操作），删除解锁。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateEntityCommand('start', 'e-k11-guard', { hostile: undefined }),
      )
    })
    expect(removeButton().disabled).toBe(false)
    expect(removeButton().title).toBe('删除敌队')
    expect(host.textContent).toContain('当前敌队可以安全删除。')

    // confirm 取消：零提交、零 notice、列表不动。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const historyBeforeCancel = mounted.session.getHistoryVersion()
    await act(async () => {
      removeButton().click()
    })
    expect(confirm).toHaveBeenCalledWith('删除敌队 team-c1？此操作可以撤销。')
    expect(mounted.session.getHistoryVersion()).toBe(historyBeforeCancel)
    expect(teamsOf(mounted).map((team) => team.id)).toEqual(['team-c1', 'team-c2', 'team-c3'])
    expect(noticeText()).toBeNull()

    // 确认删除：真实 DeleteEnemyTeamCommand 提交，选中回退到原序下一位。
    confirm.mockReturnValue(true)
    await act(async () => {
      removeButton().click()
    })
    expect(teamsOf(mounted).map((team) => team.id)).toEqual(['team-c2', 'team-c3'])
    expect(host.querySelector('h1')?.textContent).toBe('team-c2')
    expect(mounted.focusLog.at(-1)).toBe('team-c2')
    expect(catalogRows()).toHaveLength(2)
    assertProjectSaveValid(mounted.session.getState())

    // undo 原位还原完整敌队；redo 再删；再 undo 到底连场景敌对引用一并还原。
    expect(undo(mounted.session)).toBe(true)
    expect(teamsOf(mounted)).toEqual(teamsBefore)
    expect(redo(mounted.session)).toBe(true)
    expect(teamsOf(mounted).map((team) => team.id)).toEqual(['team-c2', 'team-c3'])
    expect(undo(mounted.session)).toBe(true)
    expect(teamsOf(mounted)).toEqual(teamsBefore)
    expect(undo(mounted.session)).toBe(true)
    expect(
      mounted.session.getState().scenes.find((scene) => scene.id === 'start')?.entities,
    ).toEqual([
      {
        id: 'e-k11-guard',
        sprite: 'hero',
        pos: { col: 2, row: 2, height: 0 },
        hostile: {
          enemyTeamId: 'team-c1',
          onVictory: { kind: 'remove' },
          onPlayerFlee: { kind: 'remain' },
        },
      },
    ])
    assertProjectSaveValid(mounted.session.getState())
  })

  test('战后结算汇总与成员摘要跟踪真实敌人定义变更（数值/偷取/击败后事件）', async () => {
    // 作者态 onDefeated 树（EditorState 的 EnemyDef 标注是既存类型债，同 EnemyTab.tsx:636 口径）。
    const defeatedSeed = [
      { kind: 'giveItem', itemId: ITEM_A, count: 1 },
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.k11.reward' }] },
      },
    ] as unknown as EnemyDef['onDefeated']
    const mounted = await mountTeamTab({
      name: 'k11-team-summary',
      enemies: [
        makeEnemy(
          ENEMY_A,
          { exp: 5, cash: 10, collectValue: 15 },
          { steal: { itemId: ITEM_A, count: 2 }, onDefeated: defeatedSeed },
        ),
      ],
      enemyTeams: [{ id: 'team-c1', slots: [ENEMY_A] }],
      items: [makeItem(ITEM_A, '还魂香'), makeItem(ITEM_B, '金蚕王')],
      locale: { [`name.${ENEMY_A}`]: '赤鬼', 'dlg.k11.reward': '获得奖励' },
      initialFocus: 'team-c1',
    })
    const enemyBefore = deepSnapshot(
      mounted.session.getState().enemies?.find((enemy) => enemy.id === ENEMY_A),
    )
    expect(totals()).toEqual(['5', '10', '15'])
    expect(memberRows()).toHaveLength(1)
    expect(memberRows()[0]!.textContent).toContain('偷物 还魂香 ×2')
    expect(memberRows()[0]!.textContent).toContain('击败后：获得还魂香 ×1')

    // 敌人工作台等价真实命令：数值变更立即重算汇总（重复槽按位各结算的前提不变）。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateEnemyCommand(ENEMY_A, {
          stats: { ...enemyBefore!.stats, exp: 8, cash: 3, collectValue: 0 },
        }),
      )
    })
    expect(totals()).toEqual(['8', '3', '0'])

    // 偷取目标变更：摘要换物品名与数量。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateEnemyCommand(ENEMY_A, { steal: { itemId: ITEM_B, count: 5 } }),
      )
    })
    expect(memberRows()[0]!.textContent).toContain('偷物 金蚕王 ×5')
    expect(memberRows()[0]!.textContent).not.toContain('还魂香 ×2')

    // 击败后事件变更：摘要按当前事件重新生成。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateEnemyCommand(ENEMY_A, {
          onDefeated: [{ kind: 'giveMoney', delta: 99 }] as unknown as EnemyDef['onDefeated'],
        }),
      )
    })
    expect(memberRows()[0]!.textContent).toContain('击败后：获得金钱 99')
    assertProjectSaveValid(mounted.session.getState())

    // undo 全链还原到初始摘要；redo 重放。
    expect(undo(mounted.session)).toBe(true)
    expect(memberRows()[0]!.textContent).toContain('击败后：获得还魂香 ×1')
    expect(undo(mounted.session)).toBe(true)
    expect(memberRows()[0]!.textContent).toContain('偷物 还魂香 ×2')
    expect(undo(mounted.session)).toBe(true)
    expect(totals()).toEqual(['5', '10', '15'])
    expect(mounted.session.getState().enemies?.find((enemy) => enemy.id === ENEMY_A)).toEqual(
      enemyBefore,
    )
    expect(redo(mounted.session)).toBe(true)
    expect(redo(mounted.session)).toBe(true)
    expect(redo(mounted.session)).toBe(true)
    expect(totals()).toEqual(['8', '3', '0'])
    expect(memberRows()[0]!.textContent).toContain('偷物 金蚕王 ×5')
    expect(memberRows()[0]!.textContent).toContain('击败后：获得金钱 99')
    assertProjectSaveValid(mounted.session.getState())
  })

  test('目录搜索按成员名与敌队 ID 过滤：命中、空结果、清空恢复，且不偷换当前选中', async () => {
    const mounted = await mountTeamTab({
      name: 'k11-team-filter',
      enemies: [makeEnemy(ENEMY_A), makeEnemy(ENEMY_B)],
      enemyTeams: [
        { id: 'team-c1', slots: [ENEMY_A] },
        { id: 'team-c2', slots: [ENEMY_B] },
        { id: 'team-c3', slots: [] },
      ],
      locale: { [`name.${ENEMY_A}`]: '赤鬼', [`name.${ENEMY_B}`]: '青鬼' },
      initialFocus: 'team-c1',
    })
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索敌队"]')!
    expect(catalogRows()).toHaveLength(3)
    const historyAtMount = mounted.session.getHistoryVersion()

    // 成员显示名命中（成员查找经 locale 文本，大小写不敏感）。
    await setCatalogSearch(search, '青鬼')
    expect(catalogRows()).toHaveLength(1)
    expect(catalogRows()[0]!.querySelector('.ds-catalog-row__meta')?.textContent).toBe('team-c2')
    expect(host.querySelector('h1')?.textContent).toBe('team-c1')

    // 敌队 ID 命中（过滤词小写化）。
    await setCatalogSearch(search, 'TEAM-C3')
    expect(catalogRows()).toHaveLength(1)
    expect(catalogRows()[0]!.querySelector('.ds-catalog-row__meta')?.textContent).toBe('team-c3')

    // 空结果与清空恢复；全程选中不被偷换、过滤不写历史。
    await setCatalogSearch(search, '不存在')
    expect(catalogRows()).toHaveLength(0)
    expect(host.textContent).toContain('没有匹配的敌队。')
    expect(host.querySelector('h1')?.textContent).toBe('team-c1')
    await setCatalogSearch(search, '')
    expect(catalogRows()).toHaveLength(3)
    expect(host.querySelector('h1')?.textContent).toBe('team-c1')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount)
  })
})
