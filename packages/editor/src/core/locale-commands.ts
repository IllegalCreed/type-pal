/**
 * locale 文本命令族。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

/** 改 locale 单键文本(敌人/角色名等;invert 还原,新键还原 = 删除)。 */
export class UpdateLocaleCommand implements Command {
  readonly label = '修改文本'
  private readonly key: string
  private readonly text: string
  private old: string | undefined
  private had = false
  private captured = false

  constructor(key: string, text: string) {
    this.key = key
    this.text = text
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.captured = true
      this.had = this.key in state.locale
      this.old = state.locale[this.key]
    }
    return { ...state, locale: { ...state.locale, [this.key]: this.text } }
  }

  invert(state: EditorState): EditorState {
    const locale = { ...state.locale }
    if (this.had) locale[this.key] = this.old!
    else delete locale[this.key]
    return { ...state, locale }
  }
}
