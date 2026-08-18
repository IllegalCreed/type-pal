/** Product runtime accepts exactly the current canonical content epoch. */
import { type FileSource, httpSource } from './file-source.js'
import { type LoadedProjectV16, loadProjectV16From } from './loader-v16.js'

export type RunnableProject = LoadedProjectV16

interface ManifestVersionProbe {
  id?: unknown
  contentVersion?: unknown
}

export async function loadRunnableProjectFrom(source: FileSource): Promise<RunnableProject> {
  const manifest = await source.readJson<ManifestVersionProbe>('manifest.json')
  if (manifest.contentVersion === 16) return loadProjectV16From(source)
  const project = typeof manifest.id === 'string' ? `工程 "${manifest.id}"` : '工程'
  throw new Error(
    `${project}: runtime 只接受当前 contentVersion 16，收到 ${String(manifest.contentVersion)}`,
  )
}

export function loadRunnableProject(projectId: string): Promise<RunnableProject> {
  return loadRunnableProjectFrom(httpSource(`projects/${projectId}`))
}
