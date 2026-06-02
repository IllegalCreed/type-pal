/**
 * DialogBox 真实实现 — port sdlpal text.c:1208-1815
 * PAL_StartDialogWithOffset + PAL_ShowDialogText + PAL_DialogWaitForKey + PAL_ClearDialog + PAL_EndDialog
 *
 * **sdlpal 真实交互(text.c:1616 PAL_ShowDialogText 真值)**:
 *  - 每条 showDialog opcode = 1 行;**单行 typing 完不等键**,opcode 直接推进
 *  - 累计 4 行后再来 showDialog → PAL_DialogWaitForKey(等 Confirm)+ 清屏 + 行号归零 + 画新行
 *  - dialog 整段结束(script 跑到 end / 退出 event mode)→ PAL_EndDialog → PAL_ClearDialog(TRUE)
 *    → 若有过任何行 → 等 1 次 Confirm 才真清屏
 *  - typing 进行中按 Confirm → fUserSkip = TRUE,当前行剩字瞬现(g_TextLib.fUserSkip 读后不重置 cursor)
 *
 * **状态机 phase**:
 *  - 'typing':       当前行 typing 中,Confirm = 跳行末
 *  - 'line-done':    当前行 typing 完,**event-system 自动推进 cursor.ip 到下一 opcode**,无需 Confirm
 *  - 'waiting-page-key':  shownLines==4 + 来了新 showDialog → 等 Confirm 清屏
 *  - 'waiting-end-key':   dialog 整段结束(撞 end opcode)+ 有行 → 等 Confirm 关 dialog
 *
 * **行间不停**:典型 NPC 对话 3-4 行 = 玩家按 0-1 次 Confirm(只在第 5 行 / 整段末)。
 *
 * 真值表(sdlpal text.c:1289-1346):
 *   portrait/text 位置 同前(不变,fix1 已对)。
 *   typing FRAMES_PER_CHAR = 1(每帧 1 字,@10fps = 100ms/字)。
 *   LINE_HEIGHT_PX = 18(sdlpal text.c:1661 `y + nCurrentDialogLine * 18`)。
 *   MAX_LINES_PER_PAGE = 4(text.c:1649 `nCurrentDialogLine > 3` 触发等键)。
 */

import { type DialogBoxStyle, FRAME_MS_EXPLORE } from '@type-pal/shared'
import type { Framebuffer } from './framebuffer.js'
import { renderText, renderColoredText, measureText, type GlyphTable } from './font.js'
import type { DialogBoxState, DialogPhase } from '../core/game-state.js'
import { drawSingleLineBox } from './menu/draw-box.js'
import { drawNumber } from './draw-number.js'

// ── 常量 ──────────────────────────────────────────────────────────────────────

export const FRAMES_PER_CHAR = 1

// ── sdlpal text.c:29-34 FONT_COLOR_* 真值(palette index)──────────────────────
/** 默认对话字体色 0x4F(palette idx 79)。普通对话(isDialog=FALSE)DEFAULT 即此;narration DEFAULT→0。 */
export const FONT_COLOR_DEFAULT = 0x4F
/** `"` toggle 黄(text.c:30)。普通对话生效;narration(isDialog=TRUE)被 `!isDialog` 屏蔽。 */
export const FONT_COLOR_YELLOW = 0x2D
/** `'` toggle 红(text.c:31)。 */
export const FONT_COLOR_RED = 0x1A
/** `-` toggle 青(text.c:32)。 */
export const FONT_COLOR_CYAN = 0x8D
/** `@` toggle 红 alt(text.c:34)。 */
export const FONT_COLOR_RED_ALT = 0x17

/** sdlpal text.c:1649 `nCurrentDialogLine > 3`:超过 3 (即 4) 触发等键 */
export const MAX_LINES_PER_PAGE = 4

/** sdlpal text.c:885 `g_TextLib.iDelayTime = 3` 默认打字延时基数(每字 iDelayTime*8 ms)。 */
export const DIALOG_IDELAY_DEFAULT = 3

/** parseDialogText 输出:可见文本 + 逐字符色 + 时间驱动打字数据 + 行末状态(跨行持续)+ 等键图标。 */
export interface ParsedDialogLine {
  /** 可见文本(控制符已消费/剥离)。 */
  text: string
  /** 每个可见字符的调色板色(与 [...text] 等长,按 code point)。 */
  colors: number[]
  /**
   * 每个可见字符的出现时刻(ms,相对行起)。sdlpal text.c:1600 每字后 UTIL_Delay(iDelayTime*8);
   * `$NN` 改 iDelayTime=NN*10/7(text.c:1538)。revealAt[i] = 前 i 字延时累加。
   */
  revealAt: number[]
  /** 本行完全打完时刻(ms):最后一字延时 + `~NN` 尾暂停(text.c:1551 NN*80/7)。 */
  doneAt: number
  /** 行末 bCurrentFontColor 状态 —— toggle 跨行持续(下一行的起始色)。 */
  endColor: number
  /** 行末 iDelayTime 状态 —— `$NN` 跨行持续(下一行打字速度基数,sdlpal g_TextLib.iDelayTime 不自动重置)。 */
  endIDelay: number
  /** `(`/`)` 设的等键图标(sdlpal bIcon:0=默认,1=`)`,2=`(`)。 */
  icon: number
  /**
   * 本行是否以 `~` 控制码收尾(sdlpal text.c:1542-1554 `case '~'`:`nCurrentDialogLine = -1; return`)。
   * 回到 PAL_ShowDialogText 后 `nCurrentDialogLine++`(text.c:1746)→ 0,即 `~` 收尾的行**行计数复位 0**:
   * 之后的 PAL_ClearDialog(TRUE) 见 `nCurrentDialogLine == 0` → **不等键、不画黄色箭头**(text.c:1770)。
   * 这是"开场梦境三句(均 `~NN` 收尾)原版无结尾光标 + 自动推进"的真值根因。
   */
  endedWithTilde: boolean
}

