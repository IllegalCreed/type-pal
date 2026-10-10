import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import ts from 'typescript'

const codeFile = (path) => /\.[cm]?[jt]sx?$/.test(path)
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

/** Check before reading, including symlink targets. Artifact paths are not authority. */
async function repositoryFile(root, name) {
  assert(typeof name === 'string' && name && !isAbsolute(name), 'invalid dependency path')
  const local = relative(resolve(root), resolve(root, name))
  assert(local && local !== '..' && !local.startsWith('../'), 'dependency escaped repository')
  const physical = relative(await realpath(root), await realpath(resolve(root, local)))
  if (physical === '..' || physical.startsWith('../') || isAbsolute(physical)) {
    // Managed worktrees share extracted inputs with their Git common checkout.
    // The exact mapping comes from local Git, never from a report's claimed root.
    assert(local.startsWith('data/extracted/'), 'dependency symlink escaped repository')
    const common = execFileSync(
      'git',
      ['rev-parse', '--path-format=absolute', '--git-common-dir'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim()
    const expected = resolve(dirname(common), local)
    assert.equal(
      await realpath(resolve(root, local)),
      await realpath(expected),
      'dependency symlink differs from shared extracted input',
    )
  }
  return resolve(root, local)
}

/** Resolve real local imports; never infer dependency roles from a hand-maintained
 * "pure checker" allowlist. Runtime packages are pinned by the lockfile too.
 */
export async function localDependencyGraph(root, entries, browserPackage) {
  const files = new Set(),
    pending = [...entries],
    external = new Set()
  const exists = async (path) => {
    try {
      return (await stat(await repositoryFile(root, path))).isFile()
    } catch (error) {
      if (error.code === 'ENOENT') return false
      throw error
    }
  }
  const local = async (path) => {
    const candidates = [
      path,
      ...['.ts', '.tsx', '.mts', '.mjs', '.js', '/index.ts', '/index.js'].map((ext) => path + ext),
    ]
    if (path.endsWith('.js')) candidates.push(`${path.slice(0, -3)}.ts`, `${path.slice(0, -3)}.tsx`)
    for (const candidate of candidates) if (await exists(candidate)) return candidate
    throw new Error(`unresolved local evidence dependency ${path}`)
  }
  while (pending.length) {
    const path = await local(pending.pop())
    assert(!path.startsWith('../') && !path.startsWith('/'), 'dependency escaped repository')
    if (files.has(path)) continue
    files.add(path)
    if (!codeFile(path)) continue
    const source = await readFile(await repositoryFile(root, path), 'utf8')
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
    assert.equal(ast.parseDiagnostics.length, 0, `dependency source does not parse: ${path}`)
    const specifiers = []
    const visit = (node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier)
        specifiers.push(node.moduleSpecifier.text)
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        assert(
          node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0]),
          `dynamic module dependency needs an explicit loader contract: ${path}`,
        )
        specifiers.push(node.arguments[0].text)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    for (const specifier of specifiers) {
      if (specifier.startsWith('.'))
        pending.push(relative(root, resolve(root, dirname(path), specifier)))
      else if (specifier.startsWith('/src/')) {
        // Shared journey modules contain callbacks for both browser roots. Static
        // closure includes both legal resolutions, not an invented RF save-io path.
        const candidates = [...new Set([browserPackage, 'game', 'reforge'])].filter(Boolean)
        const resolved = []
        for (const name of candidates) {
          const candidate = `packages/${name}${specifier}`
          if (await exists(candidate)) resolved.push(candidate)
        }
        assert(resolved.length, `unresolved browser import ${path}/${specifier}`)
        pending.push(...resolved)
      } else if (specifier.startsWith('@type-pal/')) {
        const [name, ...subpath] = specifier.slice('@type-pal/'.length).split('/')
        const manifest = `packages/${name}/package.json`
        const pkg = JSON.parse(await readFile(await repositoryFile(root, manifest), 'utf8'))
        files.add(manifest)
        const entry =
          pkg.exports?.[subpath.length ? `./${subpath.join('/')}` : '.'] ??
          (!subpath.length && pkg.main)
        assert(typeof entry === 'string', `unresolved workspace export ${specifier}`)
        pending.push(relative(root, resolve(root, dirname(manifest), entry)))
      } else {
        assert(!specifier.startsWith('/'), `unclassified absolute import ${specifier}`)
        external.add(specifier)
      }
    }
  }
  return { files: [...files].sort(), external: [...external].sort() }
}

/** Non-code inputs remain explicitly declared by the real scenario/asset contract.
 * Code closure is independently rediscovered so dropping a receipt entry cannot hide it.
 */
