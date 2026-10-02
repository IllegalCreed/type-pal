// @vitest-environment node
/**
 * TEST-GLM-WAVE-P-1 P04（actor-references.glm-p）：人物引用闭包的选择性扫描、
 * detail 标签策略与自删除豁免、当前合法投影路径下的共享脚本/敌人立绘引用（r17 返工版）。
 * 去重（真实旧 fullName 锚）：
 * - actor-references.test.ts › Actor 引用闭包 › 16 个作者外部定位变体逐项进入删除门禁并都有
 *   可跳转 locator（已证 16 kind 全集与 locator 存在性）；本文件核 includeScriptCommands
 *   开关臂、detail 精确值与 actorReferenceBlocksDeletion 自援护豁免——旧集未断言轴。
 * - actor-references.test.ts › levelUp 是伴随数据而不是自我引用阻塞（已证 level-up-owner
 *   伴随免删）——本文件不再重复该轴，G02-2 仅保留自援护豁免与外部实体阻塞新轴。
 * r17 返工（P-R17-02/03）：
 * - 开关臂输入改为当前合法 canonical 共享脚本（RuntimeScriptLibrary.body: RuntimeCommand[]）；
 *   非空 ScriptChunkV1 无当前 producer（open-local.ts:90、main.tsx:143/187 产空 chunks），
 *   chunks where 轴与空 actor/party id 轴撤回（空 party id 被公开 validateStartWorld:95-107
 *   拒收，无当前合法 caller）。
 * - 共享脚本/敌人 identity 立绘引用经真实公开投影路径取证：buildBlankProject 种子 →
 *   当前作者文件真实 IO（validate* 校验后落盘）→ loadCurrentProjectFrom → toEditorState →
 *   assertProjectSaveValid；作者 IO 读回即含 identity cue（EditorState 运行时声明不收窄该真值），
 *   不复制旧测试强转、不新增接口。
 * 合法输入：pEditorState typed 夹具（引用目标闭合：actor/coveredBy/装备/levelUp 均有存在目标）。
 */
import {
  type BattleSpriteDef,
  validateActors,
  validateAssetCatalog,
  validateBattleSprites,
  validateCurrentManifestStartup,
} from '@type-pal/content'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { pEditorState } from '../__tests__/glm-p/kit.js'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import {
  actorReferenceBlocksDeletion,
  collectActorReferences,
  collectEditorDialoguePortraitReferences,
} from './actor-references.js'
import type { EditorState } from './edit-session.js'
import { assertProjectSaveValid } from './project-diagnostics.js'
import { toEditorState } from './project-io.js'
import { buildBlankProject } from './seed.js'

const pos = { col: 1, row: 1, height: 0 }

function actorDef(id: string, coveredBy?: string): EditorState['actors'][number] {
  return {
    id,
    name: `name.${id}`,
    spriteId: `sprite.${id}`,
    ...(coveredBy
      ? {
          battler: {
            baseStats: {
              level: 1,
              hp: 10,
              maxHP: 10,
              mp: 5,
              maxMP: 5,
              attack: 5,
              defense: 5,
              magicAttack: 0,
              speed: 5,
              luck: 5,
            },
            initialEquipment: {},
            initialMagic: [],
            battleSprite: `battle.${id}`,
            coveredBy,
          },
        }
      : {}),
  }
}

function enemyTaggingHero(): NonNullable<EditorState['enemies']>[number] {
  return {
    id: 'enemy-1',
    name: 'name.enemy-1',
    battleSprite: 'battle.enemy-1',
    yPosOffset: 0,
    stats: {
      health: 10,
      level: 1,
      exp: 1,
      cash: 1,
      attackStrength: 5,
      magicStrength: 0,
      defense: 0,
      dexterity: 5,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: {
      resistanceToSorcery: 5,
      rules: [{ at: 'act', when: { kind: 'playerInParty', role: 'hero' }, do: { kind: 'attack' } }],
    },
    sounds: {},
    choreography: [
      {
        at: 'battleStart',
        body: [
          {
            kind: 'applyActorGrowth',
            actor: 'hero',
            delta: {
              level: 0,
              maxHP: 0,
              maxMP: 0,
              attack: 0,
              magicAttack: 0,
              defense: 0,
              speed: 0,
              luck: 0,
            },
          },
        ],
      },
    ],
  }
}

/** 引用目标闭合的合法夹具：actors 表含 hero；coveredBy/装备/levelUp 目标均存在。 */
function baseState(overrides: Partial<EditorState>): EditorState {
  return pEditorState({
    scenes: [
      {
        id: 's001',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'inst-1', pos, actor: 'hero' }],
      },
    ],
    actors: [actorDef('hero')],
    manifest: {
      ...pEditorState().manifest,
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's001',
          startWorld: {
            party: ['hero'],
            money: 0,
            inventory: [],
            seedStats: { hero: { hp: 9 } },
            seedConditions: { hero: { poisonResistance: 1 } },
          },
        },
      ],
    },
    ...overrides,
  })
}

