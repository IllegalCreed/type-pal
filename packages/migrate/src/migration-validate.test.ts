import { describe, expect, test } from 'vitest'
import { createMigrationPlan, snapshotOf } from './migration-plan.js'
import {
  assertSpriteReferenceClosure,
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

describe('ED-4A 合并后精灵引用闭包门禁', () => {
  test('只扫描 SpriteDef 与真实引用字段,不误伤含 npc- 的实体 id 或语义资源 id', () => {
    const files = new Map<string, MigrationJson>([
      [
        'content/sprites.json',
        [
          { id: 'sprite-55', spriteNum: 55, label: '迁移资源', layout: { kind: 'static' } },
          { id: 'npc-merchant', spriteNum: 700, label: '作者资源', layout: { kind: 'static' } },
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
      definitions: { total: 2, migrated: 1 },
      actors: { total: 1, migrated: 0 },
      entities: { total: 1, migrated: 0 },
      setActorSprite: { total: 1, migrated: 1 },
      setActorAppearance: { total: 1, migrated: 0 },
    })
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
      spriteNum: 55,
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