export async function recordingDependencies(root, { entry, traceConfig, packageName, declared }) {
  assert(['game', 'reforge'].includes(packageName), 'unsupported evidence runtime')
  const definition = { entry, traceConfig, packageName, declared: [...new Set(declared)].sort() }
  const execution = await localDependencyGraph(root, [entry], packageName)
  const recording = await localDependencyGraph(root, [traceConfig], packageName)
  const runtime = await browserDependencyGraph(root, packageName)
  const configFiles = new Set(['pnpm-lock.yaml', 'package.json', 'pnpm-workspace.yaml'])
  const packages = new Set([
    packageName,
    ...runtime.files.map((path) => /^packages\/([^/]+)\//u.exec(path)?.[1]).filter(Boolean),
  ])
  const configs = [...packages].map((name) => `packages/${name}/tsconfig.json`)
  for (const name of packages) configFiles.add(`packages/${name}/package.json`)
  while (configs.length) {
    const file = configs.pop()
    if (configFiles.has(file)) continue
    const source = await readFile(await repositoryFile(root, file), 'utf8')
    const parsed = ts.parseConfigFileTextToJson(file, source)
    assert(!parsed.error, `invalid compiler configuration ${file}`)
    configFiles.add(file)
    const parents = parsed.config.extends ? [parsed.config.extends].flat() : []
    for (const parent of parents) {
      assert(
        typeof parent === 'string' && parent.startsWith('.'),
        `unsupported compiler config parent ${file}`,
      )
      configs.push(relative(root, resolve(root, dirname(file), parent)))
    }
  }
  const groups = {
    execution: execution.files,
    recording: recording.files,
    runtime: [
      ...new Set([
        ...runtime.files,
        ...definition.declared.filter((path) => path.startsWith('packages/')),
      ]),
    ].sort(),
    inputs: [
      ...new Set([...configFiles, ...definition.declared.filter((path) => !codeFile(path))]),
    ].sort(),
    declared: definition.declared,
  }
  const paths = [...new Set(Object.values(groups).flat())].sort()
  const hashes = await hashRepositoryFiles(root, paths)
  return {
    version: 1,
    definition,
    groups,
    external: [
      ...new Set([...execution.external, ...recording.external, ...runtime.external]),
    ].sort(),
    hashes,
  }
}

/** Read the HTML module entry Vite actually serves. Unsupported script loaders
 * must be classified explicitly, not silently replaced with a main.ts assumption.
 */
export async function browserDependencyGraph(root, packageName) {
  const html = `packages/${packageName}/index.html`
  const source = (await readFile(await repositoryFile(root, html), 'utf8')).replace(
    /<!--[\s\S]*?-->/gu,
    '',
  )
  const entries = []
  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/giu)) {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gu)].map((attr) => [attr[1], attr[3]]),
    )
    assert(
      attributes.type === 'module' && attributes.src && !match[2].trim(),
      `unsupported browser script entry in ${html}`,
    )
    assert(
      /^\/?src\/[\w./-]+$/u.test(attributes.src),
      `unsupported browser entry source ${attributes.src}`,
    )
    entries.push(`packages/${packageName}/${attributes.src.replace(/^\//u, '')}`)
  }
  assert(entries.length > 0, `browser module entry missing in ${html}`)
  const graph = await localDependencyGraph(root, entries, packageName)
  return { ...graph, files: [html, ...graph.files].sort() }
}

export async function hashRepositoryFiles(root, paths) {
  return Object.fromEntries(
    await Promise.all(
      [...new Set(paths)]
        .sort()
        .map(async (path) => [path, hash(await readFile(await repositoryFile(root, path)))]),
    ),
  )
}

export function assertDependencyClosure(recorded, current) {
  assert.equal(recorded?.version, 1, 'recording lacks current dependency manifest')
  assert.deepEqual(recorded.definition, current.definition, 'dependency entry definition changed')
  assert.deepEqual(
    recorded.groups,
    current.groups,
    'dependency graph changed or receipt omitted a dependency',
  )
  assert.deepEqual(recorded.external, current.external, 'external dependency graph changed')
  assert.deepEqual(
    Object.keys(recorded.hashes),
    Object.keys(current.hashes),
    'dependency hashes incomplete',
  )
}

/** A source outside the producer closure can change the verdict, not the captured facts.
 * Unknown or missing producer manifests never receive this classification.
 */
export function dependencyImpact(manifest, path) {
  assert.equal(manifest?.version, 1, 'recording lacks current dependency manifest')
  const producer = ['execution', 'recording', 'runtime', 'inputs']
  if (producer.some((group) => manifest.groups[group].includes(path))) return 'producer'
  assert(manifest.groups.declared.includes(path), `unclassified recorded dependency ${path}`)
  return 'declared-oracle'
}
