/** TEST-GLM-WAVE-O-1 O06：内容校验器残余公开合同（startWorld/manifest/scenes/sprites/locale）。
 *  旧证：validate.test.ts 等覆盖常规正控；本卡按 gap-map 直击未覆盖臂：
 *  资源池边界、seedStats、manifest startup 字段轴、场景命名落点/实体引用恰一、
 *  精灵 layout/poses、locale 软换行。全部纯内存。
 */
import { describe, expect, test } from 'vitest'
import { CONTENT_VERSION, CURRENT_PROJECT_MINIMUM_SAVE_VERSION } from './character.js'
import { validateMapIndex } from './map-index.js'
import { validateMigrationDiagnostics } from './migration-diagnostic.js'
import { validateStampTemplates } from './stamp.js'
import {
  validateCurrentManifestStartup,
  validateLocale,
  validateScenes,
  validateSprites,
  validateStartWorld,
  validateStartWorldResources,
} from './validate.js'
import { validateWorldVariableRegistryV1 } from './world-variable.js'

const legalStartWorld = () => ({
  party: ['li-xiaoyao'],
  money: 0,
  inventory: [],
})

describe('O06 validateStartWorldResources：资源池边界', () => {
  test('resources 缺席直接通过（不做键检查）', () => {
    expect(() => validateStartWorldResources({ party: [] })).not.toThrow()
  })

  test('空键/首尾空格键/collectValue 保留键/负值或非整数 逐轴拒绝', () => {
    expect(() => validateStartWorldResources({ resources: { ' ': 1 } })).toThrow(
      'startWorld.resources: 资源键不能为空',
    )
    expect(() => validateStartWorldResources({ resources: { ' x': 1 } })).toThrow(
      /资源键不得包含首尾空格/,
    )
    expect(() => validateStartWorldResources({ resources: { collectValue: 1 } })).toThrow(
      'startWorld.resources.collectValue: 保留资源必须使用专用世界字段',
    )
    expect(() => validateStartWorldResources({ resources: { herb: -1 } })).toThrow(
      'startWorld.resources.herb: 必须是非负安全整数',
    )
    expect(() => validateStartWorldResources({ resources: { herb: 1.5 } })).toThrow(
      /必须是非负安全整数/,
    )
  })

  test('合法资源键（非负整数）通过', () => {
    expect(() => validateStartWorldResources({ resources: { herb: 0, gold: 10 } })).not.toThrow()
  })
})

describe('O06 validateStartWorld：当前入口世界形状', () => {
  test('缺键/未知键/party 非法/money 非法/背包条目非法 逐轴拒绝', () => {
    expect(() => validateStartWorld({})).toThrow(/缺键 "party"/)
    expect(() => validateStartWorld({ ...legalStartWorld(), extra: 1 })).toThrow(/未知字段/)
    expect(() => validateStartWorld({ ...legalStartWorld(), party: [''] })).toThrow(
      'startWorld.party[0]: 期望非空角色 id',
    )
    expect(() => validateStartWorld({ ...legalStartWorld(), money: -1 })).toThrow(
      'startWorld.money: 必须是非负安全整数',
    )
    expect(() =>
      validateStartWorld({ ...legalStartWorld(), inventory: [{ itemId: 'x' }] }),
    ).toThrow(/缺键 "count"/)
    expect(() =>
      validateStartWorld({ ...legalStartWorld(), inventory: [{ itemId: 'x', count: -1 }] }),
    ).toThrow('startWorld.inventory[0].count: 必须是非负安全整数')
  })

  test('seedStats：空角色 id/未知字段/hp/mp 非负整数 逐轴拒绝', () => {
    expect(() => validateStartWorld({ ...legalStartWorld(), seedStats: { ' ': {} } })).toThrow(
      'startWorld.seedStats: 角色 id 不能为空',
    )
    expect(() =>
      validateStartWorld({ ...legalStartWorld(), seedStats: { a: { atk: 1 } } }),
    ).toThrow(/startWorld\.seedStats\.a\.atk: 未知字段|未知字段/)
    expect(() =>
      validateStartWorld({ ...legalStartWorld(), seedStats: { a: { hp: -1, mp: 0 } } }),
    ).toThrow(/seedStats\.a\.hp/)
    expect(() =>
      validateStartWorld({ ...legalStartWorld(), seedStats: { a: { hp: 10, mp: 5 } } }),
    ).not.toThrow()
  })
})

