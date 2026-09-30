import base from '../../packages/game/vite.config'
import { innTracePlugin } from './inn-trace-plugin.mjs'
export default { ...base, plugins: [...base.plugins, innTracePlugin()] }
