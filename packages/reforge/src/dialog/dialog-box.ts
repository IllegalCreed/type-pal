/**
 * 对话框渲染(② 外观 Task 6:slot 共存模型)。
 * 逐段推进 + top/bottom 多槽:同槽覆盖、异槽共存。位置真值 GLM spec §3。
 * 每段话在它的 slot 内自动折行(layoutLines)+ 按 4 显示行/页分页,翻页只翻活跃槽。
 */
import {
  type Locale,
  lookupText,
  parseDialogControlCodes,
  parseRichText,
  type TextSpan,
} from '@type-pal/content'
import type { RleFrame } from '@type-pal/shared'
import { advanceLine, type DialogueState } from '../dialogue.js'
import { type BoxTiles, drawScroll } from '../menu/menu-box.js'
import type { GlyphTable } from '../text/glyph.js'
import { CURSOR_COLOR_COUNT, CURSOR_RGBA, colorRgba, TITLE_RGBA } from '../text/palette-color.js'
import { measureSpans, renderSpans } from '../text/text-render.js'
import { charsShown, countChars, DEFAULT_SPEED_MS } from '../text/typewriter.js'
import { bakeCursorTinted } from './dialog-assets.js'
import { type DisplayLine, layoutLines } from './layout.js'
import { narrationScrollLayout } from './narration-scroll.js'
import { advanceSlots, emptySlots, type SlotId, type SlotState } from './slot.js'

// GLM spec §3 布局真值(320×200 坐标系)。无头像 / 有头像两种正文+姓名 x(spec §3 hasPortrait 三元)。
const LINE_HEIGHT = 18
const LINES_PER_PAGE = 4 // spec §3:MAX_LINES_PER_PAGE
const POS = {
  bottom: {
    text: { x: 44, y: 126 },
    title: { x: 12, y: 108 },
    textWithPortrait: { x: 20, y: 126 },
    titleWithPortrait: { x: 4, y: 108 },
    portrait: { x: 270, y: 144 }, // 实际画 (portrait.x - w/2, portrait.y - h/2)
  },
  top: {
    text: { x: 44, y: 26 },
    title: { x: 12, y: 8 },
    textWithPortrait: { x: 96, y: 26 },
    titleWithPortrait: { x: 80, y: 8 },
    portrait: { x: 48, y: 55 },
  },
  // 中央叙述窗(原版 0x3E:宝箱拾取/旁白)。M3a 复用正文排版居中放;专用窗框绘制 M3b 细化。
  narration: {
    text: { x: 60, y: 88 },
    title: { x: 60, y: 72 },
    textWithPortrait: { x: 60, y: 88 },
    titleWithPortrait: { x: 60, y: 72 },
    portrait: { x: -100, y: -100 }, // 叙述窗无头像
  },
  // 居中窗(原版 setDialogStyleCenter:开场独白/剧情大字,偏上)。≠底部叙述窗;一阶段 center={80,40}。
  center: {
    text: { x: 80, y: 40 },
    title: { x: 80, y: 24 },
    textWithPortrait: { x: 80, y: 40 },
    titleWithPortrait: { x: 80, y: 24 },
    portrait: { x: -100, y: -100 }, // 居中窗无头像
  },
} as const
const MAX_RIGHT = 308 // 正文右边距 → 每行可用 264px(无头像)
const CURSOR_RESERVE = 12 // 末行末尾给光标留位,防顶出屏幕

