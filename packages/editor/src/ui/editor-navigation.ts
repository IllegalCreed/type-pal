export const EDITOR_MODULE_IDS = [
  'scene',
  'map',
  'story',
  'actor',
  'item',
  'battle',
  'asset',
  'project',
] as const

export type EditorModuleId = (typeof EDITOR_MODULE_IDS)[number]

export const ACTOR_WORKSPACE_SECTIONS = [
  'overview',
  'battle',
  'relationships',
  'appearance',
] as const

export type ActorWorkspaceSection = (typeof ACTOR_WORKSPACE_SECTIONS)[number]

export const DATA_PAGE_IDS = [
  'sprite',
  'skill',
  'item',
  'enemy',
  'enemy-team',
  'poison',
  'ambience',
  'shop',
  'battlefield',
  'image',
  'music',
  'sound',
  'tileset',
  'stamp',
  'cutscene',
  'entrypoint',
  'vars',
  'events',
  'scripts',
] as const

export type DataPageId = (typeof DATA_PAGE_IDS)[number]
export const PROJECT_PAGE_IDS = ['overview', 'startup', 'entrypoint', 'advanced'] as const
export type ProjectPageId = (typeof PROJECT_PAGE_IDS)[number]
export type EditorWorkspaceKind = 'scene' | 'map' | 'actor' | 'data' | 'project'

export interface EditorSubpageDefinition {
  id: string
  label: string
  icon: string
  kind: EditorWorkspaceKind
  dataPage?: DataPageId
  projectPage?: ProjectPageId
  acceptsObject?: boolean
}

export interface EditorModuleDefinition {
  id: EditorModuleId
  label: string
  icon: string
  defaultSubpage: string
  subpages: readonly EditorSubpageDefinition[]
}

