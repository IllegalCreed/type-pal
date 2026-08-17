import { isDeepStrictEqual } from 'node:util'
import {
  type AuthorCommandV5,
  type SceneDefV5,
  type ScriptFlowV5,
  type SkillData,
  validateScenesV5,
  validateSkills,
} from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationFileSet, MigrationJson, PalMigrationSources } from '../../pal-migration.js'
import {
  assertPreparedR13SourceExecutionCensus,
  assertR13SourceExecutionCensus,
  buildR13SourceExecutionCensus,
  type PreparedR13SourceExecutionCensus,
  type R13SourceExecutionCensusV1,
  type R13SourceExecutionContext,
} from './source-execution-census.js'
import { digestRecord, stableJsonSha256, stableStringCompare } from './stable-json.js'

export const R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST =
  '4d4bcbdb04b26947c75c1cd3899c9b988ace926a54d5d2a2f7f5e4f961e12a33' as const

export const R13_EXISTING_SCHEMA_CHANGED_PATHS = Object.freeze([
  'content/scenes/s002.json',
  'content/scenes/s020.json',
  'content/scenes/s053.json',
  'content/scenes/s140.json',
  'content/scenes/s141.json',
  'content/scenes/s142.json',
  'content/scenes/s145.json',
  'content/scenes/s169.json',
  'content/scenes/s174.json',
  'content/scenes/s188.json',
  'content/scenes/s193.json',
  'content/scenes/s194.json',
  'content/scenes/s199.json',
  'content/scenes/s200.json',
  'content/scenes/s230.json',
  'content/scenes/s243.json',
  'content/skills.json',
])

export const R13_EXISTING_SCHEMA_SKILL_COSTS = Object.freeze([
  { skillId: '352', items: [{ itemId: '148', amount: 1 }] },
  { skillId: '372', items: [{ itemId: '148', amount: 1 }] },
  { skillId: '373', items: [{ itemId: '148', amount: 1 }] },
] as const)

type CommandSourceSpec =
  | { kind: 'delay'; frames: number }
  | { kind: 'palette'; paletteIndex: 0 | 5; ambience: 'day' | 'warm' }
  | { kind: 'redraw' }

interface CommandInsertionSpec {
  address: number
  siteId: string
  source: CommandSourceSpec
  originalIndex: number
  /** 动态 host 与 item-private root 额外钉值；普通静态 host 已由 siteId/context hash 钉住。 */
  expectedEntrySiteId?: string
  expectedHostSourceId?: string
}

type FlowOwner =
  | {
      kind: 'entity'
      sceneId: string
      entityId: string
      channel: 'trigger'
      behaviorId: string
    }
  | {
      kind: 'hook'
      sceneId: string
      channel: 'onEnter'
      behaviorId: string
    }

interface CommandContainerSpec {
  id: string
  owner: FlowOwner
  node: { kind: 'stage' | 'state'; id: string }
  segment: 'body' | 'entry.prepare'
  parentDigest: string
  insertions: readonly CommandInsertionSpec[]
}

function site(address: number, contextHash: string): string {
  return `site-${address}-ctx-${contextHash}`
}

/**
 * R13-6A 只拥有这些 canonical command slots。下标属于被 parentDigest 钉住的纯 R13-5
 * 容器，并非对作者 target 的定位方式；三方合并后的 closure 使用 evidence 中的前后锚点。
 */
