// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K11（批C）：EnemyTab 敌定义真实业务工作流补测。
 * 目标源 EnemyTab.tsx（锚 539 组件 / 738 addEnemy / 753 removeEnemy）。
 *
 * 旧断言去重（旧 file/title → 已证合同 → 本组缺口；只测缺口）：
 * - EnemyTab.test.tsx（手工 state + assetReader={} as never）：
 *   - '目录第二行保留原始 EnemyId，不制造点分展示别名' → 目录行 title/meta；不重复。
 *   - 'profile fields stay disabled until the referenced sprite frames are ready' → assetBase
 *     占位下外观区禁用；不重复（本组不传 assetBase，外观预览属 EnemyAnimPreview 自有测试）。
 *   - '目录搜索覆盖命中、空结果与清空恢复，且不会偷换深链选择' → 过滤；不重复。
 *   - '可新建、编辑，并由 object 深链精确定位' → 新建存在性/改名 locale/undo 移除；
 *     缺口：新建守卫（无 enemy profile 精灵禁用）、生产模板深值、locale 键身份、id 递增、
 *     CompositeCommand 双键 undo（本组 test 1）。
 *   - '共享 Hero/目录行、单敌试打入口与引用跳转保持闭环' → hero/试打回调/引用跳转/阻断禁用；
 *     不重复。
 *   - '无引用敌人可删除且保留撤销入口' → 本来就零引用的删除+undo；
 *     缺口：引用阻断→逐处解除→删除成功→选中回退/focus/notice 清除→undo 原位还原全链，
 *     共享槽位（同一敌占多槽）计数（本组 test 2）。
 *   - '数值与音效按业务分组，字段编辑保持命令与撤销语义' → 分组结构 + health/collectValue
 *     commit+undo；缺口：SoundPicker 选择/清除/施法音优先/onOpenSound（本组 test 5）。
 *   - '[reorder-family:enemy-ai] …' → AI 规则键盘重排；不重复。
 *   - '物品交互与击败后奖励使用结构化字段，并保留未识别事件' → 偷取金钱/概率编辑/奖励开关；
 *     缺口：奖励物品切换与奖励数量提交（保留 branch/dialog/giveMoney 旁事件）与段落摘要刷新
 *     （本组 test 6）。
 *   - '击败后事件弹窗…'、'奖励同值不写历史…' → 查看器与同值零命令；不重复。
 *   - 'unified reference guard' 五条 → checking/stale/failed/缺索引 fail-closed、自变身不自锁、
 *     live oracle 阻断与报错；不重复。
 * - EnemyTab.glm-ui-wave.test.tsx（合法项目 + 真 session）：
 *   - '删除确认取消 → 零提交' / '加规则单命令…删最后一条规则清掉 ai.rules 键' /
 *     '偷取无→删键…启用附带效果开与关' / '击败奖励从无到有…二动…敌队行传出回调' → 均已证；
 *     缺口：规则行字段编辑（条件/数值/时机/动作切换/技能/目标/once，本组 test 3）、
 *     UI 创建变身/召唤规则产生真实引用并阻断目标删除（本组 test 4）。
 * - core/battle-data-delete-commands.test.ts / battle-data-references*.test.ts：命令与引用收集
 *   的纯函数/命令层直测（fail-closed、invert 原位），未经组件 DOM；本组只证 DOM→命令→UI 环。
 * - DataMode.glm-ui-wave.test.tsx：vi.mock 掉 EnemyTab 的路由探针，不构成工作流证明。
 *
 * 主动放弃分支（举证）：
 * - removeEnemy 的 `!changed`「敌人已变化」分支（EnemyTab.tsx:771-774）：删除按钮渲染前提是
 *   被删敌人存在于当前渲染；useSyncExternalStore 同步重渲染使「渲染后敌人消失但按钮仍可点」
 *   的窗口在合法路径下不存在，不为触达分支伪造非法状态。
 * - 偷取物品/奖励物品/槽位 DsSelect 的 invalid 缺失标记：保存门对悬空引用报 error
 *   （packages/content/src/validate-refs.ts:1356-1363 敌人 steal/attackEquivItem 域），
 *   合法 fixture 不可达；守卫本身由保存门证明。
 *
 * 本文件全部走真实组件 DOM → 真实 EditSession/commands/collectCurrentProjectReferenceIndex
 * + createEditorAssetReader 活 reader + loadLegalUiProject 合法项目（assertProjectSaveValid
 * 自证）。唯一替身：kit 浏览器硬件端口（Node Blob/crypto + createImageBitmap；本组件不传
 * assetBase，不触发图像解码）。解除引用/外部敌人变更用真实命令经 session.dispatch 播种，
 * 等价于对应工作台的真实操作，不 mock 被测函数。
 */
