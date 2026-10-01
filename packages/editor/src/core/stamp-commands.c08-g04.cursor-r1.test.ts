/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C08-G04：stamp-commands 命令身份与 manifest 轴。
 * 排重：stamp-commands.test / boundaries 已证 manifest 首次登记、migrated 接管、Duplicate、
 * Delete proof 与 batch 失效；不重复 project-io 序列化守卫（P 包 stamps IO）。
 */
import type { StampTemplate } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  C08_TILESET,
  c08StampTemplate,
  openC08Session,
} from '../__tests__/cursor-asset-r1/c08-fixtures.js'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import {
  AddStampTemplateCommand,
  DeleteStampTemplateCommand,
  DuplicateStampTemplateCommand,
  ReplaceStampTemplateCommand,
} from './stamp-commands.js'
import { StampDeletionProof } from './tileset-references.js'

function emptyState(stamps: StampTemplate[] = []): EditorState {
  return {
    manifest: { content: {} } as EditorState['manifest'],
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps,
  } as EditorState
}

describe('C08-G04 stamp-commands 模板身份与 mapReferenceStampIds', () => {
  test('C08-G04-01 AddStampTemplateCommand mapReferenceStampIds 与模板 id 一致', () => {
    const template = c08StampTemplate('c08-a', C08_TILESET)
    const command = new AddStampTemplateCommand(template)
    expect(command.mapReferenceStampIds).toEqual(['c08-a'])
  })

  test('C08-G04-02 ReplaceStampTemplateCommand mapReferenceStampIds 指向目标 id', () => {
    const command = new ReplaceStampTemplateCommand(c08StampTemplate('c08-b', C08_TILESET))
    expect(command.mapReferenceStampIds).toEqual(['c08-b'])
  })

  test('C08-G04-03 DuplicateStampTemplateCommand mapReferenceStampIds 为副本 id', () => {
    const command = new DuplicateStampTemplateCommand('src', 'copy-id')
    expect(command.mapReferenceStampIds).toEqual(['copy-id'])
  })

  test('C08-G04-04 DeleteStampTemplateCommand mapReferenceStampIds 为被删 id', async () => {
    const { session } = await openC08Session('c08-g04-04')
    session.dispatch(new AddStampTemplateCommand(c08StampTemplate('c08-del', C08_TILESET)))
    await session.ensureMapReferencesIndexed()
    const proof = StampDeletionProof.fromBatch(session.getMapReferenceBatch(), 'c08-del')
    const command = new DeleteStampTemplateCommand('c08-del', proof, (current) =>
      session.getCurrentMapReferenceBatch(current),
    )
    expect(command.mapReferenceStampIds).toEqual(['c08-del'])
  })

  test('C08-G04-05 Add 后 manifest.stamps 已存在时不重复改写路径', async () => {
    const { session } = await openC08Session('c08-g04-05')
    session.getState().manifest.content.stamps = 'content/custom-stamps.json'
    session.dispatch(new AddStampTemplateCommand(c08StampTemplate('c08-first', C08_TILESET)))
    expect(session.getState().manifest.content.stamps).toBe('content/custom-stamps.json')
  })

  test('C08-G04-06 Replace 同 JSON 内容 apply 返回同一 stamps 引用语义（no-op）', () => {
    const session = new EditSession(emptyState([c08StampTemplate('c08-same', C08_TILESET)]))
    const before = session.getState().stamps
    const command = new ReplaceStampTemplateCommand(structuredClone(before[0]!))
    const next = command.apply(session.getState())
    expect(next.stamps).toEqual(before)
  })

  test('C08-G04-07 Duplicate 缺省 targetName 时使用「来源名 副本」', () => {
    const source = c08StampTemplate('c08-src', C08_TILESET)
    source.name = '原型组合'
    const session = new EditSession(emptyState([source]))
    session.dispatch(new DuplicateStampTemplateCommand('c08-src', 'c08-copy'))
    expect(session.getState().stamps[1]?.name).toBe('原型组合 副本')
  })

  test('C08-G04-08 Duplicate targetId 空白 trim 后仍走 Add 守卫', () => {
    const session = new EditSession(emptyState([c08StampTemplate('c08-src', C08_TILESET)]))
    expect(() =>
      new DuplicateStampTemplateCommand('c08-src', '   ').apply(session.getState()),
    ).toThrow()
  })

  test('C08-G04-09 Delete 缺模板 apply 为 no-op（false dispatch）', async () => {
    const { session } = await openC08Session('c08-g04-09')
    await session.ensureMapReferencesIndexed()
    const proof = StampDeletionProof.fromBatch(session.getMapReferenceBatch(), 'missing')
    const changed = session.dispatch(
      new DeleteStampTemplateCommand('missing', proof, (current) =>
        session.getCurrentMapReferenceBatch(current),
      ),
    )
    expect(changed).toBe(false)
  })

  test('C08-G04-10 Add invert 后 stamps 为空且 manifest 不含 stamps 键', () => {
    const session = new EditSession(emptyState())
    const command = new AddStampTemplateCommand(c08StampTemplate('c08-x', C08_TILESET))
    session.dispatch(command)
    session.undo()
    expect(session.getState().stamps).toEqual([])
    expect(session.getState().manifest.content).not.toHaveProperty('stamps')
  })
})
