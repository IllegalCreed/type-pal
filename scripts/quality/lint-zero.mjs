import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
export const biomeCli = require.resolve('@biomejs/biome/bin/biome')
const root = fileURLToPath(new URL('../../', import.meta.url))

/** Fail closed on source diagnostics, partial scans, malformed reports or child failure. */
export function inspectLintResult(run) {
  const problems = []
  if (run.error) problems.push(`Biome could not run: ${run.error.message}`)
  if (run.signal !== null) problems.push(`Biome terminated: ${String(run.signal)}`)
  if (run.status !== 0) problems.push(`Biome exit ${String(run.status)}`)
  let report
  try {
    report = JSON.parse(run.stdout)
  } catch {
    problems.push('Biome did not produce valid JSON')
    return { ok: false, problems }
  }
  if (!report || report.command !== 'check' || !Array.isArray(report.diagnostics)) {
    problems.push('Unexpected Biome report shape')
    return { ok: false, problems }
  }
  const summary = report.summary
  if (!summary || typeof summary !== 'object') {
    problems.push('Missing Biome summary')
    return { ok: false, problems }
  }
  for (const key of [
    'errors',
    'warnings',
    'infos',
    'skipped',
    'diagnosticsNotPrinted',
    'changed',
  ]) {
    if (!Number.isSafeInteger(summary[key]) || summary[key] < 0)
      problems.push(`Invalid summary.${key}`)
    else if (summary[key] !== 0) problems.push(`${key}: ${summary[key]}`)
  }
  if (!Number.isSafeInteger(summary.unchanged) || summary.unchanged <= 0)
    problems.push('No verified files')
  if (report.diagnostics.length !== 0) problems.push(`diagnostics: ${report.diagnostics.length}`)
  return { ok: problems.length === 0, problems, report }
}

export function runLintZero(cwd = root) {
  const run = spawnSync(
    process.execPath,
    [biomeCli, 'check', '.', '--reporter=json', '--max-diagnostics=none'],
    {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 120_000,
    },
  )
  return { ...inspectLintResult(run), stderr: run.stderr ?? '' }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 2) {
    console.error('lint: whole repository only; filtering or override arguments are not accepted')
    process.exitCode = 2
  } else {
    const result = runLintZero()
    if (!result.ok) {
      console.error(`lint: FAIL — ${result.problems.join('; ')}`)
      for (const diagnostic of result.report?.diagnostics ?? []) {
        const location = diagnostic.location
        console.error(
          `${location?.path ?? '<unknown>'}:${location?.start?.line ?? 0} ${diagnostic.severity} ${diagnostic.category}: ${diagnostic.message}`,
        )
      }
      if (!result.report && result.stderr) console.error(result.stderr)
      process.exitCode = 1
    } else {
      console.log(
        `lint: PASS — ${result.report.summary.unchanged} files; 0 errors / 0 warnings / 0 infos; complete report`,
      )
    }
  }
}
