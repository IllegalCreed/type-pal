import base from '../../packages/reforge/vite.config'
import { innTracePlugin } from './inn-trace-plugin.mjs'
export default { ...base, plugins: [...base.plugins, innTracePlugin()] }
