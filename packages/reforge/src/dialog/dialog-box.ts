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
  }

  /** 翻页;翻完关闭。Task 4 单页 1 行(默认 linesPerPage),Task 5 接分页。 */
  advance(nowMs: number): void {
    if (!this.state) return
    this.state = advancePage(this.state)
    this.lineStartMs = nowMs
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
    for (const line of lines) {
      const spans = parseRichText(lookupText(line.text, zhLocale))
      const rowLen = countChars(spans)
      // 该行开始打字后经过的时间 = 总 elapsed 减去前面行打字花的时间
      const rowElapsed = Math.max(0, elapsed - charsBefore * DEFAULT_SPEED_MS)
      // 该行已显示字数:按 rowElapsed 推进,但打完(rowLen)即停
      const limit = Math.min(charsShown(rowElapsed, DEFAULT_SPEED_MS), rowLen)
      renderSpans(this.ctx, spans, TEXT_POS_BOTTOM.x, ty, {
        glyphs: this.glyphs,
        palette: this.palette,
        shadow: true,
        maxChars: limit,
      })
      charsBefore += rowLen
      ty += LINE_HEIGHT
    }
  }
}
