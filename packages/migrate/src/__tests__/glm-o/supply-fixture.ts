/**
 * Wave O 合成 typed 供应工程：不读取真实 PAL 工程/extracted 输入，全部数据程序化生成，
 * 且在构造处先过现行内容守卫（非法形状在 fixture 内直接失败）。只服务 glm-o 测试。
 *
 * census 合同（真实 PAL 数据的算术下界）按下列方式合成复刻：
 * - Store0/商店边界：源商店 0 + 1..20；29 buy / 6 sell（shop=0）openShop 全部在 s000。
 * - 物品剧情方案：49 个方案节点 / 11 个 item root（268、270 + 九档奖励物品）/ 4 个 machine-inner。
 * - B11-1 伤亡脚本：四个入口脚本解析出的 dlg.* locale 键集合恰为 PAL_CASUALTY_LOCALE_KEYS。
 * - 大世界精灵别名：51 个逐项 scene/entity 锚点（sceneId/entityId/spriteNum/nSpriteFrames=3）。
 */
import type {
  ActorDef,
  AssetCatalogV1,
  AssetRecordV1,
  BattleSpriteDef,
  ItemData,
  SceneIndexV1,
  SpriteDef,
} from '@type-pal/content'
import {
  palFaceAssetId,
  palSpriteAssetId,
  palTilesetAssetId,
  validateActors,
  validateSceneIndex,
  validateSprites,
} from '@type-pal/content'
import type { PalAssetMigrationReport } from '../../pal-assets.js'
import { applyPalCasualtyOverlays, PAL_CASUALTY_LOCALE_KEYS } from '../../pal-casualty-scripts.js'
import type { PalContentSupplySources } from '../../pal-content-supply.js'
import { migratePalShops, type SourceStore } from '../../pal-derived-content.js'
import {
  buildPalItemMessageSources,
  type PalItemMessageSource,
} from '../../pal-item-message-source.js'
import { mapActor } from '../../pal-role-mapping.js'
import type { SourceItem, SourceRole, SourceScene } from '../../pal-source-types.js'
import {
  PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES,
  PAL_WORLD_SPRITE_LAYOUT_OVERLAYS,
} from '../../pal-world-sprite-layouts.js'
import type { SourceCmd } from '../../source-facts.js'
import { ROLE_SLUGS } from '../../source-facts.js'

const FAKE_SHA = 'a1'.padEnd(64, '0')
const FAKE_SHA_B = 'b2'.padEnd(64, '1')

/** 角色稳定 slug → 旧大世界精灵号（巫后 525 无别名锚点，不进 ALIAS_ANCHORS）。 */
const ROLE_SPRITE_NUM_BY_SLUG = {
  'li-xiaoyao': 2,
  'zhao-linger': 3,
  'lin-yueru': 7,
  'wu-hou': 525,
  anu: 5,
  'gai-luojiao': 26,
} as const

type RoleSlugKey = keyof typeof ROLE_SPRITE_NUM_BY_SLUG

/** 别名锚点所需的 39 个场景（sceneId + 每个 {entityId, spriteNum}）。 */
const ALIAS_ANCHORS: readonly { sceneId: number; spriteNum: number; entityId: number }[] = [
  ...PAL_WORLD_SCENE_SEMANTIC_SPRITE_ALIASES.flatMap((alias) =>
    alias.references.map((reference) => ({
      sceneId: Number(reference.sceneId.slice(1)),
      entityId: Number(reference.entityId.slice(1)),
      spriteNum: ROLE_SPRITE_NUM_BY_SLUG[alias.semanticId as RoleSlugKey],
    })),
  ),
]

export const ROLE_SPRITE_NUMS = Object.values(ROLE_SPRITE_NUM_BY_SLUG)

function spriteIdForSlug(slug: RoleSlugKey): string {
  return palSpriteAssetId(ROLE_SPRITE_NUM_BY_SLUG[slug])
}