/**
 * port sdlpal `TEXT_DisplayText` 控制符 state machine(text.c:1458-1613)。把原始对话文本解析成
 * {可见文本 + 逐字符色},消费控制符(原本被我们字面显示出来 = bug):
 *   `-` toggle CYAN(0x8D)/ `'` toggle RED(0x1A)/ `@` toggle RED_ALT(0x17)
 *   `"` toggle YELLOW(0x2D)—— **仅 !isDialog**(text.c:1522 `if(!isDialog)`,但 `"` 总被消费)
 *   `$NN` typing 速度(text.c:1539 `lpszText+=3` 消费 3 字符,不显;我们暂不改 typing 速度)
 *   `~` 本行提前结束(text.c:1554 return —— 其后丢弃)
 *   `)` icon=1(text.c:1560)/ `(` icon=2(text.c:1568)/ `\` 转义下一字符(text.c:1572)
 * 默认色映射(text.c:1580-1582):isDialog 且当前色 == DEFAULT → 0;否则 = 当前色。
 *
 * @param raw        原始文本(events 数据,含控制符)
 * @param startColor 起始 bCurrentFontColor(跨行持续:首行 = dialog bFontColor,续行 = 上行 endColor)
 * @param isDialog   sdlpal isDialog 参数 —— **普通对话(top/bottom/center)= FALSE**;narration(居中小窗)= TRUE
 */
export function parseDialogText(
  raw: string,
  startColor: number,
  isDialog: boolean,
  startIDelay: number = DIALOG_IDELAY_DEFAULT,
): ParsedDialogLine {
  let color = startColor
  let iDelay = startIDelay // sdlpal g_TextLib.iDelayTime(跨行持续)
  let cum = 0 // 累计 ms(下一字出现时刻)
  let icon = 0
  const out: string[] = []
  const colors: number[] = []
  const revealAt: number[] = []
  const emit = (ch: string): void => {
    out.push(ch)
    colors.push(isDialog && color === FONT_COLOR_DEFAULT ? 0 : color) // text.c:1581-1582
    revealAt.push(cum) // 本字在 cum 时刻出现
    cum += iDelay * 8 // text.c:1600 每字后 UTIL_Delay(iDelayTime*8)
  }
  const chars = [...raw] // 按 code point 拆(中文 BMP 单点;控制符是 ASCII 单点)
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!
    switch (ch) {
      case '-': color = color === FONT_COLOR_CYAN ? FONT_COLOR_DEFAULT : FONT_COLOR_CYAN; break
      case '\'': color = color === FONT_COLOR_RED ? FONT_COLOR_DEFAULT : FONT_COLOR_RED; break
      case '@': color = color === FONT_COLOR_RED_ALT ? FONT_COLOR_DEFAULT : FONT_COLOR_RED_ALT; break
      case '"':
        if (!isDialog) color = color === FONT_COLOR_YELLOW ? FONT_COLOR_DEFAULT : FONT_COLOR_YELLOW
        break // `"` 总消费(text.c:1531 lpszText++ 在 if 外)
      case '$': { // text.c:1538-1539 iDelayTime = NN*10/7;lpszText+=3(消费 $ + 2 位)
        const nn = Number.parseInt((chars[i + 1] ?? '') + (chars[i + 2] ?? ''), 10)
        if (!Number.isNaN(nn)) iDelay = Math.floor((nn * 10) / 7)
        i += 2
        break
      }
      case '~': { // text.c:1551-1554 UTIL_Delay(NN*80/7) + return(本行止,尾暂停)
        const nn = Number.parseInt((chars[i + 1] ?? '') + (chars[i + 2] ?? ''), 10)
        const endDelay = Number.isNaN(nn) ? 0 : Math.floor((nn * 80) / 7)
        return { text: out.join(''), colors, revealAt, doneAt: cum + endDelay, endColor: color, endIDelay: iDelay, icon, endedWithTilde: true }
      }
      case ')': icon = 1; break
      case '(': icon = 2; break
      case '\\': { const nx = chars[++i]; if (nx !== undefined) emit(nx); break } // 转义:画下一字符字面
      default: emit(ch)
    }
  }
  return { text: out.join(''), colors, revealAt, doneAt: cum, endColor: color, endIDelay: iDelay, icon, endedWithTilde: false }
}

