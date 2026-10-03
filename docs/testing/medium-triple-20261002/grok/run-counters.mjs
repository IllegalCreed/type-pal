#!/usr/bin/env node
/**
 * 四枚隔离产品变异。每枚自己的 mkdtemp，只改副本里的一处产品源。
 * finally 只删除本次目录。正/变/恢复都把真实 spawn 的 exit/signal 写入证据。
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { identityMultiset, judgeTriple } from './judge.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../../..')
const vitest = join(root, 'node_modules/vitest/vitest.mjs')
const evidenceRoot = join(here, 'counters')

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

const needles = [
  {
    id: 'C1-assets-identity',
    batch: 'G1',
    axis: 'loadAssets rejection keeps the caller error object',
    source: 'packages/game/src/shell/bootstrap-resources.ts',
    testFiles: [
      'src/shell/bootstrap-resources.test.ts',
      'src/shell/bootstrap-resources.grok-mid-1.test.ts',
    ],
    hashedTest: 'packages/game/src/shell/bootstrap-resources.grok-mid-1.test.ts',
    registeredFile: 'src/shell/bootstrap-resources.grok-mid-1.test.ts',
    oldFile: 'src/shell/bootstrap-resources.test.ts',
    runByDefault: false,
    counted: true,
    classification: 'new-oracle',
    targetFullName:
      'grok-mid-1 bootstrap barriers loadAssets 拒绝保持原错误对象，soundfont 仍可成功且 settle 独立',
    from: '    ports.loadAssets(sceneId),',
    to: "    ports.loadAssets(sceneId).catch((error: unknown) => Promise.reject(new Error('masked:' + String(error)))),",
  },
  {
    id: 'C2-settle-order',
    batch: 'G1',
    axis: 'soundfontSettled waits for resourcesReady on the success path',
    source: 'packages/game/src/shell/bootstrap-resources.ts',
    testFiles: [
      'src/shell/bootstrap-resources.test.ts',
      'src/shell/bootstrap-resources.grok-mid-1.test.ts',
    ],
    hashedTest: 'packages/game/src/shell/bootstrap-resources.grok-mid-1.test.ts',
    registeredFile: 'src/shell/bootstrap-resources.grok-mid-1.test.ts',
    oldFile: 'src/shell/bootstrap-resources.test.ts',
    runByDefault: false,
    counted: true,
    classification: 'new-oracle',
    targetFullName:
      'grok-mid-1 bootstrap barriers soundfont 先 settle 时 resourcesReady 仍等待，随后装配同一引用',
    from: `  const soundfontSettled = soundfontData.then(
    () => {},
    () => {},
  )`,
    to: `  const soundfontSettled = soundfontData.then(
    () => resourcesReady.then(() => {}, () => {}),
    () => {},
  ).then(() => {})`,
  },
  {
    id: 'C3-icon-index',
    batch: 'G4',
    axis: 'dialog icon frame index stays the sprite-group index',
    source: 'packages/game/src/assets/dialog-assets.ts',
    testFiles: [
      'src/assets/dialog-assets.glm-phase1-leaves.test.ts',
      'src/assets/dialog-resources.grok-mid-1.test.ts',
    ],
    hashedTest: 'packages/game/src/assets/dialog-resources.grok-mid-1.test.ts',
    registeredFile: 'src/assets/dialog-resources.grok-mid-1.test.ts',
    oldFile: 'src/assets/dialog-assets.glm-phase1-leaves.test.ts',
    targetFullName:
      'grok-mid-1 dialog parallel degradation 单张头像失败仍保留成功头像与图标第 0 帧',
    from: '    map.set(i,',
    to: '    map.set(i + 1,',
    runByDefault: false,
    counted: false,
    classification: 'existing-proof/cross-check',
  },
  {
    id: 'C4-protect-snapshot',
    batch: 'G5',
    axis: 'protect is sampled again at eviction time',
    source: 'packages/game/src/assets/loader.ts',
    testFiles: ['src/assets/loader.test.ts', 'src/assets/scene-cache.grok-mid-1.test.ts'],
    hashedTest: 'packages/game/src/assets/scene-cache.grok-mid-1.test.ts',
    registeredFile: 'src/assets/scene-cache.grok-mid-1.test.ts',
    oldFile: 'src/assets/loader.test.ts',
    runByDefault: false,
    counted: true,
    classification: 'new-oracle',
    targetFullName:
      'grok-mid-1 scene cache eviction protect 切换后原先受保护的场景成为下一次淘汰对象',
    from: `    this.maxEntries = opts?.maxEntries
    this.onEvict = opts?.onEvict
    this.protect = opts?.protect`,
    to: `    this.maxEntries = opts?.maxEntries
    this.onEvict = opts?.onEvict
    const frozenProtect = opts?.protect?.()
    this.protect = () => frozenProtect`,
  },
  {
    id: 'C5-count-bound',
    batch: 'G4',
    axis: 'portraits.json count does not replace the portraits array as the PNG fetch bound',
    source: 'packages/game/src/assets/dialog-assets.ts',
    testFiles: [
      'src/assets/dialog-assets.glm-phase1-leaves.test.ts',
      'src/assets/dialog-resources.grok-mid-1.test.ts',
    ],
    hashedTest: 'packages/game/src/assets/dialog-resources.grok-mid-1.test.ts',
    registeredFile: 'src/assets/dialog-resources.grok-mid-1.test.ts',
    oldFile: 'src/assets/dialog-assets.glm-phase1-leaves.test.ts',
    targetFullName:
      'grok-mid-1 dialog parallel degradation portraits.json 的 count 不决定 PNG 请求次数',
    from: `  await Promise.all(
    manifest.portraits.map(async (entry) => {`,
    to: `  const countedPortraits = Array.from({ length: manifest.count }, (_, index) => {
    return manifest.portraits[index] ?? { chunkIndex: index, width: 1, height: 1 }
  })
  await Promise.all(
    countedPortraits.map(async (entry) => {`,
    counted: true,
    classification: 'new-oracle',
  },
]

function replaceOnce(source, from, to, id) {
  const hits = source.split(from).length - 1
  if (hits !== 1) throw new Error(`${id} matched ${hits} times`)
  return source.replace(from, to)
}

function copyTree(destination) {
  mkdirSync(join(destination, 'packages'), { recursive: true })
  const rsync = spawnSync(
    'rsync',
    [
      '-a',
      '--exclude',
      'node_modules',
      `${join(root, 'packages/game')}/`,
      `${join(destination, 'packages/game')}/`,
    ],
    { encoding: 'utf8' },
  )
  if (rsync.status !== 0) throw new Error(rsync.stderr || 'rsync failed')
  writeFileSync(
    join(destination, 'tsconfig.base.json'),
    readFileSync(join(root, 'tsconfig.base.json')),
  )
  const link = spawnSync('ln', [
    '-s',
    join(root, 'node_modules'),
    join(destination, 'node_modules'),
  ])
  if (link.status !== 0) throw new Error('node_modules link failed')
  const gameLink = spawnSync('ln', [
    '-s',
    join(root, 'packages/game/node_modules'),
    join(destination, 'packages/game/node_modules'),
  ])
  if (gameLink.status !== 0) throw new Error('game node_modules link failed')
}

function runVitest(tree, needle, jsonPath) {
  const args = [
    vitest,
    'run',
    ...needle.testFiles,
    '--reporter=verbose',
    '--reporter=json',
    `--outputFile=${jsonPath}`,
  ]
  if (needle.testNamePattern) args.push('--testNamePattern', needle.testNamePattern)
  const cwd = join(tree, 'packages/game')
  const child = spawnSync(process.execPath, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, CI: '1', NO_COLOR: '1' },
    maxBuffer: 32 * 1024 * 1024,
  })
  return {
    exitCode: child.status,
    signal: child.signal,
    stdout: child.stdout ?? '',
    stderr: child.stderr ?? '',
    spawn: { command: [process.execPath, ...args], cwd },
  }
}

function loadReport(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    return { testResults: [], parseError: String(error) }
  }
}

function oneTrailingNewline(text) {
  if (!text) return ''
  return `${text.replace(/\n+$/, '')}\n`
}

function normalizePatch(text) {
  const lines = text.split('\n').map((line) => (line === ' ' ? '' : line))
  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}

function writeRun(dir, label, run, report) {
  writeFileSync(join(dir, `${label}.json`), `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(join(dir, `${label}.stdout`), oneTrailingNewline(run.stdout))
  writeFileSync(join(dir, `${label}.stderr`), oneTrailingNewline(run.stderr))
}

function runNeedle(needle) {
  const tree = mkdtempSync(join(tmpdir(), `grok-mid-1-${needle.id}-`))
  const dir = join(evidenceRoot, needle.id)
  mkdirSync(dir, { recursive: true })
  try {
    copyTree(tree)
    const sourcePath = join(tree, needle.source)
    const testPath = join(tree, needle.hashedTest)
    const original = readFileSync(sourcePath)
    const mutantText = replaceOnce(original.toString('utf8'), needle.from, needle.to, needle.id)
    const mutantCopy = join(tree, 'mutant-source.txt')
    writeFileSync(mutantCopy, mutantText)
    const diff = spawnSync('diff', ['-u', sourcePath, mutantCopy], { encoding: 'utf8' })
    if (diff.status !== 1) throw new Error(diff.stderr || `${needle.id} diff status ${diff.status}`)
    const product = {}
    const test = {}
    const capture = (label) => {
      product[label] = sha256(readFileSync(sourcePath))
      test[label] = sha256(readFileSync(testPath))
    }
    capture('original')
    const originalRun = runVitest(tree, needle, join(tree, 'original.json'))
    const originalReport = loadReport(join(tree, 'original.json'))
    writeFileSync(sourcePath, mutantText)
    capture('mutant')
    const mutantRun = runVitest(tree, needle, join(tree, 'mutant.json'))
    const mutantReport = loadReport(join(tree, 'mutant.json'))
    writeFileSync(sourcePath, original)
    capture('restored')
    const restoredRun = runVitest(tree, needle, join(tree, 'restored.json'))
    const restoredReport = loadReport(join(tree, 'restored.json'))
    writeRun(dir, 'original', originalRun, originalReport)
    writeRun(dir, 'mutant', mutantRun, mutantReport)
    writeRun(dir, 'restored', restoredRun, restoredReport)
    writeFileSync(join(dir, 'patch.diff'), normalizePatch(diff.stdout))
    const judgement = judgeTriple(
      {
        original: { report: originalReport, run: originalRun },
        mutant: { report: mutantReport, run: mutantRun },
        restored: { report: restoredReport, run: restoredRun },
      },
      {
        file: needle.registeredFile,
        fullName: needle.targetFullName,
        oldFile: needle.oldFile,
      },
      { tempRoot: tree, sha: { product, test } },
    )
    const assertion = judgement.assertion
    const meta = {
      id: needle.id,
      batch: needle.batch,
      axis: needle.axis,
      source: needle.source,
      testFile: needle.hashedTest,
      oldFile: `packages/game/${needle.oldFile}`,
      target: needle.targetFullName,
      testNamePattern: needle.testNamePattern ?? null,
      accepted: judgement.reasons.length === 0,
      reasons: judgement.reasons,
      sha256: { product, test },
      exitCode: {
        original: originalRun.exitCode,
        mutant: mutantRun.exitCode,
        restored: restoredRun.exitCode,
      },
      signal: {
        original: originalRun.signal,
        mutant: mutantRun.signal,
        restored: restoredRun.signal,
      },
      spawn: {
        original: originalRun.spawn,
        mutant: mutantRun.spawn,
        restored: restoredRun.spawn,
      },
      counts: {
        original: originalReport.numTotalTests ?? 0,
        mutantFailed: mutantReport.numFailedTests ?? 0,
        restored: restoredReport.numTotalTests ?? 0,
      },
      assertionError: assertion ? (assertion.failureMessages ?? []).join('\n') : '',
      fullName: assertion?.fullName ?? '',
      names: identityMultiset(originalReport, tree),
    }
    writeFileSync(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
    return meta
  } finally {
    rmSync(tree, { recursive: true, force: true })
  }
}

function main() {
  const only = process.argv.find((arg) => arg.startsWith('--only='))
  const ids = only ? new Set(only.slice('--only='.length).split(',')) : null
  const selected = needles.filter((needle) =>
    ids ? ids.has(needle.id) : needle.runByDefault !== false,
  )
  const summaries = []
  let failed = false
  for (const needle of selected) {
    try {
      const meta = runNeedle(needle)
      summaries.push({
        id: meta.id,
        accepted: meta.accepted,
        reasons: meta.reasons,
        counted: needle.counted !== false,
        classification: needle.classification ?? 'new-oracle',
      })
      if (!meta.accepted) failed = true
    } catch (error) {
      failed = true
      summaries.push({ id: needle.id, accepted: false, reasons: [String(error)] })
      console.error(error)
    }
  }
  const indexPath = join(evidenceRoot, 'index.json')
  let previous = []
  try {
    previous = JSON.parse(readFileSync(indexPath, 'utf8'))
  } catch {
    previous = []
  }
  const byId = new Map(previous.map((row) => [row.id, row]))
  for (const row of summaries) byId.set(row.id, row)
  for (const needle of needles) {
    const current = byId.get(needle.id) ?? { id: needle.id, accepted: null, reasons: [] }
    byId.set(needle.id, {
      ...current,
      counted: needle.counted !== false,
      classification: needle.classification ?? 'new-oracle',
    })
  }
  const order = needles.map((needle) => needle.id)
  const merged = order.filter((id) => byId.has(id)).map((id) => byId.get(id))
  writeFileSync(indexPath, `${JSON.stringify(merged, null, 2)}\n`)
  console.log(JSON.stringify(summaries, null, 2))
  if (failed) process.exitCode = 1
}

const invoked = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invoked) main()
