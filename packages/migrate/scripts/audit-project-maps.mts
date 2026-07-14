import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Tilemap } from '@type-pal/shared'
import { auditAndConvertSourceMaps } from '../src/project-map-audit.js'

const root = path.resolve(import.meta.dirname, '../../..')
const sourceDir = path.join(root, 'data/extracted/data/tilemap')
const names = (await readdir(sourceDir))
  .filter((name) => /^\d+\.json$/.test(name))
  .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
const entries = await Promise.all(
  names.map(async (name) => {
    const file = path.join(sourceDir, name)
    const [text, info] = await Promise.all([readFile(file, 'utf8'), stat(file)])
    return {
      mapNum: Number.parseInt(name, 10),
      source: JSON.parse(text) as Tilemap,
      sourceJsonBytes: info.size,
    }
  }),
)
const { report } = auditAndConvertSourceMaps(entries)
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
