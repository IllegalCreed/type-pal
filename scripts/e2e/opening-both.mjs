import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Separate browser contexts, servers and checkpoint chains. One engine's failure never skips the other.
const children = ['game-opening.mjs', 'reforge-opening.mjs'].map((file) => {
  const child = spawn(
    process.execPath,
    [fileURLToPath(new URL(file, import.meta.url)), ...process.argv.slice(2)],
    { detached: true, stdio: ['ignore', 'inherit', 'inherit'] },
  )
  const done = new Promise((resolve) => {
    child.once('error', (error) => resolve({ file, code: 1, error: String(error) }))
    child.once('exit', (code, signal) => resolve({ file, code, signal }))
  })
  return { child, done }
})
let interrupted = false
const stop = () => {
  interrupted = true
  for (const { child } of children)
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGINT')
}
process.once('SIGINT', stop)
process.once('SIGTERM', stop)
const results = await Promise.all(children.map((c) => c.done))
process.removeListener('SIGINT', stop)
process.removeListener('SIGTERM', stop)
console.log('[001 both]', JSON.stringify(results))
if (interrupted) process.exitCode = 130
else if (results.some((r) => r.code !== 0)) process.exitCode = 1
