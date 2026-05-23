import { bootstrap, showError } from './shell/bootstrap.js'

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('screen')
  if (canvas instanceof HTMLCanvasElement) {
    void bootstrap(canvas).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('bootstrap failed:', err)
      showError(canvas, msg)
    })
  }
}
