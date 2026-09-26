/**
 * 多个命令的一次原子编辑：任一 apply 抛错时 EditSession 看不到中间态；undo 按逆序回滚。
 * 资源导入 + 语义引用切换必须走此命令，避免留下孤儿定义或半写 catalog。
 * 对 Command 仅 type import（commands.ts 反向 re-export），运行期无环。
 */
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

export class CompositeCommand implements Command {
  constructor(
    readonly label: string,
    private readonly commands: readonly Command[],
  ) {}

  apply(state: EditorState): EditorState {
    return this.commands.reduce((current, command) => command.apply(current), state)
  }

  invert(state: EditorState): EditorState {
    return [...this.commands].reverse().reduce((current, command) => command.invert(current), state)
  }
}
