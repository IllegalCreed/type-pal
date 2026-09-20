/**
 * TEST-EDITOR-SCRIPT-HELPERS-1 S03：script-editor-projection 合并语义。
 * 既有 script-editor-projection.test 已覆盖顺序/shell+正文/不复活/引用切片主干——不重复。
 * 本文件：initial 页动画以 shell 覆盖/移除且非 initial 不受 shell、hostile 三 callback
 * canonical 优先、无 shell hostile 不复活、新实体未登记 onLose 拒绝、切片双向不别名、
 * 保存边界私有脚本缺正文精确拒绝、itemPrivateScript 正文回写。
 * canonical scenes 由当前合法作者对象构造（过 validateAuthorScenes，见机账 factory 正控）。
 */
import { validateAuthorScenes } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import type { ScriptEditorState } from './script-editor.js'
import {
  mergeEditorProjectionWithCurrentAuthorState,
  projectCurrentAuthorReferenceSlices,
} from './script-editor-projection.js'

const page = (id: string, label: string, animation?: string) => ({
  id,
  label,
  ...(animation === undefined ? {} : { animation: { effect: animation } }),
})

function makeShell() {
  return {
    scenes: [
      {
        id: 'scene-1',
        name: '场景',
        entities: [
          {
            id: 'npc-1',
            name: 'NPC',
            pages: [page('initial', '首页', 'shell-anim'), page('other', '次页', 'x')],
            hostile: {
              enemyTeamId: 'team-shell',
              onLose: 'gameOver',
              onVictory: { kind: 'remove' },
              onPlayerFlee: { kind: 'suspend', ticks: 3 },
            },
          },
        ],
        hooks: {},
      },
    ],
    items: [],
  } as unknown as EditorState
}

function makeCanonical(): ScriptEditorState {
  return {
    scenes: [
      {
        id: 'scene-1',
        mapId: 'map-1',
        name: '场景（canonical 名不进 shell 合并）',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'npc-1',
            pos: { col: 0, row: 0, height: 0 },
            zone: true,
            pages: [
              page('initial', '首页', 'canonical-anim'),
              page('other', '次页', 'canonical-anim'),
            ],
            initialPage: 'initial',
            hostile: {
              enemyTeamId: 'team-canonical',
              onLose: [{ kind: 'wait', ms: 100 }],
              onVictory: { kind: 'hide', ticks: 9 },
              onPlayerFlee: { kind: 'remain' },
            },
          },
        ],
        hooks: {
          onEnter: {
            variants: {
              'hook-1': {
                label: '钩子',
                order: 10,
                flow: { kind: 'stages', initial: 'main', stages: [{ id: 'main', body: [] }] },
              },
            },
          },
        },
      },
    ],
    items: [],
    sharedScripts: {},
  } as unknown as ScriptEditorState
}

describe('S03 projectCurrentAuthorReferenceSlices 合并', () => {
  test('canonical scenes 过正式 validateAuthorScenes（合法 fixture 正控）', () => {
    expect(() => validateAuthorScenes(makeCanonical().scenes)).not.toThrow()
  })
  test('initial 页动画以 shell 覆盖/移除；非 initial 页动画保持 canonical；hostile 三 callback canonical 优先', () => {
    const shell = makeShell()
    const canonical = makeCanonical()
    // onVictory 未定义轴：删键后合并应保留 shell 值（正式守卫要求三键齐备，故用运行时变体）
    delete (
      (canonical.scenes[0] as unknown as { entities: Array<Record<string, unknown>> }).entities[0]!
        .hostile as Record<string, unknown>
    ).onVictory
    const merged = projectCurrentAuthorReferenceSlices(canonical, shell)
    const entity = (merged.scenes[0] as unknown as { entities: Array<Record<string, unknown>> })
      .entities[0]!
    const pages = entity.pages as Array<{ id: string; animation?: { effect: string } }>
    expect(pages.find((p) => p.id === 'initial')?.animation?.effect).toBe('shell-anim') // shell 覆盖
    expect(pages.find((p) => p.id === 'other')?.animation?.effect).toBe('canonical-anim') // 非 initial 不动
    const hostile = entity.hostile as Record<string, unknown>
    expect(hostile.onLose).toEqual([{ kind: 'wait', ms: 100 }]) // canonical 优先
    expect(hostile.onPlayerFlee).toEqual({ kind: 'remain' })
    expect(hostile.onVictory).toEqual({ kind: 'remove' }) // canonical 未定义 → 保留 shell 值
    expect(hostile.enemyTeamId).toBe('team-shell') // shell 基底字段
    // 移除轴：shell 无动画 → initial 页动画被删
    const shellNoAnim = structuredClone(shell)
    ;(
      (shellNoAnim.scenes[0] as unknown as { entities: Array<Record<string, unknown>> })
        .entities[0]!.pages as Array<Record<string, unknown>>
    )[0] = page('initial', '首页')
    const removed = projectCurrentAuthorReferenceSlices(canonical, shellNoAnim)
    const removedEntity = (
      (removed.scenes[0] as unknown as { entities: Array<Record<string, unknown>> }).entities[0]!
        .pages as Array<{ id: string; animation?: unknown }>
    ).find((p) => p.id === 'initial')!
    expect('animation' in removedEntity).toBe(false)
  })
  test('无 shell hostile → hostile 不复活；hooks/behaviors 取 canonical；切片与实际输入双向不别名', () => {
    const shell = makeShell()
    delete (shell.scenes[0] as unknown as { entities: Array<Record<string, unknown>> }).entities[0]!
      .hostile
    const canonical = makeCanonical()
    const merged = projectCurrentAuthorReferenceSlices(canonical, shell)
    const entity = (merged.scenes[0] as unknown as { entities: Array<Record<string, unknown>> })
      .entities[0]!
    expect('hostile' in entity).toBe(false) // canonical 有 hostile 但 shell 无 → 不复活
    const hooks = (
      merged.scenes[0] as unknown as {
        hooks: { onEnter?: { variants: Record<string, { label: string }> } }
      }
    ).hooks
    expect(hooks.onEnter!.variants['hook-1']!.label).toBe('钩子') // hooks 取 canonical
    // 双向不别名：改合并结果不动两份实参
    const shellSnapshot = structuredClone(shell.scenes)
    const canonicalSnapshot = structuredClone(canonical.scenes)
    hooks.onEnter!.variants['hook-1']!.label = '改了'
    expect(structuredClone(shell.scenes)).toEqual(shellSnapshot)
    expect(structuredClone(canonical.scenes)).toEqual(canonicalSnapshot)
  })
})

