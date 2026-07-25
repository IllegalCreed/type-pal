import { describe, expect, test } from 'vitest'
import { parseScriptV5ShadowCliArgs } from './shadow-cli.js'

describe('script-v5 shadow CLI parser', () => {
  test.each([
    [[], { check: false, through: 'p7' }],
    [['--check'], { check: true, through: 'p7' }],
    [['--through', 'p2'], { check: false, through: 'p2' }],
    [['--through=p2', '--check'], { check: true, through: 'p2' }],
    [['--through', 'p3'], { check: false, through: 'p3' }],
    [['--through=p3', '--check'], { check: true, through: 'p3' }],
    [['--through', 'p4'], { check: false, through: 'p4' }],
    [['--through=p4', '--check'], { check: true, through: 'p4' }],
    [['--through', 'p5'], { check: false, through: 'p5' }],
    [['--through=p5', '--check'], { check: true, through: 'p5' }],
    [['--through', 'p6'], { check: false, through: 'p6' }],
    [['--through=p6', '--check'], { check: true, through: 'p6' }],
    [['--through', 'p7'], { check: false, through: 'p7' }],
    [['--through=p7', '--check'], { check: true, through: 'p7' }],
    [['--check', '--through', 'p2'], { check: true, through: 'p2' }],
  ])('接受严格参数序列 %#', (args, expected) => {
    expect(parseScriptV5ShadowCliArgs(args)).toEqual({ publish: false, ...expected })
  })

  test('accepts only an explicit P7 publish mode', () => {
    expect(parseScriptV5ShadowCliArgs(['--publish'])).toEqual({
      check: false,
      publish: true,
      through: 'p7',
    })
    expect(() =>
      parseScriptV5ShadowCliArgs(['--publish', '--through', 'p6']),
    ).toThrow(/只允许/)
    expect(() => parseScriptV5ShadowCliArgs(['--publish', '--check'])).toThrow(/不能同时/)
  })

  test.each([
    ['p2'],
    ['--through'],
    ['--through', 'p8'],
    ['--through=p8'],
    ['--check', '--check'],
    ['--through=p2', '--through', 'p2'],
    ['--unknown'],
  ])('拒绝歧义、重复或未知参数 %#', (...args) => {
    expect(() => parseScriptV5ShadowCliArgs(args)).toThrow()
  })
})
