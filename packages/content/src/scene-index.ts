/** 工程场景目录。场景稳定身份、作者显示名与 JSON 路径严格分离。 */
export interface SceneAssetDefV1 {
  id: string
  name: string
  path: string
}

export interface SceneIndexV1 {
  version: 1
  scenes: SceneAssetDefV1[]
}

export const SCENE_INDEX_PATH = 'content/scenes/index.json'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 作者态稳定 SceneId；显示名与文件路径不得充当身份。 */
export function isSceneId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)
}

/** 工程相对场景 JSON 路径；绝对路径、反斜杠和 `..` 一律 fail-loud。 */
export function normalizeSceneAssetPath(value: string): string {
  const input = value.trim()
  if (!input || input.startsWith('/') || input.includes('\\') || /^[a-zA-Z]+:/.test(input))
    throw new Error(`scene path: 期望工程相对路径，收到 "${value}"`)
  const parts: string[] = []
  for (const part of input.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') throw new Error(`scene path: 禁止 ".."（${value}）`)
    parts.push(part)
  }
  const normalized = parts.join('/')
  if (!normalized.endsWith('.json')) throw new Error(`scene path: 必须指向 .json（${value}）`)
  return normalized
}

export function validateSceneIndex(
  value: unknown,
  indexPath = SCENE_INDEX_PATH,
): SceneIndexV1 {
  if (!isRecord(value)) throw new Error('sceneIndex: 期望对象')
  if (value.version !== 1)
    throw new Error(`sceneIndex.version: 仅支持 1，收到 ${String(value.version)}`)
  if (!Array.isArray(value.scenes)) throw new Error('sceneIndex.scenes: 期望数组')
  const normalizedIndexPath = normalizeSceneAssetPath(indexPath)
  const ids = new Set<string>()
  const paths = new Set<string>()
  const scenes = value.scenes.map((raw, index): SceneAssetDefV1 => {
    const where = `sceneIndex.scenes[${index}]`
    if (!isRecord(raw)) throw new Error(`${where}: 期望对象`)
    if (!isSceneId(raw.id)) throw new Error(`${where}.id: 非法稳定 id "${String(raw.id)}"`)
    if (ids.has(raw.id)) throw new Error(`${where}.id: 重复 "${raw.id}"`)
    ids.add(raw.id)
    if (typeof raw.name !== 'string' || !raw.name.trim())
      throw new Error(`${where}.name: 期望非空字符串`)
    if (typeof raw.path !== 'string') throw new Error(`${where}.path: 期望字符串`)
    const path = normalizeSceneAssetPath(raw.path)
    if (path === normalizedIndexPath) throw new Error(`${where}.path: 不得覆盖 scene index 自身`)
    if (paths.has(path)) throw new Error(`${where}.path: 规范化后重复 "${path}"`)
    paths.add(path)
    return { id: raw.id, name: raw.name.trim(), path }
  })
  return { version: 1, scenes }
}

export function sceneAssetById(index: SceneIndexV1, id: string): SceneAssetDefV1 | undefined {
  return index.scenes.find((asset) => asset.id === id)
}

function authorSceneIdBase(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '') || 'scene'
  )
}

/** 同时避开稳定 id 与默认 JSON path 冲突，供新建/复制场景入口共用。 */
export function nextSceneAssetIdentity(
  index: SceneIndexV1,
  preferred: string,
  directory = 'content/scenes/',
): Pick<SceneAssetDefV1, 'id' | 'path'> {
  const ids = new Set(index.scenes.map((asset) => asset.id))
  const paths = new Set(index.scenes.map((asset) => normalizeSceneAssetPath(asset.path)))
  const dir = directory.replace(/\/?$/, '/')
  const base = authorSceneIdBase(preferred)
  let suffix = 1
  for (;;) {
    const id = suffix === 1 ? base : `${base}-${suffix}`
    const path = normalizeSceneAssetPath(`${dir}${id}.json`)
    if (!ids.has(id) && !paths.has(path)) return { id, path }
    suffix += 1
  }
}
