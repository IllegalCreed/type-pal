// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K09：SkillTab 技能生命周期工作流补测（锚 SkillTab.tsx:896/1011/1048）。
 *
 * 旧断言去重（旧 file/title → 已证合同 → 本组缺口；已证族登记 existing-proof 不复制）：
 * - SkillTab.test.tsx（assetBase/assetReader 为字面量替身，vi.mock TrancePreview/SummonPreview）：
 *   - '目录第二行保留原始数值 SkillId' / '目录搜索覆盖命中…不偷换被过滤的选择' /
 *     '检查器使用共享引用/说明 Tab 完整键盘与 ARIA 合同' / '战斗中试放…' → 目录/搜索/检查器/试放
 *     已证；existing-proof，不重复。
 *   - '可新建、编辑，并由 object 深链精确定位' → 已证 prompt 成功命名、id 1000 空位分配、undo；
 *     缺口：prompt 取消/纯空白零提交、id 1000 被占时递增 1001、AddSkillCommand 缺省字段完整
 *     深比较、新建后选中/焦点（本文件 test 3）。
 *   - '使用共享 Hero 与方角目录行，无引用时可删除并撤销' → 已证单技能删除+undo；
 *     缺口：删除后选中回退（后继/前驱）、onObjectFocus/onStatusNotice(undefined)、undo 按原索引
 *     还原多技能数组顺序（本文件 test 1/4）。
 *   - '显示、添加、改量、删除均保留兄弟成本…' / '悬空引用显式报警且可改选' / '空物品表时添加按钮
 *     禁用' / '一生限用…' / 动画三例 / '[reorder-family:skill-effects]…' / '敌方分支不显示 prepare…'
 *     → 消耗物品/一生限用/动画/效果链/敌方分支全部已证；existing-proof，不重复。
 *   - 'checking/stale/failed 快照不冒充零引用并禁用删除' / 'current 但索引缺失时按 error/unknown
 *     fail-closed' → 引用状态门禁已证；existing-proof。
 *   - '展示为零后删除仍读取 live canonical learnSkill' → 已证 canonical 脚本引用阻断删除（伪造
 *     state + objectContaining 断言）；缺口：合法 blank 项目内真实 battle-data 引用（人物初始
 *     仙术）经渲染期面板 → 真实命令解除 → 删除放行的完整链（test 1），以及渲染期索引落后时
 *     精确 notice 文本 + 历史版本/选中/技能数组深快照保全（test 2）。
 *   - 'live oracle 失败时保留技能并显示具体错误' → 已证 provider 抛错路径；existing-proof。
 * - SkillTab.glm-ui-wave.test.tsx（合法项目 + 同一 vi.mock 预览边界）：
 *   - '删除确认取消 → 零提交' / '添加效果提交缺省 damage…' / '效果类型切换…召唤缺精灵报错零提交' /
 *     'gate 概率参数…目录行点击传出 onObjectFocus' / '目标/战外可用/说明提交；玩家施法分支增删…'
 *     → 全部已证；existing-proof，不重复。
 *
 * 主动放弃的分支（合法 UI 不可达，举证不伪造）：
 * - SkillTab.tsx:1013-1023 removeSkill 的 `!referenceReady` 与 `references.length` 早退：删除按钮
 *   在同条件下 disabled（SkillTab.tsx:1121），DOM 无法触发；disabled 形态已由上述旧测试证明。
 * - SkillTab.tsx:1029-1032 `changed === false`：DeleteSkillCommand.apply 仅当技能不在 state 时
 *   返回原 state（skill-commands.ts:117-118），而渲染中的 skill 必然存在 → 防御分支不可达。
 *
 * 本文件全部走真实组件 DOM → EditSession/commands/EditorAssetReader + 合法 blank 项目
 * （loadLegalUiProject + assertProjectSaveValid 自证），引用索引为 collectCurrentProjectReferenceIndex
 * 真实重算；不 mock 任何被测组件/命令/reader。技能 fixture 用 0xffff 无特效哨兵让 FIRE 预览停在
 * 不播放分支（该哨兵语义已有旧测试证明），与 FIRE 预览加载链无关。唯一替身：kit 浏览器硬件端口
 * （Node Blob/crypto，仅 blank seed 的 gzip/sha256 需要）。
 */