/** sdlpal text.c:1661 `y + nCurrentDialogLine * 18`:行间距 18 px */
export const LINE_HEIGHT_PX = 18

// ── 文本位置(sdlpal text.c:1313-1346 真值) ───────────────────────────────────

export interface TextPos {
  x: number
  y: number
}

export function getDialogTextPos(style: DialogBoxStyle, hasPortrait: boolean): TextPos {
  switch (style) {
    case 'top':
      return { x: hasPortrait ? 96 : 44, y: 26 }
    case 'center':
      return { x: 80, y: 40 }
    case 'bottom':
    case 'narration':
      return { x: hasPortrait ? 20 : 44, y: 126 }
  }
}

/**
 * sdlpal text.c:1316/1340 真值 — title(姓名)位置,跟 dialog text 独立。
 * top:    (iNumCharFace > 0 ? 80 : 12, 8)
 * bottom: (iNumCharFace > 0 ? 4 : 12, 108)
 * 姓名以 `:` 结尾,画在此处,**不**计入 nCurrentDialogLine。
 */
export function getDialogTitlePos(style: DialogBoxStyle, hasPortrait: boolean): TextPos {
  switch (style) {
    case 'top':
      return { x: hasPortrait ? 80 : 12, y: 8 }
    case 'center':
      return { x: 12, y: 8 }  // sdlpal default,center 一般不用 title
    case 'bottom':
    case 'narration':
      return { x: hasPortrait ? 4 : 12, y: 108 }
  }
}

/**
 * sdlpal text.c:1717-1719 真值 — 姓名识别:全角 `：` (0xff1a) / `∶` (0x2236) / 半角 `:` 结尾。
 */
export function isCharacterNameLine(text: string): boolean {
  if (text.length === 0) return false
  const last = text.charCodeAt(text.length - 1)
  return last === 0xff1a || last === 0x2236 || last === 0x3a /* ':' */
}

/** sdlpal text.c:33 真值 `#define FONT_COLOR_CYAN_ALT 0x8C` — 姓名 title 渲染色。 */
export const FONT_COLOR_CYAN_ALT = 0x8C

// ── 头像位置(sdlpal text.c:1289-1310 真值) ───────────────────────────────────

interface PortraitPos {
  x: number
  y: number
}

function getPortraitPos(
  style: DialogBoxStyle,
  width: number,
  height: number,
): PortraitPos | null {
  switch (style) {
    case 'top':
      return { x: 48 - Math.floor(width / 2), y: 55 - Math.floor(height / 2) }
    case 'bottom':
    case 'narration':
      return { x: 270 - Math.floor(width / 2), y: 144 - Math.floor(height / 2) }
    case 'center':
      return null
  }
}

// ── 4 styles 矩形(仅供测试 / e2e 引用;实际不画 box) ─────────────────────────

export interface BoxRect {
  x: number
  y: number
  w: number
  h: number
}

const STYLE_RECTS: Record<DialogBoxStyle, BoxRect> = {
  top:       { x: 8, y: 8,   w: 304, h: 48 },
  center:    { x: 8, y: 80,  w: 304, h: 48 },
  bottom:    { x: 8, y: 144, w: 304, h: 48 },
  narration: { x: 8, y: 144, w: 304, h: 48 },
}

export function getDialogBoxRect(style: DialogBoxStyle): BoxRect {
  return STYLE_RECTS[style]
}

// ── startDialogLine ───────────────────────────────────────────────────────────

/**
 * 启动 dialog 显示首行。event-system showDialog opcode 在 gs.dialogBox==undefined 时调。
 * shownLines=[],currentLineText=text,phase='typing'。
 */
export function startDialogLine(
  rawText: string,
  opts: {
    style?: DialogBoxStyle
    portraitIcon?: number
    fontColor?: number
    shadow?: boolean
  },
): DialogBoxState {
  const style = opts.style ?? 'bottom'
  const startColor = opts.fontColor ?? FONT_COLOR_DEFAULT
  const isDialog = style === 'narration' // sdlpal isDialog:普通对话=FALSE,narration(居中小窗)=TRUE
  // 新 dialog 段:iDelayTime 重置默认 3(sdlpal g_TextLib.iDelayTime 段内续行继承,这里起手默认)
  const parsed = parseDialogText(rawText, startColor, isDialog, DIALOG_IDELAY_DEFAULT)
  // sdlpal text.c:1715-1727 真值:`:` 结尾的字符串 = 姓名 title,画独立位置(CYAN_ALT,PAL_DrawText 不过
  //   控制符 state machine,不改 bCurrentFontColor),不计入 line。在剥码后的可见文本上判定。
  const isTitle = isCharacterNameLine(parsed.text)
  return {
    titleText: isTitle ? parsed.text : undefined,
    shownLines: [],
    shownLineColors: [],
    currentLineText: isTitle ? null : parsed.text,
    currentLineColors: isTitle ? undefined : parsed.colors,
    currentLineRevealAt: isTitle ? undefined : parsed.revealAt,
    currentLineDoneAt: isTitle ? 0 : parsed.doneAt,
    fontColorState: isTitle ? startColor : parsed.endColor, // title 不改色态
    iDelayState: isTitle ? DIALOG_IDELAY_DEFAULT : parsed.endIDelay, // title 不改打字速度态
    iconKind: parsed.icon,
    typingFrames: 0,
    charsRevealed: 0,
    // sdlpal nCurrentDialogLine:PAL_StartDialog 置 0(text.c:1262)→ 本行 PAL_ShowDialogText 后:
    //   title 不 ++(0);`~` 收尾 -1→++→0;普通正文 ++→1。
    dialogLineCount: isTitle ? 0 : (parsed.endedWithTilde ? 0 : 1),
    phase: isTitle ? 'line-done' : 'typing',  // title 即出完,让 event-system 立即 ip++ 下条
    style,
    portraitIcon: opts.portraitIcon,
    fontColor: startColor,
    shadow: opts.shadow ?? false,
    keyIconBlink: false,
  }
}

