/**
 * 对话框渲染(② 外观 Task 4 骨架)。
 * 从 main.ts 拎出:框/姓名牌/正文/打字。位置真值 GLM spec §3。
 * ⚠ 本 Task 单 state(按页翻)是临时设计,Task 6(slot 共存)会重构——勿过度打磨。
 */
import { lookupText, parseRichText, type TextSpan, zhLocale } from '@type-pal/content'
import type { Palette } from '@type-pal/shared'
import { advancePage, type DialogueState, pageLines } from '../dialogue.js'
import type { GlyphTable } from '../text/glyph.js'
import { TITLE_COLOR_INDEX } from '../text/palette-color.js'
import { renderSpans } from '../text/text-render.js'
import { charsShown, countChars, DEFAULT_SPEED_MS } from '../text/typewriter.js'

// GLM spec §3 bottom 布局真值(320×200 坐标系)
const LINE_HEIGHT = 18
const TEXT_POS_BOTTOM = { x: 44, y: 126 } // 无头像;有头像 x=20(Task 6)
const TITLE_POS_BOTTOM = { x: 12, y: 108 } // 无头像;有头像 x=4

export class DialogBox {
  private state: DialogueState | null = null
  private lineStartMs = 0
  /** 本页是否已「瞬显」(打字中按 space 触发,或逐字打完自然置位)。
   *  sdlpal fUserSkip 语义:瞬显后本页全字显示 + 出光标等键,再按 space 才翻页。 */
  private pageDone = false

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly glyphs: GlyphTable,
    private readonly palette: Palette,
  ) {}

  get active(): boolean {
    return this.state !== null
  }

  open(state: DialogueState, nowMs: number): void {
    this.state = state
    this.lineStartMs = nowMs
    this.pageDone = false
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
    this.state = advancePage(this.state)
    if (this.state) {
      this.lineStartMs = nowMs
      this.pageDone = false
    }
  }

  render(nowMs: number): void {
    if (!this.state) return
    const lines = pageLines(this.state)
    // 姓名牌只画该页首行(spec §3:仅首行 + 非 center 当姓名,不计入正文行)
    const first = lines[0]
    if (first?.speaker) {
      const nameSpans: TextSpan[] = [{ text: `${lookupText(first.speaker, zhLocale)}：` }]
      renderSpans(this.ctx, nameSpans, TITLE_POS_BOTTOM.x, TITLE_POS_BOTTOM.y, {
        glyphs: this.glyphs,
        palette: this.palette,
        shadow: true,
        forceColorIndex: TITLE_COLOR_INDEX, // 姓名牌固定 CYAN_ALT(0x8C)
      })
    }
    let ty = TEXT_POS_BOTTOM.y
    const elapsed = nowMs - this.lineStartMs
    let charsBefore = 0 // 该行之前各行已打完的总字符数(逐行打:第 i 行等前 i-1 行打完才开始)
    let allDone = true // 本页是否所有行都已打完(用于自然置 pageDone + 光标判定)
    for (const line of lines) {
      const spans = parseRichText(lookupText(line.text, zhLocale))
      const rowLen = countChars(spans)
      // 瞬显(pageDone)→ 全字;否则逐行打字:rowElapsed 减去前面行打字耗时
      const limit = this.pageDone
        ? rowLen
        : Math.min(
            charsShown(Math.max(0, elapsed - charsBefore * DEFAULT_SPEED_MS), DEFAULT_SPEED_MS),
            rowLen,
          )
      if (limit < rowLen) allDone = false
      renderSpans(this.ctx, spans, TEXT_POS_BOTTOM.x, ty, {
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
  }
}