describe('P04-G01 collectActorReferences 选择性扫描', () => {
  test('includeScriptCommands:false 仅排除命令扫描臂；当前合法共享脚本输入下实体/入口/敌人条件臂保留', () => {
    const state = baseState({
      sharedScripts: {
        'probe-lib': {
          name: '探针库',
          self: 'none',
          body: [{ kind: 'setParty', members: ['hero'] }],
        },
      },
      enemies: [enemyTaggingHero()],
    })
    const keptKinds = [
      'scene-entity-actor',
      'entry-point-party',
      'entry-point-seed-stats',
      'entry-point-seed-condition',
      'enemy-condition-player-in-party',
      'enemy-apply-actor-growth',
    ] as const
    const kindsOf = (refs: ReturnType<typeof collectActorReferences>) =>
      refs.map((reference) => reference.kind).sort()

    const full = collectActorReferences(state)
    expect(
      kindsOf(full.filter((r) => keptKinds.includes(r.kind as (typeof keptKinds)[number]))),
    ).toEqual([...keptKinds].sort())
    expect(kindsOf(full).includes('command-set-party-member')).toBe(true)

    const excluded = collectActorReferences(state, { includeScriptCommands: false })
    expect(kindsOf(excluded).includes('command-set-party-member')).toBe(false)
    expect(
      kindsOf(excluded.filter((r) => keptKinds.includes(r.kind as (typeof keptKinds)[number]))),
    ).toEqual([...keptKinds].sort())
  })
})

describe('P04-G02 引用 detail 标签策略与自删除豁免', () => {
  test('显式 detail 三值与策略回退两值精确（引用目标闭合合法夹具）', () => {
    const state = baseState({
      actors: [actorDef('hero'), actorDef('solo', 'hero')],
      items: [
        {
          id: 'sword',
          name: 'item.sword',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          equip: {
            slot: 'weapon',
            equipableBy: ['hero'],
            effects: [{ kind: 'battleSprite', byActor: { hero: 'battle.hero' } }],
          },
        },
      ],
      levelUp: { hero: [{ level: 2, skillId: 'skill' }] },
    })
    const detailOf = (kind: string): string | undefined =>
      collectActorReferences(state).find((reference) => reference.kind === kind)?.detail
    expect(detailOf('scene-entity-actor')).toBe('人物预制实例')
    expect(detailOf('item-equipable-by')).toBe('物品可装备人物')
    expect(detailOf('item-battle-sprite-by-actor')).toBe('装备战斗形象映射')
    expect(detailOf('actor-covered-by')).toBe('援护者')
    expect(detailOf('level-up-owner')).toBe('随人物复制/删除的伴随数据')
  })

  test('actorReferenceBlocksDeletion：自援护豁免，外部实体引用阻塞（levelUp 伴随免删为旧证，不再重复）', () => {
    const state = baseState({ actors: [actorDef('hero'), actorDef('solo', 'solo')] })
    const references = collectActorReferences(state)
    const coveredBy = references.find((reference) => reference.kind === 'actor-covered-by')
    expect(coveredBy).toMatchObject({ actorId: 'solo', ownerActorId: 'solo' })
    expect(actorReferenceBlocksDeletion(coveredBy!)).toBe(false)
    const entityRef = references.find((reference) => reference.kind === 'scene-entity-actor')
    expect(entityRef).toMatchObject({ actorId: 'hero' })
    expect(actorReferenceBlocksDeletion(entityRef!)).toBe(true)
  })
})

/**
 * r17 公开投影路径：当前作者文件真实 IO → 公开 loader → toEditorState → 保存校验。
 * 作者 IO 读回即携带 identity cue；无测试侧强转、无新增接口（Codex r17 小样同路径）。
 */
