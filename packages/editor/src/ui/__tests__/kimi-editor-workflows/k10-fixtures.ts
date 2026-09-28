/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K10 夹具：物品页合法项目装载器。
 * blank seed + 作者物品/毒种/共享脚本覆盖 → memory 目录 → 真实 loader →
 * 生产装配（toEditorState + projectEditorItemShells 壳投影 + main.tsx 同构的
 * canonical ScriptEditSession + EditorHistoryCoordinator）→ assertProjectSaveValid 自证。
 * 只被本卡 K10 新测试导入，不被生产引用；不含任何替身，全部走生产构造器。
 */

import type { FileSource } from '@type-pal/reforge'
import {
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { memoryAuthorDirectory } from '../../../core/__tests__/author-save-fixture.js'
import { type EditorState, EditSession } from '../../../core/edit-session.js'
import { EditorHistoryCoordinator } from '../../../core/editor-history-coordinator.js'
import { assertProjectSaveValid } from '../../../core/project-diagnostics.js'
import { toEditorState } from '../../../core/project-io.js'
import { type ScriptEditorState, ScriptEditSession } from '../../../core/script-editor.js'
import {
  mergeEditorProjectionWithCurrentAuthorState,
  projectEditorItemShells,
} from '../../../core/script-editor-projection.js'
import { buildBlankProject } from '../../../core/seed.js'

export interface K10ItemRig {
  /** blank seed 文件集（已被 loader 消费；保存序列化输出可合并回它再重开）。 */
  files: Record<string, unknown>
  source: FileSource
  session: EditSession
  scriptSession: ScriptEditSession
  /** paired=false 时为 undefined（用于缺协调器拒绝路径）。 */
  history: EditorHistoryCoordinator | undefined
}

export interface K10ItemSeeds {
  /** 作者形态物品数组（loader 校验；runScript 写共享脚本 id 字符串，私有脚本写 itemPrivateScript）。 */
  items?: readonly unknown[]
  /** 毒种数组；提供时同步登记 manifest.content.poisons。 */
  poisons?: readonly unknown[]
  /** 共享脚本库（id → { name, self, body }）。 */
  sharedScripts?: Record<string, unknown>
}

/**
 * 合法物品项目装载：种子文件必须先过真实 loader 与保存门，失败即测试数据错误。
 * 会话装配与生产 main.tsx 相同：主会话 items 用壳投影（私有脚本呈现为 runtime ref），
 * 脚本会话持 canonical 作者真值，协调器连接两侧。
 */
export async function loadK10ItemProject(
  name: string,
  seeds: K10ItemSeeds = {},
  options: { paired?: boolean } = {},
): Promise<K10ItemRig> {
  const files = await buildBlankProject(name)
  if (seeds.items) files['content/items.json'] = seeds.items
  if (seeds.sharedScripts) files['content/shared-scripts.json'] = seeds.sharedScripts
  if (seeds.poisons) {
    files['content/poisons.json'] = seeds.poisons
    const manifest = files['manifest.json'] as { content: Record<string, string> }
    manifest.content.poisons = 'content/poisons.json'
  }
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state: EditorState = {
    ...toEditorState(project, scenes, maps, {}, []),
    items: projectEditorItemShells(project),
  }
  const session = new EditSession(state)
  const canonical: ScriptEditorState = {
    scenes: structuredClone(scenes),
    items: structuredClone(project.authorContent.items) as unknown as ScriptEditorState['items'],
    sharedScripts: structuredClone(
      project.authorContent.sharedScripts,
    ) as unknown as ScriptEditorState['sharedScripts'],
  }
  const scriptSession = new ScriptEditSession(canonical)
  const rig: K10ItemRig = {
    files,
    source,
    session,
    scriptSession,
    history:
      options.paired === false ? undefined : new EditorHistoryCoordinator(session, scriptSession),
  }
  // 壳状态的脚本引用是 runtime ref 对象，保存门只认作者形态；与生产保存一致，门设在合并态上。
  assertK10SaveValid(rig)
  return rig
}

/** 生产保存门：壳/canonical 合并后的作者真值必须过 assertProjectSaveValid。 */
export function assertK10SaveValid(rig: K10ItemRig): void {
  assertProjectSaveValid(
    mergeEditorProjectionWithCurrentAuthorState(
      rig.scriptSession.getState(),
      rig.session.getState(),
    ),
  )
}
