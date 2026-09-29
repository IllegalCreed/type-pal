/** TEST-GLM-NEW-J-1 J02：migrate-content 0x6D 场景覆写补丁解析 + 中性精灵 id 身份。
 * 旧证：migrate-content.test.ts / migrate-scenes.* 盖 mapScenesStatic/finalizeBattleConfig/
 * propagateBattleFieldDefaults/mergeSceneScriptBindings；
 * `resolveSceneScriptPatches` 与 `migratedSpriteId` 在旧测试零直接断言。
 * 纯内存测试：真实 translator/registry，不 mock 被测核心，不执行真实迁移。
 */

import type { Command, SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { migratedSpriteId, resolveSceneScriptPatches } from './migrate-content.js'
import type { SourceCmd } from './source-facts.js'
import { emptyTranslateReport, ScriptRegistry, type TranslateCtx } from './translate-events.js'

const playSoundChain: SourceCmd[] = [
  { label: 'L_100', op: 'raw', opcode: 0x47, operands: [5] },
  { op: 'end' },
]

function ctxWith(labels: Record<string, readonly SourceCmd[]>): TranslateCtx {
  const labelAt: TranslateCtx['labelAt'] = new Map()
  for (const [label, cmds] of Object.entries(labels)) {
    const index = cmds.findIndex((command) => 'label' in command && command.label === label)
    labelAt.set(label, { cmds, idx: index < 0 ? 0 : index })
  }
  return {
    labelAt,
    locale: {},
    report: emptyTranslateReport(),
    palSemanticProfile: 'current-r13-6b',
    palReferenceSchema: 'stable-id',
    registry: new ScriptRegistry(() => 's001'),
  }
}

const scene = (id: string, onEnter: Command[] = []): SceneDef => ({
  id,
  mapId: 'map-001',
  entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
  entities: [],
  ...(onEnter.length ? { onEnter: [{ body: onEnter }] } : {}),
})

const placeholder = (targetScene: string, addr: number): Command[] => [
  {
    kind: 'setSceneOnEnter',
    scene: targetScene,
    stages: [],
    _addr: addr,
    _sourceAddress: 7,
    _owner: 'e3',
    _path: 'root',
  } as Command,
]

describe('resolveSceneScriptPatches：0x6D 覆写占位解析为 registry 分片根', () => {
  test('占位 _addr 解析成 callScript 根绑定并删除全部迁移期私有键', () => {
    const ctx = ctxWith({ L_100: playSoundChain })
    const chainBefore = structuredClone(playSoundChain)
    const scenes = [scene('s001', placeholder('s002', 100)), scene('s002')]
    const lifted: string[] = []
    resolveSceneScriptPatches(scenes, ctx, lifted)
    const command = scenes[0]!.onEnter?.[0]!.body[0] as Record<string, unknown>
    expect(command.kind).toBe('setSceneOnEnter')
    expect(command).not.toHaveProperty('_addr')
    expect(command).not.toHaveProperty('_sourceAddress')
    expect(command).not.toHaveProperty('_owner')
    expect(command).not.toHaveProperty('_path')
    const stages = command.stages as Array<{ body: Command[] }>
    expect(stages).toHaveLength(1)
    expect(stages[0]!.body).toEqual([
      {
        kind: 'callScript',
        ref: { id: 'scene/s002/override/on-enter/L-100/stage-0', chunk: 'scene/s002' },
      },
    ])
    const bodies = ctx.registry!.commandBodies()
    expect(bodies).toHaveLength(1)
    expect(JSON.stringify(bodies[0])).toContain('sound.pal.005')
    expect(lifted).toEqual([])
    expect(playSoundChain).toEqual(chainBefore)
    expect(scenes[1]!.id).toBe('s002')
    expect(scenes[1]!.entities).toEqual([])
  })

  test('同 key 占位共享同一根（不重复注册），不同目标地址各走各的绑定', () => {
    const ctx = ctxWith({ L_100: playSoundChain, L_200: playSoundChain })
    const scenes = [
      scene('s001', placeholder('s002', 100)),
      scene('s003', placeholder('s002', 100)),
      scene('s002'),
    ]
    resolveSceneScriptPatches(scenes, ctx)
    const first = (scenes[0]!.onEnter?.[0]!.body[0] as Record<string, unknown>).stages as Array<{
      body: Command[]
    }>
    const second = (scenes[1]!.onEnter?.[0]!.body[0] as Record<string, unknown>).stages as Array<{
      body: Command[]
    }>
    expect(first).toEqual(second)
    const rootBodies = ctx.registry!.commandBodies()
    expect(rootBodies).toHaveLength(1)
    expect(JSON.stringify(rootBodies[0])).toContain('sound.pal.005')
  })

  test('目标场景不存在：记 0x6D gap 并拆除占位，不伪造绑定', () => {
    const ctx = ctxWith({ L_100: playSoundChain })
    const scenes = [scene('s001', placeholder('s999', 100)), scene('s002')]
    resolveSceneScriptPatches(scenes, ctx)
    const command = scenes[0]!.onEnter?.[0]!.body[0] as Record<string, unknown>
    expect(command.stages).toEqual([])
    expect(command).not.toHaveProperty('_addr')
    const gap = ctx.report.gaps.find((entry) => entry.opcode === 0x6d)
    expect(gap).toMatchObject({
      sourceAddress: 7,
      operands: [1000, 100, 0],
      owner: 'e3',
      reachable: true,
      reason: '0x6D 目标场景不存在 s999',
    })
    expect(ctx.registry!.commandBodies()).toEqual([])
  })

  test('目标脚本不可译（label 缺失）：记不可译 gap，占位拆除', () => {
    const ctx = ctxWith({ L_100: playSoundChain })
    const scenes = [scene('s001', placeholder('s002', 200)), scene('s002')]
    resolveSceneScriptPatches(scenes, ctx)
    const command = scenes[0]!.onEnter?.[0]!.body[0] as Record<string, unknown>
    expect(command.stages).toEqual([])
    expect(ctx.report.gaps.map((entry) => entry.reason)).toContain('0x6D 目标脚本不可译 s002:L_200')
  })
})

describe('migratedSpriteId：中性 SpriteDef 稳定身份', () => {
  test('编号直映射；布局变体仅在显式给定时追加 -f<n>', () => {
    expect(migratedSpriteId(245)).toBe('sprite-245')
    expect(migratedSpriteId(1)).toBe('sprite-1')
    expect(migratedSpriteId(193, 5)).toBe('sprite-193-f5')
    expect(migratedSpriteId(7, 0)).toBe('sprite-7-f0')
  })
})
