// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P01（project-diagnostics.glm-p）：保存门分段拒绝与聚合诊断残余。
 * 去重：project-diagnostics.test X7 已证 物品投掷/战场/开局 seedStats 与重复/资源引用闭包/
 * 资源角色/内容引用 missing-sprite/脚本引用 shared-missing/世界变量未登记与 flag-number
 * 门口径，以及入口点 issue 级 codes、损坏恢复 id 集。本文件只补：
 * G06 尚未断言过的保存门分段前缀（世界变量注册表路径缺失/场景 pages 页记录缺 id/
 *     敌人空 battleSprite 引用/共享脚本空 id/对话身份/实体引用/开局资源键/资源注册表/
 *     内容引用 mapId 臂）——全部 typed-legal fixture 触发值级守卫，无 as never/双桥
 * G07 聚合诊断残余（missing-scene target.objectId 与 #index 消息、startWorld.resources
 *     issue 形状、catalog 非法时资产闭包诊断被整体跳过、manifest-assets-invalid 形状、
 *     战场 #24 在场无缺省警告、状态诊断收集器同对象身份快路径）
 */
import type { CurrentManifest, EnemyDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadLegalProject } from '../__tests__/glm-p/kit.js'
import type { EditorState } from './edit-session.js'
import {
  assertProjectSaveValid,
  collectEditorStatusIssues,
  collectProjectIssues,
  createEditorStatusIssueCollector,
} from './project-diagnostics.js'

async function legalState(name = 'glm-p-gate'): Promise<EditorState> {
  return (await loadLegalProject(name)).state
}

