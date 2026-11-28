// @vitest-environment jsdom
import type { LevelUpSkill, SkillData } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { type EditorState, EditSession } from '../core/edit-session.js'
import { readLevelUpRows } from '../core/level-up-commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import {
  buttonByLabel,
  loadLegalUiProject,
  setInputValue,
  useActEnvironment,
} from './__tests__/glm-ui-wave-kit.js'
import { installBrowserHardwarePorts } from './__tests__/kimi-editor-workflows/kit.js'
import {
  installLevelCurveDomPorts,
  LEVEL_CURVE_VIEWBOX_HEIGHT,
  type LevelCurveDomPort,
  restoreLevelCurveDomPorts,
} from './__tests__/level-curve-pointer-ports.js'
import { LevelCurveEditor } from './LevelCurveEditor.js'

// The fixture provides a chart rectangle at its SVG viewBox dimensions.
const PAD_TOP = 16
const PAD_BOTTOM = 34
const PLOT_H = LEVEL_CURVE_VIEWBOX_HEIGHT - PAD_TOP - PAD_BOTTOM

/** Choose the pointer position for a labelled value on the rendered axis. */
function clientYForValue(value: number, maxY: number): number {
  return PAD_TOP + PLOT_H * (1 - value / maxY)
}

interface Mounted {
  session: EditSession
  closeLog: string[]
}

function Harness(props: { session: EditSession; closeLog: string[] }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const actor = current.actors.find((entry) => entry.id === 'hero')
  if (!actor?.battler) throw new Error('blank project must have a player battler')
  return (
    <LevelCurveEditor
      actor={{ ...actor, battler: actor.battler }}
      levelUpRows={readLevelUpRows(current.levelUp, actor.id) ?? []}
      skills={Object.fromEntries(current.skills.map((skill) => [skill.id, skill]))}
      session={props.session}
      onClose={() => props.closeLog.push(actor.id)}
    />
  )
}

let root: Root
let host: HTMLDivElement
let domPort: LevelCurveDomPort

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  domPort = installLevelCurveDomPorts()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    restoreLevelCurveDomPorts()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})

function makeSkill(id: string, name: string): SkillData {
  return {
    id,
    name,
    desc: '',
    cost: { mp: 22 },
    usableOutsideBattle: false,
    target: 'allEnemies',
    effects: [],
    animation: { effectSprite: 0xffff },
  }
}

async function mountCurve(
  options: { expTable?: number[]; skills?: SkillData[]; levelUpRows?: LevelUpSkill[] } = {},
): Promise<Mounted> {
  const legal = await loadLegalUiProject('experience-curve')
  const expTable = options.expTable
  const actors = expTable
    ? legal.state.actors.map((actor) =>
        actor.id === 'hero' && actor.battler
          ? { ...actor, battler: { ...actor.battler, leveling: { expTable: [...expTable] } } }
          : actor,
      )
    : legal.state.actors
  const seeded: EditorState = {
    ...legal.state,
    actors,
    skills: options.skills ?? legal.state.skills,
    levelUp: options.levelUpRows ? { hero: options.levelUpRows } : legal.state.levelUp,
  }
  assertProjectSaveValid(seeded)
  const session = new EditSession(seeded)
  const closeLog: string[] = []
  await act(async () => {
    root.render(<Harness session={session} closeLog={closeLog} />)
    await Promise.resolve()
  })
  return { session, closeLog }
}

function chart(): SVGSVGElement {
  const svg = host.querySelector<SVGSVGElement>('svg.level-curve-chart')
  expect(svg, '曲线 svg').not.toBeNull()
  return svg!
}

function curvePoints(): SVGCircleElement[] {
  return [...host.querySelectorAll<SVGCircleElement>('circle.level-curve-point')]
}

function expTable(session: EditSession): number[] {
  const leveling = session.getState().actors[0]!.battler!.leveling
  expect(leveling, 'hero leveling').toBeDefined()
  return leveling!.expTable
}

async function pointerOn(
  target: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: PointerEventInit,
): Promise<void> {
  await act(async () => {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, ...init }))
  })
}

async function wheelOnChart(init: WheelEventInit): Promise<WheelEvent> {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
  await act(async () => {
    chart().dispatchEvent(event)
  })
  return event
}

