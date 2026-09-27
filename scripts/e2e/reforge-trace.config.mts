import base from '../../packages/reforge/vite.config'
import { openingTracePlugin } from './opening-trace-plugin.mjs'

export default { ...base, plugins: [...base.plugins, openingTracePlugin()] }