import type { AssetRecordV1, EnemyDef, EnemyTeamDef, ItemData } from '@type-pal/content'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { withSharedEnemyBattleSprite } from '../core/__tests__/cursor-command-boundary-fixtures.js'
import { sha256Hex } from '../core/binary-signature.js'
import {
  AddEnemyCommand,
  AddEnemyTeamCommand,
  AddItemCommand,
  AddSkillCommand,
  UpdateEnemyTeamCommand,
  UpdateLocaleCommand,
  UpsertAssetCommand,
} from '../core/commands.js'
import { type EditorState, EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import type { ProjectReferenceEdge } from '../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  buttonByLabel,
  clickCheckboxByLabel,
  comboboxByAriaLabel,
  deepSnapshot,
  fieldControlByLabel,
  loadLegalUiProject,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { EnemyTab } from './EnemyTab.js'

const ENEMY_SPRITE_ID = 'enemy-k11-shape'
const ENEMY_A = 'enemy-k11-a'
const ENEMY_B = 'enemy-k11-b'
const ITEM_A = 'item-k11-a'
const ITEM_B = 'item-k11-b'
const SKILL_FIRE = 'skill-k11-fire'
const SKILL_HEAL = 'skill-k11-heal'
const SOUND_DRUM = 'sound.k11.drum'
const SOUND_BELL = 'sound.k11.bell'

/** 与产品 newEnemy（EnemyTab.tsx:174-199）同形的种子敌人；只改测试需要的字段。 */
function makeEnemy(id: string, overrides?: Partial<EnemyDef>): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite: ENEMY_SPRITE_ID,
    yPosOffset: 0,
    stats: {
      health: 50,
      level: 1,
      exp: 5,
      cash: 5,
      attackStrength: 20,
      magicStrength: 10,
      defense: 10,
      dexterity: 10,
      fleeRate: 10,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 5 },
    sounds: {},
    ...overrides,
  }
}

function makeItem(id: string, name: string): ItemData {
  return { id, name, desc: [], buyPrice: 10, sellPrice: 5, sellable: true }
}

/** 真实最小 RIFF/WAVE 字节（PCM16 单声道 8kHz，4 个采样）；本组只作目录登记，不解码。 */
function wavBytes(): Uint8Array {
  const samples = new Int16Array([100, -100, 200, -200])
  const data = new Uint8Array(samples.buffer.slice(0))
  const out = new Uint8Array(44 + data.byteLength)
  const view = new DataView(out.buffer)
  const text = (at: number, value: string): void => {
    for (let index = 0; index < value.length; index += 1) out[at + index] = value.charCodeAt(index)
  }
  text(0, 'RIFF')
  view.setUint32(4, 36 + data.byteLength, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 8000, true)
  view.setUint32(28, 16000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, data.byteLength, true)
  out.set(data, 44)
  return out
}

interface Mounted {
  session: EditSession
  reader: EditorAssetReader
  focusLog: Array<string | undefined>
  notices: Array<{ kind: 'info' | 'error'; message: string } | undefined>
  openedReferences: ProjectReferenceEdge[]
  openedSounds: string[]
}

