/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K03：world-sprite-behavior 纯核心模块补测。
 *
 * 旧断言去重（只登记缺口，不复制）：
 * - world-sprite-behavior.test.ts 已证：确定性线性闭环→cycle；非 chance 分支/缺引用/513 超预算→
 *   「自动行为脚本」label；递归栈退出后顺序重用子脚本；next:0 animEntity 隐式逐帧循环；显式定帧压住
 *   animEntity；directional 布局不把朝向偏移伪装成物理帧；只读第 0 页 auto；intro/cycle 分离；单阶段
 *   整段循环；多阶段 wait 精确定时循环；chance 自重试/尾跳拆 variants（路径 [0,1]/[2,3,2,0]、note 含
 *   96%、非 cycle）；callee/stage 根 stopScript 语义；非尾 jumpScript；wait-only 默认帧；
 *   collectAutomaticScriptSpriteInstanceSites/DefinitionIds 的 direct/actor、只读第 0 页、空 stages/zone/
 *   未投影 auto 字符串忽略（手铸 `as unknown as EditorState` 状态，sites 只断 {spriteId, via} 子集）。
 * - world-sprite-behavior.wave2.test.ts 已证：canonical 投影全命令 lowering + 输入隔离、until/while 条件
 *   保留、shared 调用 self 兼容/异己/缺失边界、projectCanonicalSharedScriptPreviewChunk 精确、状态机
 *   initial/restart/to 下标、双实例两 site 精确 + 输入隔离。
 * 本组缺口（本文件）：
 * - collectSpriteAutomaticScriptBehaviorsForResource 直调：同资产多定义分组、相同稳定帧序跨实例合并计数
 *   （instanceCount/sceneCount）、directional 定义在聚合路径落 unavailable、混合资产整表拒绝。
 * - describeSpriteReferenceBehavior 非场景 owner 分类（actor/script-owner/script-chunk/shared-script/
 *   runtime-world/兜底内容引用）与失效 scene-entity/scene 引用的保守回退；scene-page owner 同样解析实例行为。
 * - 无 auto 实例的布局分类：loop→「用途自动循环」、directional→「四向场景实例」（读实体朝向）。
 * - unavailable preview 精确形状；合法可证脚本在 actualFrameCount 缺席/零/非整数时不伪装 cycle。
 * - chance 采样 48 tick 预算耗尽 → note 披露「此示例在安全预算处截断」，仍报 variants 不伪装唯一循环。
 * - projectCanonicalSpritePreviewState 边界：无 canonical 对应的 scene/entity 原引用保留、无 auto 的
 *   canonical 实体保留 shell 页字段、scriptChunks 注入共享 chunk 且不动既有键、输入隔离。
 * - collectAutomaticScriptSpriteInstanceSites：真实 loader 状态 + 真实命令实体；未知 actor 跳过；全字段精确。
 * 全部走真实导出函数 + 真实装载项目（loadBoundaryProject）+ 真实命令（AddEntityCommand/AddSpriteCommand）；
 * 无任何 mock/私有栈读取。
 */