// ── appendDialogLine ──────────────────────────────────────────────────────────

/**
 * 把上一行(已 line-done)推进 shownLines,开始新行 typing。
 * event-system showDialog opcode 在 gs.dialogBox!=undefined 时调。
 *
 * **必须先在 caller 中检查 shouldWaitPageKey(state)** — 如果会到第 5 行,
 * 不调本函数,而是 setWaitingPageKey(state) 等键后再调。
 */
export function appendDialogLine(state: DialogBoxState, rawText: string): void {
  const isDialog = state.style === 'narration'
  // 续行起始色 = 上一行行末色态(toggle 跨行持续,sdlpal g_TextLib.bCurrentFontColor 同段不重置)
  const startColor = state.fontColorState ?? state.fontColor ?? FONT_COLOR_DEFAULT
  // 续行起始 iDelayTime = 上一行行末态(`$NN` 段内跨行持续,sdlpal g_TextLib.iDelayTime 不自动重置)
  const startIDelay = state.iDelayState ?? DIALOG_IDELAY_DEFAULT
  const parsed = parseDialogText(rawText, startColor, isDialog, startIDelay)
  // sdlpal text.c:1715 姓名识别 — `:` 结尾的字符串画 title 位置(CYAN_ALT,独立路径),不进 shownLines、不改色/速态。
  if (isCharacterNameLine(parsed.text)) {
    state.titleText = parsed.text
    // **不**修改 currentLineText / phase — title 跟现在 typing 的 dialog 并存
    return
  }
  // 把"上次 line-done 的 currentLineText"沉入 shownLines(连同其逐字符色)
  if (state.currentLineText !== null) {
    state.shownLines.push(state.currentLineText)
    ;(state.shownLineColors ??= []).push(state.currentLineColors ?? [])
  }
  state.currentLineText = parsed.text
  state.currentLineColors = parsed.colors
  state.currentLineRevealAt = parsed.revealAt
  state.currentLineDoneAt = parsed.doneAt
  state.fontColorState = parsed.endColor
  state.iDelayState = parsed.endIDelay
  if (parsed.icon) state.iconKind = parsed.icon
  // sdlpal nCurrentDialogLine:正文行显示后 ++(text.c:1746);`~` 收尾 -1→++→0(text.c:1552 硬复位,
  //   无视前面累计行数)。title 行在上面 isCharacterNameLine 分支已 return,不到这里(不计入,对齐 text.c:1715-1726)。
  state.dialogLineCount = parsed.endedWithTilde ? 0 : state.dialogLineCount + 1
  state.typingFrames = 0
  state.charsRevealed = 0
  state.phase = 'typing'
  state.keyIconBlink = false
}

/**
 * 判定:再加一行是否会撞满(>=4 行已显 + 新行)→ caller 应先 setWaitingPageKey。
 *
 * 触发条件:shownLines 中已有 4 条(即 phase='line-done' 时的 currentLineText 是第 4 行,
 * 或 phase 已 'waiting-page-key' 表示尚未沉入)。本函数在 appendDialogLine 之**前**调用。
 */
export function shouldWaitPageKey(state: DialogBoxState): boolean {
  // currentLineText 若已 typing 完,逻辑上算 1 行;还没沉 shownLines 因为 append 才沉
  const effectiveLines = state.shownLines.length
    + (state.currentLineText !== null && state.phase === 'line-done' ? 1 : 0)
  return effectiveLines >= MAX_LINES_PER_PAGE
}

// ── setWaitingPageKey / setWaitingEndKey ──────────────────────────────────────

/**
 * 第 5 行 showDialog 到来 → 进 waiting-page-key,等 Confirm 清屏。
 *
 * 可选 pendingStyle:若由 setDialogStyleX 在已有 dialog 上触发的 PAL_ClearDialog(TRUE),
 * 把新 style/portrait/fontColor 暂存,Confirm 翻页时 caller 应用到 gs。
 *
 * Sync.2 fix8:可选 fullClear:若由 0x05 ClearDialog 或 setDialogStyleX 触发,
 * Confirm 翻页后 caller 应 gs.dialogBox = undefined(对应 sdlpal PAL_ClearDialog(TRUE))。
 */
