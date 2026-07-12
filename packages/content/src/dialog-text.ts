/**
 * 原版对话控制码解析(照一阶段 game/present/dialog-box.ts parseDialogText / sdlpal text.c:1458-1613)。
 * 二阶段渲染层解析:locale 文本保留提取原文(数据纯粹、与一阶段一致),显示时剥离控制码 + 提取行级属性。
 *
 * - `$NN` 打字速度:iDelay = ⌊NN*10/7⌋,每字延时 iDelay*8 ms(消费 `$`+2 位;缺省 iDelay=3 → 24ms)。
 * - `~NN` 行尾停顿 ⌊NN*80/7⌋ ms + 本行止(自动推进、无光标),其后文本丢弃(text.c:1554 return)。
 * - `"`(黄色 toggle,仅叙述)/ `(` `)`(光标图标)/ `\`(转义下一字符字面)→ 消费剥离
 *   (reforge 颜色走 <tag>、光标形态走 cursorFrame 字段,图标 M3b;此处仅保证不残留成乱码)。
 *
 * 老式颜色符 `-'@` 不处理:提取的老对话实测不含,新写内容一律用 <cyan> 标签(parseRichText 通道)。
 */
export interface DialogControlCodes {
  /** 剥离控制码后的可显示文本。 */
  text: string
  /** 打字速度(ms/字);undefined = 用默认 DEFAULT_SPEED_MS。原版 `$NN`。 */
  speed?: number
  /** 尾停顿 + 自动推进(ms);非 undefined = 打完停 N ms 自动推进、不画光标。原版 `~NN`。 */
  autoAdvance?: number
}

export function parseDialogControlCodes(raw: string): DialogControlCodes {
  // 快路径:无控制符(绝大多数新写内容)直接返回,零遍历开销。
  if (!/[$~"()\\]/.test(raw)) return { text: raw }
  const chars = [...raw]
  const out: string[] = []
  let iDelay: number | undefined // $NN → 显式打字速度(帧);undefined = 保持默认
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!
    switch (ch) {
      case '$': {
        // text.c:1538-1539 iDelayTime = NN*10/7;消费 `$` + 2 位数字
        const nn = Number.parseInt((chars[i + 1] ?? '') + (chars[i + 2] ?? ''), 10)
        if (!Number.isNaN(nn)) iDelay = Math.floor((nn * 10) / 7)
        i += 2
        break
      }
      case '~': {
        // text.c:1551-1554 UTIL_Delay(NN*80/7) + return(本行止,尾停顿自动推进)
        const nn = Number.parseInt((chars[i + 1] ?? '') + (chars[i + 2] ?? ''), 10)
        const autoAdvance = Number.isNaN(nn) ? 0 : Math.floor((nn * 80) / 7)
        return { text: out.join(''), speed: iDelay === undefined ? undefined : iDelay * 8, autoAdvance }
      }
      case '"':
      case '(':
      case ')':
        break // 消费剥离(颜色/图标符;reforge 走 <tag>/cursorFrame)
      case '\\': {
        const nx = chars[++i]
        if (nx !== undefined) out.push(nx) // 转义:画下一字符字面
        break
      }
      default:
        out.push(ch)
    }
  }
  return { text: out.join(''), speed: iDelay === undefined ? undefined : iDelay * 8 }
}