/** 最小合法 catalog 记录；bytes/hash 是合成的，不指向真实文件。 */
function assetRecord(
  id: string,
  kind: AssetRecordV1['kind'],
  sha: string = FAKE_SHA,
): AssetRecordV1 {
  return {
    kind,
    path: `assets/generated/${id.replaceAll('.', '-')}.bin`,
    mediaType: 'application/octet-stream',
    bytes: 16,
    sha256: sha,
    origin: { kind: 'generated' },
  }
}

/** 合成 catalog：manifest 角色、六角色精灵、瓦片集、战斗精灵与片头视频所需资源全部就位。 */
export function syntheticCatalog(): AssetCatalogV1 {
  const assets: Record<string, AssetRecordV1> = {
    'soundfont.default': assetRecord('soundfont.default', 'soundfont', FAKE_SHA_B),
    'color.project-standard': assetRecord('color.project-standard', 'color-table'),
    'video.pal.001': assetRecord('video.pal.001', 'video'),
    'video.pal.002': assetRecord('video.pal.002', 'video'),
    'video.pal.003': assetRecord('video.pal.003', 'video'),
    'tileset.pal.001': assetRecord('tileset.pal.001', 'tileset'),
    'battle-sprite.pal.player.000': assetRecord('battle-sprite.pal.player.000', 'battle-sprite'),
  }
  for (const track of [2, 3, 4, 37])
    assets[`music.pal.0${String(track).padStart(2, '0')}`] = assetRecord(
      `music.pal.${track}`,
      'music',
    )
  for (const track of [28, 29, 45, 47])
    assets[`sound.pal.0${String(track).padStart(2, '0')}`] = assetRecord(
      `sound.pal.${track}`,
      'sound',
    )
  for (const slug of ROLE_SLUGS)
    assets[spriteIdForSlug(slug)] = assetRecord(spriteIdForSlug(slug), 'sprite')
  // 角色 0..4 的小头像（PAL_PLAYER_FACE_FRAME_BY_ROLE_ID；角色 5 刻意无 face）。
  for (const slug of ROLE_SLUGS.slice(0, 5))
    assets[palFaceAssetId(slug)] = assetRecord(palFaceAssetId(slug), 'face')
  return { version: 1, assets }
}

/** 六名 SourceRole：与真实数据同构的窄输入（精灵号/战斗精灵号/零装备零仙术零音效）。 */
export function syntheticRoles(): SourceRole[] {
  return ROLE_SLUGS.map((_slug, id) => ({
    id,
    _name: ROLE_SLUGS[id]!,
    avatar: 0,
    spriteNum: ROLE_SPRITE_NUM_BY_SLUG[ROLE_SLUGS[id] as RoleSlugKey],
    spriteNumInBattle: id,
    walkFrames: 3,
    level: 1,
    hp: 100,
    maxHP: 100,
    mp: 50,
    maxMP: 50,
    attackStrength: 10,
    magicStrength: 10,
    defense: 10,
    dexterity: 10,
    fleeRate: 10,
    equipment: [0, 0, 0, 0, 0, 0],
    magic: [0],
    coveredBy: 0,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    coverSound: 0,
    dyingSound: 0,
    deathSound: 0,
  }))
}

export const STORE0_REWARD_IDS = [100, 105, 95, 112, 72, 131, 97, 102, 111] as const

/** 源商店：0 号奖励档 + 1..20 真实商店（与 Store0 边界断言的顺序合同一致）。 */
export function syntheticStores(): SourceStore[] {
  return [
    { id: 0, items: [...STORE0_REWARD_IDS] },
    ...Array.from({ length: 20 }, (_unused, index) => ({ id: index + 1, items: [141] })),
  ]
}

/** 六名生成角色（applyPalCasualtyOverlays 前的基础表）。 */
export function syntheticBaseActors(levelUpExp: readonly number[]): ActorDef[] {
  return syntheticRoles().map((role) => mapActor(role, levelUpExp))
}

