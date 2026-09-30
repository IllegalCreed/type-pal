// Q01 专属薄 fixture：在只读 runtime-shell 工程上追加合法商店分区，经正式 loader 重载。
import { loadCurrentProjectFrom } from '../../project-loader.js'
import { medicine } from '../runtime-shell/scenarios.js'
import { projectData, shellProject } from '../runtime-shell/project.js'
import type { LoadedCurrentProject } from '../../project-loader.js'

/** 带一个合法商店（id 0，含一件 0 元补品）的完整当前工程。 */
export async function shopProject() {
  const fixture = await shellProject()
  const manifest = structuredClone(fixture.project.manifest)
  manifest.content.shops = 'content/shops.json'
  fixture.files['manifest.json'] = manifest
  fixture.files['content/shops.json'] = [{ id: 0, items: ['tonic', 'tonic-b', 'tonic-c'] }]
  fixture.files['content/items.json'] = [
    medicine('tonic', 10),
    medicine('tonic-b', 20),
    medicine('tonic-c', 30),
  ]
  const project = await loadCurrentProjectFrom(fixture.source)
  return { ...fixture, project }
}

/** projectData 的再导出：输入不变性断言用。 */
export { projectData }
export type { LoadedCurrentProject }
