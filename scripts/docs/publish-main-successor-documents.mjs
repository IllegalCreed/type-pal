import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { closeSync, lstatSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mainSuccessorAdmission } from './main-successor-admission.mjs'
import {
  inspectMainSuccessorPublication,
  prepareMainSuccessorPublication,
  publishMainSuccessor,
} from './main-successor-publication.mjs'
import { parseTerminalJson } from './terminal-json.mjs'

const defaultRoot = fileURLToPath(new URL('../../', import.meta.url))
function external(path, root, input) {
  assert(
    typeof path === 'string' && isAbsolute(path),
    'absolute external plan/result path required',
  )
  const real = input
    ? realpathSync(path)
    : resolve(realpathSync(dirname(path)), path.split(sep).at(-1))
  const inside = relative(realpathSync(root), real)
  assert(
    inside && (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)),
    'plan/result must be outside repository',
  )
  if (input) assert(lstatSync(path).isFile(), 'ordinary external plan required')
  return real
}

export function runMainSuccessorPublication(args) {
  const flags = new Set(),
    values = new Map()
  for (let i = 0; i < args.length; i++) {
    const key = args[i]
    assert(!flags.has(key) && !values.has(key), 'duplicate successor option')
    if (['--write', '--publish', '--inspect'].includes(key)) flags.add(key)
    else {
      assert(
        ['--root', '--plan', '--out'].includes(key) && args[i + 1] && !args[i + 1].startsWith('--'),
        'unknown or missing successor option',
      )
      values.set(key, args[++i])
    }
  }
  assert(flags.size <= 1, 'successor modes are mutually exclusive')
  const root = resolve(values.get('--root') ?? defaultRoot)
  assert(
    flags.has('--inspect') ? !values.has('--plan') : values.has('--plan'),
    'inspect and closed plan are exclusive',
  )
  const out = values.has('--out') ? external(values.get('--out'), root, false) : undefined
  // Claim the result before any mutation. Never remove an existing receipt.
  const fd = out === undefined ? undefined : openSync(out, 'wx')
  let result
  try {
    if (flags.has('--inspect')) result = inspectMainSuccessorPublication({ root })
    else {
      const plan = parseTerminalJson(readFileSync(external(values.get('--plan'), root, true)))
      assert.deepEqual(Object.keys(plan).sort(), ['carrierRevision', 'rows', 'upstreamRevision'])
      assert(
        plan.carrierRevision === mainSuccessorAdmission.carrierRevision &&
          plan.upstreamRevision === mainSuccessorAdmission.mainRevision,
        'closed successor source revisions differ',
      )
      const baseRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim()
      const prepared = prepareMainSuccessorPublication({
        root,
        baseRevision,
        rows: plan.rows,
        grant: flags.has('--publish'),
      })
      result = flags.size ? publishMainSuccessor(prepared, { allowWrite: true }) : prepared
    }
    if (fd !== undefined) writeFileSync(fd, `${JSON.stringify(result, null, 2)}\n`)
    return result
  } finally {
    if (fd !== undefined) closeSync(fd)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(runMainSuccessorPublication(process.argv.slice(2))))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