export function setWaitingPageKey(
  state: DialogBoxState,
  pendingStyle?: DialogBoxState['pendingStyle'],
  fullClear?: boolean,
  preOpClear?: boolean,
  partialClear?: boolean,
): void {
  state.phase = 'waiting-page-key'
  state.typingFrames = 0
  state.keyIconBlink = true
  if (pendingStyle !== undefined) {
    state.pendingStyle = pendingStyle
  }
  if (fullClear) {
    state.pendingFullClear = true
  }
  if (preOpClear) {
    state.pendingPreOpClear = true
  }
  if (partialClear) {
    state.pendingPartialClear = true
  }
}

/** dialog 整段结束(end opcode 触发)+ 有行 → 进 waiting-end-key。 */
export function setWaitingEndKey(state: DialogBoxState): void {
  state.phase = 'waiting-end-key'
  state.typingFrames = 0
  state.keyIconBlink = true
}

/**
 * 清当前页正文(shownLines + currentLine)并把行计数归 0,phase→'line-done'。保留 titleText / portraitIcon
 * / style / fontColorState(对应 sdlpal PAL_ClearDialog 把 nCurrentDialogLine=0 但不擦 title/portrait,
 * text.c:1775;0x8E VIDEO_RestoreScreen 也只 restore 到"含 title、无 body"的 backup)。
 * 用于:翻页 Confirm 后(confirmDialog)、`~` 收尾句 count==0 时被 0x8E 立即清 body(event-system)。
 */
export function resetDialogBody(state: DialogBoxState): void {
  state.shownLines = []
  state.shownLineColors = []
  state.currentLineText = null
  state.currentLineColors = undefined
  state.currentLineRevealAt = undefined
  state.currentLineDoneAt = undefined
  state.dialogLineCount = 0
  state.typingFrames = 0
  state.charsRevealed = 0
  state.phase = 'line-done'
  state.keyIconBlink = false
}

// ── tickDialog ────────────────────────────────────────────────────────────────

/**
 * 每逻辑帧调一次:
 *  - typing 中 → 推 charsRevealed,完后 phase → 'line-done'
 *  - line-done / wait 状态 → blink key icon
 */
export function tickDialog(state: DialogBoxState): void {
  state.typingFrames++

  if (state.phase === 'typing' && state.currentLineText !== null) {
    const len = state.currentLineText.length
    const revealAt = state.currentLineRevealAt
    if (revealAt) {
      // 时间驱动打字(sdlpal text.c:1600 iDelayTime*8/字 + `$NN` 变速 text.c:1538 + `~NN` 尾暂停 text.c:1551)。
      //   elapsed 用 typingFrames*FRAME_MS_EXPLORE 保持 tick 驱动确定性(可测/可回放);10fps→100ms/tick
      //   内一次显多字(总时长忠实 sdlpal,受 tick 率限制成块显)。
      const elapsed = state.typingFrames * FRAME_MS_EXPLORE
      let shown = 0
      while (shown < len && (revealAt[shown] ?? 0) <= elapsed) shown++
      state.charsRevealed = shown
      // doneAt = 末字延时 +(`~NN` 尾暂停);全字显完后的尾暂停 = `~` 的戏剧停顿,到点才 line-done。
      if (elapsed >= (state.currentLineDoneAt ?? 0)) {
        state.charsRevealed = len
        state.phase = 'line-done'
      }
    }
    else {
      // fallback(无 revealAt 的手搭 state / 旧测试):恒速 FRAMES_PER_CHAR。
      const want = Math.floor(state.typingFrames / FRAMES_PER_CHAR)
      state.charsRevealed = Math.min(want, len)
      if (state.charsRevealed >= len) state.phase = 'line-done'
    }
  }

  // 注:箭头"闪烁"已改为 present 层 palette 0xF9-0xFE 轮转(sdlpal text.c:1408-1426),
  //   箭头本身常显 → 不再用 keyIconBlink show/hide。字段保留(初始 false)以兼容存档/类型。
}

// ── confirmDialog ─────────────────────────────────────────────────────────────

/**
 * Confirm 按键时调,返回值告诉 event-system 接下来做什么:
 *  - 'skip-typing':  当前行 typing 中 → 跳行末(fUserSkip)。caller 不动 cursor。
 *  - 'page-advance': 之前 waiting-page-key → 清屏 + line=0。caller 应 appendDialogLine
 *                    (即推进到下一 showDialog opcode)— 实际上 caller 仍 cursor.ip++ 让
 *                    event-system 跑下一条 opcode。
 *  - 'dialog-end':   之前 waiting-end-key → 关 dialog。caller 清 gs.dialogBox + cursor.ip++。
 *  - 'noop':         其他状态(line-done 等),Confirm 无效(等自动推进)。
 */