export const EDITOR_MODULES: readonly EditorModuleDefinition[] = [
  {
    id: 'scene',
    label: '场景',
    icon: '📍',
    defaultSubpage: 'workspace',
    subpages: [
      { id: 'workspace', label: '场景编排', icon: '🎬', kind: 'scene', acceptsObject: true },
      { id: 'ambience', label: '氛围', icon: '🌗', kind: 'data', dataPage: 'ambience' },
    ],
  },
  {
    id: 'map',
    label: '地图',
    icon: '🗺️',
    defaultSubpage: 'workspace',
    subpages: [
      { id: 'workspace', label: '地图编辑', icon: '✏️', kind: 'map', acceptsObject: true },
      {
        id: 'tileset',
        label: '瓦片集',
        icon: '🧱',
        kind: 'data',
        dataPage: 'tileset',
        acceptsObject: true,
      },
      {
        id: 'stamp',
        label: '组合库',
        icon: '▦',
        kind: 'data',
        dataPage: 'stamp',
        acceptsObject: true,
      },
    ],
  },
  {
    id: 'story',
    label: '剧情',
    icon: '📜',
    defaultSubpage: 'scripts',
    subpages: [
      {
        id: 'scripts',
        label: '脚本库',
        icon: '↪',
        kind: 'data',
        dataPage: 'scripts',
        acceptsObject: true,
      },
      { id: 'vars', label: '变量', icon: '🚩', kind: 'data', dataPage: 'vars' },
      { id: 'events', label: '指令手册', icon: '📖', kind: 'data', dataPage: 'events' },
    ],
  },
  {
    id: 'actor',
    label: '角色',
    icon: '👥',
    defaultSubpage: 'workspace',
    subpages: [
      { id: 'workspace', label: '角色编辑', icon: '👤', kind: 'actor', acceptsObject: true },
    ],
  },
  {
    id: 'item',
    label: '物品',
    icon: '🎒',
    defaultSubpage: 'item',
    subpages: [
      {
        id: 'item',
        label: '物品',
        icon: '🎒',
        kind: 'data',
        dataPage: 'item',
        acceptsObject: true,
      },
      {
        id: 'shop',
        label: '商店',
        icon: '🏪',
        kind: 'data',
        dataPage: 'shop',
        acceptsObject: true,
      },
    ],
  },
  {
    id: 'battle',
    label: '战斗',
    icon: '⚔️',
    defaultSubpage: 'skill',
    subpages: [
      {
        id: 'skill',
        label: '技能',
        icon: '✨',
        kind: 'data',
        dataPage: 'skill',
        acceptsObject: true,
      },
      {
        id: 'enemy',
        label: '敌人',
        icon: '👹',
        kind: 'data',
        dataPage: 'enemy',
        acceptsObject: true,
      },
      {
        id: 'enemy-team',
        label: '敌队',
        icon: '⚔',
        kind: 'data',
        dataPage: 'enemy-team',
        acceptsObject: true,
      },
      {
        id: 'poison',
        label: '毒',
        icon: '☠️',
        kind: 'data',
        dataPage: 'poison',
        acceptsObject: true,
      },
      {
        id: 'battlefield',
        label: '战场',
        icon: '🏞️',
        kind: 'data',
        dataPage: 'battlefield',
        acceptsObject: true,
      },
    ],
  },
  {
    id: 'asset',
    label: '资源',
    icon: '🗂️',
    defaultSubpage: 'sprite',
    subpages: [
      {
        id: 'sprite',
        label: '精灵库',
        icon: '🖼️',
        kind: 'data',
        dataPage: 'sprite',
        acceptsObject: true,
      },
      {
        id: 'image',
        label: '图像',
        icon: '🌄',
        kind: 'data',
        dataPage: 'image',
        acceptsObject: true,
      },
      {
        id: 'music',
        label: '音乐',
        icon: '🎵',
        kind: 'data',
        dataPage: 'music',
        acceptsObject: true,
      },
      {
        id: 'sound',
        label: '音效',
        icon: '🔊',
        kind: 'data',
        dataPage: 'sound',
        acceptsObject: true,
      },
      {
        id: 'cutscene',
        label: '过场素材',
        icon: '🎞️',
        kind: 'data',
        dataPage: 'cutscene',
        acceptsObject: true,
      },
    ],
  },
  {
    id: 'project',
    label: '工程',
    icon: '🛠️',
    defaultSubpage: 'overview',
    subpages: [
      { id: 'overview', label: '概览', icon: '📌', kind: 'project', projectPage: 'overview' },
      {
        id: 'startup',
        label: '全局资源与启动',
        icon: '🎛️',
        kind: 'project',
        projectPage: 'startup',
      },
      {
        id: 'entrypoint',
        label: '入口与开局',
        icon: '🚪',
        kind: 'project',
        dataPage: 'entrypoint',
        projectPage: 'entrypoint',
        acceptsObject: true,
      },
      { id: 'advanced', label: '问题与高级', icon: '⚠️', kind: 'project', projectPage: 'advanced' },
    ],
  },
]

export interface EditorLocation {
  module: EditorModuleId
  subpage: string
  objectId?: string
  /** 精灵库唯一深链维度；只在 asset/sprite 保留。 */
  domain?: 'world' | 'battle'
  view?: 'definition' | 'asset'
  /** 资源动作或角色工作区的稳定子视图标识，不是显示编号。 */
  actionId?: string
}

export function editorModule(id: EditorModuleId): EditorModuleDefinition {
  return EDITOR_MODULES.find((module) => module.id === id) ?? EDITOR_MODULES[0]!
}

export function editorSubpage(location: EditorLocation): EditorSubpageDefinition {
  const module = editorModule(location.module)
  return module.subpages.find((subpage) => subpage.id === location.subpage) ?? module.subpages[0]!
}

/**
 * 子页切换时是否继续携带对象身份。
 *
 * objectId 是当前子页的选择态，不是模块级选择态；尤其资源的 music、cutscene、sprite
 * 都接受 AssetId，但它们的资源族互斥。只有留在同一子页才可保留对象，否则让目标页选首项。
 */
export function objectIdForSubpageNavigation(
  location: EditorLocation,
  destination: EditorSubpageDefinition,
): string | undefined {
  return location.subpage === destination.id && destination.acceptsObject
    ? location.objectId
    : undefined
}

