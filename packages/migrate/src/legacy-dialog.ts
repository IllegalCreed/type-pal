/** 原版对话控制码的唯一解码入口；生成后的 content/runtime/editor 均不得识别这些字符。 */
import { type DialogColor, type DialogueCue, stableScriptHash } from '@type-pal/content'

export const LEGACY_DIALOG_DEFAULT_SPEED = 24

export interface LegacyDialogueState {
  color: DialogColor
  /** 已换算的真实毫秒/字。 */
  speed: number
}

export interface DecodedLegacyDialogueLine {
  /** 成对闭合语义颜色标签，可直接写入 locale。 */
  text: string
  /** 不含颜色标签的可见文字，供说话人识别。 */
  plainText: string
  speed: number
  autoAdvance?: number
  cursorFrame?: 1 | 2
  endedWithTilde: boolean
  state: LegacyDialogueState
}

export const DEFAULT_LEGACY_DIALOG_STATE: LegacyDialogueState = {
  color: 'default',
  speed: LEGACY_DIALOG_DEFAULT_SPEED,
}

const COLOR_CONTROL: Readonly<Record<string, Exclude<DialogColor, 'default' | 'yellow'>>> = {
  '-': 'cyan',
  "'": 'red',
  '@': 'redAlt',
}

function toggleColor(current: DialogColor, target: Exclude<DialogColor, 'default'>): DialogColor {
  return current === target ? 'default' : target
}

function twoDigits(chars: readonly string[], at: number): number | undefined {
  const raw = `${chars[at + 1] ?? ''}${chars[at + 2] ?? ''}`
  return /^\d{2}$/.test(raw) ? Number.parseInt(raw, 10) : undefined
}

function serializeColored(chars: readonly { ch: string; color: DialogColor }[]): string {
  let out = ''
  let run = ''
  let color: DialogColor = 'default'
  const flush = (): void => {
    if (!run) return
    out += color === 'default' ? run : `<${color}>${run}</${color}>`
    run = ''
  }
  for (const item of chars) {
    if (item.color !== color) {
      flush()
      color = item.color
    }
    run += item.ch
  }
  flush()
  return out
}

/**
 * 解一条原始 showDialog。
 *
 * U+3000 在原引擎会占一个可见字宽，但本语料只把它当行首缩进；判断 `$NN` 是否属于“首字前设速”时
 * 明确忽略这些缩进，仍原样保留字符。若真正的可见正文出现两种速度，row 模型无法表达，直接失败。
 */
export function decodeLegacyDialogueLine(
  raw: string,
  entry: LegacyDialogueState = DEFAULT_LEGACY_DIALOG_STATE,
  slot: DialogueCue['slot'] = 'bottom',
): DecodedLegacyDialogueLine {
  const chars = [...raw]
  const visible: { ch: string; color: DialogColor; speed: number }[] = []
  const semanticSpeeds = new Set<number>()
  let color = entry.color
  let speed = entry.speed
  let autoAdvance: number | undefined
  let cursorFrame: 1 | 2 | undefined
  let endedWithTilde = false

  const emit = (ch: string): void => {
    visible.push({ ch, color, speed })
    if (ch !== '\u3000') semanticSpeeds.add(speed)
  }

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] ?? ''
    const colorControl = COLOR_CONTROL[ch]
    if (colorControl) {
      color = toggleColor(color, colorControl)
      continue
    }
    switch (ch) {
      case '"':
        // 原版 narration(isDialog=true)只消费双引号，不改变颜色。
        if (slot !== 'narration') color = toggleColor(color, 'yellow')
        break
      case '$': {
        const nn = twoDigits(chars, i)
        if (nn !== undefined) speed = Math.floor((nn * 10) / 7) * 8
        i += 2
        break
      }
      case '~': {
        const nn = twoDigits(chars, i)
        autoAdvance = nn === undefined ? 0 : Math.floor((nn * 80) / 7)
        endedWithTilde = true
        i = chars.length
        break
      }
      case ')':
        cursorFrame = 1
        break
      case '(':
        cursorFrame = 2
        break
      case '\\': {
        const escaped = chars[++i]
        if (escaped !== undefined) emit(escaped)
        break
      }
      default:
        emit(ch)
    }
  }

  if (semanticSpeeds.size > 1) {
    throw new Error(`原版对话含可见正文中途变速，DialogueRow.speed 无法无损表达: ${raw}`)
  }
  const rowSpeed = semanticSpeeds.values().next().value ?? speed
  const colored = visible.map(({ ch, color: charColor }) => ({ ch, color: charColor }))
  return {
    text: serializeColored(colored),
    plainText: visible.map(({ ch }) => ch).join(''),
    speed: rowSpeed,
    ...(autoAdvance !== undefined ? { autoAdvance } : {}),
    ...(cursorFrame !== undefined ? { cursorFrame } : {}),
    endedWithTilde,
    state: { color, speed },
  }
}

/** 基准形态固定为“默认颜色 + 普通 bottom”，因此变体 id 与遍历顺序无关。 */
export function legacyDialogueTextId(
  messageIndex: number,
  raw: string,
  decodedText: string,
): string {
  const base = `dlg.${messageIndex}`
  const baseline = decodeLegacyDialogueLine(raw, DEFAULT_LEGACY_DIALOG_STATE, 'bottom').text
  if (decodedText === baseline) return base
  const hash = stableScriptHash(decodedText).toString(16).padStart(8, '0')
  return `${base}.v-${hash}`
}

export function putLegacyDialogueText(
  locale: Record<string, string>,
  messageIndex: number,
  raw: string,
  decodedText: string,
): string {
  const key = legacyDialogueTextId(messageIndex, raw, decodedText)
  const previous = locale[key]
  if (previous !== undefined && previous !== decodedText)
    throw new Error(
      `对话 locale id 冲突 ${key}: ${JSON.stringify(previous)} / ${JSON.stringify(decodedText)}`,
    )
  locale[key] = decodedText
  return key
}
