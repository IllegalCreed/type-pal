import { readFileSync } from 'node:fs'

function parseJson(path) {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

/** IO and console owner for the design-system audit. Analysis and policy arrive as narrow ports. */
export function createDesignSystemAuditReport(ports) {
  const runDesignSystemGate = () => {
    const adoption = parseJson(ports.paths.adoption)
    if (adoption.error) {
      console.error(`design-system adoption matrix invalid: ${adoption.error}`)
      return 2
    }
    const adoptionProblems = ports.validateAdoption(adoption.value)
    if (adoptionProblems.length) {
      for (const problem of adoptionProblems) console.error(`adoption: ${problem}`)
      return 2
    }
    const effectCardAdoption = parseJson(ports.paths.effectCard)
    if (effectCardAdoption.error) {
      console.error(`effect-card adoption registry invalid: ${effectCardAdoption.error}`)
      return 2
    }
    const effectCardProblems = ports.validateEffectCardAdoption(effectCardAdoption.value)
    if (effectCardProblems.length) {
      for (const problem of effectCardProblems) console.error(`effect-card: ${problem}`)
      return 2
    }
    const actionGroupAdoption = parseJson(ports.paths.actionGroup)
    if (actionGroupAdoption.error) {
      console.error(`action-group adoption registry invalid: ${actionGroupAdoption.error}`)
      return 2
    }
    const actionGroupProblems = ports.validateActionGroupAdoption(actionGroupAdoption.value)
    if (actionGroupProblems.length) {
      for (const problem of actionGroupProblems) console.error(`action-group: ${problem}`)
      return 2
    }
    const textOverflowAdoption = parseJson(ports.paths.textOverflow)
    if (textOverflowAdoption.error) {
      console.error(`text-overflow adoption registry invalid: ${textOverflowAdoption.error}`)
      return 2
    }
    const textOverflowProblems = ports.validateTextOverflowAdoption(textOverflowAdoption.value)
    if (textOverflowProblems.length) {
      for (const problem of textOverflowProblems) console.error(`text-overflow: ${problem}`)
      return 2
    }
    const allowlist = parseJson(ports.paths.allowlist)
    if (allowlist.error) {
      console.error(`design-system allowlist invalid: ${allowlist.error}`)
      return 2
    }
    const result = ports.evaluateAllowlist(allowlist.value, ports.collectViolations())
    if (result.problems.length) {
      for (const problem of result.problems) console.error(`allowlist: ${problem}`)
      return 2
    }
    if (result.stale.length) {
      for (const identity of result.stale) console.error(`allowlist stale: ${identity}`)
      return 2
    }
    if (result.unapproved.length) {
      for (const violation of result.unapproved)
        console.error(
          `${violation.file}:${violation.line}: ${violation.rule}: ${violation.found} -> design-system owner: ${violation.recommendation}`,
        )
      return 1
    }
    console.log(
      `design-system gate passed: ${ports.productionSourceCount()} files, ${result.active.length} evidence-bound exceptions`,
    )
    return 0
  }

  const printAdoptionMatrix = () => {
    const adoption = parseJson(ports.paths.adoption)
    if (adoption.error) {
      console.error(`design-system adoption matrix invalid: ${adoption.error}`)
      return 2
    }
    const problems = ports.validateAdoption(adoption.value)
    if (problems.length) {
      for (const problem of problems) console.error(`adoption: ${problem}`)
      return 2
    }
    console.log(JSON.stringify(adoption.value, null, 2))
    return 0
  }

  const printTextOverflowAdoptionDraft = () => {
    const entries = ports.deriveTextOverflowAdoptionSeed().map((entry) => ({
      ...entry,
      policy: 'UNCLASSIFIED',
      contentKind: 'UNCLASSIFIED',
      reveal: 'UNCLASSIFIED',
      reason: '',
      verification: '',
    }))
    console.log(JSON.stringify({ version: 1, entries }, null, 2))
    return 0
  }

  return { printAdoptionMatrix, printTextOverflowAdoptionDraft, runDesignSystemGate }
}