async function loadProjectionState(): Promise<EditorState> {
  const seed = await buildBlankProject('glm-p-projection')
  const png = Uint8Array.from(
    atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2bKcAAAAASUVORK5CYII=',
    ),
    (c) => c.charCodeAt(0),
  )
  const pngHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', png))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const catalog = validateAssetCatalog(seed['assets/index.json'])
  catalog.assets['portrait.probe'] = {
    kind: 'portrait',
    path: 'assets/authored/portraits/probe.png',
    mediaType: 'image/png',
    bytes: png.byteLength,
    sha256: pngHash,
    origin: { kind: 'authored' },
  }
  seed['assets/index.json'] = catalog
  seed['assets/authored/portraits/probe.png'] = png.buffer.slice(
    png.byteOffset,
    png.byteOffset + png.byteLength,
  )
  const actors = validateActors(seed['content/actors.json'])
  actors[0]!.portraits = { default: 'portrait.probe' }
  seed['content/actors.json'] = actors
  const battleSprites = validateBattleSprites(seed['content/battle-sprites.json'], catalog)
  const enemyShape: BattleSpriteDef = {
    id: 'enemy-probe-shape',
    label: '探针敌人',
    asset: battleSprites[0]!.asset,
    profile: {
      kind: 'enemy',
      idle: { start: 0, count: 1 },
      magic: { start: 1, count: 1 },
      attack: { start: 2, count: 1 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 1,
    },
  }
  seed['content/battle-sprites.json'] = [...battleSprites, enemyShape]
  const library = {
    probe: {
      name: '探针库',
      self: 'none',
      body: [
        {
          kind: 'dialog',
          cue: {
            identity: { kind: 'actor', actor: 'hero', portrait: { kind: 'default', side: 'left' } },
            rows: [{ text: 'name.hero' }],
            slot: 'bottom',
          },
        },
      ],
    },
  } as const
  seed['content/shared-scripts.json'] = library
  const { manifest } = validateCurrentManifestStartup(seed['manifest.json'])
  manifest.content.enemies = 'content/enemies.json'
  seed['manifest.json'] = manifest
  seed['content/enemies.json'] = [
    {
      id: 'enemy-probe',
      name: 'name.hero',
      battleSprite: 'enemy-probe-shape',
      yPosOffset: 0,
      stats: {
        health: 10,
        level: 1,
        exp: 0,
        cash: 0,
        attackStrength: 1,
        magicStrength: 0,
        defense: 0,
        dexterity: 1,
        fleeRate: 0,
        physicalResistance: 1,
        poisonResistance: 0,
        elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
        dualMove: false,
        collectValue: 0,
      },
      ai: { resistanceToSorcery: 0 },
      sounds: {},
      onDefeated: library.probe.body,
    },
  ]
  const disk = memoryAuthorDirectory(seed)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const state = toEditorState(
    project,
    await loadAllAuthorScenes(project),
    await loadAllProjectMaps(project),
    {},
    [],
  )
  assertProjectSaveValid(state)
  return state
}

describe('P04-G07 当前合法投影路径下的 identity 立绘引用', () => {
  test('共享脚本 dialog cue：label/locator/where 精确；canonical 投影不产生 scriptChunks', async () => {
    const state = await loadProjectionState()
    const references = collectEditorDialoguePortraitReferences(state)
    expect(references.filter((entry) => entry.locator?.kind === 'shared-script')).toMatchObject([
      {
        actorId: 'hero',
        portraitKind: 'default',
        where: 'sharedScripts.probe.body[0].cue.identity.portrait',
        label: '共享脚本 探针库',
        locator: { kind: 'shared-script', scriptId: 'probe' },
      },
    ])
    expect(state.scriptChunks).toEqual({})
  })

  test('敌人 onDefeated dialog cue：label=敌人 id、locator 指向敌人、where 精确到 portrait 节点', async () => {
    const state = await loadProjectionState()
    const references = collectEditorDialoguePortraitReferences(state)
    expect(references.filter((entry) => entry.locator?.kind === 'enemy')).toMatchObject([
      {
        actorId: 'hero',
        portraitKind: 'default',
        where: 'enemies[0](enemy-probe).onDefeated[0].cue.identity.portrait',
        label: '敌人 enemy-probe',
        locator: { kind: 'enemy', enemyId: 'enemy-probe' },
      },
    ])
  })
})
