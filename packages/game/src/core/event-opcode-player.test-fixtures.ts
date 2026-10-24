import { makeRole } from '../__tests__/coverage85-glm-game/harness.js'
import { createInitialGameState, loadDefaultGame } from './game-state.js'

/** 事件玩家族的已初始化运行态；四份专测共享角色基线，不共享可变实例。 */
export function freshPlayerOpcodeState() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  loadDefaultGame(gs, {
    roles: Array.from({ length: 6 }, (_, id) =>
      makeRole(id, { level: 1, hp: 100, maxHP: 100, mp: 0, maxMP: 50 }),
    ),
  })
  return gs
}
