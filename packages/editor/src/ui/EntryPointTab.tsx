/** 入口与开局页的薄封装；编辑能力统一由 ProjectWorkbenchTab 提供。 */
import type {
  ActorDef,
  AssetCatalogV1,
  ItemData,
  Locale,
  SceneDef,
  SkillData,
} from '@type-pal/content'
import type { ReactNode } from 'react'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ManifestLike } from '../core/project-diagnostics.js'
import { ProjectWorkbenchTab } from './ProjectWorkbenchTab.js'

export function EntryPointTab(props: {
  manifest: ManifestLike
  scenes: SceneDef[]
  actors: ActorDef[]
  items: ItemData[]
  skills: SkillData[]
  locale: Locale
  assetCatalog: AssetCatalogV1
  session: EditSession
  assetReader: EditorAssetReader
  tabBar?: ReactNode
}) {
  return <ProjectWorkbenchTab page="entrypoint" {...props} editorState={props.session.getState()} />
}
