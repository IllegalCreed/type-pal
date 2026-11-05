import base from '../../packages/reforge/vite.config'
import { fairyIslandMazeTracePlugin } from './fairy-island-maze-reforge-trace.mjs'

export default { ...base, plugins: [...base.plugins, fairyIslandMazeTracePlugin()] }