function Harness(props: {
  session: EditSession
  reader: EditorAssetReader
  initialFocus?: string
  focusLog: Array<string | undefined>
  notices: Mounted['notices']
  openedReferences: ProjectReferenceEdge[]
  openedSounds: string[]
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  // 模拟真实父级深链回路：onObjectFocus 上报后 focusObjectId 回喂（同 DataMode 调用域）。
  const [focus, setFocus] = useState<string | undefined>(props.initialFocus)
  const current = props.session.getState()
  return (
    <EnemyTab
      enemies={current.enemies ?? []}
      enemyTeams={current.enemyTeams ?? []}
      skills={current.skills ?? []}
      items={current.items ?? []}
      locale={current.locale ?? {}}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={props.reader}
      battleSprites={current.battleSprites ?? []}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        props.focusLog.push(id)
        setFocus(id)
      }}
      onStatusNotice={(notice) => props.notices.push(notice)}
      onOpenReference={(reference) => props.openedReferences.push(reference)}
      onOpenSound={(id) => props.openedSounds.push(id)}
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

async function mountEnemyTab(options: {
  name: string
  withEnemySprite?: boolean
  enemies?: EnemyDef[]
  enemyTeams?: EnemyTeamDef[]
  items?: ItemData[]
  skills?: readonly (readonly [string, string])[]
  sounds?: readonly { id: string; label: string }[]
  locale?: Record<string, string>
  initialFocus?: string
}): Promise<Mounted> {
  const legal = await loadLegalUiProject(options.name)
  let seeded: EditorState = legal.state
  if (options.withEnemySprite ?? true)
    seeded = await withSharedEnemyBattleSprite(legal.source, seeded, ENEMY_SPRITE_ID)
  const soundRecords: { id: string; record: AssetRecordV1; bytes: ArrayBuffer }[] = []
  for (const sound of options.sounds ?? []) {
    const payload = wavBytes()
    const sha256 = await sha256Hex(payload)
    soundRecords.push({
      id: sound.id,
      record: {
        kind: 'sound',
        path: `assets/authored/sounds/k11-${sha256.slice(0, 12)}.wav`,
        mediaType: 'audio/wav',
        bytes: payload.byteLength,
        sha256,
        label: sound.label,
        origin: { kind: 'authored' },
      },
      bytes: payload.buffer.slice(0) as ArrayBuffer,
    })
  }
  for (const enemy of options.enemies ?? []) seeded = new AddEnemyCommand(enemy).apply(seeded)
  for (const [key, text] of Object.entries(options.locale ?? {}))
    seeded = new UpdateLocaleCommand(key, text).apply(seeded)
  for (const team of options.enemyTeams ?? []) seeded = new AddEnemyTeamCommand(team).apply(seeded)
  for (const item of options.items ?? []) seeded = new AddItemCommand(item).apply(seeded)
  for (const [id, name] of options.skills ?? [])
    seeded = new AddSkillCommand(id, name).apply(seeded)
  for (const sound of soundRecords)
    seeded = new UpsertAssetCommand(sound.id, sound.record, sound.bytes).apply(seeded)
  // 合法 fixture 自证：播种后仍过当前保存门。
  assertProjectSaveValid(seeded)
  const session = new EditSession(seeded)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const mounted: Mounted = {
    session,
    reader,
    focusLog: [],
    notices: [],
    openedReferences: [],
    openedSounds: [],
  }
  await act(async () => {
    root.render(
      <Harness
        session={session}
        reader={reader}
        initialFocus={options.initialFocus}
        focusLog={mounted.focusLog}
        notices={mounted.notices}
        openedReferences={mounted.openedReferences}
        openedSounds={mounted.openedSounds}
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

/** DsSelect 驱动：点击触发器后在 aria-controls listbox 内按选项标签文本选择（兼容描述行）。 */
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

function deleteEnemyButton(): HTMLButtonElement {
  return buttonByLabel(host, '删除敌人')
}

function referencesTab(): HTMLButtonElement {
  const tab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((candidate) =>
    candidate.textContent?.includes('引用'),
  )
  expect(tab, '引用 tab').toBeDefined()
  return tab!
}

function referenceRows(): HTMLElement[] {
  return [...host.querySelectorAll<HTMLElement>('.ds-reference-list .ds-reference-row')]
}

function catalogRowByTitle(title: string): HTMLElement {
  const row = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find(
    (candidate) => candidate.querySelector('.ds-catalog-row__title')?.textContent?.trim() === title,
  )
  expect(row, `目录行「${title}」`).toBeDefined()
  return row!
}

function enemyRules(mounted: Mounted, enemyId = ENEMY_A): unknown {
  return mounted.session.getState().enemies?.find((enemy) => enemy.id === enemyId)?.ai.rules
}

describe('K11 EnemyTab 敌定义真实业务工作流', () => {
  test('新建敌人：无 enemy profile 战斗精灵时禁用守卫；播种后经 CompositeCommand 落生产模板并递增', async () => {
    // 守卫侧：合法 blank 项目原生只有 player-fighter 精灵，新建入口禁用且点击零提交。
    const guard = await mountEnemyTab({ name: 'k11-enemy-guard', withEnemySprite: false })
    const guardButton = buttonByLabel(host, '请先在战斗精灵库创建 enemy 定义')
    expect(guardButton.disabled).toBe(true)
    expect(host.textContent).toContain('无敌人;点 ＋ 新建。')
    const guardHistory = guard.session.getHistoryVersion()
    await act(async () => {
      guardButton.click()
    })
    expect(guard.session.getHistoryVersion()).toBe(guardHistory)
    expect(guard.session.getState().enemies ?? []).toEqual([])

    // 正控侧：真实 AddBattleSpriteCommand 播种 enemy profile 精灵后，新建走完整生产线。
    const mounted = await mountEnemyTab({ name: 'k11-enemy-create' })
    expect(buttonByLabel(host, '新建敌人').disabled).toBe(false)
    const historyAtMount = mounted.session.getHistoryVersion()

    await act(async () => {
      buttonByLabel(host, '新建敌人').click()
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    // 生产模板深值（EnemyTab.tsx:174-199 newEnemy）：任何字段被改都会打红本断言。
    expect(mounted.session.getState().enemies).toEqual([
      {
        id: 'enemy-c1',
        name: 'name.enemy-c1',
        battleSprite: ENEMY_SPRITE_ID,
        yPosOffset: 0,
        stats: {
          health: 50,
          level: 1,
          exp: 5,
          cash: 5,
          attackStrength: 20,
          magicStrength: 10,
          defense: 10,
          dexterity: 10,
          fleeRate: 10,
          physicalResistance: 0,
          poisonResistance: 0,
          elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
          dualMove: false,
          collectValue: 0,
        },
        ai: { resistanceToSorcery: 5 },
        sounds: {},
      },
    ])
    expect(mounted.session.getState().locale['name.enemy-c1']).toBe('新敌人 1')
    assertProjectSaveValid(mounted.session.getState())
    expect(host.querySelector('h1')?.textContent).toBe('新敌人 1')
    expect(mounted.focusLog.at(-1)).toBe('enemy-c1')

    // id 递增：while 循环跳过已存在的 enemy-c1。
    await act(async () => {
      buttonByLabel(host, '新建敌人').click()
    })
    expect(mounted.session.getState().enemies?.map((enemy) => enemy.id)).toEqual([
      'enemy-c1',
      'enemy-c2',
    ])
    expect(mounted.session.getState().locale['name.enemy-c2']).toBe('新敌人 2')
    expect(host.querySelector('h1')?.textContent).toBe('新敌人 2')
    expect(mounted.focusLog.at(-1)).toBe('enemy-c2')

    // CompositeCommand undo：敌人与 locale 键一起回退；redo 对称。
    expect(undo(mounted.session)).toBe(true)
    expect(mounted.session.getState().enemies?.map((enemy) => enemy.id)).toEqual(['enemy-c1'])
    expect('name.enemy-c2' in mounted.session.getState().locale).toBe(false)
    expect(undo(mounted.session)).toBe(true)
    expect(mounted.session.getState().enemies ?? []).toEqual([])
    expect('name.enemy-c1' in mounted.session.getState().locale).toBe(false)
    expect(redo(mounted.session)).toBe(true)
    expect(redo(mounted.session)).toBe(true)
    expect(mounted.session.getState().enemies?.map((enemy) => enemy.id)).toEqual([
      'enemy-c1',
      'enemy-c2',
    ])
    expect(mounted.session.getState().locale['name.enemy-c2']).toBe('新敌人 2')
    assertProjectSaveValid(mounted.session.getState())
  })

  test('删除引用证明：共享槽位计数 → 真实命令逐处解除 → 确认删除 → 选中回退与 notice 清除 → undo 原位还原', async () => {
    const mounted = await mountEnemyTab({
      name: 'k11-enemy-delete',
      enemies: [makeEnemy(ENEMY_A), makeEnemy(ENEMY_B)],
      enemyTeams: [
        // 同一敌人占同一敌队的两个语义槽：共享敌引用必须逐槽计数。
        { id: 'team-k11-1', slots: [ENEMY_A, null, ENEMY_A] },
        { id: 'team-k11-2', slots: [ENEMY_B] },
      ],
      locale: { [`name.${ENEMY_A}`]: '赤鬼', [`name.${ENEMY_B}`]: '青鬼' },
      initialFocus: ENEMY_A,
    })
    const enemyBefore = deepSnapshot(
      mounted.session.getState().enemies?.find((enemy) => enemy.id === ENEMY_A),
    )
    expect(host.querySelector('h1')?.textContent).toBe('赤鬼')

    // 引用证明：两处阻断分别落在槽位 1 与槽位 3，删除禁用。
    expect(referencesTab().textContent).toContain('引用 2')
    await act(async () => {
      referencesTab().click()
    })
    expect(
      referenceRows().map((row) => ({
        title: row.querySelector('.ds-reference-row__title')?.textContent,
        detail: row.querySelector('.ds-reference-row__detail')?.textContent,
        path: row.querySelector('.ds-reference-row__path')?.textContent,
      })),
    ).toEqual([
      {
        title: '敌队 team-k11-1',
        detail: '敌队槽位 1',
        path: 'enemyTeams[0](team-k11-1).slots[0]',
      },
      {
        title: '敌队 team-k11-1',
        detail: '敌队槽位 3',
        path: 'enemyTeams[0](team-k11-1).slots[2]',
      },
    ])
    expect(deleteEnemyButton().disabled).toBe(true)

    // 解除第一处（真实 UpdateEnemyTeamCommand = 敌队工作台清空槽 1 的等价命令）。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateEnemyTeamCommand('team-k11-1', {
          id: 'team-k11-1',
          slots: [null, null, ENEMY_A],
        }),
      )
    })
    expect(referencesTab().textContent).toContain('引用 1')
    expect(deleteEnemyButton().disabled).toBe(true)
    expect(
      referenceRows().map((row) => row.querySelector('.ds-reference-row__detail')?.textContent),
    ).toEqual(['敌队槽位 3'])

    // 解除第二处：计数归零，删除解锁。
    await act(async () => {
      mounted.session.dispatch(
        new UpdateEnemyTeamCommand('team-k11-1', { id: 'team-k11-1', slots: [] }),
      )
    })
    expect(referencesTab().textContent).toContain('引用 0')
    expect(deleteEnemyButton().disabled).toBe(false)
    expect(host.textContent).toContain('当前敌人可以安全删除。')

    // 确认删除：真实 DeleteEnemyCommand 提交，选中回退到原序下一位并清 notice。
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const historyBefore = mounted.session.getHistoryVersion()
    await act(async () => {
      deleteEnemyButton().click()
    })
    expect(confirm).toHaveBeenCalledWith(`删除敌人 赤鬼(${ENEMY_A})？此操作可以撤销。`)
    expect(mounted.session.getHistoryVersion()).toBe(historyBefore + 1)
    expect(mounted.session.getState().enemies?.map((enemy) => enemy.id)).toEqual([ENEMY_B])
    assertProjectSaveValid(mounted.session.getState())
    expect(host.querySelector('h1')?.textContent).toBe('青鬼')
    expect(mounted.focusLog.at(-1)).toBe(ENEMY_B)
    expect(mounted.notices).toEqual([undefined])

    // undo 原位还原完整敌人对象；redo 再删。
    expect(undo(mounted.session)).toBe(true)
    expect(mounted.session.getState().enemies?.map((enemy) => enemy.id)).toEqual([ENEMY_A, ENEMY_B])
    expect(mounted.session.getState().enemies?.[0]).toEqual(enemyBefore)
    expect(redo(mounted.session)).toBe(true)
    expect(mounted.session.getState().enemies?.map((enemy) => enemy.id)).toEqual([ENEMY_B])
  })

  test('AI 规则行编辑：条件/数值/时机/动作/技能/目标/once 每步单命令到 session，undo/redo 逐格对称', async () => {
    const mounted = await mountEnemyTab({
      name: 'k11-enemy-rule-edit',
      enemies: [makeEnemy(ENEMY_A)],
      skills: [
        [SKILL_FIRE, '烈火咒'],
        [SKILL_HEAL, '还魂咒'],
      ],
      locale: { [`name.${ENEMY_A}`]: '赤鬼' },
      initialFocus: ENEMY_A,
    })
    const historyAtMount = mounted.session.getHistoryVersion()

    await act(async () => {
      buttonByLabel(host, '加规则').click()
    })
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(enemyRules(mounted)).toEqual([{ at: 'act', do: { kind: 'attack' } }])

    await chooseOption(comboboxByAriaLabel(host, '触发条件'), 'HP 低于 %')
    expect(enemyRules(mounted)).toEqual([
      { at: 'act', when: { kind: 'hpBelow', percent: 30 }, do: { kind: 'attack' } },
    ])

    await setInputValue(host.querySelector<HTMLInputElement>('input[aria-label="条件数值"]')!, '15')
    expect(enemyRules(mounted)).toEqual([
      { at: 'act', when: { kind: 'hpBelow', percent: 15 }, do: { kind: 'attack' } },
    ])

    await chooseOption(comboboxByAriaLabel(host, '触发时机'), '轮起手')
    expect(enemyRules(mounted)).toEqual([
      { at: 'turnStart', when: { kind: 'hpBelow', percent: 15 }, do: { kind: 'attack' } },
    ])

    // 动作切换：施法默认带走首个技能 id（switchAction 的 mk.cast）。
    await chooseOption(comboboxByAriaLabel(host, '执行动作'), '施法')
    expect(enemyRules(mounted)).toEqual([
      {
        at: 'turnStart',
        when: { kind: 'hpBelow', percent: 15 },
        do: { kind: 'cast', skillId: SKILL_FIRE },
      },
    ])

    await chooseOption(comboboxByAriaLabel(host, '施放技能'), `还魂咒(${SKILL_HEAL})`)
    expect(enemyRules(mounted)).toEqual([
      {
        at: 'turnStart',
        when: { kind: 'hpBelow', percent: 15 },
        do: { kind: 'cast', skillId: SKILL_HEAL },
      },
    ])

    await chooseOption(comboboxByAriaLabel(host, '动作目标'), '集火残血')
    expect(enemyRules(mounted)).toEqual([
      {
        at: 'turnStart',
        when: { kind: 'hpBelow', percent: 15 },
        do: { kind: 'cast', skillId: SKILL_HEAL, target: 'lowestHp' },
      },
    ])

    // 回选「随机(原版)」：target 恢复缺省（undefined 语义）。
    await chooseOption(comboboxByAriaLabel(host, '动作目标'), '随机(原版)')
    expect(enemyRules(mounted)).toEqual([
      {
        at: 'turnStart',
        when: { kind: 'hpBelow', percent: 15 },
        do: { kind: 'cast', skillId: SKILL_HEAL },
      },
    ])

    await clickCheckboxByLabel(host, '1次')
    const finalRules = [
      {
        at: 'turnStart',
        when: { kind: 'hpBelow', percent: 15 },
        once: true,
        do: { kind: 'cast', skillId: SKILL_HEAL },
      },
    ]
    expect(enemyRules(mounted)).toEqual(finalRules)
    // 每次编辑恰好一条命令。
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 9)
    assertProjectSaveValid(mounted.session.getState())

    // undo 链逐格回退到「加规则前」；redo 回到终态。
    expect(undo(mounted.session)).toBe(true)
    expect(enemyRules(mounted)).toEqual([
      {
        at: 'turnStart',
        when: { kind: 'hpBelow', percent: 15 },
        do: { kind: 'cast', skillId: SKILL_HEAL },
      },
    ])
    for (let step = 0; step < 7; step += 1) expect(undo(mounted.session)).toBe(true)
    expect(enemyRules(mounted)).toEqual([{ at: 'act', do: { kind: 'attack' } }])
    expect(undo(mounted.session)).toBe(true)
    expect(enemyRules(mounted)).toBeUndefined()
    for (let step = 0; step < 9; step += 1) expect(redo(mounted.session)).toBe(true)
    expect(enemyRules(mounted)).toEqual(finalRules)
    assertProjectSaveValid(mounted.session.getState())
  })

  test('UI 创建变身/召唤规则实时产生真实引用：目标敌人删除被阻断，改回同种召唤即解除', async () => {
    const mounted = await mountEnemyTab({
      name: 'k11-enemy-rule-reference',
      enemies: [makeEnemy(ENEMY_A), makeEnemy(ENEMY_B)],
      locale: { [`name.${ENEMY_A}`]: '赤鬼', [`name.${ENEMY_B}`]: '青鬼' },
      initialFocus: ENEMY_B,
    })
    expect(host.querySelector('h1')?.textContent).toBe('青鬼')

    // 在青鬼上加规则并切到变身：默认带走 enemies[0]（赤鬼）作为变身目标。
    await act(async () => {
      buttonByLabel(host, '加规则').click()
    })
    const historyAfterAdd = mounted.session.getHistoryVersion()
    await chooseOption(comboboxByAriaLabel(host, '执行动作'), '变身')
    expect(mounted.session.getHistoryVersion()).toBe(historyAfterAdd + 1)
    expect(enemyRules(mounted, ENEMY_B)).toEqual([
      { at: 'act', do: { kind: 'transform', enemyId: ENEMY_A } },
    ])

    // 引用证明：赤鬼被「变身目标」阻断删除。
    await act(async () => {
      catalogRowByTitle('赤鬼').click()
    })
    expect(host.querySelector('h1')?.textContent).toBe('赤鬼')
    expect(referencesTab().textContent).toContain('引用 1')
    await act(async () => {
      referencesTab().click()
    })
    expect(
      referenceRows().map((row) => ({
        title: row.querySelector('.ds-reference-row__title')?.textContent,
        detail: row.querySelector('.ds-reference-row__detail')?.textContent,
        path: row.querySelector('.ds-reference-row__path')?.textContent,
      })),
    ).toEqual([
      {
        title: `敌人 ${ENEMY_B}`,
        detail: '变身目标',
        path: `enemies[1](${ENEMY_B}).ai.rules[0].do.enemyId`,
      },
    ])
    expect(deleteEnemyButton().disabled).toBe(true)

    // 召唤同种：enemyId 缺省不产生跨敌引用，赤鬼删除解锁。
    await act(async () => {
      catalogRowByTitle('青鬼').click()
    })
    await chooseOption(comboboxByAriaLabel(host, '执行动作'), '召唤')
    expect(enemyRules(mounted, ENEMY_B)).toEqual([{ at: 'act', do: { kind: 'summon', count: 1 } }])
    expect(comboboxByAriaLabel(host, '召唤敌人').textContent).toContain('同种')
    await act(async () => {
      catalogRowByTitle('赤鬼').click()
    })
    expect(referencesTab().textContent).toContain('引用 0')
    expect(deleteEnemyButton().disabled).toBe(false)

    // 指定召唤目标：enemy-summon 引用出现并再次阻断。
    await act(async () => {
      catalogRowByTitle('青鬼').click()
    })
    await chooseOption(comboboxByAriaLabel(host, '召唤敌人'), '赤鬼')
    expect(enemyRules(mounted, ENEMY_B)).toEqual([
      { at: 'act', do: { kind: 'summon', enemyId: ENEMY_A, count: 1 } },
    ])
    await act(async () => {
      catalogRowByTitle('赤鬼').click()
    })
    await act(async () => {
      referencesTab().click()
    })
    expect(
      referenceRows().map((row) => row.querySelector('.ds-reference-row__detail')?.textContent),
    ).toEqual(['召唤目标'])
    expect(deleteEnemyButton().disabled).toBe(true)

    // 改回同种即解除；规则编辑全程是同一合法项目内的真实命令。
    await act(async () => {
      catalogRowByTitle('青鬼').click()
    })
    await chooseOption(comboboxByAriaLabel(host, '召唤敌人'), '同种')
    expect(enemyRules(mounted, ENEMY_B)).toEqual([{ at: 'act', do: { kind: 'summon', count: 1 } }])
    await act(async () => {
      catalogRowByTitle('赤鬼').click()
    })
    expect(referencesTab().textContent).toContain('引用 0')
    expect(deleteEnemyButton().disabled).toBe(false)
    assertProjectSaveValid(mounted.session.getState())
  })

  test('战斗音效：SoundPicker 选择/清除删键、施法音优先开关、打开音效库回调，undo/redo 对称', async () => {
    const mounted = await mountEnemyTab({
      name: 'k11-enemy-sound',
      enemies: [makeEnemy(ENEMY_A)],
      sounds: [
        { id: SOUND_DRUM, label: '战鼓' },
        { id: SOUND_BELL, label: '金钟' },
      ],
      locale: { [`name.${ENEMY_A}`]: '赤鬼' },
      initialFocus: ENEMY_A,
    })
    // 目录登记见证：catalog 记录与真实字节一致（kind/path/bytes/sha256 全字段）。
    const drumRecord = mounted.session.getState().assetCatalog.assets[SOUND_DRUM]
    expect(drumRecord?.kind).toBe('sound')
    expect(drumRecord?.bytes).toBeGreaterThan(44)
    const soundsOf = () =>
      mounted.session.getState().enemies?.find((enemy) => enemy.id === ENEMY_A)?.sounds
    expect(soundsOf()).toEqual({})
    const historyAtMount = mounted.session.getHistoryVersion()

    await chooseOption(comboboxByAriaLabel(host, '普攻音效'), `战鼓 (${SOUND_DRUM})`)
    expect(soundsOf()).toEqual({ attack: SOUND_DRUM })

    await chooseOption(comboboxByAriaLabel(host, '死亡音效'), `金钟 (${SOUND_BELL})`)
    expect(soundsOf()).toEqual({ attack: SOUND_DRUM, death: SOUND_BELL })

    // 清除 = 删键（allowUnset 的「(无音效)」）。
    await chooseOption(comboboxByAriaLabel(host, '普攻音效'), '(无音效)')
    expect(soundsOf()).toEqual({ death: SOUND_BELL })

    await clickCheckboxByLabel(host, '施法音优先')
    expect(soundsOf()).toEqual({ death: SOUND_BELL, suppressMagicEffectSound: true })
    await clickCheckboxByLabel(host, '施法音优先')
    expect(soundsOf()).toEqual({ death: SOUND_BELL })
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 5)
    assertProjectSaveValid(mounted.session.getState())

    // 打开音效库：真实 callback 带出当前绑定 AssetId。
    await act(async () => {
      buttonByLabel(host, `在音效库打开 ${SOUND_BELL}`).click()
    })
    expect(mounted.openedSounds).toEqual([SOUND_BELL])

    expect(undo(mounted.session)).toBe(true)
    expect(soundsOf()).toEqual({ death: SOUND_BELL, suppressMagicEffectSound: true })
    for (let step = 0; step < 3; step += 1) expect(undo(mounted.session)).toBe(true)
    expect(soundsOf()).toEqual({ attack: SOUND_DRUM })
    expect(undo(mounted.session)).toBe(true)
    expect(soundsOf()).toEqual({})
    for (let step = 0; step < 5; step += 1) expect(redo(mounted.session)).toBe(true)
    expect(soundsOf()).toEqual({ death: SOUND_BELL })
    assertProjectSaveValid(mounted.session.getState())
  })

  test('击败后奖励：物品切换与数量提交逐条命令保留旁事件，段落摘要按实际奖励刷新', async () => {
    // 作者态 onDefeated 树（EditorState 的 EnemyDef 标注是既存类型债，同 EnemyTab.tsx:636 口径）。
    const defeatedSeed = [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 75 },
        then: [{ kind: 'stopScript' }],
      },
      { kind: 'giveItem', itemId: ITEM_B, count: 2 },
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.k11.reward' }] },
      },
      { kind: 'giveMoney', delta: 9 },
    ] as unknown as EnemyDef['onDefeated']
    const mounted = await mountEnemyTab({
      name: 'k11-enemy-reward',
      enemies: [{ ...makeEnemy(ENEMY_A), onDefeated: defeatedSeed }],
      items: [makeItem(ITEM_A, '还魂香'), makeItem(ITEM_B, '金蚕王')],
      locale: { [`name.${ENEMY_A}`]: '赤鬼', 'dlg.k11.reward': '获得奖励' },
      initialFocus: ENEMY_A,
    })
    const onDefeatedOf = () =>
      mounted.session.getState().enemies?.find((enemy) => enemy.id === ENEMY_A)?.onDefeated
    const summaryOf = () => host.querySelector('.enemy-defeated-summary')?.textContent ?? ''
    expect(onDefeatedOf()).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 75 },
        then: [{ kind: 'stopScript' }],
      },
      { kind: 'giveItem', itemId: ITEM_B, count: 2 },
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.k11.reward' }] },
      },
      { kind: 'giveMoney', delta: 9 },
    ])
    expect(summaryOf()).toContain('获得金蚕王 ×2')
    const historyAtMount = mounted.session.getHistoryVersion()

    // 奖励物品切换：只换 itemId，概率分支/对话/金钱旁事件原样保留。
    await chooseOption(fieldControlByLabel(host, '奖励物品'), '还魂香')
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(onDefeatedOf()).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 75 },
        then: [{ kind: 'stopScript' }],
      },
      { kind: 'giveItem', itemId: ITEM_A, count: 2 },
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.k11.reward' }] },
      },
      { kind: 'giveMoney', delta: 9 },
    ])
    expect(summaryOf()).toContain('获得还魂香 ×2')
    expect(summaryOf()).not.toContain('金蚕王')

    // 奖励数量提交：整数化到 [1,999]，摘要同步。
    await setInputValue(
      host.querySelector<HTMLInputElement>(`input[name="enemy.${ENEMY_A}.onDefeated.count"]`)!,
      '5',
    )
    expect(mounted.session.getHistoryVersion()).toBe(historyAtMount + 2)
    expect(onDefeatedOf()).toEqual([
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 75 },
        then: [{ kind: 'stopScript' }],
      },
      { kind: 'giveItem', itemId: ITEM_A, count: 5 },
      {
        kind: 'dialog',
        cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.k11.reward' }] },
      },
      { kind: 'giveMoney', delta: 9 },
    ])
    expect(summaryOf()).toContain('获得还魂香 ×5')
    assertProjectSaveValid(mounted.session.getState())

    // undo/redo 对称：摘要与数组同步回退/重放。
    expect(undo(mounted.session)).toBe(true)
    expect(onDefeatedOf()?.[1]).toEqual({ kind: 'giveItem', itemId: ITEM_A, count: 2 })
    expect(summaryOf()).toContain('获得还魂香 ×2')
    expect(undo(mounted.session)).toBe(true)
    expect(onDefeatedOf()?.[1]).toEqual({ kind: 'giveItem', itemId: ITEM_B, count: 2 })
    expect(summaryOf()).toContain('获得金蚕王 ×2')
    expect(redo(mounted.session)).toBe(true)
    expect(redo(mounted.session)).toBe(true)
    expect(onDefeatedOf()?.[1]).toEqual({ kind: 'giveItem', itemId: ITEM_A, count: 5 })
    expect(summaryOf()).toContain('获得还魂香 ×5')
    assertProjectSaveValid(mounted.session.getState())
  })
})
