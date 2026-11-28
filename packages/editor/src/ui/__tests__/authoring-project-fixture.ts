import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { loadFixtureProjectMaps } from '../../__tests__/project-map-fixtures.js'
import { memoryAuthorDirectory } from '../../core/__tests__/author-save-fixture.js'
import type { EditorState } from '../../core/edit-session.js'
import { assertProjectSaveValid } from '../../core/project-diagnostics.js'
import { toEditorState } from '../../core/project-io.js'
import { buildBlankProject } from '../../core/seed.js'

export interface LegalProject {
  source: FileSource
  state: EditorState
  /** 正式 AssetBase（source + assetResolver），供组件真实资产准备边界使用。 */
  assetBase: import('@type-pal/reforge').AssetBase
}

/**
 * 正式 blank 项目装载器：seed→memory 目录→loader→全量场景与地图正文→toEditorState，
 * 并经 assertProjectSaveValid 自证可通过当前保存门。测试文件需在 beforeEach
 * 自行 `vi.stubGlobal('Blob', NodeBlob)` 与 `vi.stubGlobal('crypto', webcrypto)`
 * （jsdom 环境缺 CompressionStream/Response 所需的 Node Blob.stream）。
 */
export async function loadLegalUiProject(name = 'editor-ui-fixture'): Promise<LegalProject> {
  const disk = memoryAuthorDirectory(await buildBlankProject(name))
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadFixtureProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { source, state, assetBase: project.assetBase }
}