export const R13_EXISTING_SCHEMA_COMMAND_ORACLE = Object.freeze([
  {
    id: 's002/e34/trigger/c8-e5c9958448aa/stage:main/body',
    owner: {
      kind: 'entity',
      sceneId: 's002',
      entityId: 'e34',
      channel: 'trigger',
      behaviorId: 'c8-e5c9958448aa',
    },
    node: { kind: 'stage', id: 'main' },
    segment: 'body',
    parentDigest: '3982a75363abc294819198e02c28cd8a41fde46dfbd5c56706970ed9c1f4a94b',
    insertions: [
      {
        address: 1736,
        siteId: site(1736, '9c4d897f7c7e4e08c4a7'),
        source: { kind: 'delay', frames: 2 },
        originalIndex: 74,
        expectedEntrySiteId: 'global/items/273/scriptOnUse',
        expectedHostSourceId: 'global/items/273/scriptOnUse@39645:e34:trigger',
      },
    ],
  },
  {
    id: 's020/e348/trigger/default/stage:initial/body',
    owner: {
      kind: 'entity',
      sceneId: 's020',
      entityId: 'e348',
      channel: 'trigger',
      behaviorId: 'default',
    },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: '13df9a51a17d1a2df155784e46f5c9248018f6f8c25bb84f80609f75b096e561',
    insertions: [
      {
        address: 4767,
        siteId: site(4767, 'b5da09f45e174691f69a'),
        source: { kind: 'delay', frames: 3 },
        originalIndex: 300,
      },
    ],
  },
  {
    id: 's053/e904/trigger/c8-a962aeca50ea/stage:main/body',
    owner: {
      kind: 'entity',
      sceneId: 's053',
      entityId: 'e904',
      channel: 'trigger',
      behaviorId: 'c8-a962aeca50ea',
    },
    node: { kind: 'stage', id: 'main' },
    segment: 'body',
    parentDigest: '2acf4ac381068e1099e7b300ee6deb5422d1fc87749786216ddeaedb871711d5',
    insertions: [
      {
        address: 10465,
        siteId: site(10465, '9cfb155e6cceb4bf47a9'),
        source: { kind: 'delay', frames: 3 },
        originalIndex: 9,
        expectedEntrySiteId: 'global/items/286/scriptOnUse',
        expectedHostSourceId: 'global/items/286/scriptOnUse@39661:e904:trigger',
      },
    ],
  },
  {
    id: 's140/onEnter/default/stage:legacy-002/body',
    owner: { kind: 'hook', sceneId: 's140', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'legacy-002' },
    segment: 'body',
    parentDigest: '7d9cde839dc5e467b0bb8fdd7baf1a902c836a8053667fa91f1a1ddf2833d563',
    insertions: [
      {
        address: 21982,
        siteId: site(21982, '16382db2f99a7881e0e8'),
        source: { kind: 'palette', paletteIndex: 0, ambience: 'day' },
        originalIndex: 0,
      },
    ],
  },
  {
    id: 's140/onEnter/default/stage:legacy-003/body',
    owner: { kind: 'hook', sceneId: 's140', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'legacy-003' },
    segment: 'body',
    parentDigest: 'ca45f864d630a8111c1acf7a3a10fdedbc4a44bbdb2bdd5b742ceb042257904c',
    insertions: [
      {
        address: 21990,
        siteId: site(21990, '16382db2f99a7881e0e8'),
        source: { kind: 'palette', paletteIndex: 0, ambience: 'day' },
        originalIndex: 0,
      },
      {
        address: 22008,
        siteId: site(22008, '16382db2f99a7881e0e8'),
        source: { kind: 'delay', frames: 5 },
        originalIndex: 20,
      },
    ],
  },
  {
    id: 's141/onEnter/default/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's141', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: '41c6a94164af5123fbad80462f8962fa7b1b135d0bddf531a772fb4e197fbc47',
    insertions: [
      {
        address: 22223,
        siteId: site(22223, '0b3efa47aeeb9a1024a3'),
        source: { kind: 'palette', paletteIndex: 5, ambience: 'warm' },
        originalIndex: 0,
      },
    ],
  },
  {
    id: 's142/onEnter/default/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's142', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: '54ebaaf05a92e3ad27ccb5933e8500c44721069ecb6ba8d551672760ac22a5f1',
    insertions: [
      {
        address: 22275,
        siteId: site(22275, 'b0472711aadaba98bbdb'),
        source: { kind: 'palette', paletteIndex: 5, ambience: 'warm' },
        originalIndex: 0,
      },
    ],
  },
  {
    id: 's145/onEnter/legacy-001/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's145', channel: 'onEnter', behaviorId: 'legacy-001' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: 'e31c6e96e46d684b454b09ca959931ef45f68fc0d0570781d64bde6f88942772',
    insertions: [
      {
        address: 23975,
        siteId: site(23975, 'dc04648c97c3eb99b449'),
        source: { kind: 'palette', paletteIndex: 0, ambience: 'day' },
        originalIndex: 0,
        expectedEntrySiteId: 's169/on-enter',
        expectedHostSourceId: 's169/on-enter@24730:s145:on-enter',
      },
    ],
  },
  {
    id: 's169/onEnter/default/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's169', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: '2e9c70f7aa74576e084c9100858339544bcae3676321f27de5aabcae41f7a666',
    insertions: [
      {
        address: 24710,
        siteId: site(24710, '5243a6b9e751e92efb40'),
        source: { kind: 'palette', paletteIndex: 5, ambience: 'warm' },
        originalIndex: 0,
      },
      {
        address: 24714,
        siteId: site(24714, '5243a6b9e751e92efb40'),
        source: { kind: 'delay', frames: 3 },
        originalIndex: 4,
      },
    ],
  },
  {
    id: 's174/onEnter/legacy-001/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's174', channel: 'onEnter', behaviorId: 'legacy-001' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: '5ddb930484c95f26488e4b82f39cf957dfa23bc305fd65c68727ec09c9bf62a1',
    insertions: [
      {
        address: 28486,
        siteId: site(28486, 'fa28c8f2fdd4a013fa1a'),
        source: { kind: 'delay', frames: 2 },
        originalIndex: 20,
        expectedEntrySiteId: 's172/e2862/trigger',
        expectedHostSourceId: 's172/e2862/trigger@28425:s174:on-enter',
      },
    ],
  },
  {
    id: 's188/onEnter/default/state:initial/body',
    owner: { kind: 'hook', sceneId: 's188', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'state', id: 'initial' },
    segment: 'body',
    parentDigest: '45531b2cefcaa522cd8eafba9e1b12169941c50a4f26c6284d7f0584d87b9248',
    insertions: [
      {
        address: 26371,
        siteId: site(26371, '9029f3642bf25e81a8c4'),
        source: { kind: 'delay', frames: 3 },
        originalIndex: 4,
      },
    ],
  },
  {
    id: 's193/onEnter/default/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's193', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: 'e2e22654e3a3185a0928512d1f22950f6bf2a7a9d19e2b6c6c298fa3ba1ed38f',
    insertions: [
      {
        address: 28624,
        siteId: site(28624, 'd13f6e2fc015c23c7115'),
        source: { kind: 'palette', paletteIndex: 5, ambience: 'warm' },
        originalIndex: 0,
      },
    ],
  },
  {
    id: 's194/onEnter/default/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's194', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: 'c7f59d077276284cc92c687933f0c9adb5b19d878d5641ba19763ea0c520a352',
    insertions: [
      {
        address: 28664,
        siteId: site(28664, '2327ac800252d77d511c'),
        source: { kind: 'delay', frames: 2 },
        originalIndex: 2,
      },
    ],
  },
  {
    id: 's199/onEnter/default/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's199', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: '99866dfb940b2ad81cb9a82ce43af495c9d9c2166f345675fd1e2f3ee106de69',
    insertions: [
      {
        address: 28841,
        siteId: site(28841, 'c54e3ef4724bd4f80774'),
        source: { kind: 'delay', frames: 2 },
        originalIndex: 2,
      },
      {
        address: 28850,
        siteId: site(28850, 'c54e3ef4724bd4f80774'),
        source: { kind: 'palette', paletteIndex: 0, ambience: 'day' },
        originalIndex: 7,
      },
    ],
  },
  {
    id: 's200/onEnter/default/stage:initial/entry.prepare',
    owner: { kind: 'hook', sceneId: 's200', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'entry.prepare',
    parentDigest: '66163d8f9c67f9b40ea7c127b65774b910fa6821d450c0c5338e828957bb832f',
    insertions: [
      {
        address: 30589,
        siteId: site(30589, '6f2fbc6d4f782a3e55b1'),
        source: { kind: 'palette', paletteIndex: 5, ambience: 'warm' },
        originalIndex: 0,
      },
      {
        address: 30593,
        siteId: site(30593, '6f2fbc6d4f782a3e55b1'),
        source: { kind: 'delay', frames: 3 },
        originalIndex: 4,
      },
    ],
  },
  {
    id: 's200/onEnter/default/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's200', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: '87bb93781a99e26faca5793f36082bb5baa8c5a3c14c1a75bcb9e446f9c059f7',
    insertions: [
      {
        address: 30645,
        siteId: site(30645, '6f2fbc6d4f782a3e55b1'),
        source: { kind: 'palette', paletteIndex: 0, ambience: 'day' },
        originalIndex: 20,
      },
    ],
  },
  {
    id: 's230/onEnter/default/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's230', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: 'c7fbdc0bef7e99b9c22e740181128b8233baaf78cb3ac01803d56dbd11bcb50c',
    insertions: [
      {
        address: 31858,
        siteId: site(31858, 'b3d22c1bf8341caf2d97'),
        source: { kind: 'redraw' },
        originalIndex: 8,
      },
    ],
  },
  {
    id: 's243/onEnter/default/stage:initial/body',
    owner: { kind: 'hook', sceneId: 's243', channel: 'onEnter', behaviorId: 'default' },
    node: { kind: 'stage', id: 'initial' },
    segment: 'body',
    parentDigest: '2cd26a8bcf59b3327b5f7163146d1830b0e94152e6254e0ffe9335d34716a27b',
    insertions: [
      {
        address: 31883,
        siteId: site(31883, '066b16be2ddeb8a1f6a4'),
        source: { kind: 'redraw' },
        originalIndex: 4,
      },
    ],
  },
] as const satisfies readonly CommandContainerSpec[])

export interface R13ExistingSchemaSiteEvidenceV1 {
  address: number
  siteId: string
  contextId: string
  sourceEntrySiteId: string
  sourceHost: R13SourceExecutionContext['host']
  sourceCommandSha256: string
  owner: string
  parentContainerDigest: string
  successorContainerDigest: string
  commandDigest: string
  finalIndex: number
  beforeDigest?: string
  afterDigest?: string
}

export interface R13ExistingSchemaSkillEvidenceV1 {
  skillId: '352' | '372' | '373'
  parentCostDigest: string
  successorCostDigest: string
  items: [{ itemId: '148'; amount: 1 }]
}

interface R13ExistingSchemaAugmentationEvidenceBodyV1 {
  kind: 'r13-existing-schema-augmentation-evidence'
  version: 1
  projectId: 'pal'
  generator: { id: 'r13-existing-schema-augmentation'; version: 1 }
  summary: {
    commandSites: 22
    skillCosts: 3
    changedScenes: 16
    changedFiles: 17
  }
  parentContentDigest: string
  successorContentDigest: string
  changedPaths: string[]
  sites: R13ExistingSchemaSiteEvidenceV1[]
  skills: R13ExistingSchemaSkillEvidenceV1[]
  externalPrerequisites: {
    warmAmbience: { id: 'warm'; tint: [255, 230, 102]; ownership: 'project-authored' }
  }
}

export interface R13ExistingSchemaAugmentationEvidenceV1
  extends R13ExistingSchemaAugmentationEvidenceBodyV1 {
  digest: string
}

export interface R13ExistingSchemaAugmentation {
  snapshot: MigrationSnapshot
  evidence: R13ExistingSchemaAugmentationEvidenceV1
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map(source.files),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function asMigrationJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

export function digestR13ExistingSchemaContentSnapshot(snapshot: MigrationSnapshot): string {
  return stableJsonSha256(
    [...snapshot.managedFiles]
      .filter((path) => snapshot.files.has(path))
      .sort(stableStringCompare)
      .map((path) => ({ path, value: snapshot.files.get(path)! })),
  )
}

function sceneOf(snapshot: MigrationSnapshot, sceneId: string): SceneDefV5 {
  const raw = snapshot.files.get(`content/scenes/${sceneId}.json`)
  const currentCommandView = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(currentCommandView)
    if (!value || typeof value !== 'object') return value
    const record = value as Record<string, unknown>
    if (record.kind === 'startBattle' && Number.isSafeInteger(record.team))
      return {
        ...Object.fromEntries(
          Object.entries(record)
            .filter(([key]) => key !== 'team')
            .map(([key, child]) => [key, currentCommandView(child)]),
        ),
        enemyTeamId: `team-${String(record.team)}`,
      }
    return Object.fromEntries(
      Object.entries(record).map(([key, child]) => [key, currentCommandView(child)]),
    )
  }
  const validated = validateScenesV5([currentCommandView(raw)])[0]
  if (!validated || validated.id !== sceneId)
    throw new Error(`R13 existing-schema augmentation: scene identity 漂移 ${sceneId}`)
  return raw as unknown as SceneDefV5
}

function flowOf(scene: SceneDefV5, owner: FlowOwner): ScriptFlowV5 {
  if (owner.kind === 'entity') {
    const entities = scene.entities.filter((entity) => entity.id === owner.entityId)
    const flow = entities[0]?.behaviors?.[owner.channel]?.[owner.behaviorId]?.flow
    if (entities.length !== 1 || !flow)
      throw new Error(
        `R13 existing-schema augmentation: entity flow 漂移 ${owner.sceneId}/${owner.entityId}/` +
          `${owner.channel}/${owner.behaviorId}`,
      )
    return flow
  }
  const flow = scene.hooks?.[owner.channel]?.variants[owner.behaviorId]?.flow
  if (!flow)
    throw new Error(
      `R13 existing-schema augmentation: hook flow 漂移 ${owner.sceneId}/${owner.channel}/` +
        owner.behaviorId,
    )
  return flow
}

function commandContainer(scene: SceneDefV5, spec: CommandContainerSpec): AuthorCommandV5[] {
  const flow = flowOf(scene, spec.owner)
  let node:
    | Extract<ScriptFlowV5, { kind: 'stages' }>['stages'][number]
    | Extract<ScriptFlowV5, { kind: 'stateMachine' }>['machine']['states'][string]
  if (spec.node.kind === 'stage') {
    if (flow.kind !== 'stages')
      throw new Error(`R13 existing-schema augmentation: ${spec.id} 不是 stages`)
    const matches = flow.stages.filter((stage) => stage.id === spec.node.id)
    if (matches.length !== 1)
      throw new Error(`R13 existing-schema augmentation: ${spec.id} stage 数量=${matches.length}`)
    node = matches[0]!
  } else {
    if (flow.kind !== 'stateMachine')
      throw new Error(`R13 existing-schema augmentation: ${spec.id} 不是 stateMachine`)
    const state = flow.machine.states[spec.node.id]
    if (!state) throw new Error(`R13 existing-schema augmentation: ${spec.id} state 不存在`)
    node = state
  }
  if (spec.segment === 'body') return node.body
  if (!node.entry) throw new Error(`R13 existing-schema augmentation: ${spec.id} entry 不存在`)
  return node.entry.prepare
}

function commandFor(source: CommandSourceSpec): AuthorCommandV5 {
  if (source.kind === 'delay') return { kind: 'wait', ms: source.frames * 60 }
  if (source.kind === 'palette') return { kind: 'setAmbience', ambience: source.ambience }
  return { kind: 'ditherScreen', ms: 2160 }
}

function contextIdFromSiteId(siteId: string): string {
  const marker = siteId.indexOf('-ctx-')
  if (marker < 0) throw new Error(`R13 existing-schema augmentation: site id 无 context ${siteId}`)
  return siteId.slice(marker + 1)
}

function validateSourceCommand(source: PalMigrationSources, insertion: CommandInsertionSpec): void {
  const command = source.migrate.commands[insertion.address] as
    | { op?: string; opcode?: number; operands?: number[]; paletteIndex?: number }
    | undefined
  if (!command)
    throw new Error(`R13 existing-schema augmentation: source address 不存在 ${insertion.address}`)
  const expected = insertion.source
  const valid =
    expected.kind === 'delay'
      ? command.op === 'raw' &&
        command.opcode === 0x05 &&
        isDeepStrictEqual(command.operands, [0, expected.frames, 0])
      : expected.kind === 'palette'
        ? command.op === 'setPalette' && command.paletteIndex === expected.paletteIndex
        : command.op === 'raw' &&
          command.opcode === 0x9b &&
          isDeepStrictEqual(command.operands, [2, 0xffff, 0])
  if (!valid)
    throw new Error(
      `R13 existing-schema augmentation: source command 漂移 ${insertion.address} ` +
        JSON.stringify(command),
    )
}

function sourceEvidence(args: {
  sources: PalMigrationSources
  census: R13SourceExecutionCensusV1
  spec: CommandContainerSpec
  insertion: CommandInsertionSpec
  parentContainer: readonly AuthorCommandV5[]
  successorContainer: readonly AuthorCommandV5[]
  finalIndex: number
}): R13ExistingSchemaSiteEvidenceV1 {
  validateSourceCommand(args.sources, args.insertion)
  const contextId = contextIdFromSiteId(args.insertion.siteId)
  const sites = args.census.sites.filter(
    (candidate) =>
      candidate.id === args.insertion.siteId &&
      candidate.address === args.insertion.address &&
      candidate.contextId === contextId,
  )
  const context = args.census.contexts.find((candidate) => candidate.id === contextId)
  const instruction = args.census.instructions[args.insertion.address]
  const sourceCommand = args.sources.migrate.commands[args.insertion.address]
  if (
    sites.length !== 1 ||
    !context ||
    !instruction ||
    instruction.sourceCommandSha256 !== stableJsonSha256(sourceCommand) ||
    !instruction.executionSiteIds.includes(args.insertion.siteId) ||
    (args.insertion.expectedEntrySiteId !== undefined &&
      context.entrySiteId !== args.insertion.expectedEntrySiteId) ||
    (args.insertion.expectedHostSourceId !== undefined &&
      context.host.sourceId !== args.insertion.expectedHostSourceId)
  )
    throw new Error(
      `R13 existing-schema augmentation: source site/context 漂移 ${args.insertion.siteId}`,
    )
  const inserted = args.successorContainer[args.finalIndex]
  const expectedCommand = commandFor(args.insertion.source)
  if (!inserted || !isDeepStrictEqual(inserted, expectedCommand))
    throw new Error(
      `R13 existing-schema augmentation: inserted command 漂移 ${args.insertion.siteId}`,
    )
  const before = args.successorContainer[args.finalIndex - 1]
  const after = args.successorContainer[args.finalIndex + 1]
  return {
    address: args.insertion.address,
    siteId: args.insertion.siteId,
    contextId,
    sourceEntrySiteId: context.entrySiteId,
    sourceHost: structuredClone(context.host),
    sourceCommandSha256: instruction.sourceCommandSha256,
    owner: args.spec.id,
    parentContainerDigest: stableJsonSha256(args.parentContainer),
    successorContainerDigest: stableJsonSha256(args.successorContainer),
    commandDigest: stableJsonSha256(inserted),
    finalIndex: args.finalIndex,
    ...(before ? { beforeDigest: stableJsonSha256(before) } : {}),
    ...(after ? { afterDigest: stableJsonSha256(after) } : {}),
  }
}

function indexedSkills(
  value: ReturnType<typeof validateSkills>,
  label: string,
): Map<string, SkillData> {
  const result = new Map<string, SkillData>()
  for (const skill of value.skills) {
    if (result.has(skill.id))
      throw new Error(`R13 existing-schema augmentation: ${label} duplicate skill ${skill.id}`)
    result.set(skill.id, skill)
  }
  return result
}

function withoutItemCosts(skill: SkillData): SkillData {
  const clone = structuredClone(skill)
  delete clone.cost.items
  return clone
}

function augmentSkillCosts(args: {
  snapshot: MigrationSnapshot
  currentMigration: MigrationFileSet
}): R13ExistingSchemaSkillEvidenceV1[] {
  const path = 'content/skills.json'
  const parent = validateSkills(args.snapshot.files.get(path))
  const current = validateSkills(args.currentMigration.files.get(path))
  const parentById = indexedSkills(parent, 'parent')
  const currentById = indexedSkills(current, 'current')
  if (
    parentById.size !== currentById.size ||
    [...parentById.keys()].some((id) => !currentById.has(id))
  )
    throw new Error('R13 existing-schema augmentation: skill id set 漂移')
  const changed = [...parentById.keys()]
    .filter((id) => !isDeepStrictEqual(parentById.get(id), currentById.get(id)))
    .sort(stableStringCompare)
  const expectedIds = R13_EXISTING_SCHEMA_SKILL_COSTS.map((entry) => entry.skillId)
  if (!isDeepStrictEqual(changed, expectedIds))
    throw new Error(
      `R13 existing-schema augmentation: current skill delta 漂移 ${changed.join(',')}`,
    )
  for (const id of parentById.keys())
    if (
      !isDeepStrictEqual(
        withoutItemCosts(parentById.get(id)!),
        withoutItemCosts(currentById.get(id)!),
      )
    )
      throw new Error(`R13 existing-schema augmentation: skill 非 items 字段漂移 ${id}`)

  const next = structuredClone(parent)
  const nextById = indexedSkills(next, 'successor')
  const evidence = R13_EXISTING_SCHEMA_SKILL_COSTS.map((spec) => {
    const parentSkill = parentById.get(spec.skillId)
    const currentSkill = currentById.get(spec.skillId)
    const successorSkill = nextById.get(spec.skillId)
    if (
      !parentSkill ||
      !currentSkill ||
      !successorSkill ||
      parentSkill.cost.items !== undefined ||
      !isDeepStrictEqual(currentSkill.cost.items, spec.items)
    )
      throw new Error(`R13 existing-schema augmentation: skill cost authority 漂移 ${spec.skillId}`)
    successorSkill.cost.items = spec.items.map((entry) => ({ ...entry }))
    return {
      skillId: spec.skillId,
      parentCostDigest: stableJsonSha256(parentSkill.cost),
      successorCostDigest: stableJsonSha256(successorSkill.cost),
      items: [{ itemId: '148' as const, amount: 1 as const }] as [{ itemId: '148'; amount: 1 }],
    }
  })
  args.snapshot.files.set(path, asMigrationJson(next))
  args.snapshot.hashes?.delete(path)
  validateSkills(args.snapshot.files.get(path))
  return evidence
}

function changedPaths(parent: MigrationSnapshot, successor: MigrationSnapshot): string[] {
  if (
    !isDeepStrictEqual(
      [...parent.managedFiles].sort(stableStringCompare),
      [...successor.managedFiles].sort(stableStringCompare),
    ) ||
    !isDeepStrictEqual(
      [...parent.files.keys()].sort(stableStringCompare),
      [...successor.files.keys()].sort(stableStringCompare),
    )
  )
    throw new Error('R13 existing-schema augmentation: snapshot path set 漂移')
  return [...parent.files]
    .filter(([path, value]) => !isDeepStrictEqual(value, successor.files.get(path)))
    .map(([path]) => path)
    .sort(stableStringCompare)
}

function censusFor(args: {
  sources: PalMigrationSources
  prepared?: PreparedR13SourceExecutionCensus
}): R13SourceExecutionCensusV1 {
  if (args.prepared) {
    assertPreparedR13SourceExecutionCensus(args.prepared, args.sources, args.prepared.census)
    return args.prepared.census
  }
  const census = buildR13SourceExecutionCensus(args.sources)
  assertR13SourceExecutionCensus(census)
  return census
}

export function assertR13ExistingSchemaAugmentationEvidence(
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
): void {
  const { digest, ...body } = evidence
  if (
    stableJsonSha256(body) !== digest ||
    evidence.kind !== 'r13-existing-schema-augmentation-evidence' ||
    evidence.version !== 1 ||
    evidence.summary.commandSites !== 22 ||
    evidence.summary.skillCosts !== 3 ||
    evidence.summary.changedScenes !== 16 ||
    evidence.summary.changedFiles !== 17 ||
    !isDeepStrictEqual(evidence.changedPaths, R13_EXISTING_SCHEMA_CHANGED_PATHS) ||
    evidence.sites.length !== 22 ||
    evidence.skills.length !== 3 ||
    new Set(evidence.sites.map((entry) => entry.siteId)).size !== 22
  )
    throw new Error('R13 existing-schema augmentation: evidence payload 漂移')
}

function assertR13ExistingSchemaFinalTargetClosureWithDigest(
  snapshot: MigrationSnapshot,
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
  successorContentDigest: string,
): void {
  assertR13ExistingSchemaAugmentationEvidence(evidence)
  if (successorContentDigest !== evidence.successorContentDigest)
    throw new Error('R13 existing-schema augmentation: successor content digest 漂移')
  const skillFile = validateSkills(snapshot.files.get('content/skills.json'))
  const skills = indexedSkills(skillFile, 'final')
  for (const expected of R13_EXISTING_SCHEMA_SKILL_COSTS)
    if (!isDeepStrictEqual(skills.get(expected.skillId)?.cost.items, expected.items))
      throw new Error(`R13 existing-schema augmentation: final skill cost 漂移 ${expected.skillId}`)
  for (const spec of R13_EXISTING_SCHEMA_COMMAND_ORACLE) {
    const container = commandContainer(sceneOf(snapshot, spec.owner.sceneId), spec)
    const siteEvidence = evidence.sites.filter((entry) => entry.owner === spec.id)
    if (stableJsonSha256(container) !== siteEvidence[0]?.successorContainerDigest)
      throw new Error(`R13 existing-schema augmentation: final container 漂移 ${spec.id}`)
    for (const entry of siteEvidence) {
      const command = container[entry.finalIndex]
      if (!command || stableJsonSha256(command) !== entry.commandDigest)
        throw new Error(`R13 existing-schema augmentation: final command 漂移 ${entry.siteId}`)
    }
  }
}

export function assertR13ExistingSchemaFinalTargetClosure(
  snapshot: MigrationSnapshot,
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
): void {
  assertR13ExistingSchemaFinalTargetClosureWithDigest(
    snapshot,
    evidence,
    digestR13ExistingSchemaContentSnapshot(snapshot),
  )
}

export function augmentR13ExistingSchemaAfterEnemy(args: {
  parent: MigrationSnapshot
  currentSources: PalMigrationSources
  currentMigration: MigrationFileSet
  preparedCurrentSourceCensus?: PreparedR13SourceExecutionCensus
}): R13ExistingSchemaAugmentation {
  const parentDigest = digestR13ExistingSchemaContentSnapshot(args.parent)
  if (parentDigest !== R13_EXISTING_SCHEMA_PARENT_CONTENT_DIGEST)
    throw new Error(`R13 existing-schema augmentation: parent authority 漂移 ${parentDigest}`)
  if (
    R13_EXISTING_SCHEMA_COMMAND_ORACLE.reduce(
      (count, entry) => count + entry.insertions.length,
      0,
    ) !== 22
  )
    throw new Error('R13 existing-schema augmentation: command oracle 数量漂移')
  const census = censusFor({
    sources: args.currentSources,
    ...(args.preparedCurrentSourceCensus ? { prepared: args.preparedCurrentSourceCensus } : {}),
  })
  const snapshot = cloneSnapshot(args.parent)
  const clonedScenes = new Set<string>()
  const siteEvidence: R13ExistingSchemaSiteEvidenceV1[] = []

  for (const spec of R13_EXISTING_SCHEMA_COMMAND_ORACLE) {
    const sceneId = spec.owner.sceneId
    if (!clonedScenes.has(sceneId)) {
      const path = `content/scenes/${sceneId}.json`
      snapshot.files.set(path, asMigrationJson(structuredClone(sceneOf(args.parent, sceneId))))
      snapshot.hashes?.delete(path)
      clonedScenes.add(sceneId)
    }
    const parentContainer = commandContainer(sceneOf(args.parent, sceneId), spec)
    if (stableJsonSha256(parentContainer) !== spec.parentDigest)
      throw new Error(`R13 existing-schema augmentation: parent container 漂移 ${spec.id}`)
    const successorScene = sceneOf(snapshot, sceneId)
    const successorContainer = commandContainer(successorScene, spec)
    const ordered = [...spec.insertions].sort(
      (left, right) => right.originalIndex - left.originalIndex || right.address - left.address,
    )
    for (const insertion of ordered) {
      if (insertion.originalIndex < 0 || insertion.originalIndex > successorContainer.length)
        throw new Error(`R13 existing-schema augmentation: insertion 越界 ${insertion.siteId}`)
      successorContainer.splice(insertion.originalIndex, 0, commandFor(insertion.source))
    }
    for (const insertion of spec.insertions) {
      const finalIndex =
        insertion.originalIndex +
        spec.insertions.filter((candidate) => candidate.originalIndex <= insertion.originalIndex)
          .length -
        1
      siteEvidence.push(
        sourceEvidence({
          sources: args.currentSources,
          census,
          spec,
          insertion,
          parentContainer,
          successorContainer,
          finalIndex,
        }),
      )
    }
    validateScenesV5([snapshot.files.get(`content/scenes/${sceneId}.json`)])
  }
  siteEvidence.sort((left, right) => left.address - right.address)
  const skillEvidence = augmentSkillCosts({
    snapshot,
    currentMigration: args.currentMigration,
  })
  const paths = changedPaths(args.parent, snapshot)
  if (!isDeepStrictEqual(paths, R13_EXISTING_SCHEMA_CHANGED_PATHS))
    throw new Error(`R13 existing-schema augmentation: changed paths 漂移 ${paths.join(',')}`)

  const successorContentDigest = digestR13ExistingSchemaContentSnapshot(snapshot)
  const evidence = digestRecord<R13ExistingSchemaAugmentationEvidenceV1>({
    kind: 'r13-existing-schema-augmentation-evidence',
    version: 1,
    projectId: 'pal',
    generator: { id: 'r13-existing-schema-augmentation', version: 1 },
    summary: {
      commandSites: 22,
      skillCosts: 3,
      changedScenes: 16,
      changedFiles: 17,
    },
    parentContentDigest: parentDigest,
    successorContentDigest,
    changedPaths: paths,
    sites: siteEvidence,
    skills: skillEvidence,
    externalPrerequisites: {
      warmAmbience: { id: 'warm', tint: [255, 230, 102], ownership: 'project-authored' },
    },
  })
  assertR13ExistingSchemaFinalTargetClosureWithDigest(snapshot, evidence, successorContentDigest)
  return { snapshot, evidence }
}

/**
 * Reconstruct the R13-5 parent content from a published pure R13-6A successor.
 *
 * The transition seal deliberately stores only source-backed command/skill evidence,
 * not a second copy of every parent file.  Replay therefore removes exactly the
 * evidenced commands (using their successor indices and digests) and the three
 * evidenced item costs, then re-checks the canonical parent digest.  Author edits
 * in a project target cannot be rewound silently: any mismatch fails closed.
 */
export function rewindR13ExistingSchemaAugmentation(
  successor: MigrationSnapshot,
  evidence: R13ExistingSchemaAugmentationEvidenceV1,
  options: { allowAppendOnlySuccessor?: boolean } = {},
): MigrationSnapshot {
  assertR13ExistingSchemaAugmentationEvidence(evidence)
  const allowAppendOnlySuccessor = options.allowAppendOnlySuccessor === true
  if (
    !allowAppendOnlySuccessor &&
    digestR13ExistingSchemaContentSnapshot(successor) !== evidence.successorContentDigest
  )
    throw new Error('R13 existing-schema augmentation: replay successor content digest 漂移')

  const parent = cloneSnapshot(successor)
  const touchedScenes = new Set<string>()
  for (const spec of R13_EXISTING_SCHEMA_COMMAND_ORACLE) {
    const path = `content/scenes/${spec.owner.sceneId}.json`
    const rawValue = parent.files.get(path)
    if (rawValue === undefined)
      throw new Error(`R13 existing-schema augmentation: replay scene 缺失 ${path}`)
    const raw = structuredClone(rawValue)
    const scene = sceneOf({ ...parent, files: new Map([[path, raw]]) }, spec.owner.sceneId)
    const container = commandContainer(scene, spec)
    const entries = evidence.sites
      .filter((entry) => entry.owner === spec.id)
      .sort((left, right) => right.finalIndex - left.finalIndex)
    if (entries.length !== spec.insertions.length)
      throw new Error(`R13 existing-schema augmentation: replay site 数量漂移 ${spec.id}`)
    for (const entry of entries) {
      let index = entry.finalIndex
      const command = container[index]
      if (!command || stableJsonSha256(command) !== entry.commandDigest) {
        if (!allowAppendOnlySuccessor) {
          throw new Error(`R13 existing-schema augmentation: replay command 漂移 ${entry.siteId}`)
        }
        const matches = container
          .map((candidate, candidateIndex) => ({ candidate, candidateIndex }))
          .filter(({ candidate }) => stableJsonSha256(candidate) === entry.commandDigest)
        if (matches.length !== 1)
          throw new Error(
            `R13 existing-schema augmentation: successor command 不唯一 ${entry.siteId}`,
          )
        index = matches[0]!.candidateIndex
      }
      container.splice(index, 1)
    }
    if (
      !allowAppendOnlySuccessor &&
      stableJsonSha256(container) !== entries[0]?.parentContainerDigest
    )
      throw new Error(`R13 existing-schema augmentation: replay parent container 漂移 ${spec.id}`)
    parent.files.set(path, asMigrationJson(scene))
    parent.hashes?.delete(path)
    touchedScenes.add(path)
  }

  const skillValue = parent.files.get('content/skills.json')
  if (skillValue === undefined)
    throw new Error('R13 existing-schema augmentation: replay skills 缺失')
  const skills = validateSkills(structuredClone(skillValue))
  const skillsById = indexedSkills(skills, 'replay parent')
  for (const expected of R13_EXISTING_SCHEMA_SKILL_COSTS) {
    const skill = skillsById.get(expected.skillId)
    const evidenceEntry = evidence.skills.find((entry) => entry.skillId === expected.skillId)
    if (
      !skill ||
      !evidenceEntry ||
      !isDeepStrictEqual(skill.cost.items, expected.items) ||
      stableJsonSha256(skill.cost) !== evidenceEntry.successorCostDigest
    )
      throw new Error(
        `R13 existing-schema augmentation: replay skill cost 漂移 ${expected.skillId}`,
      )
    delete skill.cost.items
  }
  parent.files.set('content/skills.json', asMigrationJson(skills))
  parent.hashes?.delete('content/skills.json')

  if (
    !allowAppendOnlySuccessor &&
    digestR13ExistingSchemaContentSnapshot(parent) !== evidence.parentContentDigest
  )
    throw new Error('R13 existing-schema augmentation: replay parent content digest 漂移')
  // Keep the path set/managed set byte-for-byte stable; only the evidenced JSON
  // leaves and their cached hashes are intentionally changed.
  if (
    touchedScenes.size !== evidence.summary.changedScenes ||
    !isDeepStrictEqual(
      [...parent.managedFiles].sort(stableStringCompare),
      [...successor.managedFiles].sort(stableStringCompare),
    )
  )
    throw new Error('R13 existing-schema augmentation: replay parent snapshot shape 漂移')
  return parent
}
