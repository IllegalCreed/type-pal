/** TEST-GLM-WAVE-O-1 O01：合成 typed 工程上的 current publication 公开合同。
 *  旧证：pal-current-publication.pal.test.ts 依赖真实 PAL 全量 baseline（fast 覆盖除外）；
 *  glm-next-wave 只覆盖 palAssetPreconditions 纯排序。本卡用全合成 supply/baseline/manifest
 *  走真实 build/validate 入口，覆盖三方合并输入、Census 门与资源闭包拒绝合同。不写盘。
 */
import { describe, expect, test } from 'vitest'
import {
  syntheticBaselineFiles,
  syntheticCatalog,
  syntheticSupply,
} from './__tests__/glm-o/supply-fixture.js'
import type { MigrationSnapshot } from './migration-baseline.js'
import type { MigrationJson } from './migration-files.js'
import type { PalContentSupplySources } from './pal-content-supply.js'
import {
  buildPalCurrentPublication,
  type PalCurrentPublication,
  validatePalCurrentPublication,
} from './pal-current-publication.js'
import { buildPalCurrentManifest } from './pal-manifest.js'

function baselineFromEntries(entries: Iterable<readonly [string, unknown]>): MigrationSnapshot {
  const files = new Map<string, MigrationJson>()
  for (const [path, value] of entries)
    files.set(path, JSON.parse(JSON.stringify(value)) as MigrationJson)
  return { files, managedFiles: new Set(files.keys()) }
}

function syntheticBaseline(): MigrationSnapshot {
  return baselineFromEntries(syntheticBaselineFiles())
}

function fresh(): {
  baseline: MigrationSnapshot
  sources: PalContentSupplySources
  manifest: ReturnType<typeof buildPalCurrentManifest>
} {
  const { sources } = syntheticSupply()
  return {
    baseline: syntheticBaseline(),
    sources,
    manifest: buildPalCurrentManifest(sources.assetCatalog),
  }
}

function rebuild(
  baseline: MigrationSnapshot,
  sources: PalContentSupplySources,
): PalCurrentPublication {
  return buildPalCurrentPublication(baseline, sources)
}

