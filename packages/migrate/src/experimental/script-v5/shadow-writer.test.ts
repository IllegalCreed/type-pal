import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { applyShadowFilePlan, planShadowFileWrite } from './shadow-writer.js'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('script-v5 shadow file writer', () => {
  test('事务式替换完整目标树、删除陈旧项，并在第二次得到 0/0/0', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-shadow-writer-'))
    roots.push(root)
    writeFileSync(resolve(root, 'stale.json'), '{}\n')
    mkdirSync(resolve(root, 'empty'))
    const target = new Map([
      ['ir/example.json', '{"value":1}\n'],
      ['shadow.json', '{"kind":"shadow"}\n'],
    ])

    const first = planShadowFileWrite(root, target)
    expect(first.summary).toEqual({ writes: 2, deletes: 2, conflicts: 0 })
    applyShadowFilePlan(root, target, first)
    expect(readFileSync(resolve(root, 'ir/example.json'), 'utf8')).toBe('{"value":1}\n')
    expect(existsSync(resolve(root, 'stale.json'))).toBe(false)
    expect(existsSync(resolve(root, 'empty'))).toBe(false)

    const second = planShadowFileWrite(root, target)
    expect(second.summary).toEqual({ writes: 0, deletes: 0, conflicts: 0 })
  })

  test('拒绝越出 shadow 根的 artifact path', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-shadow-writer-'))
    roots.push(root)
    expect(() => planShadowFileWrite(root, new Map([['../escape', 'x']]))).toThrow(
      'invalid artifact path',
    )
  })

  test('允许文件名包含连续点，但拒绝非 canonical 路径与文件目录冲突', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-shadow-writer-'))
    roots.push(root)
    expect(planShadowFileWrite(root, new Map([['foo..bar.json', 'x']])).summary.writes).toBe(1)
    for (const path of ['/abs', './a', 'a//b', 'a/../b', 'a\\b']) {
      expect(() => planShadowFileWrite(root, new Map([[path, 'x']]))).toThrow(
        'invalid artifact path',
      )
    }
    expect(() =>
      planShadowFileWrite(
        root,
        new Map([
          ['a', 'x'],
          ['a/b', 'y'],
        ]),
      ),
    ).toThrow('file/directory path collision')
  })

  test('拒绝伪造或过期计划，并保证根内外均零改动', () => {
    const parent = mkdtempSync(resolve(tmpdir(), 'type-pal-shadow-writer-parent-'))
    roots.push(parent)
    const root = resolve(parent, 'shadow')
    mkdirSync(root)
    const outside = resolve(parent, 'outside.txt')
    writeFileSync(outside, 'safe')
    const target = new Map([['shadow.json', '{"kind":"shadow"}\n']])
    const forged = {
      ...planShadowFileWrite(root, target),
      summary: { writes: 0, deletes: 1, conflicts: 0 as const },
      writes: [],
      deletes: ['../outside.txt'],
    }
    expect(() => applyShadowFilePlan(root, target, forged)).toThrow('changed or was forged')
    expect(readFileSync(outside, 'utf8')).toBe('safe')
    expect(existsSync(resolve(root, 'shadow.json'))).toBe(false)

    const planned = planShadowFileWrite(root, target)
    target.set('shadow.json', '{"kind":"changed"}\n')
    expect(() => applyShadowFilePlan(root, target, planned)).toThrow('changed or was forged')
    expect(existsSync(resolve(root, 'shadow.json'))).toBe(false)
  })

  test('符号链接根、叶和祖先目录全部 fail closed', () => {
    const parent = mkdtempSync(resolve(tmpdir(), 'type-pal-shadow-writer-parent-'))
    roots.push(parent)
    const outside = resolve(parent, 'outside')
    mkdirSync(outside)
    writeFileSync(resolve(outside, 'safe.txt'), 'safe')

    const rootLink = resolve(parent, 'root-link')
    symlinkSync(outside, rootLink)
    expect(() => planShadowFileWrite(rootLink, new Map([['shadow.json', '{}\n']]))).toThrow(
      'root must be a real directory',
    )

    const root = resolve(parent, 'shadow')
    mkdirSync(root)
    symlinkSync(resolve(outside, 'safe.txt'), resolve(root, 'leaf.json'))
    expect(() => planShadowFileWrite(root, new Map([['shadow.json', '{}\n']]))).toThrow(
      'contains symbolic link',
    )
    rmSync(resolve(root, 'leaf.json'))
    symlinkSync(outside, resolve(root, 'linked-dir'))
    expect(() => planShadowFileWrite(root, new Map([['linked-dir/escape.json', 'x']]))).toThrow(
      'contains symbolic link',
    )
    expect(readFileSync(resolve(outside, 'safe.txt'), 'utf8')).toBe('safe')
  })

  test('apply 会拒绝运行中的同根 writer lock', () => {
    const root = mkdtempSync(resolve(tmpdir(), 'type-pal-shadow-writer-'))
    roots.push(root)
    const target = new Map([['shadow.json', '{}\n']])
    const plan = planShadowFileWrite(root, target)
    const lock = resolve(dirname(root), `.${root.split('/').at(-1)}.lock`)
    writeFileSync(lock, 'busy')
    try {
      expect(() => applyShadowFilePlan(root, target, plan)).toThrow('already active')
    } finally {
      rmSync(lock, { force: true })
    }
  })
})
