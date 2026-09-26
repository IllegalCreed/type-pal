export interface CommandValidationOptions {
  forbidLoadScene?: boolean
  /** Current author dialect extensions are validated in place; no tree-shape downgrade. */
  commandKinds?: Readonly<Record<string, boolean>>
  checkExtensionCommand?: (command: Record<string, unknown>, path: string) => boolean
  checkDialogueCue?: (cue: unknown, path: string) => void
  dialectLabel?: string
}
