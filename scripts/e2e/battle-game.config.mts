import base from '../../packages/game/vite.config'
import { gameBattlePlugin } from './battle-game-instrumentation.mjs'

export default { ...base, plugins: [...base.plugins, gameBattlePlugin()] }