/** 伤亡/寻址解析器经窄化读取的专有字段；fixture 以扩展类型承载，传入处放宽为 SourceCmd。 */
type FixtureCmd = SourceCmd & {
  messageIndex?: number
  to?: string
  itemId?: number
  count?: number
}

interface ScriptPlan {
  commands: SourceCmd[]
  /** 物品 268 炼蛊脚本入口（= scriptOnUse）。 */
  item268Script: number
  /** 物品 270 资源池脚本入口（= scriptOnUse）。 */
  item270Script: number
  /** 伤亡四脚本的 objectPlayers 入口表。 */
  objectPlayers: { scriptOnFriendDeath: number; scriptOnDying: number }[]
}

interface BranchSpec {
  lines: number[]
}

/**
 * 伤亡脚本（0x06 门 + showDialog 分支）+ 窄物品两脚本（0x20 链 / 0x34 池），
 * 全部隐式 L_<index> 寻址，无显式 label（buildSourceAddressLabelIndex 合同）。
 */
function buildCommands(): ScriptPlan {
  const commands: FixtureCmd[] = []
  // 入口地址必须 >0（真实 all.json 地址域从 1 起）；占位一条不可达指令。
  commands.push({ op: 'end' })

  const emitCasualtyScript = (branches: BranchSpec[]): number => {
    const entry = commands.length
    // 布局：连续 0x06 门 → fallback 分支体 → 各门分支体（由门 operand 显式寻址）。
    for (let index = 0; index < branches.length; index++)
      commands.push({ op: 'raw', opcode: 0x06, operands: [0, 0] })
    // 兜底分支复用本脚本首个台词键（locale 键集合不变，仍为冻结 36 键）。
    commands.push({ op: 'setDialogStyleNarration' })
    commands.push({ op: 'showDialog', messageIndex: branches[0]!.lines[0]!, text: '台词 兜底' })
    commands.push({ op: 'end' })
    for (const [index, branch] of branches.entries()) {
      const branchStart = commands.length
      commands[entry + index] = { op: 'raw', opcode: 0x06, operands: [100, branchStart] }
      for (const messageIndex of branch.lines)
        commands.push({ op: 'showDialog', messageIndex, text: `台词 ${messageIndex}` })
      commands.push({ op: 'end' })
    }
    return entry
  }

  // 36 个冻结台词键按四脚本均分；与 PAL_CASUALTY_LOCALE_KEYS 逐键一致。
  const keys = PAL_CASUALTY_LOCALE_KEYS.map((key) => Number(key.slice('dlg.'.length)))
  const quarter = keys.length / 4
  const script0 = emitCasualtyScript([
    { lines: keys.slice(0, quarter / 2) },
    { lines: keys.slice(quarter / 2, quarter) },
  ])
  const script1 = emitCasualtyScript([{ lines: keys.slice(quarter, 2 * quarter) }])
  const script2 = emitCasualtyScript([{ lines: keys.slice(2 * quarter, 3 * quarter) }])
  const script3 = emitCasualtyScript([{ lines: keys.slice(3 * quarter) }])

  // 物品 270 资源池：0x34 [失败地址] + end；失败臂为旁白三元组。
  const item270Script = commands.length
  const poolBodyStart = commands.length + 2
  commands.push({ op: 'raw', opcode: 0x34, operands: [poolBodyStart] })
  commands.push({ op: 'end' })
  commands.push({ op: 'setDialogStyleNarration' })
  commands.push({ op: 'showDialog', text: '无任何效果' })
  commands.push({ op: 'end' })

  // 物品 268 炼蛊：五条 0x20 [材料,1,失败地址] + goto 共享产物段；末条失败臂是终局旁白。
  const item268Script = commands.length
  const ingredients = [117, 118, 119, 120, 121]
  const chainLength = ingredients.length
  const productStart = item268Script + chainLength * 2 + 3
  for (const [index, ingredient] of ingredients.entries()) {
    const failureAddress =
      index + 1 < chainLength ? item268Script + (index + 1) * 2 : item268Script + chainLength * 2
    // 首条带显式 label：物品 270 失败臂的“下一块”合同要求 label 与地址一致。
    commands.push(
      index === 0
        ? {
            label: `L_${item268Script}`,
            op: 'raw',
            opcode: 0x20,
            operands: [ingredient, 1, failureAddress],
          }
        : { op: 'raw', opcode: 0x20, operands: [ingredient, 1, failureAddress] },
    )
    commands.push({ op: 'goto', to: `L_${productStart}` })
  }
  commands.push({ op: 'setDialogStyleNarration' })
  commands.push({ op: 'showDialog', text: '炼蛊的材料不足' })
  commands.push({ op: 'end' })
  // 失败三元组之后的下一块必须带显式 label（与数组地址一致）。
  commands.push({ label: `L_${productStart}`, op: 'giveItem', itemId: 148, count: 1 })

  return {
    commands,
    item268Script,
    item270Script,
    objectPlayers: [
      { scriptOnFriendDeath: script0, scriptOnDying: 0 },
      { scriptOnFriendDeath: 0, scriptOnDying: script1 },
      { scriptOnFriendDeath: script2, scriptOnDying: script3 },
    ],
  }
}