/** 子页 tab 导航的完整位置；留在精灵库时必须同时保留资源域与定义/二进制视图。 */
export function locationForSubpageNavigation(
  location: EditorLocation,
  destination: EditorSubpageDefinition,
): EditorLocation {
  const objectId = objectIdForSubpageNavigation(location, destination)
  const preserveSpriteLocation =
    location.module === 'asset' && location.subpage === 'sprite' && destination.id === 'sprite'
  const preserveActorSection =
    location.module === 'actor' && location.subpage === 'workspace' && destination.id === 'workspace'
  return {
    module: location.module,
    subpage: destination.id,
    ...(objectId ? { objectId } : {}),
    ...(preserveSpriteLocation && location.domain ? { domain: location.domain } : {}),
    ...(preserveSpriteLocation && location.view ? { view: location.view } : {}),
    ...((preserveSpriteLocation || preserveActorSection) && location.actionId
      ? { actionId: location.actionId }
      : {}),
  }
}

export function editorSubpageForDataPage(page: DataPageId): EditorSubpageDefinition {
  for (const module of EDITOR_MODULES) {
    const subpage = module.subpages.find((candidate) => candidate.dataPage === page)
    if (subpage) return subpage
  }
  throw new Error(`数据页未登记:${page}`)
}

export function defaultEditorLocation(moduleId: EditorModuleId = 'scene'): EditorLocation {
  const module = editorModule(moduleId)
  return { module: module.id, subpage: module.defaultSubpage }
}

export function normalizeEditorLocation(
  input: Partial<EditorLocation> | undefined,
): EditorLocation {
  const moduleId = EDITOR_MODULE_IDS.includes(input?.module as EditorModuleId)
    ? (input?.module as EditorModuleId)
    : 'scene'
  const module = editorModule(moduleId)
  const requestedSubpage =
    moduleId === 'project' && input?.subpage === 'startworld' ? 'entrypoint' : input?.subpage
  const subpage = module.subpages.some((candidate) => candidate.id === requestedSubpage)
    ? (requestedSubpage as string)
    : module.defaultSubpage
  const objectId = typeof input?.objectId === 'string' ? input.objectId.trim() : ''
  const spriteLocation = moduleId === 'asset' && subpage === 'sprite'
  const actorLocation = moduleId === 'actor' && subpage === 'workspace'
  const domain = spriteLocation && input?.domain === 'battle' ? 'battle' : 'world'
  const view = spriteLocation && input?.view === 'asset' ? 'asset' : 'definition'
  const actionId = typeof input?.actionId === 'string' ? input.actionId.trim() : ''
  const actorSection = ACTOR_WORKSPACE_SECTIONS.includes(actionId as ActorWorkspaceSection)
    ? (actionId as ActorWorkspaceSection)
    : undefined
  return {
    module: moduleId,
    subpage,
    ...(objectId ? { objectId } : {}),
    ...(spriteLocation ? { domain, view } : {}),
    ...(spriteLocation && domain === 'world' && view === 'definition' && objectId && actionId
      ? { actionId }
      : {}),
    ...(actorLocation && objectId && actorSection ? { actionId: actorSection } : {}),
  }
}

export function decodeEditorLocation(search: string): EditorLocation {
  const params = new URLSearchParams(search)
  return normalizeEditorLocation({
    module: (params.get('module') as EditorModuleId | null) ?? undefined,
    subpage: params.get('page') ?? undefined,
    objectId: params.get('object') ?? undefined,
    domain: (params.get('domain') as EditorLocation['domain'] | null) ?? undefined,
    view: (params.get('view') as EditorLocation['view'] | null) ?? undefined,
    actionId: params.get('action') ?? undefined,
  })
}

export function editorLocationHref(location: EditorLocation, currentHref: string): string {
  const normalized = normalizeEditorLocation(location)
  const url = new URL(currentHref)
  url.searchParams.set('module', normalized.module)
  url.searchParams.set('page', normalized.subpage)
  if (normalized.objectId) url.searchParams.set('object', normalized.objectId)
  else url.searchParams.delete('object')
  if (normalized.domain) url.searchParams.set('domain', normalized.domain)
  else url.searchParams.delete('domain')
  if (normalized.view) url.searchParams.set('view', normalized.view)
  else url.searchParams.delete('view')
  if (normalized.actionId) url.searchParams.set('action', normalized.actionId)
  else url.searchParams.delete('action')
  return `${url.pathname}${url.search}${url.hash}`
}

