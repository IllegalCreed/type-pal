import base from '../../packages/reforge/vite.config'
import { kitchenTracePlugin } from './kitchen-trace-plugin.mjs'
export default { ...base, plugins: [...base.plugins, kitchenTracePlugin()] }