/** 全命令流 + 两个窄物品的 scriptOnUse 入口（268/270 唯一可用定义）。 */
export function syntheticSourceItems(plan: ScriptPlan): SourceItem[] {
  const flags = () => ({
    usable: true,
    equipable: false,
    throwable: false,
    consuming: true,
    applyToAll: false,
    sellable: false,
    equipableBy: [false, false, false, false, false, false],
  })
  return [
    {
      id: 268,
      _name: '炼蛊皿',
      bitmap: 1,
      price: 0,
      scriptOnUse: plan.item268Script,
      scriptOnEquip: 0,
      scriptOnThrow: 0,
      scriptDesc: 0,
      flags: flags(),
    },
    {
      id: 270,
      _name: '紫金葫芦',
      bitmap: 2,
      price: 0,
      scriptOnUse: plan.item270Script,
      scriptOnEquip: 0,
      scriptOnThrow: 0,
      scriptDesc: 0,
      flags: flags(),
    },
  ]
}

/** 39 个别名锚点场景 + 单一 mapNum=1。 */
export function syntheticScenes(): SourceScene[] {
  const byScene = new Map<number, SourceScene>()
  for (const anchor of ALIAS_ANCHORS) {
    let scene = byScene.get(anchor.sceneId)
    if (!scene) {
      scene = { sceneId: anchor.sceneId, mapNum: 1, eventObjects: [] }
      byScene.set(anchor.sceneId, scene)
    }
    scene.eventObjects.push({
      id: anchor.entityId,
      x: 0,
      y: 0,
      spriteNum: anchor.spriteNum,
      nSpriteFrames: 3,
    })
  }
  return [...byScene.values()].sort((left, right) => left.sceneId - right.sceneId)
}

/** 大世界精灵帧数表：636 项，26 个 overlay 槽位钉真实期望帧数。 */
export function syntheticWorldSpriteFrameCounts(): number[] {
  const frameCounts = Array.from({ length: 636 }, () => 3)
  for (const overlay of PAL_WORLD_SPRITE_LAYOUT_OVERLAYS)
    frameCounts[overlay.spriteNum - 1] = overlay.expectedFrameCount
  return frameCounts
}

