/**
 * C1：CompositeCommand 与 scene-state helpers 迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 */
import { describe, expect, test } from 'vitest'
import type { Command } from './command-contract.js'
import * as commands from './commands.js'
import { CompositeCommand } from './composite-command.js'
import type { EditorState } from './edit-session.js'

describe('C1 composite command', () => {
  test('keeps CompositeCommand identity on the old commands barrel', () => {
    expect(commands.CompositeCommand).toBe(CompositeCommand)
  })

  test('applies children in order and inverts in reverse', () => {
    const log: string[] = []
    const child = (id: string): Command => ({
      label: id,
      apply(state) {
        log.push(`apply:${id}`)
        return state
      },
      invert(state) {
        log.push(`invert:${id}`)
        return state
      },
    })
    const command = new CompositeCommand('atomic', [child('a'), child('b')])
    const state = {} as EditorState
    command.apply(state)
    command.invert(state)
    expect(log).toEqual(['apply:a', 'apply:b', 'invert:b', 'invert:a'])
  })
})
