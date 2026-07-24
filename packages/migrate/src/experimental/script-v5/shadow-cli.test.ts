import { describe, expect, test } from 'vitest'
import { parseP2ShadowCliArgs } from './shadow-cli.js'

describe('script-v5 shadow CLI parser', () => {
  test.each([
    [[], { check: false, through: 'p2' }],
    [['--check'], { check: true, through: 'p2' }],
    [['--through', 'p2'], { check: false, through: 'p2' }],
    [['--through=p2', '--check'], { check: true, through: 'p2' }],
    [['--check', '--through', 'p2'], { check: true, through: 'p2' }],
  ])('接受严格参数序列 %#', (args, expected) => {
    expect(parseP2ShadowCliArgs(args)).toEqual(expected)
  })

  test.each([
    ['p2'],
    ['--through'],
    ['--through', 'p3'],
    ['--through=p3'],
    ['--check', '--check'],
    ['--through=p2', '--through', 'p2'],
    ['--unknown'],
  ])('拒绝歧义、重复或未知参数 %#', (...args) => {
    expect(() => parseP2ShadowCliArgs(args)).toThrow()
  })
})