const ZERO_REPORT: PalAssetMigrationReport = {
  videos: 0,
  frameAnimations: 0,
  frames: 0,
  sounds: 0,
  emptySounds: 0,
  soundBytes: 0,
  portraits: 0,
  portraitBytes: 0,
  faces: 0,
  faceBytes: 0,
  itemIcons: 0,
  itemIconBytes: 0,
  battleBackgrounds: 0,
  battleBackgroundBytes: 0,
  effectSprites: 0,
  effectSpriteBytes: 0,
  effectSpriteFrames: 0,
  tilesets: 0,
  tilesetBytes: 0,
  tilesetFrames: 0,
  sprites: 0,
  spriteBytes: 0,
  spriteFrames: 0,
  spriteMalformedTailSlots: 0,
  spriteTupleDigest: '',
  spriteLegacyTailAnomalies: [],
  battleSprites: 0,
  battleSpriteBytes: 0,
  battleSpriteRawBytes: 0,
  battleSpriteFrames: 0,
  battleSpriteMalformedTailSlots: 0,
  battleSpritePlayerTupleDigest: '',
  battleSpriteEnemyTupleDigest: '',
  battleSpriteTupleDigest: '',
  battleSpritePlayerFrameCounts: [],
  battleSpriteEnemyFrameCounts: [],
  battleSpriteLegacyTailAnomalies: [],
  legacyPaletteByFrameAnimation: {},
}

export interface SyntheticSupply {
  sources: PalContentSupplySources
  commands: SourceCmd[]
  itemMessages: PalItemMessageSource[]
  actorsWithCasualty: ActorDef[]
  casualtyLocale: Record<string, string>
  roles: SourceRole[]
  levelUpExp: number[]
}

/** 组装 PalContentSupplySources 并在构造处先过窄消息/伤亡守卫。 */
export function syntheticSupply(): SyntheticSupply {
  const plan = buildCommands()
  const levelUpExp = [0, 10, 30]
  const roles = syntheticRoles()
  const baseActors = syntheticBaseActors(levelUpExp)
  const { actors, locale } = applyPalCasualtyOverlays(baseActors, plan.commands, plan.objectPlayers)
  const stores = syntheticStores()
  const itemMessages = buildPalItemMessageSources(syntheticSourceItems(plan), plan.commands, stores)
  const sources: PalContentSupplySources = {
    migrate: {
      roles,
      levelUpExp: [...levelUpExp],
      items: syntheticSourceItems(plan),
      commands: plan.commands,
    },
    scenes: syntheticScenes(),
    tilemaps: [
      {
        mapNum: 1,
        source: {
          width: 2,
          height: 2,
          tileset: 'tileset/1.rle',
          cells: [
            [
              { lower: 0, upper: 0 },
              { lower: 0, upper: 0 },
            ],
            [
              { lower: 0, upper: 0 },
              { lower: 0, upper: 0 },
            ],
          ],
        },
        sourceJsonBytes: 64,
      },
    ],
    objectPlayers: plan.objectPlayers,
    musicMidi: [],
    assetCatalog: syntheticCatalog(),
    binaryAssets: [],
    worldSpriteFrameCounts: syntheticWorldSpriteFrameCounts(),
    assetReport: { ...ZERO_REPORT },
    stores,
  }
  return {
    sources,
    commands: plan.commands as SourceCmd[],
    itemMessages,
    actorsWithCasualty: actors,
    casualtyLocale: locale,
    roles,
    levelUpExp,
  }
}

// ── baseline 工程（current 内容文件） ──────────────────────────────────────

export const SCHEME_MACHINE_COUNT = 4
export const SCHEME_ROOT_ITEM_COUNT = 11

interface SchemeDesign {
  /** item id → 该 root 的方案节点数。 */
  perRoot: Map<string, number>
  /** 需要 stateMachine flow（machine-inner）的方案全局序号集合。 */
  machineSlots: Set<number>
}

/** 49 个方案节点：268→9、270→4、九档奖励物品各 4；machine-inner 取前 4 个全局序号。 */
function schemeDesign(): SchemeDesign {
  const rootIds = [
    '268',
    '270',
    ...STORE0_REWARD_IDS.filter((id) => id !== 112 && id !== 72).map(String),
    '112',
    '72',
  ]
  const perRoot = new Map<string, number>()
  let allocated = 0
  for (const [index, id] of rootIds.entries()) {
    const count = index === 0 ? 9 : 4
    perRoot.set(id, count)
    allocated += count
  }
  if (allocated !== 49) throw new Error(`fixture 方案节点数漂移: ${allocated} != 49`)
  if (rootIds.length !== SCHEME_ROOT_ITEM_COUNT) throw new Error('fixture item root 数漂移')
  return { perRoot, machineSlots: new Set([0, 1, 2, 3]) }
}

