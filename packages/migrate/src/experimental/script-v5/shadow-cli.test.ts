import { describe, expect, test } from 'vitest'
import { parseScriptV5ShadowCliArgs } from './shadow-cli.js'

describe('script-v5 shadow CLI parser', () => {
  test.each([
    [[], { check: false, through: 'p5' }],
    [['--check'], { check: true, through: 'p5' }],
    [['--through', 'p2'], { check: false, through: 'p2' }],
    [['--through=p2', '--check'], { check: true, through: 'p2' }],
    [['--through', 'p3'], { check: false, through: 'p3' }],
    [['--through=p3', '--check'], { check: true, through: 'p3' }],
    [['--through', 'p4'], { check: false, through: 'p4' }],
    [['--through=p4', '--check'], { check: true, through: 'p4' }],
    [['--through', 'p5'], { check: false, through: 'p5' }],
    [['--through=p5', '--check'], { check: true, through: 'p5' }],
    [['--check', '--through', 'p2'], { check: true, through: 'p2' }],
  ])('接受严格参数序列 %#', (args, expected) => {
    expect(parseScriptV5ShadowCliArgs(args)).toEqual(expected)
  })

  test.each([
    ['p2'],
    ['--through'],
    ['--through', 'p6'],
    ['--through=p6'],
    ['--check', '--check'],
    ['--through=p2', '--through', 'p2'],
    ['--unknown'],
  ])('拒绝歧义、重复或未知参数 %#', (...args) => {
    expect(() => parseScriptV5ShadowCliArgs(args)).toThrow()
  })
})
