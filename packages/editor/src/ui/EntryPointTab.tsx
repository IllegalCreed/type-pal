/**
 * 旧数据页入口的兼容适配器。
 * 工程模块实际由 ProjectWorkbenchTab 负责；保留这个导出让历史调用方平滑迁移，
 * 不再维护第二份入口点编辑器。
 */
import type {
  ActorDef,
  AssetCatalogV1,
  ItemData,
  LoadedManifest,
  Locale,
  SceneDef,
  SkillData,
} from '@type-pal/content'
import type { ReactNode } from 'react'
import type { EditSession } from '../core/edit-session.js'
import { ProjectWorkbenchTab } from './ProjectWorkbenchTab.js'

export function EntryPointTab(props: {
  manifest: LoadedManifest
  scenes: SceneDef[]
  actors: ActorDef[]
  items: ItemData[]
  skills: SkillData[]
  locale: Locale
  assetCatalog: AssetCatalogV1
  session: EditSession
  tabBar?: ReactNode
}) {
  return <ProjectWorkbenchTab page="entrypoint" {...props} editorState={props.session.getState()} />
}
