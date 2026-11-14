import type { HostileVictoryTransition } from '@type-pal/content'
import type { Command } from './command-contract.js'
import type { EditorState } from './edit-session.js'

/** Edit just the project default; scene overrides and other manifest fields stay intact. */
export class SetHostileVictoryTransitionCommand implements Command {
  readonly label = '修改明雷回场默认'
  private previous?: HostileVictoryTransition
  private captured = false

  constructor(private readonly transition: HostileVictoryTransition) {}

  apply(state: EditorState): EditorState {
    if (!this.captured) {
      this.previous = state.manifest.hostileVictoryTransition
      this.captured = true
    }
    return this.update(state, this.transition)
  }

  invert(state: EditorState): EditorState {
    return this.update(state, this.previous)
  }

  private update(
    state: EditorState,
    transition: HostileVictoryTransition | undefined,
  ): EditorState {
    const manifest = { ...state.manifest }
    if (transition === undefined) delete manifest.hostileVictoryTransition
    else manifest.hostileVictoryTransition = transition
    return { ...state, manifest }
  }
}
