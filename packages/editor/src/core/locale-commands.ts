import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

/** 改 locale 单键文本(敌人/角色名等;invert 还原,新键还原 = 删除)。 */
export class UpdateLocaleCommand implements Command {
  readonly label = '修改文本'
  private readonly key: string
  private readonly text: string
  private old: string | undefined
  private captured = false

  constructor(key: string, text: string) {
    this.key = key
    this.text = text
  }

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.captured = true
      this.old = Object.hasOwn(state.locale, this.key) ? state.locale[this.key] : undefined
    }
    return { ...state, locale: { ...state.locale, [this.key]: this.text } }
  }

  invert(state: EditorState): EditorState {
    if (this.old !== undefined)
      return { ...state, locale: { ...state.locale, [this.key]: this.old } }
    const locale = { ...state.locale }
    delete locale[this.key]
    return { ...state, locale }
  }
}
