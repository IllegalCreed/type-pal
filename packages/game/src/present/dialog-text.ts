/** Control-code decoding and cross-line text values; no clock, state or framebuffer ownership. */

// ── sdlpal text.c:29-34 FONT_COLOR_* 真值(palette index)──────────────────────
/** 默认对话字体色 0x4F(palette idx 79)。普通对话(isDialog=FALSE)DEFAULT 即此;narration DEFAULT→0。 */
export const FONT_COLOR_DEFAULT = 0x4f

/** `"` toggle 黄(text.c:30)。普通对话生效;narration(isDialog=TRUE)被 `!isDialog` 屏蔽。 */
export const FONT_COLOR_YELLOW = 0x2d

/** `'` toggle 红(text.c:31)。 */
export const FONT_COLOR_RED = 0x1a

/** `-` toggle 青(text.c:32)。 */
export const FONT_COLOR_CYAN = 0x8d

/** `@` toggle 红 alt(text.c:34)。 */
export const FONT_COLOR_RED_ALT = 0x17

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
      case '-':
        color = color === FONT_COLOR_CYAN ? FONT_COLOR_DEFAULT : FONT_COLOR_CYAN
        break
      case "'":
        color = color === FONT_COLOR_RED ? FONT_COLOR_DEFAULT : FONT_COLOR_RED
        break
      case '@':
        color = color === FONT_COLOR_RED_ALT ? FONT_COLOR_DEFAULT : FONT_COLOR_RED_ALT
        break
      case '"':
        if (!isDialog) color = color === FONT_COLOR_YELLOW ? FONT_COLOR_DEFAULT : FONT_COLOR_YELLOW
        break // `"` 总消费(text.c:1531 lpszText++ 在 if 外)
      case '$': {
        // text.c:1538-1539 iDelayTime = NN*10/7;lpszText+=3(消费 $ + 2 位)
        const nn = Number.parseInt((chars[i + 1] ?? '') + (chars[i + 2] ?? ''), 10)
        if (!Number.isNaN(nn)) iDelay = Math.floor((nn * 10) / 7)
        i += 2
        break
      }
      case '~': {
        // text.c:1551-1554 UTIL_Delay(NN*80/7) + return(本行止,尾暂停)
        const nn = Number.parseInt((chars[i + 1] ?? '') + (chars[i + 2] ?? ''), 10)
        // `TEXT_DisplayText` only waits for `~NN` on ordinary dialog
        // (`!isDialog`); narration/center-window text is already a one-shot
        // display and skips the blocking delay (text.c:1551-1554).
        const endDelay = !isDialog && !Number.isNaN(nn) ? Math.floor((nn * 80) / 7) : 0
        return {
          text: out.join(''),
          colors,
          revealAt,
          doneAt: cum + endDelay,
          endColor: color,
          endIDelay: iDelay,
          icon,
          endedWithTilde: true,
        }
      }
      case ')':
        icon = 1
        break
      case '(':
        icon = 2
        break
      case '\\': {
        const nx = chars[++i]
        if (nx !== undefined) emit(nx)
        break
      } // 转义:画下一字符字面
      default:
        emit(ch)
    }
  }
  return {
    text: out.join(''),
    colors,
    revealAt,
    doneAt: cum,
    endColor: color,
    endIDelay: iDelay,
    icon,
    endedWithTilde: false,
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
export const FONT_COLOR_CYAN_ALT = 0x8c
