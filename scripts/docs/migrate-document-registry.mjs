import { closeSync, constants, openSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { migrateFrozenDocumentRegistry } from './document-registry.mjs'

const args = process.argv.slice(2)
if (
  args.length !== 4 ||
  args[0] !== '--manifest' ||
  args[2] !== '--mapping' ||
  !resolve(args[3]).startsWith('/tmp/')
)
  throw new Error(
    'Usage: node scripts/docs/migrate-document-registry.mjs --manifest PATH --mapping /tmp/NEW.json',
  )
const mappingPath = resolve(args[3])
const parent = realpathSync(dirname(mappingPath))
const withinTmp = relative(realpathSync('/tmp'), parent)
if (withinTmp === '..' || withinTmp.startsWith(`..${sep}`))
  throw new Error('Migration mapping parent escapes the owned temporary directory')
// Reserve a writable, exclusive output before any registry publication. A later I/O
// failure can still leave a complete registry and an incomplete reserved mapping;
// this output file and the registry are not a filesystem transaction.
const fd = openSync(
  mappingPath,
  constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
  0o600,
)
try {
  const { mapping } = migrateFrozenDocumentRegistry({ manifestPath: args[1] })
  writeFileSync(fd, `${JSON.stringify(mapping, null, 2)}\n`)
  console.log(`Migrated ${mapping.entries.length} frozen native entries; mapping: ${args[3]}`)
} finally {
  closeSync(fd)
}
