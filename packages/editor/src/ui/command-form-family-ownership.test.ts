import { describe, expect, test } from 'vitest'
import commandFormSource from './CommandForm.js?raw'
import actorSource from './command-form-actor.js?raw'
import controlSource from './command-form-control.js?raw'
import controlsSource from './command-form-controls.js?raw'
import dialogueSource from './command-form-dialogue.js?raw'
import worldSource from './command-form-world.js?raw'

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

  test('CommandForm routes world commands through one narrow family owner', () => {
    expect(commandFormSource.match(/<WorldCommandForm/g)).toHaveLength(1)
    for (const implementation of [
      'defaultActionTargetForEntity',
      'sortedSpriteActions',
      "case 'playEntityAction': {",
      "case 'loadScene': {",
    ])
      expect(commandFormSource).not.toContain(implementation)

    const props = worldSource.match(/export interface WorldCommandFormProps \{([\s\S]*?)\n\}/)?.[1]
    expect(props).toBeDefined()
    for (const field of [
      'command',
      'scene',
      'scenes',
      'actors',
      'battleSprites',
      'sprites',
      'assetCatalog',
      'assetReader',
      'references',
      'onOpenImage',
      'onOpenBattleSprite',
      'onOpenSpriteAction',
      'onChange',
    ])
      expect(props).toMatch(new RegExp(`\\b${field}[?:]`))
    for (const unrelated of [
      'locale',
      'audioResolver',
      'shops',
      'scriptIndex',
      'worldVariables',
      'hasImplicitSelf',
    ])
      expect(props).not.toMatch(new RegExp(`\\b${unrelated}[?:]`))

    expect(commandFormSource).toContain(
      "export { makeLoadScene, retargetLoadScene } from './command-form-world.js'",
    )
  })

  test('actor and party commands own their reorder session and fallback locally', () => {
    expect(commandFormSource.match(/<ActorCommandForm/g)).toHaveLength(1)
    for (const implementation of [
      'partyMemberReorderKeys',
      'CARRIED_STATUS_TURN_RANGE',
      'story/set-party-members',
      "case 'applyActorCondition': {",
    ])
      expect(commandFormSource).not.toContain(implementation)

    const props = actorSource.match(/export interface ActorCommandFormProps \{([\s\S]*?)\n\}/)?.[1]
    expect(props).toBeDefined()
    for (const field of [
      'command',
      'scene',
      'actors',
      'references',
      'showRawJson',
      'reorderScopeKey',
      'onChange',
    ])
      expect(props).toMatch(new RegExp(`\\b${field}[?:]`))
    for (const unrelated of [
      'locale',
      'assetCatalog',
      'audioResolver',
      'scriptIndex',
      'worldVariables',
      'shops',
    ])
      expect(props).not.toMatch(new RegExp(`\\b${unrelated}[?:]`))

    expect(actorSource).toContain("cmd.kind === 'setParty' ? cmd.members : []")
    expect(actorSource).toContain('<JsonForm cmd={cmd} onChange={onChange} />')
  })

  test('the control/resource family owns the remaining forms behind one default route', () => {
    expect(commandFormSource.match(/<ControlCommandForm/g)).toHaveLength(1)
    for (const implementation of [
      'deriveScriptChunk',
      '<SoundPicker',
      '<MusicPicker',
      "case 'branch': {",
      "case 'callScript': {",
    ])
      expect(commandFormSource).not.toContain(implementation)

    const props = controlSource.match(
      /export interface ControlCommandFormProps \{([\s\S]*?)\n\}/,
    )?.[1]
    expect(props).toBeDefined()
    for (const field of [
      'command',
      'scene',
      'assetCatalog',
      'audioResolver',
      'assetReader',
      'ambiences',
      'shops',
      'references',
      'scriptIndex',
      'hasImplicitSelf',
      'onOpenScript',
      'worldVariables',
      'onOpenWorldVariable',
      'onOpenSound',
      'showRawJson',
      'onChange',
    ])
      expect(props).toMatch(new RegExp(`\\b${field}[?:]`))
    for (const unrelated of [
      'locale',
      'actors',
      'battleSprites',
      'sprites',
      'onOpenImage',
      'onOpenBattleSprite',
      'onOpenSpriteAction',
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
