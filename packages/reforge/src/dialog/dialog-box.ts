/**
 * 对话框渲染(② 外观 Task 6:slot 共存模型)。
 * 逐段推进 + top/bottom 多槽:同槽覆盖、异槽共存。位置真值 GLM spec §3。
 * 每段话在它的 slot 内自动折行(layoutLines)+ 按 4 显示行/页分页,翻页只翻活跃槽。
 */
import { lookupText, type TextSpan, zhLocale } from '@type-pal/content'
import type { Palette, RleFrame } from '@type-pal/shared'
import { advanceLine, type DialogueState } from '../dialogue.js'
import type { GlyphTable } from '../text/glyph.js'
import { indexToRgba, TITLE_COLOR_INDEX } from '../text/palette-color.js'
import { measureSpans, renderSpans } from '../text/text-render.js'
import { charsShown, countChars, DEFAULT_SPEED_MS } from '../text/typewriter.js'
import { bakeCursorTinted, CURSOR_COLOR_COUNT, CURSOR_COLOR_START } from './dialog-assets.js'
import { type DisplayLine, layoutLines } from './layout.js'
import { advanceSlots, emptySlots, type SlotId, type SlotState } from './slot.js'

// GLM spec §3 布局真值(320×200 坐标系)
const LINE_HEIGHT = 18
const LINES_PER_PAGE = 4 // spec §3:MAX_LINES_PER_PAGE
const POS = {
  bottom: { text: { x: 44, y: 126 }, title: { x: 12, y: 108 } }, // 无头像
  top: { text: { x: 44, y: 26 }, title: { x: 12, y: 8 } },
} as const
const MAX_RIGHT = 308 // 正文右边距 → 每行可用 264px

/** 单个 slot 的排版渲染态(slot.ts 管 lineIdx,这里管该段的排版)。 */
interface SlotRender {
  displayLines: DisplayLine[]
  pageStart: number
}

export class DialogBox {
  private state: DialogueState | null = null
  private slots: SlotState = emptySlots()
  private renders: Partial<Record<SlotId, SlotRender>> = {}
  private lineStartMs = 0
  /** 活跃槽当前页是否已全显(fUserSkip 两段式)。 */
  private pageDone = false

