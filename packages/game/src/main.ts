import { bootstrap } from './shell/bootstrap.js'

if (typeof document !== 'undefined') {
  const canvas = document.getElementById('screen')
  if (canvas instanceof HTMLCanvasElement) {
    void bootstrap(canvas).catch((err: unknown) => {
      console.error('bootstrap failed:', err)
    })
  }
}
