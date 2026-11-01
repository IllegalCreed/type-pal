import type { Command, LocalizedMessageGroup } from '@type-pal/shared'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { useFallbackLanguage } from './language.js'
import { isolateLanguagePreference } from './language.test-fixtures.js'
import {
  getMissingEnglishMessageGroups,
  resolveMessageGroup,
  setEnglishMessages,
} from './messages.js'

let restoreLanguage: () => void
beforeEach(() => {
  restoreLanguage = isolateLanguagePreference('en')
})
afterEach(() => {
  setEnglishMessages([])
  restoreLanguage()
})

it('owns installed lines and lends a separate playback array to each caller', () => {
  const groups: LocalizedMessageGroup[] = [{ start: 10, end: 10, lines: ['Hello.', null] }]
  const commands: Command[] = [{ op: 'showDialog', messageIndex: 10, text: '你好。' }]
  setEnglishMessages(groups)
  groups[0]!.lines[0] = 'Changed resource'
  const first = resolveMessageGroup(commands, 0)
  expect(first).toEqual({ resumeIp: 1, lineIndex: 0, lines: ['Hello.', null] })
  if (!first?.lines) throw new Error('translated playback must have lines')
  first.lines[0] = 'Changed playback'
  expect(resolveMessageGroup(commands, 0)?.lines).toEqual(['Hello.', null])
})

it('reports unique missing English spans with detached records and resets them on pack replacement', () => {
  const commands: Command[] = [{ op: 'showDialog', messageIndex: 10, text: '你好。' }]
  setEnglishMessages([])
  expect(resolveMessageGroup(commands, 0)).toBeUndefined()
  expect(resolveMessageGroup(commands, 0)).toBeUndefined()
  const missing = getMissingEnglishMessageGroups()
  expect(missing).toEqual([{ start: 10, end: 10 }])
  missing[0]!.start = 99
  expect(getMissingEnglishMessageGroups()).toEqual([{ start: 10, end: 10 }])
  setEnglishMessages([])
  useFallbackLanguage('zh-CN')
  expect(resolveMessageGroup(commands, 0)).toBeUndefined()
  expect(getMissingEnglishMessageGroups()).toEqual([])
})

it('ends a translated span at a gameplay instruction or discontinuous message identity', () => {
  setEnglishMessages([
    { start: 10, end: 10, lines: ['First.'] },
    { start: 11, end: 11, lines: ['Second.'] },
  ])
  const commands: Command[] = [
    { op: 'showDialog', messageIndex: 10, text: '甲' },
    { op: 'raw', opcode: 0x1e, operands: [7, 0, 0] },
    { op: 'showDialog', messageIndex: 11, text: '乙' },
    { op: 'showDialog', messageIndex: 10, text: '甲' },
    { op: 'end' },
  ]
  expect(resolveMessageGroup(commands, 0)).toEqual({ resumeIp: 1, lineIndex: 0, lines: ['First.'] })
  expect(resolveMessageGroup(commands, 2)).toEqual({
    resumeIp: 3,
    lineIndex: 0,
    lines: ['Second.'],
  })
})
