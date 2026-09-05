import { readdir, readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

export async function assertRegularNonEmptyFile(root, relativePath) {
  const path = resolve(root, relativePath)
  let info
  try {
    info = await stat(path)
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      throw new Error(`${relativePath}: 文件不存在`)
    throw error
  }
  if (!info.isFile()) throw new Error(`${relativePath}: 不是 regular file`)
  if (info.size <= 0) throw new Error(`${relativePath}: 文件为空`)
  return path
}

export async function readRequiredJson(root, relativePath) {
  const path = await assertRegularNonEmptyFile(root, relativePath)
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    throw new Error(
      `${relativePath}: JSON 无法解析（${error instanceof Error ? error.message : String(error)}）`,
    )
  }
}

export async function assertDirectoryFileCount(root, requirement) {
  const path = resolve(root, requirement.path)
  let entries
  try {
    entries = await readdir(path, { withFileTypes: true })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
      throw new Error(`${requirement.path}: 目录不存在`)
    throw error
  }
  const count = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(requirement.extension),
  ).length
  if (count < requirement.minimumFiles)
    throw new Error(
      `${requirement.path}: ${requirement.extension} 文件只有 ${count}，至少需要 ${requirement.minimumFiles}`,
    )
  return count
}

export function assertFullJsonContracts(json) {
  const assetManifest = json.get('data/extracted/asset-manifest.json')
  if (
    !assetManifest ||
    typeof assetManifest.version !== 'string' ||
    !assetManifest.version ||
    !Number.isSafeInteger(assetManifest.fileCount) ||
    assetManifest.fileCount <= 0 ||
    !Array.isArray(assetManifest.files) ||
    assetManifest.files.length !== assetManifest.fileCount
  )
    throw new Error('data/extracted/asset-manifest.json: version/fileCount/files 闭包非法')
  const events = json.get('data/extracted/events/all.json')
  if (!events || !Array.isArray(events.segments) || events.segments.length === 0)
    throw new Error('data/extracted/events/all.json: segments 为空或非法')
  const roles = json.get('data/extracted/data/player-roles.json')
  if (!roles || !Array.isArray(roles.roles) || roles.roles.length < 6)
    throw new Error('data/extracted/data/player-roles.json: roles 少于 6 或非法')
  for (const sceneId of [0, 1, 14, 17]) {
    const scene = json.get(`data/extracted/data/scene/${sceneId}.json`)
    if (!scene || scene.sceneId !== sceneId)
      throw new Error(`data/extracted/data/scene/${sceneId}.json: sceneId 不匹配`)
  }
  const manifest = json.get('projects/pal/manifest.json')
  if (
    !manifest ||
    manifest.id !== 'pal' ||
    manifest.contentVersion !== 20 ||
    manifest.minimumSaveVersion !== 8
  )
    throw new Error('projects/pal/manifest.json: 不是当前 pal/content20/SAVE8 工程')
  const baseline = json.get('packages/migrate/baselines/pal/_state.json')
  if (
    !baseline ||
    baseline.version !== 1 ||
    !Array.isArray(baseline.managedFiles) ||
    baseline.managedFiles.length === 0 ||
    !baseline.files ||
    typeof baseline.files !== 'object'
  )
    throw new Error('packages/migrate/baselines/pal/_state.json: baseline state 非法')
}
