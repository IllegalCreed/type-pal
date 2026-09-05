export const metricNames = Object.freeze(['statements', 'branches', 'functions', 'lines'])

const assertCount = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} 必须是非负整数`)
  return value
}

export function normalizeMetrics(summary, label = 'coverage') {
  return Object.fromEntries(
    metricNames.map((metric) => {
      const value = summary?.[metric]
      const total = assertCount(value?.total, `${label}.${metric}.total`)
      const covered = assertCount(value?.covered, `${label}.${metric}.covered`)
      if (covered > total) throw new Error(`${label}.${metric}: covered 不得大于 total`)
      return [metric, { covered, total }]
    }),
  )
}

export function aggregateMetrics(metrics) {
  const result = Object.fromEntries(metricNames.map((metric) => [metric, { covered: 0, total: 0 }]))
  for (const item of metrics) {
    for (const metric of metricNames) {
      result[metric].covered += item[metric].covered
      result[metric].total += item[metric].total
    }
  }
  return result
}

export function percent({ covered, total }) {
  return total === 0 ? 100 : (covered / total) * 100
}

export function formatPercent(value) {
  return `${percent(value).toFixed(2)}% (${value.covered}/${value.total})`
}

/**
 * 用整数交叉相乘比较分数，避免 coverage-summary.json 的两位 pct 四舍五入掩盖小回退。
 */
export function compareRatio(actual, baseline) {
  if (baseline.total === 0) {
    if (actual.total === 0 || actual.covered === actual.total) return 0
    return -1
  }
  if (actual.total === 0) return 1
  const left = BigInt(actual.covered) * BigInt(baseline.total)
  const right = BigInt(baseline.covered) * BigInt(actual.total)
  return left === right ? 0 : left > right ? 1 : -1
}

export function compareCoverage(actual, baseline, { allowNewPackages = false } = {}) {
  const regressions = []
  const improvements = []
  const ids = new Set([...Object.keys(actual.packages), ...Object.keys(baseline.packages)])
  for (const id of [...ids].sort()) {
    const current = actual.packages[id]
    const previous = baseline.packages[id]
    if (current && !previous && allowNewPackages) continue
    if (!current || !previous) {
      regressions.push(`${id}: package 集合与基线不一致`)
      continue
    }
    for (const metric of metricNames) {
      const direction = compareRatio(current.metrics[metric], previous.metrics[metric])
      if (direction < 0)
        regressions.push(
          `${id}.${metric}: ${formatPercent(current.metrics[metric])} < ${formatPercent(previous.metrics[metric])}`,
        )
      else if (direction > 0) improvements.push(`${id}.${metric}`)
    }
  }
  for (const metric of metricNames) {
    const direction = compareRatio(actual.total[metric], baseline.total[metric])
    if (direction < 0)
      regressions.push(
        `total.${metric}: ${formatPercent(actual.total[metric])} < ${formatPercent(baseline.total[metric])}`,
      )
    else if (direction > 0) improvements.push(`total.${metric}`)
  }
  return { regressions, improvements }
}
