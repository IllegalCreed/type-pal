import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import type { EditorState } from '../edit-session.js'
import { toEditorState } from '../project-io.js'
import { buildBlankProject } from '../seed.js'
import { memoryAuthorDirectory } from './author-save-fixture.js'

export async function loadBoundaryProject(name = 'command-boundary'): Promise<{
  source: FileSource
  state: EditorState
}> {
  const disk = memoryAuthorDirectory(await buildBlankProject(name))
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  return { source, state: toEditorState(project, scenes, {}, {}, []) }
}
