import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { buildBlankProject } from '../src/core/seed.js'
import { authorProjectSource } from './author-project-source.js'

// Inject only OS read errors. Path guards and the actual author validator remain real.
vi.mock('node:fs/promises', async (original) => {
  const actual = await original<typeof import('node:fs/promises')>()
  return { ...actual, readFile: vi.fn(actual.readFile) }
})

const exec = promisify(execFile)
const repository = fileURLToPath(new URL('../../../', import.meta.url))
const entry = fileURLToPath(new URL('./check-project.mts', import.meta.url))
const temporaryRoots: string[] = []
afterEach(async () => {
  vi.mocked(readFile).mockClear()
  await Promise.all(
    temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  )
})

async function temporary() {
  const root = await mkdtemp(join(tmpdir(), 'type-pal-author-check-'))
  temporaryRoots.push(root)
  const project = join(root, 'author project')
  await mkdir(project)
  return { root, project }
}

async function materialize(project: string, files: Record<string, unknown>) {
  for (const [rel, value] of Object.entries(files)) {
    const path = join(project, rel)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(
      path,
      value instanceof ArrayBuffer
        ? new Uint8Array(value)
        : typeof value === 'string'
          ? value
          : `${JSON.stringify(value, null, 2)}\n`,
    )
  }
}

async function treeHash(root: string): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}
  const visit = async (path: string): Promise<void> => {
    for (const name of (await readdir(path)).sort()) {
      const child = join(path, name)
      const info = await lstat(child)
      const rel = relative(root, child)
      if (info.isDirectory()) {
        hashes[rel] = 'directory'
        await visit(child)
      } else if (info.isSymbolicLink()) hashes[rel] = `symlink:${await readlink(child)}`
      else
        hashes[rel] = createHash('sha256')
          .update(await readFile(child))
          .digest('hex')
    }
  }
  await visit(root)
  return hashes
}

