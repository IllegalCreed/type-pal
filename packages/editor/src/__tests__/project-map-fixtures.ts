import type { ProjectMap } from '@type-pal/content'
import { loadProjectMapById } from '@type-pal/reforge/author-io'

/** Populate the map bodies needed by an editor state fixture through the author IO entry. */
export async function loadFixtureProjectMaps(
  project: Parameters<typeof loadProjectMapById>[0],
): Promise<Record<string, ProjectMap>> {
  const entries = await Promise.all(
    project.mapIndex.maps.map(
      async ({ id }) => [id, await loadProjectMapById(project, id)] as const,
    ),
  )
  return Object.fromEntries(entries)
}
