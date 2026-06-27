/**
 * 对话框渲染(② 外观)。
 * 从 main.ts 拎出:框/姓名牌/正文/打字/光标/autoAdvance。位置真值 GLM spec §3。
 * 分页按【显示行】(DisplayLine)算:layoutLines 把长句折成多行,每页 ≤ LINES_PER_PAGE 行。
 * dialogue.ts 退化为 DialogueLine 序列指针;分页由渲染层按框容量算(design §6)。
 */
import { lookupText, type TextSpan, zhLocale } from '@type-pal/content'
import type { Palette, RleFrame } from '@type-pal/shared'
import type { DialogueState } from '../dialogue.js'
import type { GlyphTable } from '../text/glyph.js'
import { indexToRgba, TITLE_COLOR_INDEX } from '../text/palette-color.js'
import { measureSpans, renderSpans } from '../text/text-render.js'
import { charsShown, countChars, DEFAULT_SPEED_MS } from '../text/typewriter.js'
import { bakeCursorTinted, CURSOR_COLOR_COUNT, CURSOR_COLOR_START } from './dialog-assets.js'
import { type DisplayLine, layoutLines } from './layout.js'

// GLM spec §3 bottom 布局真值(320×200 坐标系)
const LINE_HEIGHT = 18
const LINES_PER_PAGE = 4 // spec §3:MAX_LINES_PER_PAGE
const TEXT_POS_BOTTOM = { x: 44, y: 126 } // 无头像;有头像 x=20(Task 6)
const TITLE_POS_BOTTOM = { x: 12, y: 108 } // 无头像;有头像 x=4
const MAX_RIGHT = 308 // 正文 x=44,右边距 12 → 每行可用 264px

export class DialogBox {
  private state: DialogueState | null = null
  private displayLines: DisplayLine[] = []
  private pageStart = 0
  private lineStartMs = 0
  /** 本页是否已「瞬显」(打字中按 space 触发,或逐字打完自然置位)。
   *  sdlpal fUserSkip 语义:瞬显后本页全字显示 + 出光标等键,再按 space 才翻页。 */
  private pageDone = false

  /** 光标 6 步 tinted canvas 缓存(by step 0..5),用默认 frame0 + palette[0xF9+step] 色。 */
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

  open(state: DialogueState, nowMs: number): void {
    this.state = state
    // 一次性排版整段对话成显示行(后续翻页只移动 pageStart,不重排)
    this.displayLines = layoutLines(
      state.dialogue.lines,
      this.glyphs,
      (id) => lookupText(id, zhLocale),
      MAX_RIGHT,
      TEXT_POS_BOTTOM.x,
    )
    this.pageStart = 0
    this.lineStartMs = nowMs
    this.pageDone = false
  }

  /** 当前页的显示行(≤ LINES_PER_PAGE)。 */
  private pageDisplayLines(): DisplayLine[] {
    return this.displayLines.slice(this.pageStart, this.pageStart + LINES_PER_PAGE)
  }

  /** 当前页末显示行所属的 DialogueLine 的 autoAdvance(决定本页是否自动推进)。 */
  private currentPageAutoAdvance(): number | undefined {
    const page = this.pageDisplayLines()
    const last = page[page.length - 1]
    if (!last || !this.state) return undefined
    return this.state.dialogue.lines[last.srcLineIdx]?.autoAdvance
  }

  /**
   * 按 space 的两段式(sdlpal fUserSkip):
   * - 打字中(本页未全显)→ 瞬显本页 + 出光标(不翻页);pageDone=true。
   * - 已全显 → 翻下一页(翻完关闭)。
   */
  advance(nowMs: number): void {
    if (!this.state) return
    if (!this.pageDone) {
      this.pageDone = true
      return
    }
    this.nextPage(nowMs)
  }

  /** 真翻页;翻完关闭。advance(玩家键)与 auto-advance(update)共用。 */
  private nextPage(nowMs: number): void {
    if (!this.state) return
    const next = this.pageStart + LINES_PER_PAGE
    if (next >= this.displayLines.length) {
      this.state = null // 对话结束
      return
    }
    this.pageStart = next
    this.lineStartMs = nowMs
    this.pageDone = false
  }

