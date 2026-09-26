// @vitest-environment jsdom
import { afterEach, describe, expect, test } from 'vitest'
import {
  cleanupDebug,
  command,
  debugHarness,
  element,
  field,
  status,
} from './__tests__/debug-tools-fixtures.js'
import { projectData } from './__tests__/runtime-shell/project.js'

afterEach(cleanupDebug)
describe('Debug console public commands', () => {
  test.each([
    ['scene b', { kind: 'loadScene', scene: 'b' }],
    [
      '  ScEnE b 1.5,-2 left ',
      { kind: 'loadScene', scene: 'b', pos: { col: 1.5, row: -2, height: 0 }, facing: 'left' },
    ],
    ['scene b bad right', { kind: 'loadScene', scene: 'b', facing: 'right' }],
    ['pos 3,4', { kind: 'teleportParty', pos: { col: 3, row: 4, height: 0 } }],
    [
      'pos -1.5,8 up',
      { kind: 'teleportParty', pos: { col: -1.5, row: 8, height: 0 }, facing: 'up' },
    ],
    ['give tonic', { kind: 'giveItem', itemId: 'tonic', count: 1 }],
    ['give tonic 3', { kind: 'giveItem', itemId: 'tonic', count: 3 }],
    ['money 20', { kind: 'giveMoney', delta: -30 }],
  ] as const)('%s reaches the real runtime with exact effect arguments', async (line, effect) => {
    const h = await debugHarness(),
      worldBefore = structuredClone(h.world)
    command(line)
    await h.settle()
    expect(h.effects).toEqual([effect])
    expect(h.signals).toHaveLength(1)
    expect(h.signals[0]?.aborted).toBe(false)
    expect(element('[role="status"]').dataset.tone).toBe('success')
    expect(field('调试命令').value).toBe('')
    // The panel dispatches to the effect owner; this fixture records effects, not a fake game engine.
    expect(h.world).toEqual(worldBefore)
    expect(projectData(h.project)).toEqual(h.projectBefore)
  })
  test.each([
    'scene',
    'pos',
    'pos 1',
    'pos 1,2,3',
    'pos NaN,2',
    'pos 1,Infinity',
    'give',
    'money Infinity',
    'party ,',
    'skill hero',
    'battle',
    'run-script',
    'run-trigger',
  ])('%s rejects incomplete input before host IO', async (line) => {
    const h = await debugHarness(),
      before = structuredClone(h.world)
    command(line)
    await h.settle()
    expect(element('.tpd-console').textContent).toContain('用法:')
    expect(h.signals).toEqual([])
    expect(h.startBattle).not.toHaveBeenCalled()
    expect(h.setParty).not.toHaveBeenCalled()
    expect(h.grantSkill).not.toHaveBeenCalled()
    expect(h.world).toEqual(before)
  })
  test('party and skill preserve identities and hand off to their dedicated owners', async () => {
    const h = await debugHarness()
    command('party friend,,hero,')
    expect(h.setParty).toHaveBeenCalledExactlyOnceWith(['friend', 'hero'])
    command('skill friend heal')
    expect(h.grantSkill).toHaveBeenCalledExactlyOnceWith('friend', 'heal')
    expect(status()).toContain('friend ← heal')
    expect(h.signals).toEqual([])
  })
  test('real shared script changes a world flag and retains author input', async () => {
    const h = await debugHarness()
    command('run-script mark')
    await h.settle()
    expect(h.world.script?.flags.shared).toBe(true)
    expect(status()).toBe('run-script mark done')
    expect(projectData(h.project)).toEqual(h.projectBefore)
  })
  test('empty and non-Enter input never dispatch; unknown command reports its own name', async () => {
    const h = await debugHarness()
    field('调试命令').value = 'money 1'
    field('调试命令').dispatchEvent(new KeyboardEvent('keydown', { key: 'x', bubbles: true }))
    expect(field('调试命令').value).toBe('money 1')
    command('  ')
    command('unknown')
    expect(h.operations).toEqual([])
    expect(element('.tpd-console').textContent).toContain('未知命令: unknown')
    expect(element('.tpd-console-line:last-child').getAttribute('data-tone')).toBe('warn')
  })
})
