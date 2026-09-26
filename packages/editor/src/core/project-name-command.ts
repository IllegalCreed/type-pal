/**
 * 项目显示名命令。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

/**
 * 重命名项目(manifest.name 显示名;id/文件夹名不变 —— 稳定标识与显示名分离,
 * 改名不断存档/URL 引用)。manifest 整替换,序列化随 manifest.json 落盘。
 */
export class RenameProjectCommand implements Command {
  readonly label = '重命名项目'
  private readonly next: string
  private old = ''
  private captured = false

  constructor(next: string) {
    this.next = next
  }

  apply(s: EditorState): EditorState {
    if (!this.captured) {
      this.old = s.manifest.name
      this.captured = true
    }
    return { ...s, manifest: { ...s.manifest, name: this.next } }
  }

  invert(s: EditorState): EditorState {
    return { ...s, manifest: { ...s.manifest, name: this.old } }
  }
}