describe('P01-G06 保存门分段拒绝残余', () => {
  test('manifest 缺 worldVariables 注册表路径 → 世界变量分段拒绝并指名缺路径', async () => {
    const state = await legalState()
    const content = { ...state.manifest.content }
    delete content.worldVariables
    expect(() =>
      assertProjectSaveValid({ ...state, manifest: { ...state.manifest, content } }),
    ).toThrow('保存前世界变量校验失败：manifest 缺 worldVariables 注册表路径')
  })

  test('带 pages 的实体页记录缺 id → 场景数据分段拒绝（typed-legal 值级守卫）', async () => {
    const state = await legalState()
    const start = state.scenes[0]!
    // EntityDef.pages 类型允许空页记录；保存门要求作者页必须携带非空 id。
    const broken: EditorState = {
      ...state,
      scenes: [
        ...state.scenes,
        {
          ...start,
          id: 'scene-broken',
          mapId: start.mapId,
          entities: [
            {
              id: 'npc-pages',
              sprite: 'hero',
              pos: { col: 0, row: 0, height: 0 },
              pages: [{}],
            },
          ],
        },
      ],
    }
    expect(() => assertProjectSaveValid(broken)).toThrow(/保存前场景数据校验失败.*pages\[0\]\.id/)
  })

  test('敌人 battleSprite 空引用 → 敌人数据分段拒绝（typed-legal 值级守卫）', async () => {
    const state = await legalState()
    // 完整 typed EnemyDef，唯一违规是 battleSprite 空串（值级），无缺字段强转。
    const enemy = {
      id: 'enemy-p-blank',
      name: 'name.hero',
      battleSprite: '',
      yPosOffset: 0,
      stats: {
        health: 10,
        level: 1,
        exp: 0,
        cash: 0,
        attackStrength: 5,
        magicStrength: 0,
        defense: 2,
        dexterity: 5,
        fleeRate: 0,
        physicalResistance: 0,
        poisonResistance: 0,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        dualMove: false,
        collectValue: 0,
      },
      ai: { resistanceToSorcery: 0 },
      sounds: {},
    } satisfies EnemyDef
    expect(() => assertProjectSaveValid({ ...state, enemies: [enemy] })).toThrow(
      /保存前敌人数据校验失败.*battleSprite/,
    )
  })

  test('共享脚本空 id → 共享脚本分段拒绝（typed-legal 值级守卫）', async () => {
    const state = await legalState()
    // Record 的空字符串键 typed-legal；保存门要求脚本 id 非空。
    const illegal: NonNullable<EditorState['sharedScripts']> = {
      '': { name: '坏脚本', description: '', self: 'none', body: [] },
    }
    expect(() => assertProjectSaveValid({ ...state, sharedScripts: illegal })).toThrow(
      /保存前共享脚本校验失败.*script id/,
    )
  })

  test('对话身份引用未知 Actor → 对话身份分段拒绝并指名', async () => {
    const state = await legalState()
    const scripts = {
      'script-dialog': {
        name: '对话脚本',
        description: '',
        self: 'none' as const,
        body: [
          {
            kind: 'dialog' as const,
            cue: {
              identity: { kind: 'actor' as const, actor: 'ghost-actor' },
              rows: [{ text: 'locale.dlg' }],
            },
          },
        ],
      },
    }
    expect(() => assertProjectSaveValid({ ...state, sharedScripts: scripts })).toThrow(
      /保存前对话身份校验失败.*ghost-actor/,
    )
  })

  test('实体地址指向不存在的实体 → 实体引用分段拒绝并给出 scene/entity', async () => {
    const state = await legalState()
    const item = {
      id: 'item-place',
      name: 'name.item-place',
      desc: [] as string[],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene' as const,
        consuming: true,
        effects: [
          {
            kind: 'placeEntityInFront' as const,
            target: { scene: state.scenes[0]!.id, entity: 'ghost-entity' },
            state: 0,
          },
        ],
      },
    }
    expect(() => assertProjectSaveValid({ ...state, items: [item] })).toThrow(
      /保存前实体引用校验失败.*ghost-entity/,
    )
  })

  test('开局资源保留键 collectValue → 开局数据分段拒绝', async () => {
    const state = await legalState()
    const entry = {
      ...state.manifest.entryPoints[0]!,
      startWorld: {
        ...state.manifest.entryPoints[0]!.startWorld,
        resources: { collectValue: 1 },
      },
    }
    expect(() =>
      assertProjectSaveValid({
        ...state,
        manifest: { ...state.manifest, entryPoints: [entry] },
      }),
    ).toThrow(/保存前开局数据校验失败.*collectValue/)
  })

  test('catalog 记录字节数非法 → 资源注册表分段拒绝', async () => {
    const state = await legalState()
    const catalog = structuredClone(state.assetCatalog)
    const first = Object.values(catalog.assets)[0]!
    first.bytes = -1
    expect(() => assertProjectSaveValid({ ...state, assetCatalog: catalog })).toThrow(
      /保存前资源注册表校验失败/,
    )
  })

  test('场景 mapId 指向未登记地图 → 内容引用分段拒绝（mapId 臂，区别于旧 missing-sprite）', async () => {
    const state = await legalState()
    const scenes = state.scenes.map((scene, index) =>
      index === 0 ? { ...scene, mapId: 'ghost-map' } : scene,
    )
    expect(() => assertProjectSaveValid({ ...state, scenes })).toThrow(
      /保存前内容引用校验失败.*ghost-map/,
    )
  })
})

