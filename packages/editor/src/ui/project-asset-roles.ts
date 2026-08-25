import type {
  AssetCatalogV1,
  AssetRecordV1,
  AssetRole,
  ManifestAssetConfig,
} from '@type-pal/content'
import { ASSET_ROLE_KINDS, ASSET_ROLES, AUDIO_ASSET_ROLES } from '@type-pal/content'

export type ProjectAssetRoleGroupId =
  | 'startup'
  | 'battle'
  | 'audio-base'
  | 'battle-sfx'
  | 'visual-base'

export type ProjectAssetRoleRequirement = 'audio-catalog' | 'optional'

interface ProjectAssetRolePresentation {
  label: string
  groupId: ProjectAssetRoleGroupId
  help?: string
}

const ROLE_PRESENTATION = {
  'audio.midiSoundfont': {
    label: 'MIDI 音色库',
    groupId: 'audio-base',
  },
  'audio.defaultBattleMusic': {
    label: '默认战斗音乐',
    groupId: 'battle',
  },
  'audio.bossVictoryMusic': {
    label: '特殊战胜利结算音乐',
    groupId: 'battle',
    help: '不可逃战胜利后播放；若随后升级，升级屏继续沿用此曲。',
  },
  'audio.normalVictoryMusic': {
    label: '普通胜利音乐',
    groupId: 'battle',
  },
  'audio.openingMenuMusic': {
    label: '标题菜单音乐',
    groupId: 'startup',
  },
  'audio.battleItemUseSound': {
    label: '战斗物品使用音效',
    groupId: 'battle-sfx',
  },
  'audio.battleCoopCastSound': {
    label: '合击起手音效',
    groupId: 'battle-sfx',
  },
  'audio.battleEscapeSound': {
    label: '逃跑音效',
    groupId: 'battle-sfx',
  },
  'audio.battleEnemyTransformSound': {
    label: '敌人变身音效',
    groupId: 'battle-sfx',
  },
  'video.startupTrademark': {
    label: '启动商标视频',
    groupId: 'startup',
  },
  'video.startupSplash': {
    label: '启动开场视频',
    groupId: 'startup',
  },
  'visual.standardColorTable': {
    label: '标准色表',
    groupId: 'visual-base',
  },
} as const satisfies Record<AssetRole, ProjectAssetRolePresentation>

const GROUP_PRESENTATION = {
  startup: {
    title: '启动与标题菜单',
    description: '启动商标、开场视频和标题菜单音乐。',
  },
  battle: {
    title: '战斗音乐',
    description: '普通战斗、特殊战胜利结算和普通胜利的全局默认音乐。',
  },
  'audio-base': {
    title: '音频基础',
    description: 'MIDI 播放使用的项目级音色库。',
  },
  'battle-sfx': {
    title: '战斗音效',
    description: '物品使用、合击、逃跑与敌人变身的全局回退音效。',
  },
  'visual-base': {
    title: '视觉基础',
    description: '项目标准色彩转换使用的色表。',
  },
} as const satisfies Record<ProjectAssetRoleGroupId, { title: string; description: string }>

export const PROJECT_ASSET_ROLE_PREFIXES = ['audio', 'video', 'visual'] as const
export type ProjectAssetRolePrefix = (typeof PROJECT_ASSET_ROLE_PREFIXES)[number]

export function projectAssetRolePrefix(role: AssetRole): ProjectAssetRolePrefix {
  const prefix = role.slice(0, role.indexOf('.'))
  if (!(PROJECT_ASSET_ROLE_PREFIXES as readonly string[]).includes(prefix))
    throw new Error(`资源角色 ${role} 使用了未登记的分组前缀 ${prefix}`)
  return prefix as ProjectAssetRolePrefix
}

export interface ProjectAssetRoleDefinition extends ProjectAssetRolePresentation {
  role: AssetRole
  kind: (typeof ASSET_ROLE_KINDS)[AssetRole]
  prefix: ProjectAssetRolePrefix
  requirement: ProjectAssetRoleRequirement
}

export const PROJECT_ASSET_ROLE_REGISTRY: readonly ProjectAssetRoleDefinition[] = ASSET_ROLES.map(
  (role) => ({
    role,
    kind: ASSET_ROLE_KINDS[role],
    prefix: projectAssetRolePrefix(role),
    requirement: role in AUDIO_ASSET_ROLES ? 'audio-catalog' : 'optional',
    ...ROLE_PRESENTATION[role],
  }),
)

export const PROJECT_ASSET_ROLE_GROUPS: readonly {
  id: ProjectAssetRoleGroupId
  title: string
  description: string
  roles: readonly ProjectAssetRoleDefinition[]
}[] = (Object.keys(GROUP_PRESENTATION) as ProjectAssetRoleGroupId[]).map((id) => ({
  id,
  ...GROUP_PRESENTATION[id],
  roles: PROJECT_ASSET_ROLE_REGISTRY.filter((definition) => definition.groupId === id),
}))

export type ProjectAssetRoleState = 'configured' | 'unconfigured' | 'error'

export interface ProjectAssetRoleStatus {
  definition: ProjectAssetRoleDefinition
  required: boolean
  state: ProjectAssetRoleState
  assetId?: string
  record?: AssetRecordV1
  message: string
}

export function projectHasAudioCatalog(catalog: AssetCatalogV1): boolean {
  return Object.values(catalog.assets).some(
    (record) => record.kind === 'music' || record.kind === 'soundfont',
  )
}

export function projectAssetRoleStatus(
  definition: ProjectAssetRoleDefinition,
  assets: ManifestAssetConfig,
  catalog: AssetCatalogV1,
): ProjectAssetRoleStatus {
  const assetId = assets.roles[definition.role]
  const required = definition.requirement === 'audio-catalog' && projectHasAudioCatalog(catalog)
  if (!assetId) {
    return {
      definition,
      required,
      state: required ? 'error' : 'unconfigured',
      message: required ? `${definition.label}需要配置` : `${definition.label}尚未配置（可选）`,
    }
  }
  const record = catalog.assets[assetId]
  if (!record) {
    return {
      definition,
      required,
      state: 'error',
      assetId,
      message: `${definition.label}引用的资源不存在`,
    }
  }
  if (record.kind !== definition.kind) {
    return {
      definition,
      required,
      state: 'error',
      assetId,
      record,
      message: `${definition.label}的资源类型不正确`,
    }
  }
  return {
    definition,
    required,
    state: 'configured',
    assetId,
    record,
    message: `${definition.label}已配置`,
  }
}

export function projectAssetRoleStatuses(
  assets: ManifestAssetConfig,
  catalog: AssetCatalogV1,
): readonly ProjectAssetRoleStatus[] {
  return PROJECT_ASSET_ROLE_REGISTRY.map((definition) =>
    projectAssetRoleStatus(definition, assets, catalog),
  )
}
