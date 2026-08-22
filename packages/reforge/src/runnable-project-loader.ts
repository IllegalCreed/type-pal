/** Product runtime accepts exactly the current canonical content epoch. */
import { CONTENT_VERSION } from '@type-pal/content'
import { type FileSource, httpSource } from './file-source.js'
import { type LoadedCurrentProject, loadCurrentProjectFrom } from './project-loader.js'

export type RunnableProject = LoadedCurrentProject

interface ManifestVersionProbe {
  id?: unknown
  contentVersion?: unknown
}

export async function loadRunnableProjectFrom(source: FileSource): Promise<RunnableProject> {
  const manifest = await source.readJson<ManifestVersionProbe>('manifest.json')
  if (manifest.contentVersion === CONTENT_VERSION) return loadCurrentProjectFrom(source)
  const project = typeof manifest.id === 'string' ? `工程 "${manifest.id}"` : '工程'
  throw new Error(
    `${project}: runtime 只接受当前 contentVersion ${CONTENT_VERSION}，收到 ${String(manifest.contentVersion)}`,
  )
}

export function loadRunnableProject(projectId: string): Promise<RunnableProject> {
  return loadRunnableProjectFrom(httpSource(`projects/${projectId}`))
}
