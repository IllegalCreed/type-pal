import base from '../../packages/reforge/vite.config'
import { fairyIslandPoolTracePlugin } from './fairy-island-pool-reforge-trace.mjs'

export default { ...base, plugins: [...base.plugins, fairyIslandPoolTracePlugin()] }
