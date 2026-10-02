import { mkdir, readdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCensus } from './census.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const readJson = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'))
const readDirectory = async (path) =>
  Promise.all(
    (await readdir(join(root, path)))
      .filter((name) => name.endsWith('.json'))
      .sort()
      .map((name) => readJson(`${path}/${name}`)),
  )

export async function loadCanonicalScenes(index, readScene) {
  const ids = new Set()
  const paths = new Set()
  return Promise.all(
    index.scenes.map(async (entry) => {
      if (typeof entry.id !== 'string' || ids.has(entry.id) || paths.has(entry.path))
        throw new Error('Duplicate or missing canonical manifest identity')
      if (
        typeof entry.path !== 'string' ||
        !entry.path.startsWith('content/scenes/') ||
        entry.path.split('/').includes('..')
      )
        throw new Error('Canonical scene path outside scene directory')
      ids.add(entry.id)
      paths.add(entry.path)
      const scene = await readScene(entry.path)
      if (scene.id !== entry.id)
        throw new Error(`Canonical manifest/body identity mismatch: ${entry.id}`)
      return scene
    }),
  )
}

export async function run() {
  if (process.argv.length > 2)
    throw new Error('No input, output, repair, or write-project overrides are supported')
  const [events, sourceScenes, canonicalScenes, externalTables] = await Promise.all([
    readJson('data/extracted/events/all.json'),
    readDirectory('data/extracted/data/scene'),
    readJson('projects/pal/content/scenes/index.json').then((index) =>
      loadCanonicalScenes(index, (path) => readJson(`projects/pal/${path}`)),
    ),
    Promise.all(
      ['items', 'object-magics', 'enemy-objects', 'object-players', 'object-poisons'].map(
        async (name) => ({ name, rows: await readJson(`data/extracted/data/${name}.json`) }),
      ),
    ),
  ])
  const report = buildCensus({ events, sourceScenes, canonicalScenes, externalTables })
  const output = join(root, 'build/script-governance')
  await mkdir(output, { recursive: true })
  if ((await realpath(output)) !== output) throw new Error('Refusing a symlinked report directory')
  await writeFile(join(output, 'install-census.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(
    JSON.stringify(
      {
        ...report.totals,
        output: 'build/script-governance/install-census.json',
        topRiskCandidates: report.topRiskCandidates.map(
          ({ address, target, scene, entity, channel, behavior, risk }) => ({
            address,
            target,
            scene,
            entity,
            channel,
            behavior,
            risk,
          }),
        ),
      },
      null,
      2,
    ),
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await run()
