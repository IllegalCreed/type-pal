import { describe, expect, test } from 'vitest'
import type { MigrationSnapshot } from './migration-baseline.js'
import {
  applyBootstrapReport,
  type BootstrapReportV1,
  createBootstrapReport,
} from './migration-bootstrap.js'
import type { MigrationFileSet, MigrationJson } from './pal-migration.js'

const snapshot = (files: Record<string, MigrationJson>): MigrationSnapshot => ({
  files: new Map(Object.entries(files)),
  managedFiles: new Set(Object.keys(files)),
})
const generated = (
  files: Record<string, MigrationJson>,
): Pick<MigrationFileSet, 'files' | 'managedFiles'> => ({
  files: new Map(Object.entries(files)),
  managedFiles: new Set(Object.keys(files)),
})

describe('bootstrap report', () => {
  test('稳定 id 使用语义路径并要求每项显式分类', () => {
    const ours = snapshot({
      'content/items.json': [
        { id: 'a', x: 2 },
        { id: 'local', x: 1 },
      ],
    })
    const theirs = generated({
      'content/items.json': [
        { id: 'a', x: 3 },
        { id: 'new', x: 1 },
      ],
    })
    const report = createBootstrapReport(ours, theirs)
    expect(report.differences.map((difference) => difference.path)).toEqual([
      '/@string:a/x',
      '/@string:local',
      '/@string:new',
      '/$order',
    ])
    expect(() => applyBootstrapReport(ours, theirs, report)).toThrow('尚未闭合')
  })

  test('map index 的 /maps 使用 id 语义路径', () => {
    const ours = snapshot({
      'content/maps/index.json': {
        version: 1,
        maps: [{ id: 'ours', name: '作者图', path: 'content/maps/ours.json' }],
      },
    })
    const theirs = generated({
      'content/maps/index.json': {
        version: 1,
        maps: [{ id: 'theirs', name: '迁移图', path: 'content/maps/theirs.json' }],
      },
    })
    const report = createBootstrapReport(ours, theirs)
    expect(report.differences.map((difference) => difference.path)).toEqual([
      '/maps/@string:ours',
      '/maps/@string:theirs',
      '/maps/$order',
    ])
  })

  test('G2：stamps 根数组使用稳定 id 语义路径', () => {
    const ours = snapshot({
      'content/stamps.json': [{ id: 'local', origin: 'authored' }],
    })
    const theirs = generated({
      'content/stamps.json': [{ id: 'builtin', origin: 'migrated' }],
    })
    expect(
      createBootstrapReport(ours, theirs).differences.map((difference) => difference.path),
    ).toEqual(['/@string:local', '/@string:builtin', '/$order'])
  })

  test('精确 decisions 可混合保留 ours 与接受 theirs', () => {
    const ours = snapshot({ 'content/locale.json': { manual: '保留', stale: '旧' } })
    const theirs = generated({ 'content/locale.json': { generated: '新', stale: '新' } })
    const report = createBootstrapReport(ours, theirs)
    const decided: BootstrapReportV1 = {
      ...report,
      differences: report.differences.map((difference) => ({
        ...difference,
        resolution: difference.path === '/manual' ? 'ours' : 'theirs',
        reason: 'test',
      })),
    }
    expect(applyBootstrapReport(ours, theirs, decided).files.get('content/locale.json')).toEqual({
      manual: '保留',
      generated: '新',
      stale: '新',
    })
  })

  test('任一 hash 漂移都会拒绝建立 baseline', () => {
    const ours = snapshot({ 'content/locale.json': { a: 1 } })
    const theirs = generated({ 'content/locale.json': { a: 2 } })
    const report = createBootstrapReport(ours, theirs)
    report.differences[0] = {
      ...report.differences[0]!,
      resolution: 'theirs',
      reason: 'test',
      oursHash: 'bad',
    }
    expect(() => applyBootstrapReport(ours, theirs, report)).toThrow('差异漂移')
  })

  test('整文件选 ours 可保留当前工程的删除语义', () => {
    const ours = snapshot({})
    const theirs = generated({ 'content/music.json': [{ id: 1 }] })
    const report = createBootstrapReport(ours, theirs)
    report.differences[0] = {
      ...report.differences[0]!,
      resolution: 'ours',
      reason: '工程明确删除',
    }
    expect(applyBootstrapReport(ours, theirs, report).files.has('content/music.json')).toBe(false)
  })

  test('重复决策不能冒充精确覆盖', () => {
    const ours = snapshot({ 'content/locale.json': { a: 1, b: 1 } })
    const theirs = generated({ 'content/locale.json': { a: 2, b: 2 } })
    const report = createBootstrapReport(ours, theirs)
    report.differences = [
      { ...report.differences[0]!, resolution: 'theirs', reason: 'test' },
      { ...report.differences[0]!, resolution: 'theirs', reason: 'test' },
    ]
    expect(() => applyBootstrapReport(ours, theirs, report)).toThrow('重复差异')
  })

  test('保留 ours 顺序时不丢掉 theirs 新增条目', () => {
    const ours = snapshot({
      'content/items.json': [
        { id: 'b', x: 1 },
        { id: 'a', x: 1 },
      ],
    })
    const theirs = generated({
      'content/items.json': [
        { id: 'a', x: 1 },
        { id: 'b', x: 1 },
        { id: 'new', x: 1 },
      ],
    })
    const report = createBootstrapReport(ours, theirs)
    report.differences = report.differences.reverse().map((difference) => ({
      ...difference,
      resolution: difference.path === '/$order' ? 'ours' : 'theirs',
      reason: 'test',
    }))
    expect(applyBootstrapReport(ours, theirs, report).files.get('content/items.json')).toEqual([
      { id: 'b', x: 1 },
      { id: 'a', x: 1 },
      { id: 'new', x: 1 },
    ])
  })
})