describe('P01-G07 聚合诊断残余', () => {
  test('missing-entry-point-scene：唯一合法 id 携带 objectId，空白 id 消息退回 #序号', async () => {
    const state = await legalState()
    const manifest = {
      ...state.manifest,
      entryPoints: [
        {
          id: 'dlc',
          label: 'DLC',
          scene: 'ghost-scene',
          startWorld: { party: [], money: 0, inventory: [] },
        },
        {
          id: '  ',
          label: '空白',
          scene: 'ghost-scene-2',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ] as CurrentManifest['entryPoints'],
      defaultEntryId: 'dlc',
    }
    const issues = collectProjectIssues({ ...state, manifest })
    const named = issues.find(
      (issue) =>
        issue.code === 'missing-entry-point-scene' && issue.path === 'entryPoints[0].scene',
    )
    expect(named?.target).toEqual({ module: 'project', page: 'entrypoint', objectId: 'dlc' })
    expect(named?.message).toBe('入口点 "dlc" 指向不存在的场景 "ghost-scene"')
    const blanked = issues.find(
      (issue) =>
        issue.code === 'missing-entry-point-scene' && issue.path === 'entryPoints[1].scene',
    )
    expect(blanked?.target).toEqual({ module: 'project', page: 'entrypoint' })
    expect(blanked?.message).toBe('入口点 "#1" 指向不存在的场景 "ghost-scene-2"')
  })

  test('startWorld.resources 非法键 → invalid-start-world issue 指向 resources 路径与入口', async () => {
    const state = await legalState()
    const entry = {
      ...state.manifest.entryPoints[0]!,
      startWorld: {
        ...state.manifest.entryPoints[0]!.startWorld,
        resources: { ' 带空格 ': 3 },
      },
    }
    const issues = collectProjectIssues({
      ...state,
      manifest: {
        ...state.manifest,
        entryPoints: [entry] as CurrentManifest['entryPoints'],
      },
    })
    const issue = issues.find((candidate) => candidate.code === 'invalid-start-world')
    expect(issue?.path).toBe('entryPoints[0].startWorld.resources')
    expect(issue?.message).toContain('带空格')
    expect(issue?.target).toEqual({
      module: 'project',
      page: 'entrypoint',
      objectId: entry.id,
    })
  })

  test('catalog 非法时资产闭包诊断整体跳过：只剩注册表问题，无 sprite 缺失噪声', async () => {
    const state = await legalState()
    const catalog = structuredClone(state.assetCatalog)
    Object.values(catalog.assets)[0]!.bytes = -1
    const sprites = [{ ...state.sprites[0]!, asset: 'sprite.nowhere' }]
    const issues = collectProjectIssues({ ...state, assetCatalog: catalog, sprites })
    expect(issues.find((issue) => issue.code === 'asset-catalog-invalid')).toBeDefined()
    expect(issues.find((issue) => issue.message.includes('sprite.nowhere'))).toBeUndefined()
  })

  test('manifest.assets.roles 引用不存在资产 → manifest-assets-invalid issue 指向 assets/startup', async () => {
    const state = await legalState()
    const manifest = {
      ...state.manifest,
      assets: {
        ...state.manifest.assets,
        roles: { ...state.manifest.assets.roles, 'audio.midiSoundfont': 'soundfont.nowhere' },
      },
    }
    const issues = collectProjectIssues({ ...state, manifest })
    const issue = issues.find((candidate) => candidate.code === 'manifest-assets-invalid')
    expect(issue?.path).toBe('assets')
    expect(issue?.target).toEqual({ module: 'project', page: 'startup' })
    expect(issue?.message).toContain('soundfont.nowhere')
  })

  test('战场表含系统默认 #24 → 状态诊断不再出现缺省战场警告', async () => {
    const state = await legalState()
    const silent: EditorState = {
      ...state,
      battleFields: [
        {
          id: 24,
          name: '默认战场',
          screenWave: 0,
          magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        },
      ],
      manifest: {
        ...state.manifest,
        content: { ...state.manifest.content, battleFields: 'content/battle-fields.json' },
      },
    }
    const messages = collectEditorStatusIssues(silent).map((issue) => issue.message)
    expect(messages).not.toContain('项目默认战场 #24 缺失；未显式指定战场的战斗会回落到黑底。')
    // 对照：同一 state 撤掉 #24 后警告出现，证明上面的静默来自 #24 在场而非其它原因。
    const withoutDefault: EditorState = {
      ...silent,
      battleFields: silent.battleFields?.filter((field) => field.id !== 24),
    }
    expect(
      collectEditorStatusIssues(withoutDefault).some((issue) => issue.message.includes('#24 缺失')),
    ).toBe(true)
  })

  test('状态诊断收集器对同一 state 对象命中身份快路径：复用同一数组引用', async () => {
    const state = await legalState()
    const collect = createEditorStatusIssueCollector()
    const first = collect(state)
    const second = collect(state)
    expect(second).toBe(first)
    const changed = { ...state, manifest: { ...state.manifest, name: '改名' } }
    expect(collect(changed)).not.toBe(first)
  })
})
