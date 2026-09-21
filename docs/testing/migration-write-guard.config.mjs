import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const variant = process.env.MWG_MUTANT ?? 'control'
const edits = {
  resample: {
    file: 'migration-transaction.ts',
    from: '...change,\n    target: safeRel(change.target)',
    to: `...change,
    ...(change.scope === 'project' ? { expectedPreviousHash: existsSync(resolve(repo, change.target)) ? sha256(readFileSync(resolve(repo, change.target))) : null } : {}),
    target: safeRel(change.target)`,
  },
  'late-preflight': {
    file: 'migration-transaction.ts',
    from: '      assertPlannedTarget(repo, change)\n    } else',
    to: '      /* disabled batch preflight */\n    } else',
  },
  'no-path-guard': {
    file: 'migration-path.ts',
    from: "  const parts = path.split('/')",
    to: "  return resolve(repo, path)\n  const parts = path.split('/')",
  },
  'no-pre-mkdir-check': {
    file: 'pal-assets.ts',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal production source for an exact single-site mutation.
    from: '    assertMigrationFilePath(repo, relativeDestination, `资源 ${source.id}`)\n    mkdirSync(dirname(destination), { recursive: true })',
    to: '    mkdirSync(dirname(destination), { recursive: true })',
  },
  'cleanup-foreign-inode': {
    file: 'pal-assets.ts',
    from: 'if (stat?.dev === owned.dev && stat.ino === owned.ino) unlinkSync(temporary)',
    to: 'if (stat) unlinkSync(temporary)',
  },
}
assert.ok(variant === 'control' || variant === 'old-paths' || Object.hasOwn(edits, variant))
export default {
  root: `${root}packages/migrate`,
  plugins: [
    {
      name: 'migration-write-guard-single-point',
      enforce: 'pre',
      load(id) {
        if (variant === 'control') return
        const edit = edits[variant]
        const file = `${root}packages/migrate/src/${variant === 'old-paths' ? 'pal-assets.ts' : edit.file}`
        if (id !== file) return
        if (variant === 'old-paths') {
          console.log('MWG_MUTATION_HIT', variant)
          return execFileSync('git', ['show', '14257da7:packages/migrate/src/pal-assets.ts'], {
            cwd: root,
            encoding: 'utf8',
          })
        }
        const source = readFileSync(file, 'utf8')
        assert.equal(source.split(edit.from).length, 2, `unique site ${variant}`)
        console.log('MWG_MUTATION_HIT', variant)
        return source.replace(edit.from, edit.to)
      },
    },
  ],
  test: {
    include:
      variant === 'old-paths'
        ? ['src/pal-assets-paths.test.ts']
        : [
            'src/migration-write-guard.test.ts',
            'src/pal-assets-paths.test.ts',
            'src/migration-path.test.ts',
          ],
    maxWorkers: 1,
    fileParallelism: false,
  },
}