describe('O06 validateCurrentManifestStartup：manifest 字段轴', () => {
  const manifest = () => ({
    id: 'p',
    name: '工程',
    contentVersion: CONTENT_VERSION,
    minimumSaveVersion: CURRENT_PROJECT_MINIMUM_SAVE_VERSION,
    defaultEntryId: 'main',
    content: { scenes: 'content/scenes/' } as Record<string, string>,
    assets: { catalog: 'assets/index.json', roles: {} },
    entryPoints: [{ id: 'main', label: '开始', scene: 's000', startWorld: legalStartWorld() }],
  })

  test('缺键/内容版本漂移/保存版本漂移 逐轴拒绝', () => {
    expect(() => validateCurrentManifestStartup({})).toThrow(/缺键/)
    const m = manifest()
    expect(() =>
      validateCurrentManifestStartup({ ...m, contentVersion: m.contentVersion + 1 }),
    ).toThrow(`manifest.contentVersion: 期望 ${CONTENT_VERSION}`)
    expect(() =>
      validateCurrentManifestStartup({ ...m, minimumSaveVersion: m.minimumSaveVersion + 1 }),
    ).toThrow(`manifest.minimumSaveVersion: 期望 ${CURRENT_PROJECT_MINIMUM_SAVE_VERSION}`)
  })

  test('空内容键 / 非字符串路径 / 空入口表 / 入口缺键 逐轴拒绝', () => {
    const m1 = manifest()
    m1.content = { ' ': 'x' }
    expect(() => validateCurrentManifestStartup(m1)).toThrow('manifest.content: 内容键不能为空')
    const m2 = manifest()
    m2.content = { scenes: '' }
    expect(() => validateCurrentManifestStartup(m2)).toThrow(
      'manifest.content.scenes: 期望非空工程相对路径',
    )
    expect(() => validateCurrentManifestStartup({ ...manifest(), entryPoints: [] })).toThrow(
      'manifest.entryPoints: 至少需要一个真实入口',
    )
    expect(() =>
      validateCurrentManifestStartup({
        ...manifest(),
        entryPoints: [{ id: 'main', label: 'x', startWorld: legalStartWorld() }],
      }),
    ).toThrow(/manifest\.entryPoints\[0\]: 缺键 "scene"/)
  })

  test('入口 id 重复 / 首尾空格 / scene 不在场景索引 逐轴拒绝', () => {
    const dup = manifest()
    dup.entryPoints = [dup.entryPoints[0]!, { ...dup.entryPoints[0]! }]
    expect(() => validateCurrentManifestStartup(dup)).toThrow(/入口 id "main" 重复/)
    expect(() =>
      validateCurrentManifestStartup({
        ...manifest(),
        entryPoints: [{ ...manifest().entryPoints[0]!, id: ' main' }],
      }),
    ).toThrow(/不得包含首尾空格/)
    expect(() => validateCurrentManifestStartup(manifest(), ['s999'])).toThrow(
      'manifest.entryPoints[main].scene: 场景 "s000" 不在 scenes/index.json',
    )
    expect(() => validateCurrentManifestStartup(manifest(), ['s000'])).not.toThrow()
  })
})

