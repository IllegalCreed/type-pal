/** content15 canonical loader: stable enemy-team ids plus the existing dialogue identity model. */
import type { ManifestV15, ProjectMap, SceneDefV14 } from '@type-pal/content'
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

export interface LoadedProjectV15 extends Omit<LoadedProjectV14, 'manifest'> {
  manifest: ManifestV15
}

function v14CoreSource(source: FileSource, manifest: ManifestV15): FileSource {
  return {
    ...source,
    readJson: async <T>(path: string): Promise<T> => {
      if (path === 'manifest.json') return { ...manifest, contentVersion: 14 } as T
      return source.readJson<T>(path)
    },
  }
}

export async function loadProjectV15From(source: FileSource): Promise<LoadedProjectV15> {
  const manifest = await source.readJson<ManifestV15>('manifest.json')
  if (manifest.contentVersion !== 15)
    throw new Error(`工程 "${manifest.id}": canonical loader 只接受 contentVersion 15`)
  if (manifest.minimumSaveVersion !== 8)
    throw new Error(`工程 "${manifest.id}": contentVersion 15 期望 minimumSaveVersion 8`)
  const loaded = await loadProjectV14From(v14CoreSource(source, manifest))
  return { ...loaded, manifest, source }
}

export function loadProjectV15(projectId: string): Promise<LoadedProjectV15> {
  return loadProjectV15From(httpSource(`projects/${projectId}`))
}

export function loadAllAuthorScenesV15(project: LoadedProjectV15): Promise<SceneDefV14[]> {
  return loadAllAuthorScenesV14(project as unknown as LoadedProjectV14)
}

export function loadSceneDefV15(project: LoadedProjectV15, sceneId: string) {
  return loadSceneDefV14(project as unknown as LoadedProjectV14, sceneId)
}

export function loadAllScenesV15(project: LoadedProjectV15) {
  return loadAllScenesV14(project as unknown as LoadedProjectV14)
}

export function loadStampTemplatesV15(project: LoadedProjectV15) {
  return loadStampTemplatesV14(project as unknown as LoadedProjectV14)
}

export function loadAllProjectMapsV15(
  project: LoadedProjectV15,
): Promise<Record<string, ProjectMap>> {
  return loadAllProjectMapsV14(project as unknown as LoadedProjectV14)
}
