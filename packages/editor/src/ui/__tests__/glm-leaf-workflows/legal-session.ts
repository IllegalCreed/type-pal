/**
 * 白名单 fixture：合法项目装载 + 真实命令会话的公共入口。
 * 每次调用产出独立的 EditSession（blank seed→loader→toEditorState→保存门自证），
 * 领域实体一律经当前命令类派发，不用强转部分对象冒充 EditorState。
 */
import { stubNodeTestHost } from './node-bridge.js'

export { loadLegalUiProject } from '../glm-ui-wave-kit.js'

export async function prepareNodeTestHost(): Promise<void> {
  await stubNodeTestHost()
}
