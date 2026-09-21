import * as fs from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export function guardFixture() {
  const root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'type-pal-write-guard-')))
  const repo = join(root, 'repo')
  const outside = join(root, 'outside')
  fs.mkdirSync(repo)
  fs.mkdirSync(outside)
  return { root, repo, outside }
}

export function put(path: string, bytes: string | Uint8Array) {
  fs.mkdirSync(dirname(path), { recursive: true })
  fs.writeFileSync(path, bytes)
}

/** Include directories and links without following links outside the owned fixture. */
export function tree(root: string): Record<string, string> {
  const result: Record<string, string> = {}
  const walk = (dir: string, prefix: string) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const path = join(dir, name)
      const rel = `${prefix}${name}`
      const stat = fs.lstatSync(path)
      if (stat.isSymbolicLink()) result[rel] = `link:${fs.readlinkSync(path)}`
      else if (stat.isDirectory()) {
        result[rel] = 'directory'
        walk(path, `${rel}/`)
      } else result[rel] = fs.readFileSync(path).toString('hex')
    }
  }
  walk(root, '')
  return result
}