/** 单个 slot 的排版渲染态(slot.ts 管 lineIdx,这里管该段的排版)。 */
interface SlotRender {
  displayLines: DisplayLine[]
  /** narration 单行卷轴使用未折行的富文本。 */
  singleLineSpans: TextSpan[]
  pageStart: number
  /** 该段话打字速度(ms/字):显式 line.speed > 原版 $NN 控制码 > DEFAULT_SPEED_MS。 */
  speed: number
  /** 尾停顿自动推进(ms):显式 line.autoAdvance > 原版 ~NN;非 undefined = 自动推进、无光标。 */
  autoAdvance?: number
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
    private readonly cursorFrames: RleFrame[],
    private readonly portraits: ReadonlyMap<number, HTMLCanvasElement> = new Map(),
    private readonly locale: Locale = {},
    private readonly scroll?: BoxTiles,
  ) {}

  get active(): boolean {
    return this.state !== null
  }

  /** 把第 idx 段话排版进它的 slot,返回该 slot 的渲染态。有头像时正文 x 缩进 + 右边界给头像让位(spec §3)。 */
  private layoutLineInto(lineIdx: number): { slot: SlotId; render: SlotRender } {
    const line = this.state?.dialogue.lines[lineIdx]
    if (!line) throw new Error('reforge: layoutLineInto lineIdx 越界')
    const slot: SlotId = line.slot ?? 'bottom'
    const portraitImg = line.portrait ? this.portraits.get(line.portrait.icon) : undefined
    const hasPortrait = Boolean(portraitImg)
    const startX = hasPortrait ? POS[slot].textWithPortrait.x : POS[slot].text.x
    // maxRight:头像在右(bottom)→ 正文右边收到头像左;头像在左(top)→ startX 已避开头像,maxRight 不变。
    // 始终留 CURSOR_RESERVE 给末行光标,防顶出屏幕。
    let maxRight = MAX_RIGHT - CURSOR_RESERVE
    if (hasPortrait && portraitImg && POS[slot].portrait.x > 160) {
      // bottom 头像在右(portrait.x=270),正文右边收到头像左边界
      maxRight = POS[slot].portrait.x - portraitImg.width / 2 - 4
    }
    const resolved = parseDialogControlCodes(lookupText(line.text, this.locale)).text
    const displayLines = layoutLines(
      [line],
      this.glyphs,
      () => resolved, // 剥离 $NN/~NN 等控制码
      maxRight,
      startX,
    ).map((dl) => ({ ...dl, srcLineIdx: lineIdx }))
    // 控制码 → 行级属性:显式字段优先,原版 $NN(速度)/~NN(尾停顿自动推进)次之。
    const codes = parseDialogControlCodes(lookupText(line.text, this.locale))
    return {
      slot,
      render: {
        displayLines,
        singleLineSpans: parseRichText(resolved),
        pageStart: 0,
        speed: slot === 'narration' ? 0 : (line.speed ?? codes.speed ?? DEFAULT_SPEED_MS),
        autoAdvance: line.autoAdvance ?? codes.autoAdvance,
      },
    }
  }

  open(state: DialogueState, nowMs: number): void {
    this.state = state
    this.slots = emptySlots()
    this.renders = {}
    // 第一段话进它的 slot
    const firstLine = state.dialogue.lines[0]
    if (!firstLine) throw new Error('reforge: 对话无台词')
    this.slots = advanceSlots(this.slots, firstLine, 0)
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
    const cur = this.state
    if (!cur) return
    const next = advanceLine(cur) // dialogue.ts 逐段指针推进
    if (!next) {
      this.close()
      return
    }
    this.state = next
    const nextIdx = next.lineIdx
    const line = next.dialogue.lines[nextIdx]
    if (!line) throw new Error('reforge: advanceToNextLine lineIdx 越界')
    this.slots = advanceSlots(this.slots, line, nextIdx)
    const { slot, render } = this.layoutLineInto(nextIdx)
    this.renders[slot] = render // 同槽覆盖(替换 render)/异槽新建(旧 render 不动)
    this.lineStartMs = nowMs
    this.pageDone = false
  }

  /** 关闭并清空 slot(正常收尾 + 脚本 abort/切场景清理共用)。 */
  close(): void {
    this.state = null
    this.slots = emptySlots()
    this.renders = {}
  }

  /** 活跃槽当前段话的 autoAdvance(undefined = 无,等键)。 */
  private activeAutoAdvance(): number | undefined {
    return this.renders[this.slots.activeSlot]?.autoAdvance
  }

  /** autoAdvance:活跃槽该段话翻完 + 有 autoAdvance + 过尾停顿 → 自动推进下一段。 */
  private update(nowMs: number): void {
    if (!this.state || !this.pageDone) return
    const active = this.slots.activeSlot
    const r = this.renders[active]
    if (!r) return
    const auto = r.autoAdvance
    if (auto === undefined) return
    // 活跃段话整页打字耗时 + autoAdvanceMs(此 slot 该段话,逐显示行串行)
    const page = r.displayLines.slice(r.pageStart, r.pageStart + LINES_PER_PAGE)
    const totalChars = page.reduce((sum, dl) => sum + countChars(dl.spans), 0)
    const doneAt = totalChars * r.speed + auto
    if (nowMs - this.lineStartMs >= doneAt) this.advanceToNextLine(nowMs)
  }

  render(nowMs: number): void {
    if (!this.state) return
    // 画四个 slot；narration 走横向卷轴，center 才是无框居中大字。
    // narration 最后画 = 叠在最上层(原版 0x3E 中央窗;dlg.0 婶婶画外音、宝箱拾取旁白走此槽)。
    for (const slotId of ['bottom', 'top', 'narration', 'center'] as const) {
      const entry = this.slots[slotId]
      const r = this.renders[slotId]
      if (!entry || !r) continue
      const isActive = slotId === this.slots.activeSlot
      this.renderSlot(slotId, r, isActive, nowMs)
    }
    // 原索引帧是持久屏幕:~NN 到时只清对话状态，最后文字像素保留到下次重画。
    // 因此必须先画完本帧再自动推进；loadScene 紧随时才能捕获含文字的旧帧。
    this.update(nowMs)
  }

  /** 画单个 slot:姓名牌 + 正文(留显全字 / 活跃打字)+ 活跃槽的光标。 */
  private renderSlot(slotId: SlotId, r: SlotRender, isActive: boolean, nowMs: number): void {
    const state = this.state
    if (!state) return
    const pos = POS[slotId]
    const page = r.displayLines.slice(r.pageStart, r.pageStart + LINES_PER_PAGE)
    if (page.length === 0) return
    if (slotId === 'narration') {
      this.renderNarrationScroll(r, isActive)
      return
    }

    // 该段话的头像(若有):spec §3 位置,bottom 右 / top 左。
    const firstDl = page[0]
    const line = state.dialogue.lines[firstDl?.srcLineIdx ?? 0]
    const hasPortrait = line?.portrait ? this.portraits.has(line.portrait.icon) : false
    const portraitImg = line?.portrait ? this.portraits.get(line.portrait.icon) : undefined
    if (hasPortrait && portraitImg) {
      const px = pos.portrait.x - portraitImg.width / 2
      const py = pos.portrait.y - portraitImg.height / 2
      this.ctx.drawImage(portraitImg, px, py)
    }
    // 正文 / 姓名 x:有头像时缩进(须与 layoutLineInto 的 startX 一致)
    const titleX = hasPortrait ? pos.titleWithPortrait.x : pos.title.x
    const textX = hasPortrait ? pos.textWithPortrait.x : pos.text.x

    // 姓名牌:该 slot 当前段话首行的 speaker(同段跨页常驻)
    if (line?.speaker) {
      const nameSpans: TextSpan[] = [{ text: `${lookupText(line.speaker, this.locale)}：` }]
      renderSpans(this.ctx, nameSpans, titleX, pos.title.y, {
        glyphs: this.glyphs,
        shadow: true,
        forceRgba: TITLE_RGBA,
      })
    }

    let ty = pos.text.y
    const speed = r.speed // 该段话打字速度(变速;含原版 $NN)
    const elapsed = isActive ? nowMs - this.lineStartMs : Number.POSITIVE_INFINITY // 留显槽全字
    let charsBefore = 0
    let allDone = true
    for (const dl of page) {
      const rowLen = countChars(dl.spans)
      const limit = !isActive
        ? rowLen // 留显全字
        : this.pageDone
          ? rowLen // 瞬显全字
          : Math.min(charsShown(Math.max(0, elapsed - charsBefore * speed), speed), rowLen)
      if (limit < rowLen) allDone = false
      renderSpans(this.ctx, dl.spans, textX, ty, {
        glyphs: this.glyphs,
        shadow: true,
        maxChars: limit,
      })
      charsBefore += rowLen
      ty += LINE_HEIGHT
    }
    if (isActive && allDone && !this.pageDone) this.pageDone = true

    // 光标:仅活跃槽 + 全显 + 非 autoAdvance,末显示行末尾。形态取该段 cursorFrame(默认 0)。
    const lastDl = page[page.length - 1]
    const lastLine = state.dialogue.lines[lastDl?.srcLineIdx ?? 0]
    if (isActive && this.pageDone && r.autoAdvance === undefined && lastDl) {
      this.drawCursor(
        nowMs,
        lastDl.spans,
        page.length - 1,
        { text: { x: textX, y: pos.text.y } },
        lastLine?.cursorFrame ?? 0,
      )
    }
  }

  /** 原版 kDialogCenterWindow：横向单行卷轴 + 全文瞬显，不画普通对话光标。 */
  private renderNarrationScroll(r: SlotRender, isActive: boolean): void {
    const text = r.singleLineSpans.map((span) => span.text).join('')
    if (!text) return
    const layout = narrationScrollLayout(text)
    if (this.scroll) {
      drawScroll(this.ctx, this.scroll, layout.boxX, layout.boxY, layout.boxLen, { shadow: false })
    }
    let x = layout.textX
    for (const span of r.singleLineSpans) {
      x += renderSpans(this.ctx, [span], x, layout.textY, {
        glyphs: this.glyphs,
        shadow: false,
        forceRgba: span.color ? colorRgba(span.color) : [0, 0, 0],
      })
    }
    if (isActive) this.pageDone = true
  }

  private drawCursor(
    nowMs: number,
    lastSpans: TextSpan[],
    lastRowIdx: number,
    pos: { text: { x: number; y: number } },
    frameIdx: 0 | 1 | 2,
  ): void {
    const frame = this.cursorFrames[frameIdx] ?? this.cursorFrames[0]
    if (!frame) return
    const step = Math.floor(nowMs / 100) % CURSOR_COLOR_COUNT
    const cacheKey = frameIdx * CURSOR_COLOR_COUNT + step // frame×6+step 唯一标识(3 frame × 6 色)
    const icon = this.cursorBaked[cacheKey] ?? this.bakeCursorStep(frame, cacheKey, step)
    const cursorX = pos.text.x + measureSpans(lastSpans, this.glyphs)
    const cursorY = pos.text.y + lastRowIdx * LINE_HEIGHT
    this.ctx.drawImage(icon, cursorX, cursorY)
  }

  private bakeCursorStep(frame: RleFrame, cacheKey: number, step: number): HTMLCanvasElement {
    // step 由 drawCursor 用 % CURSOR_COLOR_COUNT 计算得,恒落在 CURSOR_RGBA 范围内;
    // 此处显式判空(引擎 noNonNullAssertion,no `!`),越界兜底第 0 色。
    const rgba = CURSOR_RGBA[step] ?? CURSOR_RGBA[0]
    const baked = bakeCursorTinted(frame, rgba ?? [0, 0, 0])
    this.cursorBaked[cacheKey] = baked
    return baked
  }
}
