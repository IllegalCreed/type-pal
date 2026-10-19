import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const codeExtensions = new Set(['.js', '.mjs', '.mts', '.ts', '.tsx'])
const packageRoots = new Set([
  'content',
  'editor',
  'game',
  'migrate',
  'pal-extract',
  'reforge',
  'shared',
])

function trackedFiles() {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: root,
    encoding: 'utf8',
    // This is the whole tracked path list, including out-of-scope evidence paths.
    maxBuffer: 16 * 1024 * 1024,
  })
    .split('\0')
    .filter(Boolean)
}

function categoryFor(path) {
  if (path.startsWith('reference/') || path.includes('/vendor/')) return 'vendor/reference'
  if (
    path.includes('/generated/') ||
    path.includes('/dist/') ||
    path.includes('/build/') ||
    path.includes('/baselines/') ||
    /(?:^|\/)(?:[^/]*oracle[^/]*|[^/]*-evidence\.json)$/.test(path)
  )
    return 'generated'
  if (
    path.endsWith('.json') &&
    (path.startsWith('packages/reforge/src/') ||
      path.startsWith('packages/editor/src/ui/design-system/'))
  )
    return 'generated'
  const base = path.split('/').at(-1) ?? path
  if (path.includes('/__tests__/') || /\.(?:test|spec)\./.test(base)) return 'test'
  if (path.includes('/fixtures/') || /fixture/i.test(base)) return 'fixture'
  if (path.startsWith('scripts/')) return 'tool'
  return 'product'
}

function scopeFor(path) {
  const parts = path.split('/')
  if (parts[0] === 'packages' && packageRoots.has(parts[1])) {
    const packageName = `@type-pal/${parts[1]}`
    const sourceIndex = parts.indexOf('src')
    const module =
      sourceIndex >= 0 ? parts.slice(sourceIndex + 1, -1).join('/') || 'src' : (parts[2] ?? 'root')
    const feature = sourceIndex >= 0 ? (parts[sourceIndex + 1] ?? 'src') : (parts[2] ?? 'root')
    return { domain: packageName, module, feature }
  }
  if (parts[0] === 'scripts') {
    const module = parts[1] ?? 'root'
    return { domain: 'scripts', module, feature: parts[2] ?? module }
  }
  return {
    domain: parts[0] ?? 'root',
    module: parts.slice(1, -1).join('/') || 'root',
    feature: parts[1] ?? 'root',
  }
}

function dependencySpecifiers(source, reExports) {
  const specs = new Set(reExports)
  const patterns = [
    /\bimport\s+(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      specs.add(match[1])
    }
  }
  return [...specs].sort()
}

function exportSpecifiers(source) {
  const specs = new Set()
  for (const match of source.matchAll(
    /\bexport\s+(?:\*|\{[\s\S]*?\})\s+from\s+['"]([^'"]+)['"]/g,
  )) {
    specs.add(match[1])
  }
  return [...specs].sort()
}

function publicExports(source) {
  const names = new Set()
  for (const match of source.matchAll(
    /\bexport\s+(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([A-Za-z_$][\w$]*)/g,
  )) {
    names.add(match[1])
  }
  if (/\bexport\s+default\b/.test(source)) names.add('default')
  if (/\bexport\s*\{/.test(source)) names.add('{...}')
  if (/\bexport\s*\*/.test(source)) names.add('*')
  return [...names].sort()
}

function resolveRelative(from, specifier, known) {
  if (!specifier.startsWith('.')) return undefined
  const resolved = resolve(root, dirname(from), specifier)
  const base = resolved.replace(/\.(?:js|mjs|mts|ts|tsx)$/, '')
  const candidates = [
    resolved,
    base,
    ...[...codeExtensions].map((ext) => `${base}${ext}`),
    ...[...codeExtensions].map((ext) => join(base, `index${ext}`)),
  ]
  return candidates.map((file) => relative(root, file)).find((file) => known.has(file))
}

function resolvePackageEntry(specifier, known) {
  const match = /^@type-pal\/([a-z-]+)$/.exec(specifier)
  if (!match) return undefined
  const entry = `packages/${match[1]}/src/index.ts`
  return known.has(entry) ? entry : undefined
}

function main(args) {
  const outArg = args.find((arg) => arg.startsWith('--out='))?.slice('--out='.length)
  if (args.some((arg) => arg !== `--out=${outArg}`))
    throw new Error('usage: node scripts/quality/code-quality-inventory.mjs [--out=PATH]')

  const files = trackedFiles().filter((path) => {
    const inScope = path.startsWith('packages/') || path.startsWith('scripts/')
    return inScope && (codeExtensions.has(extname(path)) || path.endsWith('.json'))
  })
  const known = new Set(files)
  const reExportsByPath = new Map()
  const records = files.map((path) => {
    const source = readFileSync(join(root, path), 'utf8')
    const scope = scopeFor(path)
    const reExports = exportSpecifiers(source)
    reExportsByPath.set(path, reExports)
    const dependencies = dependencySpecifiers(source, reExports)
    return {
      path,
      category: categoryFor(path),
      ...scope,
      lines: source.split(/\r?\n/).length - (source.endsWith('\n') ? 1 : 0),
      publicExports: publicExports(source),
      directDependencies: dependencies,
      productionCallers: [],
      stateOwnership: '待核',
      qualityIssues: [],
      evidence: [],
      risk: '待核',
      decision: '待核',
      status: '待核',
      verification: '待核',
    }
  })
  const byPath = new Map(records.map((record) => [record.path, record]))
  for (const record of records) {
    for (const specifier of record.directDependencies) {
      const target =
        resolveRelative(record.path, specifier, known) ?? resolvePackageEntry(specifier, known)
      if (!target) continue
      const dependency = byPath.get(target)
      if (
        !['test', 'fixture', 'vendor/reference', 'generated'].includes(record.category) &&
        !dependency.productionCallers.includes(record.path)
      ) {
        dependency.productionCallers.push(record.path)
      }
    }
  }
  // Each source is read once; graph expansion uses those captured lexical facts.
  // Barrel callers propagate to every explicit re-export path. These are path-level
  // hints, not imported-symbol bindings or proof of runtime reachability.
  let changed = true
  while (changed) {
    changed = false
    for (const record of records) {
      if (record.productionCallers.length === 0) continue
      for (const specifier of reExportsByPath.get(record.path)) {
        const target = resolveRelative(record.path, specifier, known)
        if (!target) continue
        const exported = byPath.get(target)
        for (const caller of record.productionCallers) {
          if (!exported.productionCallers.includes(caller)) {
            exported.productionCallers.push(caller)
            changed = true
          }
        }
      }
    }
  }
  for (const record of records) record.productionCallers.sort()
  const inventory = {
    schemaVersion: 1,
    base: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    scope:
      'packages/{content,editor,game,migrate,pal-extract,reforge,shared} + scripts; reference/generated/projects are not implementation scope',
    records,
  }
  const output = `${JSON.stringify(inventory, null, 2)}\n`
  if (outArg) {
    const destination = resolve(root, outArg)
    if (!existsSync(dirname(destination)))
      throw new Error(`output directory missing: ${dirname(destination)}`)
    writeFileSync(destination, output)
  } else {
    process.stdout.write(output)
  }
}

main(process.argv.slice(2))
