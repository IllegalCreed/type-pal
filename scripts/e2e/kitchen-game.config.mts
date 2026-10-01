import base from '../../packages/game/vite.config'
import { kitchenTracePlugin } from './kitchen-trace-plugin.mjs'
export default { ...base, plugins: [...base.plugins, kitchenTracePlugin()] }
