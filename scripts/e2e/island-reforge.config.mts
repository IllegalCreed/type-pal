import base from '../../packages/reforge/vite.config'
import { islandEntranceTracePlugin } from './island-entrance-trace.mjs'
import { islandReforgeBattlePlugin } from './island-reforge-battle.mjs'

export default {
  ...base,
  plugins: [...base.plugins, islandEntranceTracePlugin(), islandReforgeBattlePlugin()],
}