  /**
   * 时间驱动的自动推进(render 前调):
   * 本页全显后,若末显示行所属句有 autoAdvance,且超过「本页打字耗时 + autoAdvanceMs」→ 自动 nextPage。
   * 有 autoAdvance 的页不画光标、不等键(spec §3 ~NN:尾停顿自动推进)。
   */
  private update(nowMs: number): void {
    const auto = this.currentPageAutoAdvance()
    if (!this.state || !this.pageDone || auto === undefined) return
    const page = this.pageDisplayLines()
    // 本页所有显示行总字数(逐行串行打字耗时)
    const totalChars = page.reduce((sum, dl) => sum + countChars(dl.spans), 0)
    const lastLine = this.state.dialogue.lines[page[page.length - 1]?.srcLineIdx ?? 0]
    const speed = lastLine?.speed ?? DEFAULT_SPEED_MS
    const doneAt = totalChars * speed + auto
    if (nowMs - this.lineStartMs >= doneAt) this.nextPage(nowMs)
  }

  render(nowMs: number): void {
    this.update(nowMs) // 先处理 autoAdvance 自动推进(可能关闭对话)
    if (!this.state) return
    const page = this.pageDisplayLines()
    if (page.length === 0) return

    // 姓名牌:该页首个 isLineStart 显示行所属 DialogueLine 的 speaker(spec §3 仅首行当姓名)
    const titleLine = page.find((dl) => dl.isLineStart)
    if (titleLine) {
      const speaker = this.state.dialogue.lines[titleLine.srcLineIdx]?.speaker
      if (speaker) {
        const nameSpans: TextSpan[] = [{ text: `${lookupText(speaker, zhLocale)}：` }]
        renderSpans(this.ctx, nameSpans, TITLE_POS_BOTTOM.x, TITLE_POS_BOTTOM.y, {
          glyphs: this.glyphs,
          palette: this.palette,
          shadow: true,
          forceColorIndex: TITLE_COLOR_INDEX, // 姓名牌固定 CYAN_ALT(0x8C)
        })
      }
    }

    let ty = TEXT_POS_BOTTOM.y
    const elapsed = nowMs - this.lineStartMs
    let charsBefore = 0 // 该显示行之前各行已打完的总字符数(逐行打:第 i 行等前 i-1 行打完才开始)
    let allDone = true
    for (const dl of page) {
      const rowLen = countChars(dl.spans)
      // 瞬显(pageDone)→ 全字;否则逐行打字:rowElapsed 减去前面行打字耗时
      const limit = this.pageDone
        ? rowLen
        : Math.min(
            charsShown(Math.max(0, elapsed - charsBefore * DEFAULT_SPEED_MS), DEFAULT_SPEED_MS),
            rowLen,
          )
      if (limit < rowLen) allDone = false
      renderSpans(this.ctx, dl.spans, TEXT_POS_BOTTOM.x, ty, {
        glyphs: this.glyphs,
        palette: this.palette,
        shadow: true,
        maxChars: limit,
      })
      charsBefore += rowLen
      ty += LINE_HEIGHT
    }
    // 逐字自然打完 → 置 pageDone(进入等键态,出光标),无需玩家手动瞬显
    if (allDone && !this.pageDone) this.pageDone = true

    // 本页全显(pageDone)且非 autoAdvance → 末显示行末尾画光标,6 色轮转。
    // 有 autoAdvance 的页自动推进、不等键,不画光标(spec §3 ~NN)。
    const lastDl = page[page.length - 1]
    if (this.pageDone && lastDl && this.currentPageAutoAdvance() === undefined) {
      this.drawCursor(nowMs, lastDl.spans, page.length - 1)
    }
  }

  /** 末行末尾画光标:6 步 tinted canvas(by step 缓存),100ms/步轮转。 */
  private drawCursor(nowMs: number, lastSpans: TextSpan[], lastRowIdx: number): void {
    const frame = this.cursorFrames[0] // 默认 frame0(spec §3)
    if (!frame) return
    const step = Math.floor(nowMs / 100) % CURSOR_COLOR_COUNT
    const icon = this.cursorBaked[step] ?? this.bakeCursorStep(frame, step)
    const cursorX = TEXT_POS_BOTTOM.x + measureSpans(lastSpans, this.glyphs)
    const cursorY = TEXT_POS_BOTTOM.y + lastRowIdx * LINE_HEIGHT
    this.ctx.drawImage(icon, cursorX, cursorY)
  }

  /** bake 光标的某 step tinted canvas 并缓存(by step)。 */
  private bakeCursorStep(frame: RleFrame, step: number): HTMLCanvasElement {
    const rgba = indexToRgba(CURSOR_COLOR_START + step, this.palette)
    const baked = bakeCursorTinted(frame, rgba)
    this.cursorBaked[step] = baked
    return baked
  }
}