describe('O01 buildPalCurrentPublication：分区替换与作者保留（合成工程）', () => {
  test('catalog 分区整体来自供应核且 managedFiles 覆盖全部写入路径', () => {
    const { baseline, sources } = fresh()
    const publication = rebuild(baseline, sources)
    expect(publication.files.get('assets/index.json')).toEqual(sources.assetCatalog)
    expect(publication.managedFiles.has('assets/index.json')).toBe(true)
    expect(publication.managedFiles.has('content/actors.json')).toBe(true)
  })

  test('角色分区 = 生成六角色在前、baseline 非生成作者角色按原序保留在后', () => {
    const { sources } = fresh()
    const authored = {
      id: 'author-npc',
      name: 'name.author-npc',
      spriteId: 'li-xiaoyao',
    }
    const withAuthor = baselineFromEntries([
      ...syntheticBaselineFiles(),
      [
        'content/actors.json',
        [...(syntheticBaselineFiles().get('content/actors.json') as object[]), authored],
      ],
    ])
    const publication = rebuild(withAuthor, sources)
    const actors = publication.files.get('content/actors.json') as Array<{ id: string }>
    expect(actors.map(({ id }) => id).slice(0, 6)).toEqual([
      'li-xiaoyao',
      'zhao-linger',
      'lin-yueru',
      'wu-hou',
      'anu',
      'gai-luojiao',
    ])
    expect(actors.at(-1)).toEqual(authored)
  })

  test('物品 268/270 仅同步窄消息源，其余作者字段（价格/名字）保留', () => {
    const { baseline, sources } = fresh()
    const publication = rebuild(baseline, sources)
    const items = publication.files.get('content/items.json') as Array<Record<string, unknown>>
    const vessel = items.find((item) => item.id === '268')!
    expect(vessel.name).toBe('炼蛊皿')
    expect(vessel.buyPrice).toBe(10)
    const craft = (vessel.use as { effects: Array<Record<string, unknown>> }).effects.find(
      (effect) => effect.kind === 'craftRecipe',
    )
    expect(craft).toMatchObject({ unavailableMessage: '炼蛊的材料不足' })
    const gourd = items.find((item) => item.id === '270')!
    expect(
      (gourd.use as { effects: Array<Record<string, unknown>> }).effects.find(
        (effect) => effect.kind === 'drawFromResourcePool',
      ),
    ).toMatchObject({ unavailableMessage: '无任何效果', maxRoll: 9 })
  })

  test('物品 141 应用隐蛊 overlay（hideParty 3 回合 + battleOnly）', () => {
    const { baseline, sources } = fresh()
    const publication = rebuild(baseline, sources)
    const items = publication.files.get('content/items.json') as Array<Record<string, unknown>>
    const hermit = items.find((item) => item.id === '141')!
    expect(hermit.use).toMatchObject({
      target: 'allAllies',
      consuming: true,
      battleOnly: true,
      effects: [{ kind: 'hideParty', turns: 3 }],
    })
  })

  test('商店分区 = 源 1..20 顺序货单，且不发布 ShopDef0', () => {
    const { baseline, sources } = fresh()
    const publication = rebuild(baseline, sources)
    const shops = publication.files.get('content/shops.json') as Array<{
      id: number
      items: string[]
    }>
    expect(shops.map(({ id }) => id)).toEqual(Array.from({ length: 20 }, (_unused, i) => i + 1))
    expect(shops.every((shop) => shop.items.join(',') === '141')).toBe(true)
  })

  test('别名闭包：legacy sprite-N 等价定义被退休，场景实体引用改写为语义 id', () => {
    const { baseline, sources } = fresh()
    const publication = rebuild(baseline, sources)
    const sprites = publication.files.get('content/sprites.json') as Array<{ id: string }>
    const ids = new Set(sprites.map(({ id }) => id))
    expect(ids.has('sprite-2')).toBe(false)
    expect(ids.has('sprite-525')).toBe(false)
    expect(ids.has('li-xiaoyao')).toBe(true)
    expect(ids.has('wu-hou')).toBe(true)
    const scene = publication.files.get('content/scenes/s020.json') as {
      entities: Array<{ id: string; sprite: string }>
    }
    expect(scene.entities.find(({ id }) => id === 'e344')).toMatchObject({ sprite: 'li-xiaoyao' })
  })

  test('别名闭包：legacy 定义布局漂移（variant）时拒绝发布', () => {
    const { sources } = fresh()
    const entries = syntheticBaselineFiles()
    const sprites = entries.get('content/sprites.json') as Array<{ id: string; layout: object }>
    const legacy = sprites.find(({ id }) => id === 'sprite-2')
    legacy!.layout = { kind: 'static' }
    expect(() => rebuild(baselineFromEntries(entries), sources)).toThrow(
      'sprite-2: 资源、布局或动作容器不严格等价',
    )
  })

  test('地图/瓦片集分区来自供应核，地图文件路径与 mapIndex 对齐', () => {
    const { baseline, sources } = fresh()
    const publication = rebuild(baseline, sources)
    expect(publication.files.has('content/maps/map-001.json')).toBe(true)
    const mapIndex = publication.files.get('content/maps/index.json') as {
      maps: Array<{ id: string; path: string }>
    }
    expect(mapIndex.maps).toHaveLength(sources.tilemaps.length)
    expect(publication.files.has(mapIndex.maps[0]?.path ?? '')).toBe(true)
    expect(publication.files.get('content/tilesets.json')).toEqual([
      { id: 'tileset-001', name: 'PAL 瓦片集 1', category: 'builtin', asset: 'tileset.pal.001' },
    ])
  })

  test('baseline 中不属于生成分区的旧地图文件被移出 managedFiles 与 files', () => {
    const { sources } = fresh()
    const entries = syntheticBaselineFiles()
    entries.set('content/maps/map-999.json', { version: 4, stale: true })
    const publication = rebuild(baselineFromEntries(entries), sources)
    expect(publication.files.has('content/maps/map-999.json')).toBe(false)
    expect(publication.managedFiles.has('content/maps/map-999.json')).toBe(false)
  })

  test('mapReport 透传供应核地图审计结果', () => {
    const { baseline, sources } = fresh()
    const publication = rebuild(baseline, sources)
    expect(publication.mapReport).toMatchObject({ mapCount: 1, semanticRoundTripMismatchCount: 0 })
  })

  test('current baseline 含历史发布路径（_transitions/content/migrations/scripts）时 fail-loud', () => {
    const { sources } = fresh()
    for (const path of [
      'content/migrations/old.json',
      '_transitions/t.json',
      'content/scripts/s.json',
    ]) {
      const entries = syntheticBaselineFiles()
      entries.set(path, { stale: true })
      expect(() => rebuild(baselineFromEntries(entries), sources)).toThrow(
        `current baseline 含历史发布路径: ${path}`,
      )
    }
  })

  test('生成角色分区数量与 roles 数量漂移时 fail-loud', () => {
    const { baseline } = fresh()
    const sources = syntheticSupply().sources
    // 同一 roleId 重复：稳定 id 去重后 actors 少于 roles，属分区数量漂移。
    sources.migrate.roles = [...sources.migrate.roles, { ...sources.migrate.roles[0]! }]
    expect(() => rebuild(baseline, sources)).toThrow('PAL 原始角色分区数量漂移')
  })

  test('供应核重复源地图编号被地图审计拒绝', () => {
    const { baseline } = fresh()
    const sources = syntheticSupply().sources
    sources.tilemaps = [...sources.tilemaps, ...sources.tilemaps]
    expect(() => rebuild(baseline, sources)).toThrow('重复源地图编号 1')
  })

  test('current SceneIndex 缺 raw-owned 场景时 fail-loud', () => {
    const { sources } = fresh()
    const entries = syntheticBaselineFiles()
    const index = entries.get('content/scenes/index.json') as { scenes: { id: string }[] }
    index.scenes = index.scenes.filter((scene) => scene.id !== 's020')
    entries.delete('content/scenes/s020.json')
    expect(() => rebuild(baselineFromEntries(entries), sources)).toThrow(
      /PAL SceneIndex 缺 raw-owned 场景: s020/,
    )
  })

  test('SceneIndex 登记的正文缺失时报 label 场景错误（PAL current baseline 前缀）', () => {
    const { sources } = fresh()
    const entries = syntheticBaselineFiles()
    entries.delete('content/scenes/s003.json')
    expect(() => rebuild(baselineFromEntries(entries), sources)).toThrow(
      'PAL current baseline: SceneIndex s003 缺正文 content/scenes/s003.json',
    )
  })

  test('baseline items.json 非数组时 fail-loud', () => {
    const { sources } = fresh()
    const entries = syntheticBaselineFiles()
    entries.set('content/items.json', { broken: true })
    expect(() => rebuild(baselineFromEntries(entries), sources)).toThrow(
      'PAL current baseline: content/items.json 期望数组',
    )
  })

  test('baseline 缺必需文件时报精确路径', () => {
    const { sources } = fresh()
    const entries = syntheticBaselineFiles()
    entries.delete('content/actors.json')
    expect(() => rebuild(baselineFromEntries(entries), sources)).toThrow(
      'PAL current publication 缺文件 content/actors.json',
    )
  })

  test('Store0 边界在生成侧（作者合并前）对源商店执行 29/6 census', () => {
    const { baseline, sources } = fresh()
    const publication = rebuild(baseline, sources)
    // 生成分区自身满足 census：buy 29 / sell 6 的来源在 baseline s000。
    expect(publication.files.has('content/shops.json')).toBe(true)
  })

  test('buildPalCurrentPublication 不修改传入 baseline 与 sources（输入不可变）', () => {
    const { baseline, sources } = fresh()
    const baselineBefore = JSON.stringify([...baseline.files.entries()])
    const managedBefore = [...baseline.managedFiles].sort()
    rebuild(baseline, sources)
    expect(JSON.stringify([...baseline.files.entries()])).toBe(baselineBefore)
    expect([...baseline.managedFiles].sort()).toEqual(managedBefore)
  })
})