function buildStagesFlow() {
  return {
    kind: 'stages' as const,
    initial: 'main',
    stages: [{ id: 'main', body: [] }],
  }
}

function machineFlow(label: string) {
  return {
    kind: 'stateMachine' as const,
    machine: {
      id: 'scheme-machine',
      label,
      initial: 'idle',
      states: { idle: { label: '待机', body: [], next: { kind: 'stay' as const } } },
    },
  }
}

export interface SchemeAssignmentEntry {
  itemId: string
  /** 该 root 的方案 behavior id（order 即数组序）。 */
  behaviorIds: string[]
  /** 每个节点的期望 canonical label。 */
  labels: string[]
  /** 需要 stateMachine flow 的 behaviorId。 */
  machineIds: Set<string>
}

/**
 * 49 个方案节点的唯一分配表：item root 顺序与 schemeDesign 一致；
 * 268→9、270→4、其余 9 个 root 各 4；machine-inner 钉在前 4 个全局节点。
 */
export function schemeAssignment(): SchemeAssignmentEntry[] {
  const design = schemeDesign()
  const itemNames = syntheticItemNames()
  const assignment: SchemeAssignmentEntry[] = []
  let globalIndex = 0
  for (const [itemId, count] of design.perRoot) {
    const name = itemNames[itemId]!
    const behaviorIds: string[] = []
    const labels: string[] = []
    const machineIds = new Set<string>()
    for (let ordinal = 0; ordinal < count; ordinal++) {
      const behaviorId = `scheme-${String(globalIndex).padStart(2, '0')}`
      const expectedLabel = `${name}剧情方案${ordinal === 0 ? '' : ` ${ordinal + 1}`}`
      behaviorIds.push(behaviorId)
      labels.push(expectedLabel)
      if (design.machineSlots.has(globalIndex)) machineIds.add(behaviorId)
      globalIndex += 1
    }
    assignment.push({ itemId, behaviorIds, labels, machineIds })
  }
  return assignment
}

/** s000：49 个方案 behavior + 29 buy / 6 sell openShop census。 */
export function syntheticEntryScene(): Record<string, unknown> {
  const assignment = schemeAssignment()
  const behaviors: Record<
    string,
    {
      label: string
      order: number
      flow: ReturnType<typeof buildStagesFlow> | ReturnType<typeof machineFlow>
    }
  > = {}
  for (const entry of assignment) {
    for (const [ordinal, behaviorId] of entry.behaviorIds.entries()) {
      const label = entry.labels[ordinal]!
      behaviors[behaviorId] = {
        label,
        order: ordinal,
        flow: entry.machineIds.has(behaviorId)
          ? machineFlow(`${label}连续流程`)
          : buildStagesFlow(),
      }
    }
  }
  const openShops = [
    ...Array.from({ length: 29 }, (_unused, index) => ({
      kind: 'openShop' as const,
      shop: (index % 20) + 1,
      mode: 'buy' as const,
    })),
    ...Array.from({ length: 6 }, () => ({
      kind: 'openShop' as const,
      shop: 0,
      mode: 'sell' as const,
    })),
  ]
  return {
    id: 's000',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        pos: { col: 1, row: 1, height: 0 },
        sprite: 'li-xiaoyao',
        facing: 'down',
        behaviors: {
          trigger: {
            ...behaviors,
            'shop-census': {
              label: '商店巡检',
              order: 0,
              flow: { kind: 'stages', initial: 'main', stages: [{ id: 'main', body: openShops }] },
            },
          },
        },
      },
    ],
  }
}