  private cursorBaked: HTMLCanvasElement[] = []

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly glyphs: GlyphTable,
    private readonly palette: Palette,
    private readonly cursorFrames: RleFrame[],
  ) {}

  get active(): boolean {
    return this.state !== null
  }

  /** 把第 idx 段话排版进它的 slot,返回该 slot 的渲染态。 */
  private layoutLineInto(lineIdx: number): { slot: SlotId; render: SlotRender } {
    const line = this.state!.dialogue.lines[lineIdx]!
    const slot: SlotId = line.slot ?? 'bottom'
    const displayLines = layoutLines(
      [line],
      this.glyphs,
      (id) => lookupText(id, zhLocale),
      MAX_RIGHT,
      POS[slot].text.x,
    )
    return { slot, render: { displayLines, pageStart: 0 } }
  }

  open(state: DialogueState, nowMs: number): void {
    this.state = state
    this.slots = emptySlots()
    this.renders = {}
    // 第一段话进它的 slot
    this.slots = advanceSlots(this.slots, state.dialogue.lines[0]!, 0)
    const { slot, render } = this.layoutLineInto(0)
    this.renders[slot] = render
    this.lineStartMs = nowMs
    this.pageDone = false
  }

  /**
   * 按 space(sdlpal fUserSkip 两段式 + slot 推进):
   * 1. 活跃槽未全显 → 瞬显该页。
   * 2. 活跃槽该段话还有下一页 → 翻该槽页。
   * 3. 该段话翻完 → 推进下一段话进它的 slot(同槽覆盖/异槽共存);对话结束 → 清所有。
   */
  advance(nowMs: number): void {
    if (!this.state) return
    if (!this.pageDone) {
      this.pageDone = true
      return
    }
    const active = this.slots.activeSlot
    const r = this.renders[active]
    if (r && r.pageStart + LINES_PER_PAGE < r.displayLines.length) {
      // 该段话还有下一页
      r.pageStart += LINES_PER_PAGE
      this.lineStartMs = nowMs
      this.pageDone = false
      return
    }
    // 该段话翻完 → 推进下一段话。但若该段有 autoAdvance(尾停顿),
    // sdlpal 真值(spec §Bug3):尾停顿不可加速,玩家按 space = noop,必须等 update 自动推进。
    if (this.activeAutoAdvance() !== undefined) return
    this.advanceToNextLine(nowMs)
  }

  /** 推进到下一段话(advance 第3段 + autoAdvance 共用)。对话结束 → 清所有 slot。 */
  private advanceToNextLine(nowMs: number): void {
    const next = advanceLine(this.state!) // dialogue.ts 逐段指针推进
    if (!next) {
      this.close()
      return
    }
    this.state = next
    const nextIdx = next.lineIdx
    const line = next.dialogue.lines[nextIdx]!
    this.slots = advanceSlots(this.slots, line, nextIdx)
    const { slot, render } = this.layoutLineInto(nextIdx)
    this.renders[slot] = render // 同槽覆盖(替换 render)/异槽新建(旧 render 不动)
    this.lineStartMs = nowMs
    this.pageDone = false
  }

  private close(): void {
    this.state = null
    this.slots = emptySlots()
    this.renders = {}
  }

  /** 活跃槽当前段话的 DialogueLine(取 speed/autoAdvance 用)。 */
  private activeLine() {
    if (!this.state) return undefined
    const r = this.renders[this.slots.activeSlot]
    if (!r) return undefined
    const lastDl = r.displayLines[r.displayLines.length - 1]
    return this.state.dialogue.lines[lastDl?.srcLineIdx ?? 0]
  }

  /** 活跃槽当前段话的 autoAdvance(undefined = 无,等键)。 */
  private activeAutoAdvance(): number | undefined {
    return this.activeLine()?.autoAdvance
  }

  /** autoAdvance:活跃槽该段话翻完 + 有 autoAdvance + 过尾停顿 → 自动推进下一段。 */
  private update(nowMs: number): void {
    if (!this.state || !this.pageDone) return
    const active = this.slots.activeSlot
    const r = this.renders[active]
    if (!r) return
    const line = this.activeLine()
    const auto = line?.autoAdvance
    if (auto === undefined) return
    // 活跃段话整页打字耗时 + autoAdvanceMs(此 slot 该段话,逐显示行串行)
    const page = r.displayLines.slice(r.pageStart, r.pageStart + LINES_PER_PAGE)
    const totalChars = page.reduce((sum, dl) => sum + countChars(dl.spans), 0)
    const speed = line?.speed ?? DEFAULT_SPEED_MS
    const doneAt = totalChars * speed + auto
    if (nowMs - this.lineStartMs >= doneAt) this.advanceToNextLine(nowMs)
  }

  render(nowMs: number): void {
    this.update(nowMs)
    if (!this.state) return
    // 画两个 slot(top 和 bottom),留显的全字、活跃的按打字进度
    for (const slotId of ['bottom', 'top'] as const) {
      const entry = this.slots[slotId]
      const r = this.renders[slotId]
      if (!entry || !r) continue
      const isActive = slotId === this.slots.activeSlot
      this.renderSlot(slotId, r, isActive, nowMs)
    }
  }

  /** 画单个 slot:姓名牌 + 正文(留显全字 / 活跃打字)+ 活跃槽的光标。 */
  private renderSlot(slotId: SlotId, r: SlotRender, isActive: boolean, nowMs: number): void {
    const pos = POS[slotId]
    const page = r.displayLines.slice(r.pageStart, r.pageStart + LINES_PER_PAGE)
    if (page.length === 0) return

    // 姓名牌:该 slot 当前段话首行的 speaker(同段跨页常驻)
    const firstDl = page[0]
    const line = this.state!.dialogue.lines[firstDl?.srcLineIdx ?? 0]
    if (line?.speaker) {
      const nameSpans: TextSpan[] = [{ text: `${lookupText(line.speaker, zhLocale)}：` }]
      renderSpans(this.ctx, nameSpans, pos.title.x, pos.title.y, {
        glyphs: this.glyphs,
        palette: this.palette,
        shadow: true,
        forceColorIndex: TITLE_COLOR_INDEX,
      })
    }

    let ty = pos.text.y
    const speed = line?.speed ?? DEFAULT_SPEED_MS // 该段话打字速度(变速)
    const elapsed = isActive ? nowMs - this.lineStartMs : Number.POSITIVE_INFINITY // 留显槽全字
    let charsBefore = 0
    let allDone = true
    for (const dl of page) {
      const rowLen = countChars(dl.spans)
      const limit = !isActive
        ? rowLen // 留显全字
        : this.pageDone
          ? rowLen // 瞬显全字
          : Math.min(
              charsShown(Math.max(0, elapsed - charsBefore * speed), speed),
              rowLen,
            )
      if (limit < rowLen) allDone = false
      renderSpans(this.ctx, dl.spans, pos.text.x, ty, {
        glyphs: this.glyphs,
        palette: this.palette,
        shadow: true,
        maxChars: limit,
      })
      charsBefore += rowLen
      ty += LINE_HEIGHT
    }
    if (isActive && allDone && !this.pageDone) this.pageDone = true

    // 光标:仅活跃槽 + 全显 + 非 autoAdvance,末显示行末尾
    const lastDl = page[page.length - 1]
    const lastLine = this.state!.dialogue.lines[lastDl?.srcLineIdx ?? 0]
    if (isActive && this.pageDone && lastLine?.autoAdvance === undefined && lastDl) {
      this.drawCursor(nowMs, lastDl.spans, page.length - 1, pos)
    }
  }

  private drawCursor(
    nowMs: number,
    lastSpans: TextSpan[],
    lastRowIdx: number,
    pos: { text: { x: number; y: number } },
  ): void {
    const frame = this.cursorFrames[0]
    if (!frame) return
    const step = Math.floor(nowMs / 100) % CURSOR_COLOR_COUNT
    const icon = this.cursorBaked[step] ?? this.bakeCursorStep(frame, step)
    const cursorX = pos.text.x + measureSpans(lastSpans, this.glyphs)
    const cursorY = pos.text.y + lastRowIdx * LINE_HEIGHT
    this.ctx.drawImage(icon, cursorX, cursorY)
  }

  private bakeCursorStep(frame: RleFrame, step: number): HTMLCanvasElement {
    const rgba = indexToRgba(CURSOR_COLOR_START + step, this.palette)
    const baked = bakeCursorTinted(frame, rgba)
    this.cursorBaked[step] = baked
    return baked
  }
}