export type ConfirmResult = 'skip-typing' | 'page-advance' | 'dialog-end' | 'noop'

export function confirmDialog(state: DialogBoxState): ConfirmResult {
  if (state.phase === 'typing' && state.currentLineText !== null) {
    state.charsRevealed = state.currentLineText.length
    state.phase = 'line-done'
    return 'skip-typing'
  }
  if (state.phase === 'waiting-page-key') {
    // 清屏 + line=0,准备画新行(caller 在 ip++ 后下条 showDialog 会调 startDialogLine/append)。
    // 注意:caller 应在 page-advance 后读 state.pendingStyle:
    //   - 非空 → 由 setDialogStyleX 触发的 ClearDialog,caller 应 apply pendingStyle 到 gs +
    //           清 gs.dialogBox(让下次 showDialog 重建)
    //   - 空 → 累计 4 行触发,caller 推 cursor.ip(下条 showDialog 会 append 第 5 行)
    // 清正文 + 行计数归 0(sdlpal PAL_ClearDialog text.c:1775 nCurrentDialogLine=0)。phase→'line-done'(临时;
    //   caller 推 ip → 下条 showDialog 调 append 切到 'typing')。
    // 注:fontColorState 不重置 — sdlpal PAL_ClearDialog 仅 kDialogCenter 重置 bCurrentFontColor
    //   (text.c:1777-1781),普通翻页(kDialogUpper)色态跨页持续。
    resetDialogBody(state)
    return 'page-advance'
  }
  if (state.phase === 'waiting-end-key') {
    return 'dialog-end'
  }
  return 'noop'
}

// ── drawDialogBox ─────────────────────────────────────────────────────────────

/** sprite 资产接口(与 dialog-assets.DialogSprite / draw-sprite.SpriteImage 同结构)。 */
export interface DialogSprite {
  width: number
  height: number
  indices: Uint8Array
  opaque: Uint8Array
}

export interface DialogBoxDrawCtx {
  /** RGM.MKF chunk index → 角色头像 sprite */
  portraitFrames?: Map<number, DialogSprite>
  /** DATA.MKF chunk 12 dialog icon sprite group(frame index → sprite)。 */
  iconFrames?: Map<number, DialogSprite>
  /** T14:narration style(kDialogCenterWindow)画 SingleLineBox 背景,需 SPRITEUI frame 44/45/46。 */
  uiSpriteFrames?: import('../assets/png.js').IndexedImage[]
}

const KEY_ICON_FRAME = 0

/**
 * 绘一帧 dialog:画所有 shownLines(完整)+ currentLineText 的 charsRevealed 截断。
 * 行布局:`pos.y + lineIdx * LINE_HEIGHT_PX`。
 *
 * key icon 显示条件:phase != 'typing' && (有下个动作可期待)。
 *   waiting-page-key / waiting-end-key:必须 blink(玩家必须按键)
 *   line-done:也 blink(玩家可按 Confirm 跳过 fUserSkip,但本来就完了 — 显示 hint)
 */
