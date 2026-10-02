import base from '../../packages/game/vite.config'
import { mealTracePlugin } from './meal-trace-plugin.mjs'
export default { ...base, plugins: [...base.plugins, mealTracePlugin()] }
