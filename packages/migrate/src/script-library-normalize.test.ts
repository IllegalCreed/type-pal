import type { ScriptChunkV1, ScriptIndexV1 } from '@type-pal/content'
import { deriveScriptChunk, normalizeScriptLibrary } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { MigrationJson } from './pal-migration.js'
import {
  canonicalizeMigrationScriptFiles,
  MIGRATION_SCRIPT_VIEW_PATH,
  materializeMigrationScriptFiles,
} from './script-library-normalize.js'

const id = 'shared/user/demo-a1b2c3d4'
const shards = { shared: 16, global: {} }
const chunkId = deriveScriptChunk(id, shards)!
const library = { [id]: { name: '演示脚本', self: 'none' as const } }

function fixture(): { index: ScriptIndexV1; chunks: Record<string, ScriptChunkV1> } {
  return normalizeScriptLibrary(
    { version: 1, shards, chunks: {}, library },
    {
      [chunkId]: {
        version: 1,
        id: chunkId,
        scripts: { [id]: [{ kind: 'wait', ms: 100 }] },
      },
    },
  )
}

function filesOf(): Map<string, MigrationJson> {
  const { index, chunks } = fixture()
  const meta = index.chunks[chunkId]!
  return new Map<string, MigrationJson>([
    ['content/scripts/index.json', JSON.parse(JSON.stringify(index)) as MigrationJson],
    [`content/scripts/${meta.path}`, JSON.parse(JSON.stringify(chunks[chunkId])) as MigrationJson],
  ])
}

describe('MG2 script library 规范视图', () => {
  test('没有脚本库时只复制 Map 壳，不克隆无关内容树', () => {
    const value: MigrationJson = { nested: [{ id: 'keep', value: 1 }] }
    const input = new Map<string, MigrationJson>([['content/locale.json', value]])
    const canonical = canonicalizeMigrationScriptFiles(input)
    const materialized = materializeMigrationScriptFiles(canonical)
    expect(canonical).not.toBe(input)
    expect(materialized).not.toBe(canonical)
    expect(canonical.get('content/locale.json')).toBe(value)
    expect(materialized.get('content/locale.json')).toBe(value)
  })

  test('content normalize 重建 index 时保留 library', () => {
    expect(fixture().index.library).toEqual(library)
  })

  test('canonical view 显式携带 library', () => {
    const canonical = canonicalizeMigrationScriptFiles(filesOf())
    expect(canonical.has(MIGRATION_SCRIPT_VIEW_PATH)).toBe(true)
    expect(canonical.get('content/scripts/index.json')).toMatchObject({ library })
  })

  test('materialize 重建物理 chunk 后恢复 library', () => {
    const materialized = materializeMigrationScriptFiles(
      canonicalizeMigrationScriptFiles(filesOf()),
    )
    expect(materialized.has(MIGRATION_SCRIPT_VIEW_PATH)).toBe(false)
    expect(materialized.get('content/scripts/index.json')).toMatchObject({ library })
    expect(materialized.get(`content/scripts/chunks/${chunkId}.json`)).toMatchObject({
      scripts: { [id]: [{ kind: 'wait', ms: 100 }] },
    })
  })
})
