/** Complete loader-built current project; mutations are applied only after this baseline passes. */
import { validateProjectMap } from '@type-pal/content'
import { loadCurrentProjectFrom } from '@type-pal/reforge'
import {
  battleTrialProjectFiles,
  fixtureSource,
} from '../../core/__tests__/battle-trial-project.js'
import { toEditorState } from '../../core/project-io.js'
import type { ScriptEditorState } from '../../core/script-editor.js'

export async function referenceProject() {
  const source = fixtureSource(await battleTrialProjectFiles())
  const project = await loadCurrentProjectFrom(source)
  const maps = Object.fromEntries(
    await Promise.all(
      project.mapIndex.maps.map(
        async ({ id, path }) => [id, validateProjectMap(await source.readJson(path))] as const,
      ),
    ),
  )
  const state = toEditorState(project, [project.authorContent.entryScene], maps, {}, [])
  const canonical: ScriptEditorState = {
    scenes: [structuredClone(project.authorContent.entryScene)],
    items: structuredClone(project.authorContent.items),
    sharedScripts: structuredClone(project.authorContent.sharedScripts),
  }
  return { state, canonical, source, project }
}
