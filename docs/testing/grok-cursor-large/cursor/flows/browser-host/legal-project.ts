/** 浏览器宿主合法 blank 装载（无 vitest 依赖）。 */
import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { memoryAuthorDirectory } from '../../../../../../packages/editor/src/core/__tests__/author-save-fixture.js'
import type { EditorState } from '../../../../../../packages/editor/src/core/edit-session.js'
import { EditSession } from '../../../../../../packages/editor/src/core/edit-session.js'
import { createEditorAssetReader } from '../../../../../../packages/editor/src/core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../../../../../../packages/editor/src/core/project-diagnostics.js'
import { toEditorState } from '../../../../../../packages/editor/src/core/project-io.js'
import { buildBlankProject } from '../../../../../../packages/editor/src/core/seed.js'

export interface LegalProject {
  source: FileSource
  state: EditorState
  assetBase: import('@type-pal/reforge').AssetBase
  disk: ReturnType<typeof memoryAuthorDirectory>
}

export async function loadLegalProject(name = 'cursor-flow-host'): Promise<LegalProject> {
  const disk = memoryAuthorDirectory(await buildBlankProject(name))
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { source, state, assetBase: project.assetBase, disk }
}

export async function openFlowSession(name: string) {
  const legal = await loadLegalProject(name)
  const session = new EditSession(legal.state)
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  return { legal, session, reader }
}