export function drawDialogBox(
  fb: Framebuffer,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
  ctx?: DialogBoxDrawCtx,
): void {
  // Sync.2 fix10:dialog 无活跃内容(shownLines=[]+currentLineText=null)时 整个 dialog 不画 —
  //   包括 portrait + key icon。对应 sdlpal `nCurrentDialogLine=0` 后 PAL_ShowDialogText 不被
  //   调,自然 portrait 不再 blit。我们 retainstate 但渲染层 short-circuit。
  //   场景:0x05 ClearDialog 翻页 + cutscene NPC opcode 期间,portrait 不再 overlay。
  //
  // 注:currentLineText 非 null 但 charsRevealed=0(startDialogLine 后第 0 tick)
  //    仍 draw — portrait + text 框已"准备好显示",玩家会看到 portrait 先于文字。
  const hasActiveContent = state.shownLines.length > 0
    || state.currentLineText !== null
    || state.titleText !== undefined
  if (!hasActiveContent) return

  // T14:narration style(kDialogCenterWindow)— sdlpal text.c:1663-1710 真值。
  // 居中 SingleLineBox + 一行文字 居中显示(eg. "获得 XX × N" 物品提示)。
  // 跟其他 style(透明 typing 多行)逻辑完全不同,short-circuit。
  if (state.style === 'narration') {
    drawNarrationDialog(fb, state, glyphs, ctx)
    return
  }

  // 1. portrait(sdlpal text.c:1289-1310)
  let hasPortraitRendered = false
  if (state.portraitIcon !== undefined && ctx?.portraitFrames) {
    const portrait = ctx.portraitFrames.get(state.portraitIcon)
    if (portrait) {
      const pos = getPortraitPos(state.style, portrait.width, portrait.height)
      if (pos) {
        blitSprite(fb, portrait, pos.x, pos.y)
        hasPortraitRendered = true
      }
    }
  }

  // 2a. title(姓名,以 `:` 结尾 — sdlpal text.c:1725 真值 FONT_COLOR_CYAN_ALT,独立位置)
  if (state.titleText !== undefined) {
    const titlePos = getDialogTitlePos(state.style, hasPortraitRendered)
    drawTextLine(fb, state.titleText, titlePos.x, titlePos.y, state, glyphs, FONT_COLOR_CYAN_ALT)
  }

  // 2b. text:所有已完成行 + 当前行(截 charsRevealed)
  const basePos = getDialogTextPos(state.style, hasPortraitRendered)

  for (let i = 0; i < state.shownLines.length; i++) {
    const line = state.shownLines[i]!
    drawTextLine(
      fb, line, basePos.x, basePos.y + i * LINE_HEIGHT_PX, state, glyphs,
      undefined, state.shownLineColors?.[i],
    )
  }

  // 当前行(typing 或 line-done):画在 shownLines 之后第 N 行
  if (state.currentLineText !== null && state.charsRevealed > 0) {
    const lineIdx = state.shownLines.length
    const visible = state.currentLineText.slice(0, state.charsRevealed)
    drawTextLine(
      fb, visible, basePos.x, basePos.y + lineIdx * LINE_HEIGHT_PX, state, glyphs,
      undefined, state.currentLineColors?.slice(0, state.charsRevealed),
    )
  }

  // 3. key icon(等键时显示在最后一行文字末尾)。
  //    sdlpal text.c:1745 `posIcon = PAL_XY(x, y)`:x = 本行 TEXT_DisplayText 画完返回的末尾 x,
  //    y = 本行 y(posDialogText.y + nCurrentDialogLine*18,自增前)。**不是**固定右下角。
  //    "闪烁"由 present 层 palette 索引 0xF9-0xFE 每 100ms 轮转产生(text.c:1408-1426),
  //    箭头本身**常显**(不再 show/hide gate keyIconBlink)。
  if (shouldShowKeyIcon(state)) {
    // sdlpal text.c:1391 `PAL_SpriteGetFrame(bufDialogIcons, bIcon)` —— bIcon 即帧号:
    //   默认 0;`)` → 1,`(` → 2(parseDialogText 的 iconKind)。
    const iconSprite = ctx?.iconFrames?.get(state.iconKind ?? KEY_ICON_FRAME)
    if (iconSprite) {
      // 最后一行:正在显示的 currentLineText(若有)或最后一条 shownLine。
      const lineIdx = state.currentLineText !== null
        ? state.shownLines.length
        : Math.max(0, state.shownLines.length - 1)
      const lastLineText = state.currentLineText !== null
        ? state.currentLineText
        : (state.shownLines[state.shownLines.length - 1] ?? '')
      const iconX = basePos.x + measureText(lastLineText, glyphs)
      const iconY = basePos.y + lineIdx * LINE_HEIGHT_PX
      blitSprite(fb, iconSprite, iconX, iconY)
    }
  }
}

// sdlpal:icon 只在真正等键处显示 —— PAL_DialogWaitForKey 由 page-break(text.c:1654)
// 与 dialog 结束(text.c:1772)触发。line-done 是行间自动推进,不显 icon。
//
// sdlpal text.c:1385-1386 真值守卫:`if (bDialogPosition != kDialogCenterWindow && != kDialogCenter)` 才画 icon。
//   → center(kDialogCenter)即便等键也**不画**黄色箭头(也不做 0xF9-0xFE palette 闪烁,见 present.ts)。
//   narration(kDialogCenterWindow)已在 drawDialogBox short-circuit(走 drawNarrationDialog 不画 icon),
//   故此处只需补 center 排除。
function shouldShowKeyIcon(state: DialogBoxState): boolean {
  if (state.style === 'center') return false
  return state.phase === 'waiting-page-key' || state.phase === 'waiting-end-key'
}

function drawTextLine(
  fb: Framebuffer,
  text: string,
  x: number,
  y: number,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
  colorOverride?: number,
  colors?: number[],
): void {
  if (text.length === 0) return
  // sdlpal 真值:对话正文 TEXT_DisplayText(..., isDialog=FALSE)(text.c:1737)→ fShadow=!isDialog=TRUE;
  //   姓名 title PAL_DrawText(..., fShadow=TRUE)(text.c:1725)。两者都带阴影。
  // 阴影算法 = 三层 (+1,0)/(0,+1)/(+1,+1) **color 0**(text.c:1144-1156,DOS triple,sdlpal 统一 triple)。
  // 旧实现手搓**单层** (+1,+1) color 50 是错的 —— 改用 renderText 内建 fShadow=true(正确三层 color0)。
  // colorOverride(姓名 title CYAN_ALT)优先;否则 colors(parseDialogText 逐字符色,`"`黄/`-`青/`'``@`红)
  //   逐字符上色;再否则 fallback 单色(state.fontColor)。
  if (colorOverride !== undefined) {
    renderText(fb, text, x, y, colorOverride, glyphs, true)
  }
  else if (colors) {
    renderColoredText(fb, text, colors, x, y, glyphs, true)
  }
  else {
    renderText(fb, text, x, y, state.fontColor, glyphs, true)
  }
}

