import base from '../../packages/reforge/vite.config'
import { waterMoonPalaceTracePlugin } from './water-moon-palace-reforge-trace.mjs'

export default { ...base, plugins: [...base.plugins, waterMoonPalaceTracePlugin()] }
