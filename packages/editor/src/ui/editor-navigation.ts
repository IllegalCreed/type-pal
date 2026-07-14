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

export const DATA_PAGE_IDS = [
  'sprite',
  'skill',
  'item',
  'enemy',
  'poison',
  'ambience',
  'shop',
  'battlefield',
  'music',
  'tileset',
  'cutscene',
  'entrypoint',
  'vars',
  'events',
  'scripts',
] as const

export type DataPageId = (typeof DATA_PAGE_IDS)[number]
export type EditorWorkspaceKind = 'scene' | 'map' | 'actor' | 'data'

export interface EditorSubpageDefinition {
  id: string
  label: string
  icon: string
  kind: EditorWorkspaceKind
  dataPage?: DataPageId
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
      { id: 'tileset', label: '瓦片集', icon: '🧱', kind: 'data', dataPage: 'tileset' },
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
        label: '共享脚本',
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
      { id: 'item', label: '物品', icon: '🎒', kind: 'data', dataPage: 'item' },
      { id: 'shop', label: '商店', icon: '🏪', kind: 'data', dataPage: 'shop' },
    ],
  },
  {
    id: 'battle',
    label: '战斗',
    icon: '⚔️',
    defaultSubpage: 'skill',
    subpages: [
      { id: 'skill', label: '技能', icon: '✨', kind: 'data', dataPage: 'skill' },
      { id: 'enemy', label: '敌人', icon: '👹', kind: 'data', dataPage: 'enemy' },
      { id: 'poison', label: '毒', icon: '☠️', kind: 'data', dataPage: 'poison' },
      {
        id: 'battlefield',
        label: '战场',
        icon: '🏞️',
        kind: 'data',
        dataPage: 'battlefield',
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
      { id: 'music', label: '音乐', icon: '🎵', kind: 'data', dataPage: 'music' },
      { id: 'cutscene', label: '过场素材', icon: '🎞️', kind: 'data', dataPage: 'cutscene' },
    ],
  },
  {
    id: 'project',
    label: '工程',
    icon: '🛠️',
    defaultSubpage: 'entrypoint',
    subpages: [
      { id: 'entrypoint', label: '入口点', icon: '🚪', kind: 'data', dataPage: 'entrypoint' },
    ],
  },
]

export interface EditorLocation {
  module: EditorModuleId
  subpage: string
  objectId?: string
}

export function editorModule(id: EditorModuleId): EditorModuleDefinition {
  return EDITOR_MODULES.find((module) => module.id === id) ?? EDITOR_MODULES[0]!
}

export function editorSubpage(location: EditorLocation): EditorSubpageDefinition {
  const module = editorModule(location.module)
  return module.subpages.find((subpage) => subpage.id === location.subpage) ?? module.subpages[0]!
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
  const subpage = module.subpages.some((candidate) => candidate.id === input?.subpage)
    ? (input?.subpage as string)
    : module.defaultSubpage
  const objectId = typeof input?.objectId === 'string' ? input.objectId.trim() : ''
  return { module: moduleId, subpage, ...(objectId ? { objectId } : {}) }
}

export function decodeEditorLocation(search: string): EditorLocation {
  const params = new URLSearchParams(search)
  return normalizeEditorLocation({
    module: (params.get('module') as EditorModuleId | null) ?? undefined,
    subpage: params.get('page') ?? undefined,
    objectId: params.get('object') ?? undefined,
  })
}

export function editorLocationHref(location: EditorLocation, currentHref: string): string {
  const normalized = normalizeEditorLocation(location)
  const url = new URL(currentHref)
  url.searchParams.set('module', normalized.module)
  url.searchParams.set('page', normalized.subpage)
  if (normalized.objectId) url.searchParams.set('object', normalized.objectId)
  else url.searchParams.delete('object')
  return `${url.pathname}${url.search}${url.hash}`
}

export function sameEditorLocation(left: EditorLocation, right: EditorLocation): boolean {
  return (
    left.module === right.module &&
    left.subpage === right.subpage &&
    left.objectId === right.objectId
  )
}

export const editorLinks = {
  scene: (sceneId: string): EditorLocation => ({
    module: 'scene',
    subpage: 'workspace',
    objectId: sceneId,
  }),
  sceneMap: (sceneId: string): EditorLocation => ({
    module: 'map',
    subpage: 'workspace',
    objectId: sceneId,
  }),
  actor: (actorId: string): EditorLocation => ({
    module: 'actor',
    subpage: 'workspace',
    objectId: actorId,
  }),
  actorSprite: (spriteId: string): EditorLocation => ({
    module: 'asset',
    subpage: 'sprite',
    objectId: spriteId,
  }),
  sharedScript: (scriptId: string): EditorLocation => ({
    module: 'story',
    subpage: 'scripts',
    objectId: scriptId,
  }),
}
