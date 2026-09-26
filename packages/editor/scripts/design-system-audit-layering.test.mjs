import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, test, vi } from 'vitest'
import {
  evaluateAllowlist as facadeEvaluateAllowlist,
  validateAllowlist as facadeValidateAllowlist,
} from './design-system-audit.mjs'
import {
  jsxElementFacts,
  reachableRenderFlow,
  topLevelFunctionDefinitions,
} from './design-system-audit-ast.mjs'
import { cssElementScrollContracts } from './design-system-audit-css.mjs'
import { createDesignSystemAuditReport } from './design-system-audit-report.mjs'
import {
  evaluateAllowlist as directEvaluateAllowlist,
  validateAllowlist as directValidateAllowlist,
} from './design-system-audit-rules.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const validJsonPath = join(here, '../src/ui/design-system/design-system-allowlist.json')

function functionFlow(sourceText) {
  const source = ts.createSourceFile(
    'probe.tsx',
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const body = topLevelFunctionDefinitions(source).get('Probe')?.body
  if (!body) throw new Error('Probe body missing')
  return { source, flow: reachableRenderFlow(body, new Map(), { source }) }
}

test('the facade preserves the pure allowlist policy exports', () => {
  expect(facadeValidateAllowlist).toBe(directValidateAllowlist)
  expect(facadeEvaluateAllowlist).toBe(directEvaluateAllowlist)
})

test('the AST fact layer caches one node while preserving conditional class variants', () => {
  const source = ts.createSourceFile(
    'facts.tsx',
    `const view = <div className={enabled ? 'active' : 'idle'} data-mode="preview" />`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  let opening
  const visit = (node) => {
    if (ts.isJsxSelfClosingElement(node)) opening = node
    ts.forEachChild(node, visit)
  }
  visit(source)
  expect(opening).toBeDefined()
  const facts = jsxElementFacts(opening)
  expect(jsxElementFacts(opening)).toBe(facts)
  expect(facts.classVariants).toEqual([['active'], ['idle']])
  expect(facts.attributes).toEqual({ 'data-mode': 'preview' })
})

test('the CSS fact layer treats the scroll keyword as a bounded vertical owner', () => {
  const metadata = {
    source: 'Probe.tsx',
    component: 'Probe',
    tag: 'div',
    attributes: {},
    attributeNames: [],
    classes: ['panel'],
    classVariants: [['panel']],
    classVariantsTruncated: false,
    inlineScrollStyle: { declarations: [], uncertain: false },
    position: 1,
    elementSite: 'target',
    ancestorSites: [],
  }
  const contracts = cssElementScrollContracts(
    metadata,
    new Map([['target', metadata]]),
    '.panel { overflow-y: scroll; max-height: 24px; }',
  )
  expect(contracts).toHaveLength(1)
  expect(contracts[0]).toMatchObject({
    bounded: true,
    y: { scroll: true, selector: '.panel', value: 'scroll' },
  })
})

test('unknown switches visit each distinct fall-through body once', () => {
  const { source, flow } = functionFlow(`
    function Probe(kind) {
      switch (kind) {
        case 'a':
        case 'b':
          return <A />
        case 'c':
        case 'd':
          return <B />
        default:
          return <C />
      }
    }
  `)
  expect(flow.expressions.map((expression) => expression.getText(source))).toEqual([
    '<A />',
    '<B />',
    '<C />',
  ])
  expect(flow.canContinue).toBe(false)
})

test('a terminal empty case after default keeps its distinct continuation path', () => {
  const { source, flow } = functionFlow(`
    function Probe(kind) {
      switch (kind) {
        default:
          return <Fallback />
        case 'empty':
      }
      return <After />
    }
  `)
  expect(flow.expressions.map((expression) => expression.getText(source))).toEqual([
    '<Fallback />',
    '<After />',
  ])
})

function reportPorts(overrides = {}) {
  return {
    paths: {
      actionGroup: validJsonPath,
      adoption: validJsonPath,
      allowlist: validJsonPath,
      effectCard: validJsonPath,
      textOverflow: validJsonPath,
    },
    collectViolations: vi.fn(() => []),
    deriveTextOverflowAdoptionSeed: vi.fn(() => []),
    evaluateAllowlist: vi.fn(() => ({
      active: ['Example.tsx:7:native-button'],
      problems: [],
      stale: [],
      unapproved: [],
    })),
    productionSourceCount: vi.fn(() => 3),
    validateActionGroupAdoption: vi.fn(() => []),
    validateAdoption: vi.fn(() => []),
    validateEffectCardAdoption: vi.fn(() => []),
    validateTextOverflowAdoption: vi.fn(() => []),
    ...overrides,
  }
}

test('the report layer owns gate output and exit codes through narrow ports', () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const passing = createDesignSystemAuditReport(reportPorts())
    expect(passing.runDesignSystemGate()).toBe(0)
    expect(log).toHaveBeenCalledWith(
      'design-system gate passed: 3 files, 1 evidence-bound exceptions',
    )

    const collectViolations = vi.fn(() => [])
    const failing = createDesignSystemAuditReport(
      reportPorts({
        collectViolations,
        validateAdoption: vi.fn(() => ['synthetic adoption drift']),
      }),
    )
    expect(failing.runDesignSystemGate()).toBe(2)
    expect(error).toHaveBeenCalledWith('adoption: synthetic adoption drift')
    expect(collectViolations).not.toHaveBeenCalled()
  } finally {
    log.mockRestore()
    error.mockRestore()
  }
})
