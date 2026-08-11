/** Explicit runtime loader dispatch for the two canonical epochs supported by main.ts. */
import { type FileSource, httpSource } from './file-source.js'
import { type LoadedProjectV5, loadProjectV5From } from './loader-v5.js'
import { type LoadedProjectV13, loadProjectV13From } from './loader-v13.js'

export type RunnableProject = LoadedProjectV5 | LoadedProjectV13

interface ManifestVersionProbe {
  id?: unknown
  contentVersion?: unknown
}

export async function loadRunnableProjectFrom(source: FileSource): Promise<RunnableProject> {
  const manifest = await source.readJson<ManifestVersionProbe>('manifest.json')
  if (manifest.contentVersion === 13) return loadProjectV13From(source)
  if (manifest.contentVersion === 12) return loadProjectV5From(source)
  const project = typeof manifest.id === 'string' ? `工程 "${manifest.id}"` : '工程'
  throw new Error(
    `${project}: runtime 只接受 contentVersion 12 或 13，收到 ${String(manifest.contentVersion)}`,
  )
}

export function loadRunnableProject(projectId: string): Promise<RunnableProject> {
  return loadRunnableProjectFrom(httpSource(`projects/${projectId}`))
}