function draftNumberInput(fieldId: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(
    `[data-field-id="${fieldId}"] input[data-ds-draft-commit="number"]`,
  )
  expect(input, `数字字段 ${fieldId}`).not.toBeNull()
  return input!
}

function selectedTotalInput(): HTMLInputElement {
  return draftNumberInput('level-curve-selected-total')
}

function viewRangeHint(): string | null {
  const hit = [...host.querySelectorAll('.level-curve-toolbar .hint')].find((candidate) =>
    /^L\d+–\d+$/.test(candidate.textContent ?? ''),
  )
  return hit?.textContent ?? null
}

function overviewButton(): HTMLButtonElement | null {
  return (
    [...host.querySelectorAll<HTMLButtonElement>('button')].find(
      (candidate) => candidate.textContent?.trim() === '🔍 全览',
    ) ?? null
  )
}

/** Y 轴刻度文案（textAnchor=end 的网格标签），量程变化的直接见证。 */
function yAxisTicks(): string[] {
  return [...chart().querySelectorAll('text')]
    .filter((tick) => tick.getAttribute('text-anchor') === 'end')
    .map((tick) => tick.textContent ?? '')
}

function curveWarning(): string | null {
  return host.querySelector('.level-curve-warning')?.textContent ?? null
}

describe('升级曲线交互', () => {
  test('拖点调值：在途只动本地草稿，松手单命令入史，undo/redo 对称还原且单拖拽恰一步', async () => {
    const { session } = await mountCurve({ expTable: [0, 15, 55] })
    const historyAtMount = session.getHistoryVersion()
    const points = curvePoints()
    expect(points).toHaveLength(3)
    expect(points[2]!.getAttribute('r')).toBe('5')

    // 按下第 2 级点：选中、指针捕获见证、精调字段出现；canonical 未动。
    await pointerOn(points[2]!, 'pointerdown', { pointerId: 1, clientX: 762, clientY: 137.5 })
    expect(domPort.pointerCaptures).toEqual([1])
    expect(points[2]!.getAttribute('r')).toBe('7')
    expect(host.textContent).toContain('第 2 级累计')
    expect(selectedTotalInput().value).toBe('55')

    // 在途见证：本地草稿与 DOM 跟随拖动，canonical 与历史保持原值。
    // （cy 为组件 y() 浮点结果，toBeCloseTo 6 位小数等价于逐位一致。）
    await pointerOn(chart(), 'pointermove', { pointerId: 1, clientY: clientYForValue(80, 100) })
    expect(selectedTotalInput().value).toBe('80')
    expect(Number(points[2]!.getAttribute('cy'))).toBeCloseTo(70, 6)
    expect(expTable(session)).toEqual([0, 15, 55])
    expect(session.getHistoryVersion()).toBe(historyAtMount)
    await pointerOn(chart(), 'pointermove', { pointerId: 1, clientY: clientYForValue(90, 100) })
    expect(selectedTotalInput().value).toBe('90')
    expect(Number(points[2]!.getAttribute('cy'))).toBeCloseTo(43, 6)
    expect(expTable(session)).toEqual([0, 15, 55])

    // 松手：一次拖拽 = 一步撤销（UpdateActorCommand 落到实际数组）。
    await pointerOn(chart(), 'pointerup', { pointerId: 1 })
    expect(session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(expTable(session)).toEqual([0, 15, 90])
    assertProjectSaveValid(session.getState())

    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(expTable(session)).toEqual([0, 15, 55])
    expect(selectedTotalInput().value).toBe('55')
    // 单拖拽只入一步：再无可撤销。
    await act(async () => {
      expect(session.undo()).toBe(false)
    })
    await act(async () => {
      expect(session.redo()).toBe(true)
    })
    expect(expTable(session)).toEqual([0, 15, 90])
    expect(selectedTotalInput().value).toBe('90')
  })

  test('拖点边界：下沿钳 0 触发回落警告、上沿外推扩量程、回拖原值与无移动松手均零提交', async () => {
    const { session } = await mountCurve({ expTable: [0, 15, 55] })
    expect(yAxisTicks()).toEqual(['0', '25', '50', '75', '100'])

    // 下沿钳 0：拖到图表底缘之下，值被钳到 0；在途与提交后回落警告同显。
    await pointerOn(curvePoints()[2]!, 'pointerdown', { pointerId: 2, clientY: 137.5 })
    await pointerOn(chart(), 'pointermove', { pointerId: 2, clientY: LEVEL_CURVE_VIEWBOX_HEIGHT })
    expect(selectedTotalInput().value).toBe('0')
    expect(curveWarning()).toBe('⚠ 曲线有回落(后级阈值低于前级),请检查')
    await pointerOn(chart(), 'pointerup', { pointerId: 2 })
    expect(expTable(session)).toEqual([0, 15, 0])
    expect(curveWarning()).toBe('⚠ 曲线有回落(后级阈值低于前级),请检查')
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(expTable(session)).toEqual([0, 15, 55])
    expect(curveWarning()).toBeNull()

    // 上沿外推：拖过顶缘不钳死，committed 值超过旧量程，Y 轴重定标到 200。
    await pointerOn(curvePoints()[2]!, 'pointerdown', { pointerId: 3, clientY: 137.5 })
    await pointerOn(chart(), 'pointermove', { pointerId: 3, clientY: 0 })
    expect(selectedTotalInput().value).toBe('106')
    await pointerOn(chart(), 'pointerup', { pointerId: 3 })
    expect(expTable(session)).toEqual([0, 15, 106])
    expect(curveWarning()).toBeNull()
    expect(yAxisTicks()).toEqual(['0', '50', '100', '150', '200'])
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(yAxisTicks()).toEqual(['0', '25', '50', '75', '100'])

    // Retracing the gesture to the original value leaves history unchanged.
    const historyBeforeRedraw = session.getHistoryVersion()
    await pointerOn(curvePoints()[1]!, 'pointerdown', { pointerId: 4, clientY: 245.5 })
    await pointerOn(chart(), 'pointermove', { pointerId: 4, clientY: clientYForValue(30, 100) })
    expect(selectedTotalInput().value).toBe('30')
    await pointerOn(chart(), 'pointermove', { pointerId: 4, clientY: clientYForValue(15, 100) })
    expect(selectedTotalInput().value).toBe('15')
    await pointerOn(chart(), 'pointerup', { pointerId: 4 })
    expect(session.getHistoryVersion()).toBe(historyBeforeRedraw)
    expect(expTable(session)).toEqual([0, 15, 55])
    expect(curveWarning()).toBeNull()

    // 无移动松手：moved=false 不提交；选中作为纯视图状态保留。
    await pointerOn(curvePoints()[0]!, 'pointerdown', { pointerId: 5, clientY: 286 })
    await pointerOn(chart(), 'pointerup', { pointerId: 5 })
    expect(session.getHistoryVersion()).toBe(historyBeforeRedraw)
    expect(host.textContent).toContain('第 0 级累计')
    expect(selectedTotalInput().value).toBe('0')
    expect(domPort.pointerCaptures).toEqual([2, 3, 4, 5])
  })

  test('取消指针手势后恢复已保存曲线，下一次松手不提交旧草稿', async () => {
    const { session } = await mountCurve({ expTable: [0, 15, 55] })

    await pointerOn(curvePoints()[2]!, 'pointerdown', { pointerId: 7, clientY: 137.5 })
    await pointerOn(chart(), 'pointermove', { pointerId: 7, clientY: clientYForValue(80, 100) })
    expect(selectedTotalInput().value).toBe('80')
    await pointerOn(chart(), 'pointercancel', { pointerId: 7 })
    expect(selectedTotalInput().value).toBe('55')

    await pointerOn(chart(), 'pointerup', { pointerId: 7 })
    expect(session.getHistoryVersion()).toBe(0)
    expect(expTable(session)).toEqual([0, 15, 55])
  })

  test('滚轮锚点缩放与空白平移只调视窗：clamp/全览恢复，canonical 与历史全程零变化', async () => {
    // Opening an actor without authored leveling draws a preview without a write.
    const { session } = await mountCurve()
    const historyAtMount = session.getHistoryVersion()
    expect(curvePoints()).toHaveLength(20)
    expect(viewRangeHint()).toBeNull()
    expect(overviewButton()).toBeNull()
    expect(session.getState().actors[0]!.battler!.leveling).toBeUndefined()

    // 全览态继续缩小（deltaY>0 拉大量程）被 clamp 回 null：视窗不动。
    const prevented = await wheelOnChart({ deltaY: 100, clientX: 407 })
    expect(prevented.defaultPrevented).toBe(true)
    expect(viewRangeHint()).toBeNull()
    expect(curvePoints()).toHaveLength(20)

    // 左缘锚定放大：clientX=52=PAD.l → 锚为 L0，视窗 {0, 15.2}。
    await wheelOnChart({ deltaY: -100, clientX: 52 })
    expect(viewRangeHint()).toBe('L0–15')
    expect(overviewButton()).not.toBeNull()
    expect(curvePoints()).toHaveLength(18)

    // 触控板横滑平移一格视窗宽度：clamp 到 {3.8, 19}；回滑复原。
    await wheelOnChart({ deltaX: 710, deltaY: 0, clientX: 52 })
    expect(viewRangeHint()).toBe('L4–19')
    expect(curvePoints()).toHaveLength(18)
    await wheelOnChart({ deltaX: -710, deltaY: 0, clientX: 52 })
    expect(viewRangeHint()).toBe('L0–15')

    // 继续放大到 {0, 12.16}，再两步缩小回全览。
    await wheelOnChart({ deltaY: -100, clientX: 52 })
    expect(viewRangeHint()).toBe('L0–12')
    expect(curvePoints()).toHaveLength(15)
    await wheelOnChart({ deltaY: 100, clientX: 52 })
    expect(viewRangeHint()).toBe('L0–15')
    await wheelOnChart({ deltaY: 100, clientX: 52 })
    expect(viewRangeHint()).toBeNull()
    expect(curvePoints()).toHaveLength(20)

    // 全览按钮同样恢复 null 视窗。
    await wheelOnChart({ deltaY: -100, clientX: 52 })
    expect(viewRangeHint()).toBe('L0–15')
    await act(async () => {
      overviewButton()!.click()
    })
    expect(viewRangeHint()).toBeNull()
    expect(curvePoints()).toHaveLength(20)

    await wheelOnChart({ deltaY: -100, clientX: 52 })
    await pointerOn(chart(), 'pointerdown', { pointerId: 8, clientX: 407 })
    await pointerOn(chart(), 'pointermove', { pointerId: 8, clientX: 265 })
    expect(viewRangeHint()).toBe('L3–18')
    await pointerOn(chart(), 'pointermove', { pointerId: 8, clientX: 265 })
    expect(viewRangeHint()).toBe('L3–18')
    await pointerOn(chart(), 'pointerup', { pointerId: 8 })

    // 全部视窗交互纯浏览：零提交、leveling 仍未物化。
    expect(session.getHistoryVersion()).toBe(historyAtMount)
    expect(session.getState().actors[0]!.battler!.leveling).toBeUndefined()
  })

  test('缩短曲线后，右端的旧视窗仍能显示当前全部等级', async () => {
    const { session } = await mountCurve()
    await wheelOnChart({ deltaY: -100, clientX: 762 })
    expect(viewRangeHint()).toBe('L4–19')

    await setInputValue(draftNumberInput('level-curve-count'), '2')

    expect(expTable(session)).toEqual([0, 15])
    expect(curvePoints()).toHaveLength(2)
    expect(viewRangeHint()).toBeNull()
  })

  test('级数改级落到实际数组：加长按末段增量外推、缩短截断、同值与越界草稿零提交', async () => {
    const { session } = await mountCurve({ expTable: [0, 15, 55] })
    const historyAtMount = session.getHistoryVersion()

    // 加长 3→5：末段增量 40 外推，实际数组精确落账；undo/redo 回显 canonical。
    await setInputValue(draftNumberInput('level-curve-count'), '5')
    expect(session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(expTable(session)).toEqual([0, 15, 55, 95, 135])
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(expTable(session)).toEqual([0, 15, 55])
    expect(draftNumberInput('level-curve-count').value).toBe('3')
    await act(async () => {
      expect(session.redo()).toBe(true)
    })
    expect(expTable(session)).toEqual([0, 15, 55, 95, 135])
    expect(draftNumberInput('level-curve-count').value).toBe('5')

    // 缩短 5→2：截断而非重算。
    await setInputValue(draftNumberInput('level-curve-count'), '2')
    expect(expTable(session)).toEqual([0, 15])

    // 同值草稿：controller 短路，零提交。
    const historyBeforeSame = session.getHistoryVersion()
    await setInputValue(draftNumberInput('level-curve-count'), '2')
    expect(session.getHistoryVersion()).toBe(historyBeforeSame)
    expect(expTable(session)).toEqual([0, 15])

    // 越界草稿被字段守卫拒绝（enforceRange min=2）：草稿保留并标 invalid，零提交。
    await setInputValue(draftNumberInput('level-curve-count'), '1')
    expect(session.getHistoryVersion()).toBe(historyBeforeSame)
    expect(expTable(session)).toEqual([0, 15])
    expect(draftNumberInput('level-curve-count').value).toBe('1')
    expect(draftNumberInput('level-curve-count').title).toBe('不能小于 2。')
    expect(draftNumberInput('level-curve-count').getAttribute('aria-invalid')).toBe('true')

    // 恢复合法输入：2 级表的末段增量 15 外推到 4 级。
    await setInputValue(draftNumberInput('level-curve-count'), '4')
    expect(expTable(session)).toEqual([0, 15, 30, 45])
    assertProjectSaveValid(session.getState())
  })

  test('按增量生成与点选精调提交实际数组；学技能标记渲染与返回入口', async () => {
    const { session, closeLog } = await mountCurve({
      expTable: [0, 15, 55],
      skills: [makeSkill('352', '三尸咒'), makeSkill('353', '风咒')],
      levelUpRows: [
        { level: 1, skillId: '352' },
        { level: 2, skillId: '353' },
      ],
    })
    // Both marks read the actual author skill table.
    const marks = [...chart().querySelectorAll('text[font-size="10"]')].map(
      (mark) => mark.textContent,
    )
    expect(marks).toEqual(['三尸咒', '风咒'])

    // Ten points per level produce the whole curve, including the index-zero sentinel.
    const historyAtMount = session.getHistoryVersion()
    await setInputValue(host.querySelector<HTMLInputElement>('#level-curve-generator-first')!, '10')
    await setInputValue(host.querySelector<HTMLInputElement>('#level-curve-generator-step')!, '0')
    expect(session.getHistoryVersion()).toBe(historyAtMount)
    await act(async () => {
      buttonByLabel(host, '⚡ 按增量生成').click()
    })
    expect(session.getHistoryVersion()).toBe(historyAtMount + 1)
    expect(expTable(session)).toEqual([0, 10, 20])
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(expTable(session)).toEqual([0, 15, 55])
    await act(async () => {
      expect(session.redo()).toBe(true)
    })
    expect(expTable(session)).toEqual([0, 10, 20])

    // 点选精调：按下即选（无移动松手零提交），第 1 级累计字段提交实际数组。
    const historyBeforePick = session.getHistoryVersion()
    await pointerOn(curvePoints()[1]!, 'pointerdown', { pointerId: 6, clientY: 259 })
    await pointerOn(chart(), 'pointerup', { pointerId: 6 })
    expect(session.getHistoryVersion()).toBe(historyBeforePick)
    expect(host.textContent).toContain('第 1 级累计')
    expect(selectedTotalInput().value).toBe('10')

    // 负数草稿被 min=0 守卫拒绝，零提交。
    await setInputValue(selectedTotalInput(), '-5')
    expect(session.getHistoryVersion()).toBe(historyBeforePick)
    expect(selectedTotalInput().title).toBe('不能小于 0。')
    expect(expTable(session)).toEqual([0, 10, 20])

    // 合法精调 40：破坏非递减 → 回落警告出现；undo 后警告消失且字段回显。
    await setInputValue(selectedTotalInput(), '40')
    expect(expTable(session)).toEqual([0, 40, 20])
    expect(curveWarning()).toBe('⚠ 曲线有回落(后级阈值低于前级),请检查')
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(expTable(session)).toEqual([0, 10, 20])
    expect(curveWarning()).toBeNull()
    expect(selectedTotalInput().value).toBe('10')
    assertProjectSaveValid(session.getState())

    // 返回入口：真实 onClose 回传当前角色 id。
    await act(async () => {
      buttonByLabel(host, '返回精灵帧').click()
    })
    expect(closeLog).toEqual(['hero'])
  })
})