/** 合成场景正文（39 个生成场景的最小 baseline 体；实体 sprite 引用旧 sprite-N 等价定义）。 */
export function syntheticGeneratedSceneBodies(
  scenes: readonly SourceScene[],
): Map<string, unknown> {
  const bodies = new Map<string, unknown>()
  for (const scene of scenes) {
    const id = `s${String(scene.sceneId).padStart(3, '0')}`
    bodies.set(id, {
      id,
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: scene.eventObjects.map((entity) => ({
        id: `e${entity.id}`,
        pos: { col: 0, row: 0, height: 0 },
        sprite: `sprite-${entity.spriteNum}`,
        facing: 'down',
      })),
    })
  }
  return bodies
}

/** 六角色语义精灵 + 5 个严格等价 legacy 定义（sprite-2/3/7/5/26；525 不设，保持 absent）。 */
export function syntheticBaselineSprites(): SpriteDef[] {
  const semantic: SpriteDef[] = ROLE_SLUGS.map((slug) => ({
    id: slug,
    asset: spriteIdForSlug(slug as RoleSlugKey),
    label: `${slug}(大世界)`,
    layout: { kind: 'directional', framesPerDir: 3 },
  }))
  const legacySpriteNums = [2, 3, 7, 5, 26]
  const slugBySpriteNum = new Map(
    ROLE_SLUGS.map((slug) => [ROLE_SPRITE_NUM_BY_SLUG[slug as RoleSlugKey], slug]),
  )
  const legacy: SpriteDef[] = legacySpriteNums.map((spriteNum) => ({
    id: `sprite-${spriteNum}`,
    asset: palSpriteAssetId(spriteNum),
    label: `原精灵 ${spriteNum}`,
    layout: { kind: 'directional', framesPerDir: 3 },
  }))
  void slugBySpriteNum
  return [...semantic, ...legacy]
}

export function syntheticSceneIndex(bodies: Iterable<unknown>): SceneIndexV1 {
  return validateSceneIndex({
    version: 1,
    scenes: [...bodies].map((raw) => {
      const scene = raw as { id: string }
      return {
        id: scene.id,
        name: `场景 ${scene.id}`,
        path: `content/scenes/${scene.id}.json`,
      }
    }),
  })
}

/** 物品名表：expectedLabel 由名字推导，需与方案 label 构造共用。 */
export function syntheticItemNames(): Record<string, string> {
  const names: Record<string, string> = {
    268: '炼蛊皿',
    270: '紫金葫芦',
    112: '试炼果',
    72: '舍利子',
  }
  const rewardIds = STORE0_REWARD_IDS.filter((id) => id !== 112 && id !== 72)
  for (const [index, id] of rewardIds.entries()) names[String(id)] = `储物袋${index + 1}`
  return names
}