describe('O06 validateScenes：运行态场景形状残臂', () => {
  const scene = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 's000',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
    ...over,
  })

  test('命名落点：空 id/label 非字符串/缺 pos/facing 非法 逐轴拒绝', () => {
    expect(() =>
      validateScenes([scene({ entries: { '': { pos: { col: 0, row: 0, height: 0 } } } })]),
    ).toThrow('scenes[0].entries: 命名落点 id 不能为空')
    expect(() =>
      validateScenes([
        scene({ entries: { n1: { label: 3, pos: { col: 0, row: 0, height: 0 } } } }),
      ]),
    ).toThrow('scenes[0].entries.n1.label: 期望 string')
    expect(() => validateScenes([scene({ entries: { n1: {} } })])).toThrow(
      /scenes\[0\]\.entries\.n1: 缺键 "pos"/,
    )
    expect(() =>
      validateScenes([
        scene({ entries: { n1: { pos: { col: 0, row: 0, height: 0 }, facing: 'south' } } }),
      ]),
    ).toThrow('scenes[0].entries.n1.facing: 期望 up/down/left/right')
  })

  test('实体引用恰一（0 或 2 个）与 zone 无朝向 逐轴拒绝', () => {
    expect(() =>
      validateScenes([scene({ entities: [{ id: 'e', pos: { col: 0, row: 0, height: 0 } }] })]),
    ).toThrow(/须恰有 actor\/sprite\/zone 之一\(现 0 个\)/)
    expect(() =>
      validateScenes([
        scene({
          entities: [{ id: 'e', pos: { col: 0, row: 0, height: 0 }, actor: 'a', sprite: 's' }],
        }),
      ]),
    ).toThrow(/现 2 个/)
    expect(() =>
      validateScenes([
        scene({
          entities: [{ id: 'e', pos: { col: 0, row: 0, height: 0 }, zone: true, facing: 'down' }],
        }),
      ]),
    ).toThrow('scenes[0].entities[0].facing: zone 无朝向')
  })

  test('entry.pos 缺 height / facing 非法 逐轴拒绝', () => {
    expect(() =>
      validateScenes([scene({ entry: { pos: { col: 0, row: 0 }, facing: 'down' } })]),
    ).toThrow(/scenes\[0\]\.entry\.pos: 缺键 "height"/)
    expect(() =>
      validateScenes([scene({ entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'x' } })]),
    ).toThrow('scenes[0].entry.facing: 期望 up/down/left/right')
  })
})

describe('O06 validateSprites：layout/poses 残臂', () => {
  const sprite = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: 'sp',
    asset: 'sprite.pal.001',
    label: 'x',
    layout: { kind: 'static' },
    ...over,
  })
  const catalog = {
    version: 1 as const,
    assets: {
      'sprite.pal.001': {
        kind: 'sprite' as const,
        path: 'assets/generated/sprite-pal-001.png',
        mediaType: 'image/png',
        bytes: 3,
        sha256: 'a'.repeat(64),
        origin: { kind: 'generated' as const },
      },
    },
  } satisfies import('./asset.js').AssetCatalogV1

  test('directional 缺 framesPerDir / 非正整数 拒绝；static 通过', () => {
    expect(() => validateSprites([sprite({ layout: { kind: 'directional' } })])).toThrow(
      /directional 缺 framesPerDir/,
    )
    expect(() =>
      validateSprites([sprite({ layout: { kind: 'directional', framesPerDir: 0 } })]),
    ).toThrow(/framesPerDir 期望正整数/)
    expect(() => validateSprites([sprite()], catalog)).not.toThrow()
  })

  test('kind 非法 / asset 不在 catalog / kind 不符 / 退役 spriteNum 逐轴拒绝', () => {
    expect(() => validateSprites([sprite({ layout: { kind: 'loop' } })])).toThrow(/kind 非法/)
    expect(() => validateSprites([sprite()], { version: 1, assets: {} })).toThrow(
      /AssetId "sprite\.pal\.001" 不在 catalog/,
    )
    const wrongKindCatalog = {
      version: 1 as const,
      assets: {
        'sprite.pal.001': { ...catalog.assets['sprite.pal.001']!, kind: 'music' as const },
      },
    }
    expect(() => validateSprites([sprite()], wrongKindCatalog)).toThrow(/期望 sprite，实际 music/)
    expect(() => validateSprites([sprite({ spriteNum: 3 })])).toThrow(/spriteNum: 已退役/)
  })

  test('poses：空 steps / 非 sound cue / loopFrom 越界 / 非法 label 逐轴拒绝', () => {
    const poses = (action: Record<string, unknown>) => sprite({ poses: { wave: action } })
    expect(() => validateSprites([poses({ label: 'w', steps: [] })])).toThrow(/期望非空数组/)
    expect(() =>
      validateSprites([
        poses({
          label: 'w',
          steps: [{ frame: 0, durationMs: 100, cues: [{ kind: 'fade', asset: 'x' }] }],
        }),
      ]),
    ).toThrow(/首期只允许 sound/)
    expect(() =>
      validateSprites([poses({ label: 'w', steps: [{ frame: 0, durationMs: 100 }], loopFrom: 5 })]),
    ).toThrow(/loopFrom: 期望小于 steps\.length 的非负整数/)
    expect(() =>
      validateSprites([poses({ label: ' ', steps: [{ frame: 0, durationMs: 100 }] })]),
    ).toThrow(/label: 期望非空 string/)
    expect(() =>
      validateSprites(
        [
          poses({
            label: 'w',
            steps: [
              { frame: 0, durationMs: 100, cues: [{ kind: 'sound', asset: 'sound.pal.028' }] },
            ],
          }),
        ],
        catalog,
      ),
    ).toThrow(/AssetId "sound\.pal\.028" 不在 catalog/)
  })
})

