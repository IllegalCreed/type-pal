import base from '../../packages/game/vite.config'
import { islandEntranceTracePlugin } from './island-entrance-trace.mjs'
import { islandGameBattlePlugin } from './island-game-battle.mjs'

export default {
  ...base,
  plugins: [...base.plugins, islandEntranceTracePlugin(), islandGameBattlePlugin()],
}
