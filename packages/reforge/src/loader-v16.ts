/** content16 canonical loader: content15 author model plus required world variable definitions. */
import type {
  ManifestV16,
  ProjectMap,
  SceneDefV14,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import { validateWorldVariableRegistryV1 } from '@type-pal/content'
import type { FileSource } from './file-source.js'
import { httpSource } from './file-source.js'
import {
  type LoadedProjectV14,
  loadAllAuthorScenesV14,
  loadAllProjectMapsV14,
  loadAllScenesV14,
  loadProjectV14From,
  loadSceneDefV14,
  loadStampTemplatesV14,
} from './loader-v14.js'

export interface LoadedProjectV16 extends Omit<LoadedProjectV14, 'manifest'> {
  manifest: ManifestV16
  worldVariables: WorldVariableRegistryV1
}

function v14CoreSource(source: FileSource, manifest: ManifestV16): FileSource {
  return {
    ...source,
    readJson: async <T>(path: string): Promise<T> => {
      if (path === 'manifest.json') return { ...manifest, contentVersion: 14 } as T
      return source.readJson<T>(path)
    },
  }
}

export async function loadProjectV16From(source: FileSource): Promise<LoadedProjectV16> {
  const manifest = await source.readJson<ManifestV16>('manifest.json')
  if (manifest.contentVersion !== 16)
    throw new Error(`工程 "${manifest.id}": canonical loader 只接受 contentVersion 16`)
  if (manifest.minimumSaveVersion !== 8)
    throw new Error(`工程 "${manifest.id}": contentVersion 16 期望 minimumSaveVersion 8`)
  const registryPath = manifest.content.worldVariables
  if (!registryPath) throw new Error(`工程 "${manifest.id}": manifest 缺 worldVariables 注册表路径`)
  const [loaded, rawWorldVariables] = await Promise.all([
    loadProjectV14From(v14CoreSource(source, manifest)),
    source.readJson(registryPath),
  ])
  return {
    ...loaded,
    manifest,
    source,
    worldVariables: validateWorldVariableRegistryV1(rawWorldVariables),
  }
}

export function loadProjectV16(projectId: string): Promise<LoadedProjectV16> {
  return loadProjectV16From(httpSource(`projects/${projectId}`))
}

export function loadAllAuthorScenesV16(project: LoadedProjectV16): Promise<SceneDefV14[]> {
  return loadAllAuthorScenesV14(project as unknown as LoadedProjectV14)
}

export function loadSceneDefV16(project: LoadedProjectV16, sceneId: string) {
  return loadSceneDefV14(project as unknown as LoadedProjectV14, sceneId)
}

export function loadAllScenesV16(project: LoadedProjectV16) {
  return loadAllScenesV14(project as unknown as LoadedProjectV14)
}

export function loadStampTemplatesV16(project: LoadedProjectV16) {
  return loadStampTemplatesV14(project as unknown as LoadedProjectV14)
}

export function loadAllProjectMapsV16(
  project: LoadedProjectV16,
): Promise<Record<string, ProjectMap>> {
  return loadAllProjectMapsV14(project as unknown as LoadedProjectV14)
}