/** 11 个 item root 的 baseline 物品：268/270 带生成用途结构，全部 root 带方案 select 边。 */
export function syntheticBaselineItems(itemMessages: readonly PalItemMessageSource[]): unknown[] {
  const names = syntheticItemNames()
  const assignment = schemeAssignment()
  const items: ItemData[] = [
    // 商店 1..20 的公共货单物品（141 另受隐蛊 overlay 合同约束）。
    { id: '141', name: '隐蛊', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
    // 炼蛊配方材料 117..121 与产物 148。
    ...[117, 118, 119, 120, 121, 148].map((id, index) => ({
      id: String(id),
      name: `炼蛊材料${index + 1}`,
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
    })),
  ]
  for (const id of Object.keys(names)) {
    items.push({
      id,
      name: names[id]!,
      desc: [],
      buyPrice: id === '112' || id === '72' ? 0 : 10,
      sellPrice: 0,
      sellable: false,
    })
  }
  return items.map((item) => {
    const entry = assignment.find((candidate) => candidate.itemId === item.id)
    if (!entry) return item
    const selectCommands = entry.behaviorIds.map((behaviorId) => ({
      kind: 'selectEntityBehavior' as const,
      target: { scene: 's000', entity: 'e1' },
      channel: 'trigger' as const,
      selection: { kind: 'use' as const, value: behaviorId },
    }))
    const privateScript = {
      kind: 'itemPrivateScript' as const,
      script: { id: 'use' as const, label: `${item.name}用途`, body: selectCommands },
    }
    const use = {
      target: 'scene' as const,
      consuming: true,
      effects: [privateScript],
    }
    if (item.id !== '268' && item.id !== '270') return { ...item, use }
    const source = itemMessages.find((message) => message.id === item.id)
    if (!source) throw new Error(`fixture 缺物品 ${item.id} 的窄消息源`)
    return { ...item, use: { ...use, effects: [source.effect, privateScript] } }
  })
}

/** player-fighter 0..5 战斗精灵定义（与角色 spriteNumInBattle 对齐）。 */
export function syntheticBattleSprites(): BattleSpriteDef[] {
  return Array.from({ length: 6 }, (_unused, index) => ({
    id: `player-fighter-${index}`,
    label: `战斗精灵 ${index}`,
    asset: 'battle-sprite.pal.player.000',
    profile: {
      kind: 'player-fighter' as const,
      frames: {
        idle: 0,
        dying: 1,
        dead: 2,
        defend: 3,
        hurt: 4,
        preMagic: 5,
        magic: 6,
        attackWindup: 7,
        attackRush: 8,
        attackStrike: 9,
      },
      castEffectBase: 0,
      attackEffectBase: 0,
    },
  }))
}

/** 合成 baseline 快照文件表（不含 publication put 覆盖的生成文件之外的特殊处理）。 */
export function syntheticBaselineFiles(): Map<string, unknown> {
  const supply = syntheticSupply()
  const generatedScenes = syntheticScenes()
  const bodies = syntheticGeneratedSceneBodies(generatedScenes)
  const entryScene = syntheticEntryScene()
  const allBodies = new Map([...bodies, ['s000', entryScene]])
  const index = syntheticSceneIndex(allBodies.values())
  const files = new Map<string, unknown>()
  files.set('assets/index.json', supply.sources.assetCatalog)
  files.set('content/actors.json', supply.actorsWithCasualty)
  files.set('content/sprites.json', syntheticBaselineSprites())
  files.set('content/scenes/index.json', index)
  for (const [id, body] of allBodies) files.set(`content/scenes/${id}.json`, body)
  files.set('content/items.json', syntheticBaselineItems(supply.itemMessages))
  files.set('content/shops.json', migratePalShops(supply.sources.stores))
  files.set('content/enemies.json', [])
  files.set('content/shared-scripts.json', {})
  files.set('content/skills.json', { version: 1, skills: [], levelUp: {} })
  files.set('content/locale.json', syntheticLocale(supply.casualtyLocale))
  files.set('content/battle-sprites.json', syntheticBattleSprites())
  files.set('content/battle-fields.json', [])
  files.set('content/enemy-teams.json', [])
  files.set('content/stamps.json', [])
  files.set('content/poisons.json', [])
  files.set('content/ambiences.json', [])
  files.set('content/migration-diagnostics.json', syntheticMigrationDiagnostics())
  files.set('content/world-variables.json', syntheticWorldVariables())
  files.set('content/tilesets.json', [
    {
      id: 'tileset-001',
      name: 'PAL 瓦片集 1',
      category: 'builtin',
      asset: palTilesetAssetId(1),
    },
  ])
  return files
}

export function syntheticLocale(casualtyLocale: Record<string, string>): Record<string, string> {
  return {
    ...casualtyLocale,
    ...Object.fromEntries(ROLE_SLUGS.map((slug) => [`name.${slug}`, `名字${slug}`])),
    'text.shop': '商店',
  }
}

export function syntheticMigrationDiagnostics(): unknown {
  return { version: 1, diagnostics: [] }
}

export function syntheticWorldVariables(): unknown {
  return {}
}

/** 常用断言辅助：baseline sprites 必须先过 validateSprites。 */
export function assertFixtureSpritesLegal(sprites: readonly SpriteDef[]): void {
  validateSprites(sprites, syntheticCatalog())
}

export function assertFixtureActorsLegal(actors: readonly ActorDef[]): void {
  validateActors(actors)
}

export { FAKE_SHA, FAKE_SHA_B }
