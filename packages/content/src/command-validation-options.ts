export interface CommandValidationOptions {
  forbidLoadScene?: boolean
  /** 显式交互调用不能在自动流或隐藏入场准备中取得前台。 */
  forbidRunEntityTrigger?: 'auto' | 'prepare'
  /** Current author dialect extensions are validated in place; no tree-shape downgrade. */
  commandKinds?: Readonly<Record<string, boolean>>
  checkExtensionCommand?: (command: Record<string, unknown>, path: string) => boolean
  checkDialogueCue?: (cue: unknown, path: string) => void
  dialectLabel?: string
}
