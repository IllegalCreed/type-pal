/**
 * TEST-EDITOR-SCRIPT-HELPERS-1 S03：script-editor-projection 合并语义。
 * 既有 script-editor-projection.test 已覆盖顺序/shell+正文/不复活/引用切片主干——不重复。
 * 本文件：initial 页动画以 shell 覆盖/移除且非 initial 不受 shell、hostile 三 callback
 * canonical 优先、无 shell hostile 不复活、新实体未登记 onLose 拒绝、切片双向不别名、
 * 保存边界私有脚本缺正文精确拒绝、runScript 回写纯 id。
 */
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import type { ScriptEditorState } from './script-editor.js'
import {
  mergeEditorProjectionWithCurrentAuthorState,
  projectCurrentAuthorReferenceSlices,
} from './script-editor-projection.js'

const page = (id: string, animation?: string) => ({
  id,
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
            pages: [page('initial', 'shell-anim'), page('other', 'canonical-anim')],
            hostile: { onLose: 'gameOver', onVictory: 'shared/win', onPlayerFlee: 'shell-flee' },
          },
        ],
        hooks: [],
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
        name: '场景（canonical 名不进 shell 合并）',
        entities: [
          {
            id: 'npc-1',
            name: 'NPC',
            pages: [page('initial', 'canonical-anim'), page('other', 'canonical-anim')],
            initialPage: 'initial',
            hostile: {
              onLose: 'canonical-lose',
              onVictory: undefined,
              onPlayerFlee: 'canonical-flee',
            },
          },
        ],
        hooks: [{ id: 'hook-1', name: '钩子', body: [] }],
      },
    ],
    items: [],
    sharedScripts: { 'shared/win': { name: '胜利', body: [] } },
  } as unknown as ScriptEditorState
}

describe('S03 projectCurrentAuthorReferenceSlices 合并', () => {
  test('initial 页动画以 shell 覆盖/移除；非 initial 页动画保持 canonical；hostile 三 callback canonical 优先', () => {
    const shell = makeShell()
    const canonical = makeCanonical()
    const merged = projectCurrentAuthorReferenceSlices(canonical, shell)
    const entity = (merged.scenes[0] as unknown as { entities: Array<Record<string, unknown>> })
      .entities[0]!
    const pages = entity.pages as Array<{ id: string; animation?: { effect: string } }>
    expect(pages.find((p) => p.id === 'initial')?.animation?.effect).toBe('shell-anim') // shell 覆盖
    expect(pages.find((p) => p.id === 'other')?.animation?.effect).toBe('canonical-anim') // 非 initial 不动
    const hostile = entity.hostile as Record<string, unknown>
    expect(hostile.onLose).toBe('canonical-lose') // canonical 优先
    expect(hostile.onPlayerFlee).toBe('canonical-flee')
    expect(hostile.onVictory).toBe('shared/win') // canonical 未定义 → 保留 shell 值
    // 移除轴：shell 无动画 → initial 页动画被删
    const shellNoAnim = structuredClone(shell)
    ;(
      (shellNoAnim.scenes[0] as unknown as { entities: Array<Record<string, unknown>> })
        .entities[0]!.pages as Array<Record<string, unknown>>
    )[0] = page('initial')
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
    expect((merged.scenes[0] as unknown as { hooks: unknown[] }).hooks).toEqual([
      { id: 'hook-1', name: '钩子', body: [] },
    ])
    // 双向不别名：改合并结果不动两份实参
    const shellSnapshot = structuredClone(shell.scenes)
    const canonicalSnapshot = structuredClone(canonical.scenes)
    ;(merged.scenes[0] as unknown as { hooks: Array<Record<string, unknown>> }).hooks[0]!.name =
      '改了'
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
    ).onLose = 'shared/unknown'
    expect(() => mergeEditorProjectionWithCurrentAuthorState(canonicalEmpty, shellBad)).toThrow(
      'mergeEditorProjectionWithCurrentAuthorState: 新实体 scene-1/npc-1 含未登记 hostile.onLose',
    )

    // 私有脚本：shell 引用 item:i1:use 但 canonical 缺正文 → 保存拒绝
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
                script: { id: 'item:i1:use', chunk: '__author-script-runtime' },
              },
            ],
          },
        },
      ],
    } as unknown as EditorState
    expect(() => mergeEditorProjectionWithCurrentAuthorState(canonical, shellItem)).toThrow(
      '物品 i1 的 use.effects[0] 私有脚本 use 正文缺失，拒绝保存；请恢复该脚本或移除引用。',
    )
    // 合法：canonical 提供正文 → runScript 回写纯 id
    const canonicalWithBody = {
      ...canonical,
      items: [
        {
          id: 'i1',
          name: '物',
          use: {
            effects: [
              { kind: 'itemPrivateScript', script: { id: 'use', body: [{ kind: 'end' }] } },
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
      script: { id: 'use', body: [{ kind: 'end' }] },
    })
    expect(structuredClone(shellItem.items)).toEqual(shellSnapshot)
  })
})