// ── 内部 blit ─────────────────────────────────────────────────────────────────

function blitSprite(
  fb: Framebuffer,
  sprite: DialogSprite,
  x: number,
  y: number,
): void {
  const { width, height, indices, opaque } = sprite
  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      const i = dy * width + dx
      if (opaque[i] === 1) {
        fb.writePixel(x + dx, y + dy, indices[i]!)
      }
    }
  }
}

/**
 * T14:narration style(kDialogCenterWindow)1:1 port — sdlpal text.c:1663-1710 真值。
 *
 * 视觉:屏幕中央(160, 40)居中 SingleLineBox + 一行文字。box 宽度根据文字长度计算。
 * 用于"获得 XX × N" / "钱不够" / item info 等 1-shot 1.4s 自动关闭提示。
 *
 * sdlpal 真值算法:
 *   posDialogText = PAL_XY(160, 40)               (text.c:1345)
 *   len = sum(PAL_CharWidth(ch) >> 3) for ch in lpszText   (text.c:1681)
 *   pos = PAL_XY(posDialogText.x - len * 4, posDialogText.y)
 *   PAL_CreateSingleLineBoxWithShadow(pos, (len + 1) / 2, ...)
 *   TEXT_DisplayText(lpszText, pos.x + 8 + ((len & 1) << 2), pos.y + 10, ...)
 *
 * `PAL_CharWidth(ch) >> 3`:半角 8>>3=1 / 全角 16>>3=2。
 */
function drawNarrationDialog(
  fb: Framebuffer,
  state: DialogBoxState,
  glyphs: GlyphTable | undefined,
  ctx?: DialogBoxDrawCtx,
): void {
  // narration 是 1-shot 1 行 — 取 currentLineText(若有)或 shownLines[0]
  const text = state.currentLineText ?? state.shownLines[0] ?? ''
  if (text.length === 0) return
  // 逐字符色(parseDialogText with isDialog=TRUE:DEFAULT→0;`-`青/`'``@`红;`"`黄被屏蔽)
  const colors = state.currentLineColors ?? state.shownLineColors?.[0]

  // sdlpal len:半角 1 / 全角 2
  let len = 0
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    len += cp < 0x80 ? 1 : 2
  }

  // sdlpal text.c:1345 posDialogText = PAL_XY(160, 40)
  const POS_X = 160
  const POS_Y = 40
  const boxX = POS_X - len * 4
  const boxY = POS_Y
  const boxLen = Math.floor((len + 1) / 2)

  // 画 box(若 uiSpriteFrames 缺失则只画文字,debug 防御)
  if (ctx?.uiSpriteFrames) {
    drawSingleLineBox({
      fb, x: boxX, y: boxY, len: boxLen, uiSpriteFrames: ctx.uiSpriteFrames,
    })
  }

  // 文字 pos(sdlpal text.c:1698)— PAL_X(pos) + 8 + ((len & 1) << 2), PAL_Y(pos) + 10
  const textX = boxX + 8 + ((len & 1) << 2)
  const textY = boxY + 10

  // sdlpal TEXT_DisplayText(text.c:1459-1613) narration path(isDialog=TRUE)真值:
  //   - 整 text 一次性 display(text.c:1597 typing delay 仅 !isDialog 走)
  //   - 逐字符 switch case(text.c:1474)— '0'-'9' 数字字符走 PAL_DrawNumber sprite digit,
  //     其余走 PAL_DrawTextUnescape
  //   - text.c:1581-1582 真值:isDialog + bCurrentFontColor==FONT_COLOR_DEFAULT → color=**0(黑)**
  //   - text.c:1594 fShadow=!isDialog(narration isDialog=TRUE → fShadow=FALSE)
  //   - text.c:1592 PAL_DrawNumber(ch-'0', 1, PAL_XY(x, y+4), kNumColorYellow, kNumAlignLeft)
  //   - text.c:1595 x += PAL_CharWidth(ch)
  let cursorX = textX
  let ci = 0
  for (const ch of text) {
    if (ch >= '0' && ch <= '9' && ctx?.uiSpriteFrames) {
      // sdlpal text.c:1583-1592 真值:数字字符 yellow sprite digit blit at (x, y+4) left-align
      const digit = ch.charCodeAt(0) - 0x30
      drawNumber(fb, digit, 1, { x: cursorX, y: textY + 4 }, 'yellow', 'left', ctx.uiSpriteFrames)
      cursorX += 6 // sdlpal PAL_CharWidth 数字字符 = 6(digit sprite width)
    }
    else {
      // sdlpal text.c:1594 PAL_DrawTextUnescape(text, ..., color, fShadow=FALSE);color 由 parseDialogText
      //   逐字符给(narration DEFAULT→0;`-`青/`'``@`红)。text.c:1595 x += PAL_CharWidth:半角 8 / 全角 16。
      const color = colors?.[ci] ?? 0
      const advance = renderText(fb, ch, cursorX, textY, color, glyphs, false)
      cursorX += advance
    }
    ci++
  }
}