describe('O06 validateLocale / stamp / mapIndex / diagnostics / worldVariables 残臂', () => {
  test('locale：非字符串值与换行（默认禁软换行）拒绝；allowSoftWrap 放开', () => {
    expect(() => validateLocale({ a: 1 })).toThrow(/值非string/)
    expect(() => validateLocale({ a: 'x\ny' })).toThrow(/含换行/)
    expect(() => validateLocale({ a: 'x\ny' }, { allowSoftWrap: true })).not.toThrow()
  })

  test('stamp：id 含斜杠 / 缺 anchor / anchor 越界 / 空视觉瓦片 逐轴拒绝', () => {
    const stampBase = {
      name: 's',
      origin: 'authored',
      width: 1,
      height: 1,
      tilesetRefs: ['t1'],
      layers: [
        {
          id: 'layer-0',
          name: 'l',
          tiles: [[null], [null]],
          sources: [[null], [null]],
        },
      ],
      collision: [[0], [0]],
    }
    expect(() =>
      validateStampTemplates([{ ...stampBase, id: 'a/b', anchor: { row: 0, col: 0 } }]),
    ).toThrow(/id 不得含 '\/'|id 不得含 "\/"|id 不得含/)
    expect(() =>
      validateStampTemplates([{ ...stampBase, id: 'a', anchor: { row: 2, col: 0 } }]),
    ).toThrow(/锚点超出局部 surface/)
    expect(() =>
      validateStampTemplates([
        {
          ...stampBase,
          id: 'a',
          anchor: { row: 0, col: 0 },
          layers: [
            {
              id: 'layer-0',
              name: 'l',
              tiles: [[null], [null]],
              sources: [[null], [null]],
            },
          ],
        },
      ]),
    ).toThrow(/组合必须至少包含一个视觉瓦片实例/)
  })

  test('mapIndex：version 漂移与重复 id 拒绝；合法最小索引通过', () => {
    expect(() => validateMapIndex({ version: 2, maps: [] })).toThrow(/仅支持 1|仅支持/)
    expect(() =>
      validateMapIndex({
        version: 1,
        maps: [
          { id: 'map-001', name: 'a', path: 'content/maps/map-001.json' },
          { id: 'map-001', name: 'b', path: 'content/maps/map-002.json' },
        ],
      }),
    ).toThrow(/重复/)
    expect(() =>
      validateMapIndex({
        version: 1,
        maps: [{ id: 'map-001', name: 'a', path: 'content/maps/map-001.json' }],
      }),
    ).not.toThrow()
  })

  test('migrationDiagnostics：version 漂移拒绝；空诊断表通过', () => {
    expect(() => validateMigrationDiagnostics({ version: 2, diagnostics: [] })).toThrow(/version/)
    expect(() => validateMigrationDiagnostics({ version: 1, diagnostics: [] })).not.toThrow()
  })

  test('worldVariables：flag/number 初始值类型与 kind 白名单 逐轴校验', () => {
    expect(() =>
      validateWorldVariableRegistryV1({
        f: { kind: 'flag', name: 'n', description: '', initial: 1 },
      }),
    ).toThrow(/flag 期望 boolean/)
    expect(() =>
      validateWorldVariableRegistryV1({
        n: { kind: 'number', name: 'n', description: '', initial: 'x' },
      }),
    ).toThrow(/number 期望有限数值/)
    expect(() =>
      validateWorldVariableRegistryV1({
        b: { kind: 'bool', name: 'n', description: '', initial: 1 },
      }),
    ).toThrow(/只允许 flag \/ number/)
    expect(() =>
      validateWorldVariableRegistryV1({
        ok: { kind: 'number', name: 'n', description: '', initial: 0 },
      }),
    ).not.toThrow()
  })
})
