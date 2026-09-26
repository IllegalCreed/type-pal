/**
 * C1：CompositeCommand 与 scene-state helpers 迁出同证。
 * 旧入口 commands.js 与新模块必须是同一构造器。
 * 顺序例只证 apply/invert 次序与输入不被改写，不冒称完整编辑态/atomic rollback。
 */
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import type { Command } from './command-contract.js'
import * as commands from './commands.js'
import { CompositeCommand } from './composite-command.js'
import { toEditorState } from './project-io.js'
import { buildBlankProject } from './seed.js'

describe('C1 composite command', () => {
  test('keeps CompositeCommand identity on the old commands barrel', () => {
    expect(commands.CompositeCommand).toBe(CompositeCommand)
  })

  test('applies children in order and inverts in reverse', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('composite-order'))
    const project = await loadCurrentProjectFrom(fsaSource(disk.dir))
    const scenes = await loadAllAuthorScenes(project)
    const state = toEditorState(project, scenes, {}, {}, [])
    const snapshot = structuredClone(state)
    const log: string[] = []
    const child = (id: string): Command => ({
      label: id,
      apply(current) {
        log.push(`apply:${id}`)
        return current
      },
      invert(current) {
        log.push(`invert:${id}`)
        return current
      },
    })
    const command = new CompositeCommand('atomic', [child('a'), child('b')])
    const afterApply = command.apply(state)
    const afterInvert = command.invert(afterApply)
    expect(log).toEqual(['apply:a', 'apply:b', 'invert:b', 'invert:a'])
    expect(state).toEqual(snapshot)
    expect(afterApply).toEqual(snapshot)
    expect(afterInvert).toEqual(snapshot)
  })
})