describe('O01 validatePalCurrentPublication：发布门与 census 拒绝合同（合成工程）', () => {
  function validPublication() {
    const { baseline, sources, manifest } = fresh()
    const publication = rebuild(baseline, sources)
    return { publication, sources, manifest }
  }

  test('合法发布通过并返回精确计数（场景/地图/资源/托管文件）', () => {
    const { publication, sources, manifest } = validPublication()
    const validation = validatePalCurrentPublication({ publication, manifest, sources })
    expect(validation.scenes).toBe(40)
    expect(validation.maps).toBe(1)
    expect(validation.assets).toBe(Object.keys(sources.assetCatalog.assets).length)
    // sell openShop 的 shop=0 是“当前场景当铺”哨兵，不是真实 ShopDef：跨引用按 warning 记 1。
    expect(validation.referenceWarnings).toBe(1)
    expect(validation.assetWarnings).toBe(0)
    expect(validation.managedFiles).toBe(publication.managedFiles.size)
  })

  test('manifest contentVersion / minimumSaveVersion 漂移被拒绝', () => {
    const { publication, sources, manifest: manifestBase } = validPublication()
    const manifest = manifestBase
    expect(() =>
      validatePalCurrentPublication({
        publication,
        manifest: { ...manifest, contentVersion: manifest.contentVersion + 1 } as typeof manifest,
        sources,
      }),
    ).toThrow(`PAL current publication 只接受 content${manifest.contentVersion}`)
    expect(() =>
      validatePalCurrentPublication({
        publication,
        manifest: {
          ...manifest,
          minimumSaveVersion: manifest.minimumSaveVersion + 1,
        } as typeof manifest,
        sources,
      }),
    ).toThrow(/SAVE\d+/)
  })

  test('manifest 携带 migrations 或 content.scripts 时被 startup 门拒绝（未知字段）', () => {
    const { publication, sources, manifest } = validPublication()
    expect(() =>
      validatePalCurrentPublication({
        publication,
        manifest: { ...manifest, migrations: {} } as typeof manifest,
        sources,
      }),
    ).toThrow('manifest.migrations: 未知字段')
    expect(() =>
      validatePalCurrentPublication({
        publication,
        manifest: {
          ...manifest,
          content: { ...manifest.content, scripts: 'content/scripts/' },
        } as typeof manifest,
        sources,
      }),
    ).toThrow('PAL current manifest 禁止 migrations/content.scripts')
  })

  test('发布文件含历史路径前缀时拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const poisoned: PalCurrentPublication = {
      ...publication,
      managedFiles: new Set([...publication.managedFiles, 'content/migrations/x.json']),
    }
    expect(() =>
      validatePalCurrentPublication({ publication: poisoned, manifest, sources }),
    ).toThrow('PAL current publication 含历史路径 content/migrations/x.json')
  })

  test('manifest 内容路径缺失时 requiredPath 报精确标签', () => {
    const { publication, sources, manifest } = validPublication()
    const { actors: _actors, ...content } = manifest.content
    expect(() =>
      validatePalCurrentPublication({
        publication,
        manifest: { ...manifest, content } as typeof manifest,
        sources,
      }),
    ).toThrow('PAL current manifest 缺 actors 路径')
  })

  test('组合模板引用未知瓦片集时拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const map = structuredClone(files.get('content/maps/map-001.json')) as Record<string, unknown>
    files.set('content/stamps.json', [
      {
        ...map,
        id: 'stamp-1',
        name: '测试组合',
        origin: 'authored',
        anchor: { row: 0, col: 0 },
        tilesetRefs: ['tileset-does-not-exist'],
      },
    ])
    expect(() =>
      validatePalCurrentPublication({
        publication: { ...publication, files },
        manifest,
        sources,
      }),
    ).toThrow('组合 stamp-1 引用未知瓦片集 tileset-does-not-exist')
  })

  test('地图数量与源数量不符时拒绝', () => {
    const { publication, manifest } = validPublication()
    const sources = syntheticSupply().sources
    sources.tilemaps = []
    expect(() => validatePalCurrentPublication({ publication, manifest, sources })).toThrow(
      'PAL current 地图数量 1 != 源 0',
    )
  })

  test('地图引用未知瓦片集时拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const tilesets = structuredClone(files.get('content/tilesets.json')) as Array<{
      id: string
    }>
    files.set(
      'content/tilesets.json',
      tilesets.map((tileset) => ({ ...tileset, id: 'tileset-other' })),
    )
    expect(() =>
      validatePalCurrentPublication({ publication: { ...publication, files }, manifest, sources }),
    ).toThrow(/content\/maps\/map-001\.json 引用未知瓦片集 tileset-001/)
  })

  test('场景正文 id 与 SceneIndex 不符时拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const scene = structuredClone(files.get('content/scenes/s000.json')) as { id: string }
    scene.id = 's999'
    files.set('content/scenes/s000.json', scene)
    expect(() =>
      validatePalCurrentPublication({ publication: { ...publication, files }, manifest, sources }),
    ).toThrow('场景 index/id 不符 s000')
  })

  test('场景引用未知地图时拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const scene = structuredClone(files.get('content/scenes/s000.json')) as { mapId: string }
    scene.mapId = 'map-does-not-exist'
    files.set('content/scenes/s000.json', scene)
    expect(() =>
      validatePalCurrentPublication({ publication: { ...publication, files }, manifest, sources }),
    ).toThrow('场景 s000 引用未知地图 map-does-not-exist')
  })

  test('方案 label 漂移被永久门禁拒绝（名称漂移）', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const scene = structuredClone(files.get('content/scenes/s000.json')) as {
      entities: Array<{ behaviors?: { trigger?: Record<string, { label: string }> } }>
    }
    const trigger = scene.entities[0]?.behaviors?.trigger
    const first = Object.keys(trigger ?? {})[0]
    trigger![first!] = { ...trigger![first!], label: '被作者改坏的方案名' }
    files.set('content/scenes/s000.json', scene)
    expect(() =>
      validatePalCurrentPublication({ publication: { ...publication, files }, manifest, sources }),
    ).toThrow(/PAL 物品剧情方案名称漂移/)
  })

  test('machine-inner label 与父方案名不同步时拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const scene = structuredClone(files.get('content/scenes/s000.json')) as {
      entities: Array<{
        behaviors?: { trigger?: Record<string, { flow: { machine?: { label: string } } }> }
      }>
    }
    const trigger = scene.entities[0]?.behaviors?.trigger
    const machineId = Object.keys(trigger ?? {}).find((id) => trigger![id]?.flow?.machine)
    const machine = trigger![machineId!]!.flow as { machine: { label: string } }
    machine.machine.label = '不同步的连续流程'
    files.set('content/scenes/s000.json', scene as MigrationJson)
    expect(() =>
      validatePalCurrentPublication({ publication: { ...publication, files }, manifest, sources }),
    ).toThrow(/PAL 物品剧情方案 machine-inner 未与父名同步/)
  })

  test('方案节点与 item select 边成对缺失导致 census 数量漂移时拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const scene = structuredClone(files.get('content/scenes/s000.json')) as {
      entities: Array<{ behaviors?: { trigger?: Record<string, unknown> } }>
    }
    const trigger = scene.entities[0]?.behaviors?.trigger
    delete trigger?.['scheme-00']
    files.set('content/scenes/s000.json', scene as MigrationJson)
    const items = structuredClone(files.get('content/items.json')) as Array<{
      id: string
      use?: {
        effects: Array<{
          kind: string
          script?: { body: Array<{ selection?: { value?: string } }> }
        }>
      }
    }>
    const vessel = items.find((item) => item.id === '268')!
    const script = vessel.use!.effects.find((effect) => effect.kind === 'itemPrivateScript')!
    script.script!.body = script.script!.body.filter(
      (command) => command.selection?.value !== 'scheme-00',
    )
    files.set('content/items.json', items as MigrationJson)
    expect(() =>
      validatePalCurrentPublication({ publication: { ...publication, files }, manifest, sources }),
    ).toThrow('PAL 物品剧情方案数量漂移: 48 != 49')
  })

  test('作者改动 buy openShop 至 28 时生成侧 census 拒绝发布', () => {
    const { sources, manifest } = fresh()
    const entries = syntheticBaselineFiles()
    const scene = entries.get('content/scenes/s000.json') as {
      entities: Array<{ behaviors?: { trigger?: Record<string, { flow?: object }> } }>
    }
    const census = scene.entities[0]?.behaviors?.trigger?.['shop-census']
    const stages = (census?.flow as { stages: { body: object[] }[] }).stages
    stages[0]!.body = stages[0]!.body.slice(1)
    const baseline = baselineFromEntries(entries)
    expect(() => rebuild(baseline, sources)).toThrow(
      'PAL Store0 invariant: buy openShop 数量 28 != 29',
    )
    void manifest
  })

  test('作者改动 sell openShop 指向非 0 商店时生成侧拒绝', () => {
    const { sources } = fresh()
    const entries = syntheticBaselineFiles()
    const scene = entries.get('content/scenes/s000.json') as {
      entities: Array<{ behaviors?: { trigger?: Record<string, { flow?: object }> } }>
    }
    const census = scene.entities[0]?.behaviors?.trigger?.['shop-census']
    const stages = (census?.flow as { stages: { body: Array<{ mode: string; shop: number }> }[] })
      .stages
    const sell = stages[0]!.body.find((command) => command.mode === 'sell')
    sell!.shop = 7
    expect(() => rebuild(baselineFromEntries(entries), sources)).toThrow(
      'PAL Store0 invariant: sell shop 应为 0，收到 7',
    )
  })

  test('item268 配方漂移（材料表被改）触发 Store0 recipes 拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const items = JSON.parse(JSON.stringify(files.get('content/items.json'))) as Array<{
      id: string
      use?: { effects: Array<Record<string, unknown>> }
    }>
    const vessel = items.find((item) => item.id === '268')!
    const craft = vessel.use!.effects.find((effect) => effect.kind === 'craftRecipe') as {
      recipes: Array<{ ingredients: Array<{ itemId: string }> }>
    }
    craft.recipes[0]!.ingredients[0]!.itemId = '999'
    files.set('content/items.json', JSON.parse(JSON.stringify(items)))
    expect(() =>
      validatePalCurrentPublication({ publication: { ...publication, files }, manifest, sources }),
    ).toThrow('PAL Store0 invariant: item268 recipes drift')
  })

  test('item270 资源池档位漂移触发 Store0 奖励拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const items = JSON.parse(JSON.stringify(files.get('content/items.json'))) as Array<{
      id: string
      use?: { effects: Array<Record<string, unknown>> }
    }>
    const gourd = items.find((item) => item.id === '270')!
    const pool = gourd.use!.effects.find((effect) => effect.kind === 'drawFromResourcePool') as {
      rewards: Array<{ count: number }>
    }
    pool.rewards[0]!.count = 2
    files.set('content/items.json', JSON.parse(JSON.stringify(items)))
    expect(() =>
      validatePalCurrentPublication({ publication: { ...publication, files }, manifest, sources }),
    ).toThrow('PAL Store0 invariant: item270 奖励档位漂移')
  })

  test('悬空 inParty actor 引用被拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    const scene = files.get('content/scenes/s000.json') as {
      entities: Array<{ behaviors?: { trigger?: Record<string, { flow?: object }> } }>
    }
    const census = scene.entities[0]?.behaviors?.trigger?.['shop-census']
    const stages = (census?.flow as { stages: { body: object[] }[] }).stages
    stages[0]!.body.push({
      kind: 'branch',
      cond: { kind: 'inParty', actorId: 'ghost-actor' },
      then: [],
    })
    expect(() => validatePalCurrentPublication({ publication, manifest, sources })).toThrow(
      /PAL inParty 引用未知 ActorId: .*ghost-actor/,
    )
  })

  test('资源闭包失败（catalog 缺入口视频资产）被拒绝', () => {
    const { baseline, sources, manifest } = fresh()
    // introVideo 只经 entryPoints 进入资源闭包，不在 validate 前置表校验域内。
    delete sources.assetCatalog.assets['video.pal.003']
    const publication = rebuild(baseline, sources)
    expect(() => validatePalCurrentPublication({ publication, manifest, sources })).toThrow(
      /PAL current 资源闭包失败:\n.*video\.pal\.003/,
    )
  })

  test('入口场景缺失时 manifest startup 拒绝', () => {
    const { publication, sources, manifest } = validPublication()
    const files = new Map(publication.files)
    files.delete('content/scenes/s000.json')
    const index = structuredClone(files.get('content/scenes/index.json')) as {
      scenes: Array<{ id: string; path: string }>
    }
    index.scenes = index.scenes.filter((scene) => scene.id !== 's000')
    files.set('content/scenes/index.json', index)
    expect(() =>
      validatePalCurrentPublication({ publication: { ...publication, files }, manifest, sources }),
    ).toThrow(/s000/)
  })

  test('validatePalCurrentPublication 不修改发布文件（输入不可变）', () => {
    const { publication, sources, manifest } = validPublication()
    const before = JSON.stringify([...publication.files.entries()])
    validatePalCurrentPublication({ publication, manifest, sources })
    expect(JSON.stringify([...publication.files.entries()])).toBe(before)
  })
})

describe('O01 合成 catalog 自检（fixture 卫生，不计产品净新合同）', () => {
  test('syntheticCatalog 的所有 path 位于 assets/generated 前缀', () => {
    const catalog = syntheticCatalog()
    for (const record of Object.values(catalog.assets))
      expect(record.path.startsWith('assets/generated/')).toBe(true)
  })
})
