export function classifyProtectedBaseline({ baselineExists, configExists }) {
  if (baselineExists) return 'compare'
  if (!configExists) return 'bootstrap'
  throw new Error('目标分支已有 coverage 配置但缺少 baseline，拒绝 fail-open')
}
