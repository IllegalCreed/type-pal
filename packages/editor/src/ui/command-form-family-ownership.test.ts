import { describe, expect, test } from 'vitest'
import commandFormSource from './CommandForm.js?raw'
import controlsSource from './command-form-controls.js?raw'
import dialogueSource from './command-form-dialogue.js?raw'

describe('command form family ownership', () => {
  test('CommandForm routes dialog through one family component without retaining cue implementation', () => {
    expect(commandFormSource.match(/<DialogueCommandForm/g)).toHaveLength(1)
    expect(commandFormSource).toContain("case 'dialog':")
    for (const duplicate of [
      'dialogueRowReorderKeys',
      'AuthorDialogueCue',
      'DialogueIdentity',
      'story/dialogue-cue-rows',
      'lookupText(row.text',
    ])
      expect(commandFormSource).not.toContain(duplicate)
  })

  test('dialog family receives only dialogue resources and draft callbacks', () => {
    const props = dialogueSource.match(
      /export interface DialogueCommandFormProps \{([\s\S]*?)\n\}/,
    )?.[1]
    expect(props).toBeDefined()
    for (const field of [
      'command',
      'locale',
      'assetCatalog',
      'assetReader',
      'actors',
      'onOpenImage',
      'onDialogueSpeakerOverrideChange',
      'showRawJson',
      'reorderScopeKey',
      'onChange',
    ])
      expect(props).toMatch(new RegExp(`\\b${field}[?:]`))
    for (const unrelated of [
      'scene',
      'audioResolver',
      'references',
      'scriptIndex',
      'worldVariables',
      'hasImplicitSelf',
    ])
      expect(props).not.toMatch(new RegExp(`\\b${unrelated}[?:]`))
  })

  test('shared controls have one implementation while CommandForm preserves the public picker export', () => {
    expect(commandFormSource).toContain(
      "export { WorldVariablePicker } from './command-form-controls.js'",
    )
    for (const owner of [
      'Row',
      'Num',
      'Txt',
      'Sel',
      'WorldVariablePicker',
      'EntitySel',
      'JsonForm',
    ]) {
      expect(controlsSource).toContain(`export function ${owner}`)
      expect(commandFormSource).not.toContain(`function ${owner}`)
    }
  })
})
