import base from '../../packages/game/vite.config'
import { errandTracePlugin } from './errand-trace-plugin.mjs'
export default { ...base, plugins: [...base.plugins, errandTracePlugin()] }