export function sameEditorLocation(left: EditorLocation, right: EditorLocation): boolean {
  const normalizedLeft = normalizeEditorLocation(left)
  const normalizedRight = normalizeEditorLocation(right)
  return (
    normalizedLeft.module === normalizedRight.module &&
    normalizedLeft.subpage === normalizedRight.subpage &&
    normalizedLeft.objectId === normalizedRight.objectId &&
    normalizedLeft.domain === normalizedRight.domain &&
    normalizedLeft.view === normalizedRight.view &&
    normalizedLeft.actionId === normalizedRight.actionId
  )
}

export const editorLinks = {
  scene: (sceneId: string): EditorLocation => ({
    module: 'scene',
    subpage: 'workspace',
    objectId: sceneId,
  }),
  map: (mapId: string): EditorLocation => ({
    module: 'map',
    subpage: 'workspace',
    objectId: mapId,
  }),
  stamp: (stampId?: string): EditorLocation => ({
    module: 'map',
    subpage: 'stamp',
    ...(stampId ? { objectId: stampId } : {}),
  }),
  tileset: (tilesetId: string): EditorLocation => ({
    module: 'map',
    subpage: 'tileset',
    objectId: tilesetId,
  }),
  actor: (actorId: string, section?: ActorWorkspaceSection): EditorLocation => ({
    module: 'actor',
    subpage: 'workspace',
    objectId: actorId,
    ...(section ? { actionId: section } : {}),
  }),
  actorSprite: (spriteId: string): EditorLocation => ({
    module: 'asset',
    subpage: 'sprite',
    objectId: spriteId,
    domain: 'world',
    view: 'definition',
  }),
  worldSpriteAction: (spriteId: string, actionId: string): EditorLocation => ({
    module: 'asset',
    subpage: 'sprite',
    objectId: spriteId,
    domain: 'world',
    view: 'definition',
    actionId,
  }),
  battleSpriteDefinition: (definitionId: string): EditorLocation => ({
    module: 'asset',
    subpage: 'sprite',
    objectId: definitionId,
    domain: 'battle',
    view: 'definition',
  }),
  battleSpriteAsset: (assetId: string): EditorLocation => ({
    module: 'asset',
    subpage: 'sprite',
    objectId: assetId,
    domain: 'battle',
    view: 'asset',
  }),
  battleSprite: (definitionId: string): EditorLocation => ({
    module: 'asset',
    subpage: 'sprite',
    objectId: definitionId,
    domain: 'battle',
    view: 'definition',
  }),
  item: (itemId: string): EditorLocation => ({
    module: 'item',
    subpage: 'item',
    objectId: itemId,
  }),
  skill: (skillId: string): EditorLocation => ({
    module: 'battle',
    subpage: 'skill',
    objectId: skillId,
  }),
  enemy: (enemyId: string): EditorLocation => ({
    module: 'battle',
    subpage: 'enemy',
    objectId: enemyId,
  }),
  enemyTeam: (enemyTeamId: string): EditorLocation => ({
    module: 'battle',
    subpage: 'enemy-team',
    objectId: enemyTeamId,
  }),
  poison: (poisonId: number): EditorLocation => ({
    module: 'battle',
    subpage: 'poison',
    objectId: String(poisonId),
  }),
  battleField: (fieldId: number): EditorLocation => ({
    module: 'battle',
    subpage: 'battlefield',
    objectId: String(fieldId),
  }),
  shop: (shopId: number): EditorLocation => ({
    module: 'item',
    subpage: 'shop',
    objectId: String(shopId),
  }),
  sound: (assetId: string): EditorLocation => ({
    module: 'asset',
    subpage: 'sound',
    objectId: assetId,
  }),
  image: (assetId: string): EditorLocation => ({
    module: 'asset',
    subpage: 'image',
    objectId: assetId,
  }),
  sharedScript: (scriptId: string): EditorLocation => ({
    module: 'story',
    subpage: 'scripts',
    objectId: scriptId,
  }),
  project: (page: ProjectPageId = 'overview', objectId?: string): EditorLocation => ({
    module: 'project',
    subpage: page,
    ...(objectId ? { objectId } : {}),
  }),
  entryPoint: (entryPointId?: string): EditorLocation => ({
    module: 'project',
    subpage: 'entrypoint',
    ...(entryPointId ? { objectId: entryPointId } : {}),
  }),
}
