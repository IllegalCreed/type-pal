/**
 * TEST-GLM-RUNTIME-RESOURCE-2 R26（migrate/script-library-normalize.ts 窄入口）。
 * 去重账：script-library-normalize.test 已覆盖 canonicalize/materialize 全流程。
 * 本文件只做未占用合同：isMigrationScriptChunkFile 路径分类矩阵（index/view 两保留路径 +
 * content/scripts/ 前缀）、normalizeMigrationScriptFiles 无库快照的分离 Map 合同
 * （内容相等且非同一 Map 实例、输入零突变）。
 */
import { describe, expect, test } from 'vitest'
import type { MigrationJson } from './pal-migration.js'
import {
  isMigrationScriptChunkFile,
  MIGRATION_SCRIPT_VIEW_PATH,
  normalizeMigrationScriptFiles,
} from './script-library-normalize.js'

describe('R26 isMigrationScriptChunkFile', () => {
  test('content/scripts/ 下为 chunk；index 与合并视图两保留路径非 chunk；库外非 chunk', () => {
    expect(isMigrationScriptChunkFile('content/scripts/shared-0.json')).toBe(true)
    expect(isMigrationScriptChunkFile('content/scripts/deep/nested.json')).toBe(true)
    expect(isMigrationScriptChunkFile('content/scripts/index.json')).toBe(false)
    expect(isMigrationScriptChunkFile(MIGRATION_SCRIPT_VIEW_PATH)).toBe(false)
    expect(isMigrationScriptChunkFile('content/maps/1.json')).toBe(false)
    expect(isMigrationScriptChunkFile('scripts/shared-0.json')).toBe(false)
  })
})

describe('R26 normalizeMigrationScriptFiles 无库快照', () => {
  test('无 script index：内容逐项相等、Map 壳分离（非同一实例）、输入零突变', () => {
    const input = new Map<string, MigrationJson>([
      ['content/maps/1.json', { width: 4 }],
      ['content/scripts/shared-0.json', { version: 1 }],
    ])
    const snapshot = [...input.entries()]
    const out = normalizeMigrationScriptFiles(input)
    expect([...out.keys()]).toEqual([...input.keys()])
    expect(out.get('content/maps/1.json')).toEqual({ width: 4 })
    expect(out).not.toBe(input)
    expect([...input.entries()]).toEqual(snapshot)
    // 分离：改输出不影响输入
    out.set('extra', { x: 1 })
    expect(input.has('extra')).toBe(false)
  })
})