describe('S03 mergeEditorProjectionWithCurrentAuthorState 保存边界', () => {
  test('新实体未登记非 gameOver onLose 拒绝；私有脚本缺正文精确拒绝；合法时不改实参', () => {
    const shell = makeShell()
    const canonical = makeCanonical()
    // canonical 无 npc-1 → 新实体；shell hostile.onLose = 'gameOver' 合法 → 不抛
    const canonicalEmpty = { ...canonical, scenes: [] } as ScriptEditorState
    expect(() => mergeEditorProjectionWithCurrentAuthorState(canonicalEmpty, shell)).not.toThrow()
    const shellBad = structuredClone(shell)
    ;(
      (shellBad.scenes[0] as unknown as { entities: Array<Record<string, unknown>> }).entities[0]!
        .hostile as Record<string, unknown>
    ).onLose = [{ kind: 'wait', ms: 1 }] // 命令数组 ≠ gameOver → 未登记正文拒绝
    expect(() => mergeEditorProjectionWithCurrentAuthorState(canonicalEmpty, shellBad)).toThrow(
      'mergeEditorProjectionWithCurrentAuthorState: 新实体 scene-1/npc-1 含未登记 hostile.onLose',
    )

    // 私有脚本：shell 引用 owner i1 但 canonical 缺正文 → 保存拒绝
    const shellItem = {
      ...shell,
      items: [
        {
          id: 'i1',
          name: '物',
          use: {
            effects: [
              {
                kind: 'runScript',
                script: { id: 'i1', chunk: '__author-item-private-runtime' },
              },
            ],
          },
        },
      ],
    } as unknown as EditorState
    expect(() => mergeEditorProjectionWithCurrentAuthorState(canonical, shellItem)).toThrow(
      '物品 i1 的 use.effects[0] 私有脚本 use 正文缺失，拒绝保存；请恢复该脚本或移除引用。',
    )
    // 合法：canonical 提供正文 → itemPrivateScript 正文原样回写
    const canonicalWithBody = {
      ...canonical,
      items: [
        {
          id: 'i1',
          name: '物',
          use: {
            effects: [
              { kind: 'itemPrivateScript', script: { id: 'use', body: [{ kind: 'wait', ms: 1 }] } },
            ],
          },
        },
      ],
    } as unknown as ScriptEditorState
    const shellSnapshot = structuredClone(shellItem.items)
    const merged = mergeEditorProjectionWithCurrentAuthorState(canonicalWithBody, shellItem)
    // 私有 'use' 脚本：shell 引用位替换为 canonical 的 itemPrivateScript 正文（kind 不转 runScript）
    expect(merged.items[0]!.use!.effects[0]).toEqual({
      kind: 'itemPrivateScript',
      script: { id: 'use', body: [{ kind: 'wait', ms: 1 }] },
    })
    expect(structuredClone(shellItem.items)).toEqual(shellSnapshot)
  })
})
