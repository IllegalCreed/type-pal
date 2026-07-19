import { describe, expect, test } from 'vitest'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'
import {
  assertSceneEntryReferenceClosure,
  assertSpriteReferenceClosure,
  auditSceneEntryReferenceClosure,
  auditSpriteReferenceClosure,
  findMissingDialogLocaleRefs,
} from './migration-validate.js'
import type { MigrationJson } from './pal-migration.js'

describe('迁移合并后 locale 引用门禁', () => {
  test('遍历嵌套脚本的 text/speaker 且去重', () => {
    const files = new Map<string, MigrationJson>([
      [
        'content/scripts/chunks/a.json',
        {
          scripts: {
            a: [
              { kind: 'dialog', cue: { rows: [{ text: 'dlg.ok' }], speaker: 'spk.missing' } },
              {
                kind: 'branch',
                then: [{ kind: 'dialog', cue: { rows: [{ text: 'dlg.missing' }] } }],
              },
            ],
          },
        },
      ],
    ])
    expect(findMissingDialogLocaleRefs(files, { 'dlg.ok': '已有' })).toEqual([
      'dlg.missing',
      'spk.missing',
    ])
  })
})

describe('W4-1 合并后命名落点引用闭包门禁', () => {
  const scene = (
    entries: Record<string, MigrationJson> | undefined,
    onEnter: MigrationJson[] = [],
  ): MigrationJson => ({
    id: 's001',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    ...(entries ? { entries } : {}),
    entities: [],
    ...(onEnter.length ? { onEnter } : {}),
  })

  test('递归覆盖分支中的命名引用，并区分默认/显式坐标', () => {
    const entryId = 'pal-entry-a1'
    const files = new Map<string, MigrationJson>([
      [
        'content/scenes/s001.json',
        scene({
          [entryId]: {
            label: '侧门',
            pos: { col: 2, row: 3, height: 0 },
          },
        }),
      ],
      [
        'content/scripts/chunks/shared.json',
        {
          scripts: {
            a: [
              { kind: 'loadScene', scene: 's001' },
              { kind: 'loadScene', scene: 's001', pos: { col: 8, row: 9, height: 0 } },
              {
                kind: 'branch',
                then: [{ kind: 'loadScene', scene: 's001', entryId }],
              },
            ],
          },
        },
      ],
    ])
    expect(assertSceneEntryReferenceClosure(files)).toEqual({
      commands: { total: 3, default: 1, named: 1, explicitPos: 1 },
      generatedEntries: 1,
      issues: [],
    })
  })

  test('ours 仍引用旧 from-* × theirs 删除定义：结构合并可成功，闭包必须阻断', () => {
    const oldId = 'from-shared-1'
    const entry = { pos: { col: 2, row: 3, height: 0 } }
    const baseFiles = new Map<string, MigrationJson>([
      ['content/scenes/s001.json', scene({ [oldId]: entry })],
    ])
    const oursFiles = new Map<string, MigrationJson>([
      [
        'content/scenes/s001.json',
        scene({ [oldId]: entry }, [
          { body: [{ kind: 'loadScene', scene: 's001', entryId: oldId }] },
        ]),
      ],
    ])
    const theirsFiles = new Map<string, MigrationJson>([
      [
        'content/scenes/s001.json',
        scene(undefined, [{ body: [{ kind: 'loadScene', scene: 's001', entryId: oldId }] }]),
      ],
    ])
    const fileSet = (files: Map<string, MigrationJson>) => ({
      files,
      managedFiles: new Set(files.keys()),
    })
    const plan = createMigrationPlan(
      snapshotOf(fileSet(baseFiles)),
      snapshotOf(fileSet(oursFiles)),
      fileSet(theirsFiles),
    )

    expect(plan.conflicts).toEqual([])
    expect(auditSceneEntryReferenceClosure(plan.target).issues).toEqual([
      expect.objectContaining({ message: `命名落点 s001/${oldId} 不存在` }),
    ])
    expect(() => assertSceneEntryReferenceClosure(plan.target)).toThrow(/命名落点引用闭包门禁失败/)
  })

  test('迁移落点未引用或同坐标重复均 fail-loud', () => {
    const files = new Map<string, MigrationJson>([
      [
        'content/scenes/s001.json',
        scene({
          'pal-entry-a': { pos: { col: 1, row: 2, height: 0 } },
          'pal-entry-b': { pos: { col: 1, row: 2, height: 0 } },
        }),
      ],
    ])
    const messages = auditSceneEntryReferenceClosure(files).issues.map((issue) => issue.message)
    expect(messages.some((message) => message.includes('重复 GridPos'))).toBe(true)
    expect(messages.filter((message) => message.includes('没有任何脚本引用'))).toHaveLength(2)
  })
})