describe('read-only Node author FileSource', () => {
  test('reads text/JSON/bytes and local URLs, including an in-project symlink', async () => {
    const { project } = await temporary()
    await writeFile(join(project, 'a.json'), '{"answer":42}')
    await symlink(join(project, 'a.json'), join(project, 'alias.json'))
    const source = await authorProjectSource(project)
    expect(await source.readText('a.json')).toBe('{"answer":42}')
    expect(await source.readJson('alias.json')).toEqual({ answer: 42 })
    expect(new TextDecoder().decode(await source.readBytes('a.json'))).toBe('{"answer":42}')
    expect(await source.urlFor('alias.json')).toBe(
      pathToFileURL(await realpath(join(project, 'a.json'))).href,
    )
  })

  test.each([
    '../outside.json',
    '/outside.json',
    './a.json',
    'assets//a.json',
    'a\\b.json',
    'https://example.com/a',
  ])('rejects noncanonical path %s for every FileSource method', async (path) => {
    const { project } = await temporary()
    const source = await authorProjectSource(project)
    for (const read of [source.readText, source.readJson, source.readBytes, source.urlFor])
      await expect(read(path)).rejects.toThrow()
  })

  test('rejects external symlinks at file and directory prefixes, including a similarly prefixed sibling', async () => {
    const { root, project } = await temporary()
    const outside = join(root, 'project-sibling')
    await mkdir(outside)
    await writeFile(join(outside, 'a.json'), '{"outside":true}')
    await symlink(join(outside, 'a.json'), join(project, 'file.json'))
    await symlink(outside, join(project, 'directory'))
    const source = await authorProjectSource(project)
    await expect(source.readText('file.json')).rejects.toThrow(/路径逃逸/)
    await expect(source.readBytes('directory/a.json')).rejects.toThrow(/路径逃逸/)
    await expect(source.urlFor('file.json')).rejects.toThrow(/路径逃逸/)
  })

  test('only ENOENT is optional absence; JSON, ENOTDIR and abort remain failures', async () => {
    const { project } = await temporary()
    await writeFile(join(project, 'bad.json'), '{bad')
    await writeFile(join(project, 'not-a-directory'), 'x')
    const source = await authorProjectSource(project)
    await expect(source.readText('absent.json')).rejects.toMatchObject({ name: 'NotFoundError' })
    await expect(source.readJson('bad.json')).rejects.toBeInstanceOf(SyntaxError)
    await expect(source.readText('not-a-directory/file')).rejects.toMatchObject({ code: 'ENOTDIR' })
    await expect(source.readBytes('bad.json', AbortSignal.abort())).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  test('dangling optional-metadata symlink is not converted into absence', async () => {
    const { root, project } = await temporary()
    await mkdir(join(project, '.type-pal'))
    await symlink(join(root, 'missing.json'), join(project, '.type-pal/save-state.json'))
    const source = await authorProjectSource(project)
    await expect(source.readText('.type-pal/save-state.json')).rejects.toThrow(/符号链接无法验证/)
  })

  test('permission denial preserves the original EACCES error instead of treating metadata as absent', async () => {
    const { project } = await temporary()
    await writeFile(join(project, 'permission.json'), '{}')
    const source = await authorProjectSource(project)
    const denied = Object.assign(new Error('permission denied'), { code: 'EACCES' })
    vi.mocked(readFile).mockRejectedValueOnce(denied)
    await expect(source.readText('permission.json')).rejects.toBe(denied)
  })

  test('requires an existing directory root', async () => {
    const { root, project } = await temporary()
    await writeFile(join(root, 'file'), 'x')
    await expect(authorProjectSource(join(root, 'file'))).rejects.toThrow(/工程根不是目录/)
    await expect(authorProjectSource(join(project, 'absent'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })
})

describe('real Node CLI author check, without Vite or original data', () => {
  test('both package entry points succeed and leave all files/directories unchanged', async () => {
    const { root, project } = await temporary()
    await materialize(project, await buildBlankProject('cli-blank'))
    await materialize(project, { '.type-pal/save-recovery/keep.txt': 'untouched journal bytes' })
    const before = await treeHash(root)
    for (const args of [
      ['check:content', relative(repository, project)],
      ['--filter', '@type-pal/editor', 'run', 'check:project', project],
    ]) {
      const result = await exec('pnpm', args, { cwd: repository })
      expect(result.stdout).toContain('作者工程检查通过：cli-blank（1 场景 / 1 地图 / 4 资源）')
      expect(result.stderr).toBe('')
      expect(await treeHash(root)).toEqual(before)
    }
  }, 20_000)

  test.each([
    'bad-json',
    'pending',
    'escaped',
    'write-argument',
  ] as const)('actual subprocess exits 1 without writes or recovery: %s', async (failure) => {
    const { root, project } = await temporary()
    await materialize(project, await buildBlankProject('cli-failure'))
    let expected: RegExp
    if (failure === 'bad-json') {
      await writeFile(join(project, 'content/maps/start.json'), '{bad')
      expected = /JSON|Unexpected|property name/
    } else if (failure === 'pending') {
      await materialize(project, {
        '.type-pal/save-state.json': {
          kind: 'type-pal-author-save',
          version: 1,
          operationId: '11111111-1111-4111-8111-111111111111',
          phase: 'pending',
          planHash: 'a'.repeat(64),
        },
        '.type-pal/save-recovery/keep.txt': 'must not recover',
      })
      expected = /未完成的保存/
    } else if (failure === 'escaped') {
      await writeFile(join(root, 'outside.json'), '{}')
      await rm(join(project, 'content/maps/start.json'))
      await symlink(join(root, 'outside.json'), join(project, 'content/maps/start.json'))
      expected = /路径逃逸/
    } else expected = /仅只读/
    const before = await treeHash(root)
    try {
      await exec(
        process.execPath,
        ['--import', 'tsx', entry, failure === 'write-argument' ? '--write' : project],
        { cwd: repository },
      )
      expect.fail('bad project or forbidden arguments must exit nonzero')
    } catch (error) {
      expect(error).toMatchObject({ code: 1, stdout: '' })
      expect((error as { stderr: string }).stderr).toMatch(expected)
    }
    expect(await treeHash(root)).toEqual(before)
  }, 20_000)
})