import type { EntityDef } from '@type-pal/content'
import {
  type AuthorSceneDef,
  type AuthorScriptLibrary,
  checkAuthorScriptFlow,
  checkAuthorScriptLibrary,
  validateAuthorScenes,
} from '@type-pal/content'
import { decodeWorldSpriteAssetBytes } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  loadBoundaryProject,
  withSharedWorldSprite,
} from './__tests__/cursor-command-boundary-fixtures.js'
import { AddEntityCommand, AddSpriteCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import type { ProjectReferenceEdge, ProjectReferenceSourceOwner } from './project-reference.js'
import {
  collectAutomaticScriptSpriteInstanceSites,
  collectSpriteAutomaticScriptBehaviorsForResource,
  describeSpriteReferenceBehavior,
  projectCanonicalSpritePreviewState,
  SCRIPT_PREVIEW_SHARED_CHUNK,
} from './world-sprite-behavior.js'

const STARTER_ASSET = 'sprite.generated.starter'

function pos(col: number, row: number): EntityDef['pos'] {
  return { col, row, height: 0 }
}

/** 真实装载空白项目 + 真实命令逐个加实体；返回最终合法 EditorState。 */
async function behaviorState(
  name: string,
  entities: readonly EntityDef[],
): Promise<{ state: EditorState; actualFrameCount: number }> {
  const { source, state } = await loadBoundaryProject(name)
  let current = state
  for (const entity of entities)
    current = new AddEntityCommand('start', structuredClone(entity)).apply(current)
  const hero = current.sprites.find((sprite) => sprite.id === 'hero')!
  const record = current.assetCatalog.assets[hero.asset]!
  const decoded = await decodeWorldSpriteAssetBytes(record, await source.readBytes(record.path))
  return { state: current, actualFrameCount: decoded.frames.length }
}

/** 引用边是纯输入数据；owner 形态是本测试的变量，其余字段固定合法。 */
function edgeFor(owner: ProjectReferenceSourceOwner, detail?: string): ProjectReferenceEdge {
  return {
    id: 0,
    target: { kind: 'world-sprite', id: 'hero' },
    source: { key: `k03:${owner.kind}`, owner, label: 'K03 来源', deletedWith: [] },
    relation: { kind: 'world-sprite-use' },
    where: 'k03.where',
    ...(detail === undefined ? {} : { detail }),
    locator: { kind: 'unavailable', reason: 'K03 只读' },
    deletePolicy: 'block',
  }
}

function sceneEntityOwner(entityId: string): ProjectReferenceSourceOwner {
  return { kind: 'scene-entity', sceneId: 'start', entityId }
}

describe('K03 collectSpriteAutomaticScriptBehaviorsForResource', () => {
  test('同资产多定义分组、相同帧序跨实例合并计数，directional 定义聚合落 unavailable，混合资产拒绝', async () => {
    const { source, state: blank } = await loadBoundaryProject('kimi-k03-behaviors')
    let state = await withSharedWorldSprite(source, blank, 'k03-static-a')
    state = await withSharedWorldSprite(source, state, 'k03-static-b')
    const entities: EntityDef[] = [
      // e1/e2 同定义同帧序 → 合并为一个摘要，instanceCount=2。
      {
        id: 'e1',
        pos: pos(1, 1),
        sprite: 'k03-static-a',
        pages: [
          {
            auto: {
              stages: [
                {
                  body: [
                    { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
                    { kind: 'wait', ms: 100 },
                    { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        id: 'e2',
        pos: pos(2, 2),
        sprite: 'k03-static-a',
        pages: [
          {
            auto: {
              stages: [
                {
                  body: [
                    { kind: 'setEntityFrame', entity: 'e2', frame: 1 },
                    { kind: 'wait', ms: 100 },
                    { kind: 'setEntityFrame', entity: 'e2', frame: 2 },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        id: 'e3',
        pos: pos(3, 3),
        sprite: 'k03-static-b',
        pages: [
          {
            auto: { stages: [{ body: [{ kind: 'setEntityFrame', entity: 'e3', frame: 3 }] }] },
          },
        ],
      },
      // hero 是 directional 布局：物理帧不可解析，聚合路径同样保守落 unavailable。
      {
        id: 'e4',
        pos: pos(4, 4),
        actor: 'hero',
        pages: [
          {
            auto: { stages: [{ body: [{ kind: 'setEntityFrame', entity: 'e4', frame: 1 }] }] },
          },
        ],
      },
    ]
    for (const entity of entities) state = new AddEntityCommand('start', entity).apply(state)
    const heroRecord = state.assetCatalog.assets[STARTER_ASSET]!
    const decoded = await decodeWorldSpriteAssetBytes(
      heroRecord,
      await source.readBytes(heroRecord.path),
    )
    const actualFrameCount = decoded.frames.length
    expect(actualFrameCount).toBeGreaterThan(3)

    const definitions = ['k03-static-a', 'k03-static-b', 'hero'].map(
      (id) => state.sprites.find((sprite) => sprite.id === id)!,
    )
    const result = collectSpriteAutomaticScriptBehaviorsForResource(
      state,
      definitions,
      actualFrameCount,
    )

    const previewA = {
      kind: 'cycle',
      mode: 'explicit',
      intro: [],
      cycle: [
        { frame: 1, holdMs: 100 },
        { frame: 2, holdMs: 200 },
      ],
    } as const
    const previewB = {
      kind: 'cycle',
      mode: 'explicit',
      intro: [],
      cycle: [{ frame: 3, holdMs: 200 }],
    } as const
    const previewHero = {
      kind: 'unavailable',
      reason: '脚本含无法安全展开的控制流或副作用',
    } as const
    expect(result).toEqual(
      new Map([
        [
          'k03-static-a',
          [
            {
              id: JSON.stringify(previewA),
              label: '自动脚本定时循环',
              detail: '检测到 #1 → #2；速度与分支以脚本为准',
              preview: previewA,
              instanceCount: 2,
              sceneCount: 1,
            },
          ],
        ],
        [
          'k03-static-b',
          [
            {
              id: JSON.stringify(previewB),
              label: '自动脚本切帧',
              detail: '检测到 #3；速度与分支以脚本为准',
              preview: previewB,
              instanceCount: 1,
              sceneCount: 1,
            },
          ],
        ],
        [
          'hero',
          [
            {
              id: JSON.stringify(previewHero),
              label: '自动行为脚本',
              detail: '移动、显隐或帧切换由这个场景实例的脚本决定',
              preview: previewHero,
              instanceCount: 1,
              sceneCount: 1,
            },
          ],
        ],
      ]),
    )

    // 混合资产整表拒绝：守卫先于任何分组读取。
    expect(() =>
      collectSpriteAutomaticScriptBehaviorsForResource(
        state,
        [definitions[0]!, { ...definitions[1]!, asset: 'sprite.other' }],
        actualFrameCount,
      ),
    ).toThrow('实例自动行为汇总只接受共享同一源资源的用途定义')
  })
})

describe('K03 describeSpriteReferenceBehavior 引用归属边界', () => {
  test('非场景 owner 分类与失效场景引用回退；scene-page owner 同样解析实例行为', async () => {
    const { source, state: blank } = await loadBoundaryProject('kimi-k03-owners')
    const state = await withSharedWorldSprite(source, blank, 'k03-static-a')
    const withEntity = new AddEntityCommand('start', {
      id: 'e1',
      pos: pos(1, 1),
      sprite: 'k03-static-a',
      pages: [
        {
          auto: {
            stages: [
              {
                body: [
                  { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
                  { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
                ],
              },
            ],
          },
        },
      ],
    }).apply(state)
    const definition = withEntity.sprites.find((sprite) => sprite.id === 'k03-static-a')!

    // scene-page owner 也按 sceneId/entityId 解析回真实实例，证明可预览时不降级。
    expect(
      describeSpriteReferenceBehavior(
        withEntity,
        edgeFor({ kind: 'scene-page', sceneId: 'start', entityId: 'e1', pageId: 'p1' }),
        definition,
        4,
      ),
    ).toMatchObject({ kind: 'script', label: '自动脚本切帧' })

    const cases: Array<[ProjectReferenceSourceOwner, string | undefined, object]> = [
      [
        { kind: 'actor', id: 'hero' },
        undefined,
        { kind: 'reference', label: '角色基础外观', detail: '角色实例通过此用途取得大世界外观' },
      ],
      [
        {
          kind: 'script-owner',
          owner: { kind: 'item-private-script', itemId: 'i1', ability: 'use', scriptId: 's1' },
        },
        undefined,
        { kind: 'script', label: '剧情脚本引用', detail: '脚本可在运行时切换到此用途定义' },
      ],
      [
        { kind: 'script-chunk', chunkId: 'scene/start', scriptId: 's1' },
        undefined,
        { kind: 'script', label: '剧情脚本引用', detail: '脚本可在运行时切换到此用途定义' },
      ],
      [
        { kind: 'shared-script', id: 'shared-1' },
        undefined,
        { kind: 'script', label: '剧情脚本引用', detail: '脚本可在运行时切换到此用途定义' },
      ],
      [
        { kind: 'runtime-world' },
        '战斗结束后恢复外观',
        { kind: 'reference', label: '运行态外观', detail: '战斗结束后恢复外观' },
      ],
      [
        { kind: 'runtime-world' },
        undefined,
        { kind: 'reference', label: '运行态外观', detail: '世界状态正在引用此用途定义' },
      ],
      [
        { kind: 'project-part', id: 'locale' },
        undefined,
        { kind: 'reference', label: '内容引用', detail: '由对应内容对象使用此用途定义' },
      ],
      // 失效引用不崩溃也不冒充实例行为：实体不在场景里 → 保守兜底。
      [
        { kind: 'scene-entity', sceneId: 'start', entityId: 'ghost' },
        undefined,
        { kind: 'reference', label: '内容引用', detail: '由对应内容对象使用此用途定义' },
      ],
      [
        { kind: 'scene-entity', sceneId: 'gone', entityId: 'e1' },
        undefined,
        { kind: 'reference', label: '内容引用', detail: '由对应内容对象使用此用途定义' },
      ],
    ]
    for (const [owner, detail, expected] of cases)
      expect(
        describeSpriteReferenceBehavior(withEntity, edgeFor(owner, detail), definition, 4),
      ).toEqual(expected)
  })

  test('无 auto 的实例按布局分类：loop→用途自动循环，directional→四向场景实例读实体朝向', async () => {
    const { source, state: blank } = await loadBoundaryProject('kimi-k03-layouts')
    let state = await withSharedWorldSprite(source, blank, 'k03-static-a')
    // loop 布局定义经真实 AddSpriteCommand 共享 hero 资源登记（真实 record/字节一致性由命令校验）。
    const heroRecord = state.assetCatalog.assets[STARTER_ASSET]!
    const loopDef = {
      id: 'k03-loop',
      asset: STARTER_ASSET,
      label: '循环灯',
      layout: { kind: 'loop', frameCount: 4 },
    } as const
    state = new AddSpriteCommand(
      loopDef,
      structuredClone(heroRecord),
      await source.readBytes(heroRecord.path),
    ).apply(state)
    state = new AddEntityCommand('start', {
      id: 'e-loop',
      pos: pos(1, 1),
      sprite: 'k03-loop',
    }).apply(state)
    state = new AddEntityCommand('start', {
      id: 'e-dir',
      pos: pos(2, 2),
      sprite: 'hero',
      facing: 'left',
    }).apply(state)

    const loopSprite = state.sprites.find((sprite) => sprite.id === 'k03-loop')!
    const heroSprite = state.sprites.find((sprite) => sprite.id === 'hero')!
    expect(
      describeSpriteReferenceBehavior(state, edgeFor(sceneEntityOwner('e-loop')), loopSprite, 12),
    ).toEqual({
      kind: 'layout-loop',
      label: '用途自动循环',
      detail: '默认循环 #0–#3',
    })
    expect(
      describeSpriteReferenceBehavior(state, edgeFor(sceneEntityOwner('e-dir')), heroSprite, 12),
    ).toEqual({
      kind: 'directional',
      label: '四向场景实例',
      detail: '初始朝向 left；移动时按四向帧带播放',
    })
  })

  test('可证脚本在缺实际帧数时不伪装 cycle；不可证控制流的 unavailable 形状精确', async () => {
    const { state, actualFrameCount } = await behaviorState('kimi-k03-unavailable', [
      {
        id: 'e1',
        pos: pos(1, 1),
        sprite: 'hero',
        pages: [
          {
            auto: {
              stages: [
                {
                  body: [
                    { kind: 'setEntityFrame', entity: 'e1', frame: 1 },
                    { kind: 'setEntityFrame', entity: 'e1', frame: 2 },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        id: 'e2',
        pos: pos(2, 2),
        sprite: 'hero',
        pages: [
          {
            auto: {
              stages: [
                {
                  body: [
                    {
                      kind: 'branch',
                      cond: { kind: 'flag', flag: 'x', is: true },
                      then: [{ kind: 'setEntityFrame', entity: 'e2', frame: 1 }],
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ])
    // hero 是 directional：物理帧不可解析，无论帧数如何都不得伪装帧序。改用 static 定义直调
    // 以隔离「帧数缺席」这一个变量——定义对象是本函数的直接参数（合法 caller 边界）。
    const heroDef = state.sprites.find((sprite) => sprite.id === 'hero')!
    const staticDef = { ...heroDef, layout: { kind: 'static' } } as typeof heroDef

    const edge = edgeFor(sceneEntityOwner('e1'))
    // 正控：同一脚本在真实帧数下可证 cycle（帧数是唯一变量）。
    expect(
      describeSpriteReferenceBehavior(state, edge, staticDef, actualFrameCount).preview,
    ).toMatchObject({ kind: 'cycle' })
    // actualFrameCount 缺席 / 零 / 非整数 → 不得伪装 cycle，统一 unavailable。
    for (const missing of [undefined, 0, 2.5]) {
      expect(describeSpriteReferenceBehavior(state, edge, staticDef, missing)).toEqual({
        kind: 'script',
        label: '自动行为脚本',
        detail: '移动、显隐或帧切换由这个场景实例的脚本决定',
        preview: { kind: 'unavailable', reason: '脚本含无法安全展开的控制流或副作用' },
      })
    }

    // 非 chance 分支：旧测试只断 label；这里钉死 unavailable preview 的精确形状。
    expect(
      describeSpriteReferenceBehavior(
        state,
        edgeFor(sceneEntityOwner('e2')),
        staticDef,
        actualFrameCount,
      ),
    ).toEqual({
      kind: 'script',
      label: '自动行为脚本',
      detail: '移动、显隐或帧切换由这个场景实例的脚本决定',
      preview: { kind: 'unavailable', reason: '脚本含无法安全展开的控制流或副作用' },
    })
  })

  test('chance 采样超 48 tick 预算：披露截断且仍报代表性 variants，不伪装唯一循环', async () => {
    // 每 tick animEntity 推进唯一帧（64 帧容器内 48 tick 无状态重复）→ 采样预算耗尽。
    const { state } = await behaviorState('kimi-k03-bounded', [
      {
        id: 'e1',
        pos: pos(1, 1),
        sprite: 'hero',
        pages: [
          {
            auto: {
              stages: [
                {
                  body: [
                    { kind: 'animEntity', entity: 'e1' },
                    {
                      kind: 'branch',
                      cond: { kind: 'chance', percent: 50 },
                      then: [{ kind: 'wait', ms: 10 }],
                    },
                  ],
                  next: 0,
                },
              ],
            },
          },
        ],
      },
    ])
    const heroDef = state.sprites.find((sprite) => sprite.id === 'hero')!
    const staticDef = { ...heroDef, layout: { kind: 'static' } } as typeof heroDef

    const result = describeSpriteReferenceBehavior(
      state,
      edgeFor(sceneEntityOwner('e1')),
      staticDef,
      64,
    )
    expect(result.label).toBe('自动脚本随机切帧')
    expect(result.preview?.kind).toBe('variants')
    if (result.preview?.kind !== 'variants') throw new Error('应生成代表性分支示例')
    const note = '下列是脚本的代表性合法分支示例，不是完整概率分布，也不是唯一循环。'
    expect(result.preview.note).toBe(note)
    expect(result.detail).toBe(`6 条可能路径；${note}`)
    expect(result.preview.variants.map((variant) => variant.id)).toEqual([
      'miss',
      'hit',
      'alternate-miss',
      'alternate-hit',
      'sparse-hit',
      'frequent-hit',
    ])
    for (const variant of result.preview.variants) {
      // 48 tick 各推一帧；每条路径都是合法示例且披露预算截断。
      expect(variant.steps.map((step) => step.frame)).toEqual(
        Array.from({ length: 48 }, (_, index) => index + 1),
      )
      expect(variant.note).toBe('50% 为各判断的局部命中率；此示例在安全预算处截断')
    }
    // 命中率语义正控：miss 全程未命中（停留默认 200ms），hit 全程命中（wait 10ms 夹到 60ms）。
    const byId = new Map(result.preview.variants.map((variant) => [variant.id, variant]))
    expect(byId.get('miss')!.steps.every((step) => step.holdMs === 200)).toBe(true)
    expect(byId.get('hit')!.steps.every((step) => step.holdMs === 60)).toBe(true)
  })
})

describe('K03 projectCanonicalSpritePreviewState 投影边界', () => {
  test('无 canonical 对应的场景/实体原引用保留；shell 页字段保留；共享 chunk 注入不动既有；输入隔离', async () => {
    const { state: blank } = await loadBoundaryProject('kimi-k03-projection')
    let shell = blank
    shell = new AddEntityCommand('start', {
      id: 'c1',
      pos: pos(1, 1),
      sprite: 'hero',
      pages: [{ state: 7 }],
    }).apply(shell)
    shell = new AddEntityCommand('start', { id: 'c2', pos: pos(2, 2), sprite: 'hero' }).apply(shell)
    shell = new AddEntityCommand('start', { id: 'c3', pos: pos(3, 3), sprite: 'hero' }).apply(shell)

    const flow = {
      kind: 'stages',
      initial: 'main',
      stages: [
        {
          id: 'main',
          body: [{ kind: 'setEntityFrame', target: { scene: 'start', entity: 'c1' }, frame: 3 }],
        },
      ],
    } as const
    checkAuthorScriptFlow(flow, 'k03.projection.flow')
    const canonicalScene: AuthorSceneDef = {
      id: 'start',
      mapId: 'start',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'c1',
          sprite: 'hero',
          pos: pos(1, 1),
          initialPage: 'main',
          pages: [{ id: 'main', label: 'Main', auto: 'idle' }],
          behaviors: { auto: { idle: { label: 'Idle', order: 0, flow } } },
        },
        // c2 在 canonical 中存在但没有 auto 行为 → 投影不得捏造脚本，保留 shell。
        {
          id: 'c2',
          sprite: 'hero',
          pos: pos(2, 2),
          initialPage: 'main',
          pages: [{ id: 'main', label: 'Main' }],
        },
      ],
    }
    validateAuthorScenes([canonicalScene])
    const sharedScripts: AuthorScriptLibrary = {
      wave: { name: '挥手', self: 'none', body: [{ kind: 'wait', ms: 5 }] },
    }
    checkAuthorScriptLibrary(sharedScripts, 'k03.projection.lib')
    const canonical = { scenes: [canonicalScene], sharedScripts }
    const before = structuredClone({ shell, canonical })

    const output = projectCanonicalSpritePreviewState(shell, canonical)
    // c1：auto 投影恢复，shell 页既有字段（state: 7）保留。
    expect(output.scenes[0]!.entities[0]!.pages).toEqual([
      {
        state: 7,
        auto: { stages: [{ body: [{ kind: 'setEntityFrame', entity: 'c1', frame: 3 }] }] },
      },
    ])
    // c2：无 auto 行为 → 原实体对象保留；c3：不在 canonical → 原实体对象保留。
    expect(output.scenes[0]!.entities[1]).toBe(shell.scenes[0]!.entities[1])
    expect(output.scenes[0]!.entities[2]).toBe(shell.scenes[0]!.entities[2])
    // 共享脚本投影 chunk 注入，既有 scriptChunks 键原样保留。
    expect(output.scriptChunks[SCRIPT_PREVIEW_SHARED_CHUNK]).toEqual({
      version: 1,
      id: SCRIPT_PREVIEW_SHARED_CHUNK,
      scripts: { wave: [{ kind: 'wait', ms: 5 }] },
    })
    for (const key of Object.keys(shell.scriptChunks))
      expect(output.scriptChunks[key]).toEqual(shell.scriptChunks[key])
    // 输入隔离。
    expect({ shell, canonical }).toEqual(before)

    // canonical 完全没有对应场景：整场景原引用保留，共享 chunk 仍注入。
    const empty = projectCanonicalSpritePreviewState(shell, { scenes: [], sharedScripts })
    expect(empty.scenes[0]).toBe(shell.scenes[0])
    expect(empty.scriptChunks[SCRIPT_PREVIEW_SHARED_CHUNK]).toBeDefined()
    expect({ shell, canonical }).toEqual(before)
  })
})

describe('K03 collectAutomaticScriptSpriteInstanceSites 真实状态边界', () => {
  test('真实装载/真实命令下未知 actor 跳过，site 全字段精确', async () => {
    const { state } = await behaviorState('kimi-k03-sites', [
      { id: 'e1', pos: pos(1, 1), sprite: 'hero', pages: [{ auto: { stages: [{ body: [] }] } }] },
      { id: 'e2', pos: pos(2, 2), actor: 'hero', pages: [{ auto: { stages: [{ body: [] }] } }] },
      // 引用不存在的 actor：resolveEntitySpriteId 落空，不得伪造实例位。
      { id: 'e3', pos: pos(3, 3), actor: 'ghost', pages: [{ auto: { stages: [{ body: [] }] } }] },
      // 无第 0 页 auto：跳过。
      { id: 'e4', pos: pos(4, 4), sprite: 'hero' },
    ])

    expect(collectAutomaticScriptSpriteInstanceSites(state)).toEqual([
      {
        spriteId: 'hero',
        sceneId: 'start',
        entityId: 'e1',
        where: 'scenes[0].entities[0].sprite',
        site: 'scene:start:entity:e1',
        via: 'direct',
      },
      {
        spriteId: 'hero',
        sceneId: 'start',
        entityId: 'e2',
        where: 'scenes[0].entities[1].actor(hero) → actors.spriteId',
        site: 'scene:start:entity:e2',
        via: 'actor',
      },
    ])
  })
})