describe('ED-4A 合并后精灵引用闭包门禁', () => {
  test('只扫描 SpriteDef 与真实引用字段,不误伤含 npc- 的实体 id 或语义资源 id', () => {
    const files = new Map<string, MigrationJson>([
      [
        'content/sprites.json',
        [
          {
            id: 'sprite-55',
            asset: 'sprite.pal.055',
            label: '迁移资源',
            layout: { kind: 'static' },
          },
          {
            id: 'sprite-82',
            asset: 'sprite.pal.082',
            label: '跟随者',
            layout: { kind: 'directional', framesPerDir: 3 },
          },
          {
            id: 'npc-merchant',
            asset: 'sprite.author.merchant',
            label: '作者资源',
            layout: { kind: 'static' },
          },
        ],
      ],
      ['content/actors.json', [{ id: 'guide', name: 'name.guide', spriteId: 'npc-merchant' }]],
      [
        'content/scenes/s001.json',
        {
          id: 's001',
          mapId: 'map-001',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [
            {
              id: 'npc-55',
              pos: { col: 0, row: 0, height: 0 },
              sprite: 'npc-merchant',
            },
          ],
          onEnter: [
            {
              body: [
                { kind: 'setActorSprite', actor: 'guide', sprite: 'sprite-55' },
                { kind: 'setActorAppearance', actor: 'guide', spriteId: 'npc-merchant' },
                { kind: 'setFollowers', sprites: ['sprite-82'] },
              ],
            },
          ],
        },
      ],
    ])

    const report = assertSpriteReferenceClosure(files)
    expect(report.legacy).toEqual([])
    expect(report.unresolved).toEqual([])
    expect(report.channels).toEqual({
      definitions: { total: 3, migrated: 2 },
      actors: { total: 1, migrated: 0 },
      entities: { total: 1, migrated: 0 },
      setActorSprite: { total: 1, migrated: 1 },
      setActorAppearance: { total: 1, migrated: 0 },
      setFollowers: { total: 1, migrated: 1 },
    })
  })

  test('setFollowers 旧数字不会绕过闭包门禁', () => {
    const files = new Map<string, MigrationJson>([
      ['content/sprites.json', []],
      [
        'content/scripts/chunks/a.json',
        { scripts: { a: [{ kind: 'setFollowers', sprites: [82] }] } },
      ],
    ])
    expect(auditSpriteReferenceClosure(files).unresolved).toEqual([
      {
        where: 'content/scripts/chunks/a.json/scripts/a/0/sprites/0',
        id: '82',
        channel: 'setFollowers',
      },
    ])
    expect(() => assertSpriteReferenceClosure(files)).toThrow(/setFollowers 引用 82/)
  })

  test('ours 新实体仍引用旧 id × theirs 改名时,三方合并虽无字段冲突但闭包硬阻断', () => {
    const scene = (entities: MigrationJson[]): MigrationJson => ({
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities,
    })
    const sprite = (id: string): MigrationJson => ({
      id,
      asset: 'sprite.pal.055',
      label: '原精灵 55',
      layout: { kind: 'static' },
    })
    const baseFiles = new Map<string, MigrationJson>([
      ['content/sprites.json', [sprite('npc-55')]],
      ['content/scenes/s001.json', scene([])],
    ])
    const oursFiles = new Map<string, MigrationJson>([
      ['content/sprites.json', [sprite('npc-55')]],
      [
        'content/scenes/s001.json',
        scene([
          {
            id: 'e-user',
            pos: { col: 1, row: 2, height: 0 },
            sprite: 'npc-55',
          },
        ]),
      ],
    ])
    const theirsFiles = new Map<string, MigrationJson>([
      ['content/sprites.json', [sprite('sprite-55')]],
      ['content/scenes/s001.json', scene([])],
    ])
    const fileSet = (files: Map<string, MigrationJson>) => ({
      files,
      managedFiles: new Set(files.keys()),
    })
    const plan = createMigrationPlan(
      snapshotOf(fileSet(baseFiles)),
      snapshotOf(fileSet(oursFiles)),
      fileSet(theirsFiles),
    )

    expect(plan.conflicts).toEqual([])
    expect(auditSpriteReferenceClosure(plan.target).unresolved).toEqual([
      {
        where: 'content/scenes/s001.json/entities/0/sprite',
        id: 'npc-55',
        channel: 'entities',
      },
    ])
    expect(() => assertSpriteReferenceClosure(plan.target)).toThrow(
      /精灵引用闭包门禁失败[\s\S]*npc-55/,
    )
  })
})
