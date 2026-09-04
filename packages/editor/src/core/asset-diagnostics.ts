import {
  type AssetCatalogV1,
  type AssetClosureIssue,
  type AssetId,
  type AssetKind,
  type AssetReferenceOrigin,
  type AssetRecordV1,
  type LocatedAssetReference,
  validateAssetReferenceClosure,
} from '@type-pal/content'

export const EDITOR_ASSET_KIND_LABELS = {
  music: '音乐',
  sound: '音效',
  soundfont: '音色库',
  tileset: '瓦片集',
  sprite: '场景精灵',
  'battle-sprite': '战斗精灵',
  'effect-sprite': '特效精灵',
  portrait: '角色立绘',
  face: '战斗头像',
  'item-icon': '物品图标',
  'battle-background': '战斗背景',
  video: '视频',
  'frame-animation': '帧动画',
  'color-table': '色表',
} as const satisfies Record<AssetKind, string>

/** 资源目录的可读标题；稳定 AssetId 由目录行的 meta 槽单独承载。 */
export function editorAssetCatalogTitle(
  record: Pick<AssetRecordV1, 'kind' | 'label'>,
  fallbackLabel?: string,
): string {
  for (const candidate of [record.label, fallbackLabel]) {
    const label = candidate?.trim()
    if (label) return label
  }
  return `未命名${EDITOR_ASSET_KIND_LABELS[record.kind]}`
}

export interface EditorAssetDiagnostic extends AssetClosureIssue {
  assetId?: AssetId
  assetLabel?: string
  expectedKind?: AssetKind
  actualKind?: AssetKind
  origin?: AssetReferenceOrigin
  /** 作者界面使用的中文单句；稳定 code/where 仍保留用于分类、去重和定位。 */
  title: string
}

function assetIdentity(
  assetId: AssetId,
  label: string | undefined,
  kind: AssetKind | undefined,
): string {
  const normalizedLabel = label?.trim()
  if (normalizedLabel) return `${normalizedLabel}（ID：${assetId}）`
  const kindLabel = kind ? `${EDITOR_ASSET_KIND_LABELS[kind]}资源` : '资源'
  return `${kindLabel} ID “${assetId}”`
}

function diagnosticTitle(
  issue: AssetClosureIssue,
  assetId: AssetId | undefined,
  label: string | undefined,
  expectedKind: AssetKind | undefined,
  actualKind: AssetKind | undefined,
): string {
  if (!assetId) {
    if (issue.code === 'kind-mismatch') return '资源类型与使用位置不匹配'
    if (issue.code === 'unused-asset') return '资源当前未被使用'
    return '引用的资源不存在'
  }
  const identity = assetIdentity(assetId, label, actualKind ?? expectedKind)
  if (issue.code === 'unused-asset') return `${identity}当前未被使用`
  if (issue.code === 'kind-mismatch') {
    const expected = expectedKind ? EDITOR_ASSET_KIND_LABELS[expectedKind] : '未知类型'
    const actual = actualKind ? EDITOR_ASSET_KIND_LABELS[actualKind] : '未知类型'
    return `${identity}的类型应为“${expected}”，实际为“${actual}”`
  }
  return `${identity}不存在`
}

/**
 * 把 content 的机器诊断投影成编辑器作者可读诊断。
 * 不解析 message；引用主体来自结构化 reference，未使用资源由 catalog 的精确 where 反查。
 */
export function collectEditorAssetDiagnostics(
  catalog: AssetCatalogV1,
  references: readonly LocatedAssetReference[],
): EditorAssetDiagnostic[] {
  const referenceByWhere = new Map(references.map((reference) => [reference.where, reference]))
  const unusedAssetByWhere = new Map(
    Object.keys(catalog.assets).map((id) => [`assets[${JSON.stringify(id)}]`, id as AssetId]),
  )
  return validateAssetReferenceClosure(catalog, references).map((issue) => {
    const reference = referenceByWhere.get(issue.where)
    const assetId = reference?.asset ?? unusedAssetByWhere.get(issue.where)
    const record = assetId ? catalog.assets[assetId] : undefined
    const expectedKind = reference?.expectedKind
    const actualKind = record?.kind
    return {
      ...issue,
      ...(assetId ? { assetId } : {}),
      ...(record?.label ? { assetLabel: record.label } : {}),
      ...(expectedKind ? { expectedKind } : {}),
      ...(actualKind ? { actualKind } : {}),
      ...(reference ? { origin: reference.origin } : {}),
      title: diagnosticTitle(issue, assetId, record?.label, expectedKind, actualKind),
    }
  })
}