import type { SkillData } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { UpdateActorCommand } from '../core/commands.js'
import { type EditorState, EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import {
  buttonByLabel,
  clickButton,
  deepSnapshot,
  fieldControlByLabel,
  loadLegalUiProject,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import { SkillTab } from './SkillTab.js'

interface Notice {
  kind: 'info' | 'error'
  message: string
}

interface Mounted {
  session: EditSession
  focusLog: Array<string | undefined>
  notices: Array<Notice | undefined>
  openedReferences: ProjectReferenceEdge[]
  /** 钉住渲染期引用索引（模拟父级尚未刷新快照的合法窗口）；置回 undefined 即恢复实时重算。 */
  pinnedReferenceIndex: { current: ProjectReferenceIndex | undefined }
  rerender: () => Promise<void>
}

function Harness(props: {
  session: EditSession
  assetBase: AssetBase
  reader: EditorAssetReader
  pinnedReferenceIndex: { current: ProjectReferenceIndex | undefined }
  focusLog: Array<string | undefined>
  notices: Array<Notice | undefined>
  openedReferences: ProjectReferenceEdge[]
  initialFocus?: string
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const [focus, setFocus] = useState<string | undefined>(props.initialFocus)
  return (
    <SkillTab
      skills={current.skills}
      items={current.items}
      session={props.session}
      assetBase={props.assetBase}
      assetCatalog={current.assetCatalog}
      assetReader={props.reader}
      battleSprites={current.battleSprites}
      referenceIndex={
        props.pinnedReferenceIndex.current ?? collectCurrentProjectReferenceIndex(current)
      }
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      focusObjectId={focus}
      onObjectFocus={(id) => {
        props.focusLog.push(id)
        setFocus(id)
      }}
      onStatusNotice={(notice) => props.notices.push(notice)}
      onOpenReference={(reference) => props.openedReferences.push(reference)}
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

function makeSkill(id: string, name: string, effects: SkillData['effects'] = []): SkillData {
  return {
    id,
    name,
    desc: '',
    cost: { mp: 22 },
    usableOutsideBattle: false,
    target: 'allEnemies',
    effects,
    // 0xffff = 无特效哨兵：本组合同与 FIRE 预览无关，预览停在不播放分支不产生异步读取。
    animation: { effectSprite: 0xffff },
  }
}

async function mountSkillTab(options: {
  skills: SkillData[]
  heroInitialMagic?: readonly string[]
  focus?: string
}): Promise<Mounted> {
  const legal = await loadLegalUiProject('kimi-k09-skill')
  const initialMagic = options.heroInitialMagic
  const actors = initialMagic
    ? legal.state.actors.map((actor) =>
        actor.id === 'hero' && actor.battler
          ? { ...actor, battler: { ...actor.battler, initialMagic: [...initialMagic] } }
          : actor,
      )
    : legal.state.actors
  const seeded: EditorState = { ...legal.state, actors, skills: options.skills }
  assertProjectSaveValid(seeded)
  const session = new EditSession(seeded)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const focusLog: Array<string | undefined> = []
  const notices: Array<Notice | undefined> = []
  const openedReferences: ProjectReferenceEdge[] = []
  const pinnedReferenceIndex: { current: ProjectReferenceIndex | undefined } = {
    current: undefined,
  }
  const rerender = async (): Promise<void> => {
    await act(async () => {
      root.render(
        <Harness
          session={session}
          assetBase={legal.assetBase}
          reader={reader}
          pinnedReferenceIndex={pinnedReferenceIndex}
          focusLog={focusLog}
          notices={notices}
          openedReferences={openedReferences}
          initialFocus={options.focus}
        />,
      )
      await Promise.resolve()
    })
  }
  await rerender()
  return { session, focusLog, notices, openedReferences, pinnedReferenceIndex, rerender }
}

function heroTitle(): string | undefined {
  return host.querySelector('.ds-object-hero__title')?.textContent
}

function deleteButton(): HTMLButtonElement {
  return buttonByLabel(host, '删除技能')
}

function referencePanel(): HTMLElement {
  const panel = host.querySelector<HTMLElement>('.ds-reference-panel')
  expect(panel, '引用面板').not.toBeNull()
  return panel!
}

function catalogRowByTitle(title: string): HTMLElement {
  const row = [...host.querySelectorAll<HTMLElement>('.ds-catalog-row')].find(
    (candidate) => candidate.querySelector('.ds-catalog-row__title')?.textContent === title,
  )
  expect(row, `目录行 ${title}`).toBeDefined()
  return row!
}

function skillIds(session: EditSession): string[] {
  return session.getState().skills.map((entry) => entry.id)
}

describe('K09 SkillTab 引用与生命周期工作流', () => {
  test('引用在途：面板列出真实初始仙术引用且删除禁用、表单照可提交；真实命令解除引用后删除放行并 undo/redo 对称', async () => {
    const mounted = await mountSkillTab({
      skills: [makeSkill('100', '三尸咒'), makeSkill('101', '罡风咒')],
      heroInitialMagic: ['100'],
    })
    const { session } = mounted
    expect(heroTitle()).toBe('三尸咒')

    // 真实引用索引落到面板：初始仙术引用行字段完整，可定位并回传真实 edge。
    expect(referencePanel().getAttribute('data-state')).toBe('ready')
    expect(host.querySelector('.ds-reference-panel__count')?.textContent).toBe('1 处')
    expect(host.querySelector('.ds-reference-panel__description')?.textContent).toBe(
      '解除角色、道具、敌人或开局配置中的引用后才能删除。',
    )
    const tabLabels = [...host.querySelectorAll<HTMLElement>('[role="tab"]')].map((tab) =>
      tab.textContent?.trim(),
    )
    expect(tabLabels).toContain('引用 1')
    const row = referencePanel().querySelector<HTMLElement>('.ds-reference-row')!
    expect(row.querySelector('.ds-reference-row__title')?.textContent).toBe('人物 hero')
    expect(row.querySelector('.ds-reference-row__detail')?.textContent).toBe('初始仙术')
    expect(row.querySelector('.ds-reference-row__path')?.textContent).toBe(
      'actors[0](hero).battler.initialMagic[0]',
    )
    // 可定位引用行整行即动作按钮（data-actionable），点击回传真实 edge。
    expect(row.getAttribute('data-actionable')).toBe('true')
    expect(row.querySelector('.ds-reference-row__trailing')?.textContent).toContain('打开')
    await act(async () => {
      row.click()
    })
    expect(mounted.openedReferences).toHaveLength(1)
    expect(mounted.openedReferences[0]!.where).toBe('actors[0](hero).battler.initialMagic[0]')

    expect(deleteButton().disabled).toBe(true)
    expect(deleteButton().title).toBe('仍有 1 处引用，请先从右侧处理')

    // 引用在途不冻结表单：改名/耗真气经真实 UpdateSkillCommand 提交，undo 对称还原。
    await setInputValue(fieldControlByLabel(host, '名字'), '三尸咒·改')
    expect(session.getState().skills[0]!.name).toBe('三尸咒·改')
    await setInputValue(fieldControlByLabel<HTMLInputElement>(host, '耗真气'), '33')
    expect(session.getState().skills[0]!.cost.mp).toBe(33)
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().skills[0]!.cost.mp).toBe(22)
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().skills[0]!.name).toBe('三尸咒')

    // 真实命令解除引用（UpdateActorCommand 清空 initialMagic）→ 索引重算 → 删除放行。
    const hero = session.getState().actors.find((entry) => entry.id === 'hero')!
    const beforeUnlink = session.getHistoryVersion()
    await act(async () => {
      session.dispatch(
        new UpdateActorCommand('hero', {
          battler: { ...hero.battler!, initialMagic: [] },
        }),
      )
    })
    expect(session.getHistoryVersion()).toBe(beforeUnlink + 1)
    expect(referencePanel().getAttribute('data-state')).toBe('empty')
    expect(host.querySelector('.ds-reference-panel__description')?.textContent).toBe(
      '当前技能可以安全删除。',
    )
    expect(referencePanel().querySelector('.ds-reference-row')).toBeNull()
    expect(deleteButton().disabled).toBe(false)
    expect(deleteButton().title).toBe('删除技能')
    expect(heroTitle()).toBe('三尸咒')
    expect(mounted.focusLog).toEqual([])

    // 删除成功：选中回退到后继、焦点传出、通知清零、历史单步。
    const skillsBeforeDelete = deepSnapshot(session.getState().skills)
    const noticesBeforeDelete = mounted.notices.length
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const beforeDelete = session.getHistoryVersion()
    await clickButton(host, '删除技能')
    expect(session.getHistoryVersion()).toBe(beforeDelete + 1)
    expect(skillIds(session)).toEqual(['101'])
    expect(heroTitle()).toBe('罡风咒')
    expect(mounted.focusLog).toEqual(['101'])
    expect(mounted.notices.length).toBe(noticesBeforeDelete + 1)
    expect(mounted.notices.at(-1)).toBeUndefined()
    assertProjectSaveValid(session.getState())

    // undo 按原索引完整还原；redo 再删。
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().skills).toEqual(skillsBeforeDelete)
    assertProjectSaveValid(session.getState())
    await act(async () => {
      expect(session.redo()).toBe(true)
    })
    expect(skillIds(session)).toEqual(['101'])
  })

  test('渲染期索引落后于 canonical 时删除被 live oracle 阻断：notice 精确、技能/历史/选中保全，索引刷新后删除禁用', async () => {
    const mounted = await mountSkillTab({
      skills: [makeSkill('100', '三尸咒'), makeSkill('101', '罡风咒')],
    })
    const { session } = mounted
    // 钉住当前（零引用）渲染期索引：合法 prop 快照，模拟父级尚未刷新的窗口。
    mounted.pinnedReferenceIndex.current = collectCurrentProjectReferenceIndex(session.getState())
    await mounted.rerender()
    expect(deleteButton().disabled).toBe(false)

    // 真实命令在渲染期索引之外新增引用（竞态窗口），渲染期索引仍为零引用。
    const hero = session.getState().actors.find((entry) => entry.id === 'hero')!
    await act(async () => {
      session.dispatch(
        new UpdateActorCommand('hero', {
          battler: { ...hero.battler!, initialMagic: ['100'] },
        }),
      )
    })
    expect(deleteButton().disabled).toBe(false)

    // 删除被 DeleteSkillCommand 的 live oracle 阻断：失败保真，零污染。
    const skillsBefore = deepSnapshot(session.getState().skills)
    const historyBefore = session.getHistoryVersion()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await clickButton(host, '删除技能')
    expect(mounted.notices.at(-1)).toEqual({
      kind: 'error',
      message: '仍有 1 处引用，无法删除。',
    } satisfies Notice)
    expect(session.getState().skills).toEqual(skillsBefore)
    expect(session.getHistoryVersion()).toBe(historyBefore)
    expect(heroTitle()).toBe('三尸咒')
    expect(mounted.focusLog).toEqual([])

    // 父级刷新索引后：真实引用行出现，删除禁用（fail-closed 回落）。
    mounted.pinnedReferenceIndex.current = undefined
    await mounted.rerender()
    expect(referencePanel().getAttribute('data-state')).toBe('ready')
    expect(referencePanel().querySelector('.ds-reference-row__title')?.textContent).toBe(
      '人物 hero',
    )
    expect(deleteButton().disabled).toBe(true)
  })

  test('新建技能：prompt 取消与纯空白零提交；id 冲突递增 1001，缺省字段完整落账且选中/焦点/undo/redo 对称', async () => {
    const mounted = await mountSkillTab({
      skills: [makeSkill('352', '三尸咒'), makeSkill('1000', '占位技能')],
      focus: '352',
    })
    const { session } = mounted
    const prompt = vi.spyOn(window, 'prompt')
    expect(heroTitle()).toBe('三尸咒')

    // 取消侧：null 与纯空白都不产生命令（addSkill trim 守卫）。
    prompt.mockReturnValue(null)
    const historyAtMount = session.getHistoryVersion()
    await clickButton(host, '新建技能')
    prompt.mockReturnValue('   ')
    await clickButton(host, '新建技能')
    expect(session.getHistoryVersion()).toBe(historyAtMount)
    expect(skillIds(session)).toEqual(['352', '1000'])
    expect(heroTitle()).toBe('三尸咒')
    expect(mounted.focusLog).toEqual([])

    // 成功侧：1000 被占 → 分配 1001；AddSkillCommand 缺省字段完整深比较。
    prompt.mockReturnValue(' 御剑术 ')
    await clickButton(host, '新建技能')
    expect(session.getState().skills).toHaveLength(3)
    expect(session.getState().skills[2]).toEqual({
      id: '1001',
      name: '御剑术',
      desc: '',
      cost: { mp: 10 },
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [{ kind: 'damage', power: 20, elemental: 0 }],
      animation: {
        effectSprite: 0,
        placement: 'normal',
        xOffset: 0,
        yOffset: 0,
        speed: 0,
        fireDelay: 0,
        effectTimes: 0,
        shake: 0,
      },
    } satisfies SkillData)
    expect(session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(heroTitle()).toBe('御剑术')
    expect(mounted.focusLog).toEqual(['1001'])
    // 新建技能缺省动画带 FIRE 特效号 0，实时预览经真实 assetBase 异步加载后落定（与本组合同无关）。
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(skillIds(session)).toEqual(['352', '1000'])
    // 被撤销的选择目标不存在 → 工作区回落到目录首行，不残留空 hero。
    expect(heroTitle()).toBe('三尸咒')
    await act(async () => {
      expect(session.redo()).toBe(true)
    })
    expect(skillIds(session)).toEqual(['352', '1000', '1001'])
  })

  test('删除选中回退：删中间落到后继、删末尾落到前驱，undo 按原索引还原数组顺序', async () => {
    const mounted = await mountSkillTab({
      skills: [makeSkill('100', '甲咒'), makeSkill('101', '乙咒'), makeSkill('102', '丙咒')],
    })
    const { session } = mounted
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await act(async () => {
      catalogRowByTitle('乙咒').click()
    })
    expect(heroTitle()).toBe('乙咒')

    // 删中间（101）：选中回退到后继 102。
    const beforeMiddle = session.getHistoryVersion()
    await clickButton(host, '删除技能')
    expect(session.getHistoryVersion()).toBe(beforeMiddle + 1)
    expect(skillIds(session)).toEqual(['100', '102'])
    expect(heroTitle()).toBe('丙咒')
    expect(mounted.focusLog.at(-1)).toBe('102')
    expect(mounted.notices.at(-1)).toBeUndefined()

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(skillIds(session)).toEqual(['100', '101', '102'])
    await act(async () => {
      expect(session.redo()).toBe(true)
    })
    expect(skillIds(session)).toEqual(['100', '102'])

    // 删末尾（102）：选中回退到前驱 100。
    await clickButton(host, '删除技能')
    expect(skillIds(session)).toEqual(['100'])
    expect(heroTitle()).toBe('甲咒')
    expect(mounted.focusLog.at(-1)).toBe('100')
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(skillIds(session)).toEqual(['100', '102'])
  })
})
