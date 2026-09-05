// @ts-nocheck -- Vitest-only Node/TypeScript AST audit; the editor bundle has no Node dependency.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, test } from 'vitest'
import { EDITOR_MODULES } from '../editor-navigation.js'

const here = dirname(fileURLToPath(import.meta.url))
const uiRoot = dirname(here)

interface AdoptionTransaction {
  id: string
  kind: 'field-draft' | 'aggregate-draft'
  owner?: string
  files?: string[]
  controlOwners?: string[]
  fields: string[]
  verification: string
}

type AdoptionPage =
  | {
      registry: string
      status: 'adopted'
      productionFiles: string[]
      transactions: AdoptionTransaction[]
    }
  | {
      registry: string
      status: 'not-applicable'
      reason: string
    }

interface AllowlistEntry {
  file: string
  line: number
  rule: string
  owner: string
  reason: string
  verification: string
  removalCondition: string
}

interface AdoptionInventory {
  version: number
  pages: AdoptionPage[]
  allowlist: AllowlistEntry[]
}

interface Violation {
  file: string
  line: number
  rule: 'continuous-onchange-project-mutation'
}

const adoption = JSON.parse(
  readFileSync(join(here, 'field-commit-adoption.json'), 'utf8'),
) as AdoptionInventory

function filesUnder(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

function sourceFile(path: string): ts.SourceFile {
  return ts.createSourceFile(
    path,
    readFileSync(path, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
}

function tagName(node: ts.JsxOpeningLikeElement): string {
  return node.tagName.getText()
}

function attribute(node: ts.JsxOpeningLikeElement, name: string): ts.JsxAttribute | undefined {
  return node.attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  )
}

function literalAttribute(node: ts.JsxOpeningLikeElement, name: string): string | undefined {
  const initializer = attribute(node, name)?.initializer
  return initializer && ts.isStringLiteral(initializer) ? initializer.text : undefined
}

const draftControls = new Set([
  'DsDraftTextInput',
  'DsDraftNumberInput',
  'DsDraftTextArea',
  'DsDraftTextField',
  'DsDraftNumberField',
  'DsDraftTextAreaField',
])

function isContinuousControl(node: ts.JsxOpeningLikeElement): boolean {
  const tag = tagName(node)
  if (draftControls.has(tag)) return false
  if (
    [
      'DsTextInput',
      'DsNumberInput',
      'DsTextArea',
      'DsTextField',
      'DsNumberField',
      'DsTextAreaField',
    ].includes(tag)
  )
    return true
  if (tag === 'textarea') return true
  if (tag !== 'input') return false
  return !['checkbox', 'radio', 'file', 'range', 'color', 'button', 'submit'].includes(
    literalAttribute(node, 'type') ?? 'text',
  )
}

function callName(node: ts.CallExpression): string {
  const expression = node.expression
  if (ts.isIdentifier(expression)) return expression.text
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text
  return expression.getText()
}

function namedHandlers(source: ts.SourceFile): Map<string, ts.Node> {
  const handlers = new Map<string, ts.Node>()
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name) handlers.set(node.name.text, node)
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    )
      handlers.set(node.name.text, node.initializer)
    ts.forEachChild(node, visit)
  }
  visit(source)
  return handlers
}

function handlerTargets(
  node: ts.JsxOpeningLikeElement,
  handlers: ReadonlyMap<string, ts.Node>,
): string[] {
  const initializer = attribute(node, 'onChange')?.initializer
  if (!initializer || !ts.isJsxExpression(initializer) || !initializer.expression) return []
  const targets: string[] = []
  const visitedHandlers = new Set<string>()
  const visit = (candidate: ts.Node): void => {
    if (ts.isCallExpression(candidate)) {
      const name = callName(candidate)
      targets.push(name)
      if (ts.isIdentifier(candidate.expression)) {
        const handler = handlers.get(candidate.expression.text)
        if (handler && !visitedHandlers.has(candidate.expression.text)) {
          visitedHandlers.add(candidate.expression.text)
          visit(handler)
        }
      }
    }
    ts.forEachChild(candidate, visit)
  }
  const expression = initializer.expression
  if (ts.isIdentifier(expression)) {
    targets.push(expression.text)
    const handler = handlers.get(expression.text)
    if (handler) {
      visitedHandlers.add(expression.text)
      visit(handler)
    }
  } else if (ts.isPropertyAccessExpression(expression)) targets.push(expression.getText())
  else visit(expression)
  return targets
}

function containingFunctionName(node: ts.Node): string | undefined {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text
    if (
      (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
      ts.isVariableDeclaration(current.parent) &&
      ts.isIdentifier(current.parent.name)
    )
      return current.parent.name.text
  }
  return undefined
}

const indirectProjectMutations = new Set([
  'on',
  'onChange',
  'patch',
  'patchResource',
  'patchSeed',
  'patchStats',
  'props.onChange',
  'setAction',
  'setCostItems',
  'setDefeatedReward',
  'setEffect',
  'setRules',
  'setStat',
])

function violationsInSource(
  source: ts.SourceFile,
  file: string,
  enforceIndirect: boolean,
  aggregateControlOwners: ReadonlySet<string>,
): Violation[] {
  const handlers = namedHandlers(source)
  const failures: Violation[] = []
  const visit = (node: ts.Node): void => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      isContinuousControl(node)
    ) {
      for (const name of handlerTargets(node, handlers)) {
        const directDispatch = name === 'dispatch'
        const scopedToAggregateOwner = aggregateControlOwners.has(
          containingFunctionName(node) ?? '',
        )
        if (
          !directDispatch &&
          !(enforceIndirect && !scopedToAggregateOwner && indirectProjectMutations.has(name))
        )
          continue
        failures.push({
          file,
          line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
          rule: 'continuous-onchange-project-mutation',
        })
        break
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return failures
}

function violations(
  path: string,
  enforceIndirect: boolean,
  aggregateControlOwners: ReadonlySet<string>,
): Violation[] {
  return violationsInSource(
    sourceFile(path),
    relative(uiRoot, path),
    enforceIndirect,
    aggregateControlOwners,
  )
}

function sourceDeclaresControlOwner(source: ts.SourceFile, owner: string): boolean {
  let declared = false
  const visit = (node: ts.Node): void => {
    if (
      (ts.isFunctionDeclaration(node) && node.name?.text === owner) ||
      (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === owner)
    ) {
      declared = true
      return
    }
    if (!declared) ts.forEachChild(node, visit)
  }
  visit(source)
  return declared
}

function declaresControlOwner(path: string, owner: string): boolean {
  return sourceDeclaresControlOwner(sourceFile(join(uiRoot, path)), owner)
}

function hasDraftControl(path: string): boolean {
  const source = sourceFile(path)
  let found = false
  const visit = (node: ts.Node): void => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      draftControls.has(tagName(node))
    )
      found = true
    if (!found) ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

function violationKey(value: Pick<Violation, 'file' | 'line' | 'rule'>): string {
  return `${value.file}:${value.line}:${value.rule}`
}

describe('editor field draft/commit static boundary', () => {
  test('covers every registered page exactly once with a real v2 transaction inventory', () => {
    expect(adoption.version).toBe(2)
    const registered = EDITOR_MODULES.flatMap((module) =>
      module.subpages.map((subpage) => `${module.id}/${subpage.id}`),
    ).sort()
    const inventoried = adoption.pages.map((page) => page.registry).sort()
    expect(inventoried).toEqual(registered)
    expect(new Set(inventoried).size).toBe(inventoried.length)

    for (const page of adoption.pages) {
      if (page.status === 'not-applicable') {
        expect(page.reason.trim(), `${page.registry} reason`).not.toBe('')
        expect(page).not.toHaveProperty('productionFiles')
        expect(page).not.toHaveProperty('transactions')
        continue
      }
      expect(page.productionFiles.length, `${page.registry} productionFiles`).toBeGreaterThan(0)
      expect(new Set(page.productionFiles).size, `${page.registry} duplicate production file`).toBe(
        page.productionFiles.length,
      )
      expect(page.transactions.length, `${page.registry} transactions`).toBeGreaterThan(0)
      expect(new Set(page.transactions.map(({ id }) => id)).size).toBe(page.transactions.length)
      for (const file of page.productionFiles)
        expect(existsSync(join(uiRoot, file)), `${page.registry}: ${file}`).toBe(true)
      for (const transaction of page.transactions) {
        expect(['field-draft', 'aggregate-draft']).toContain(transaction.kind)
        expect(transaction.id.trim()).not.toBe('')
        expect(
          transaction.fields.length,
          `${page.registry}/${transaction.id} fields`,
        ).toBeGreaterThan(0)
        expect(new Set(transaction.fields).size).toBe(transaction.fields.length)
        const evidenceFiles = transaction.verification.match(/[\w.-]+\.test\.tsx?/g) ?? []
        expect(
          evidenceFiles.length,
          `${page.registry}/${transaction.id} verification`,
        ).toBeGreaterThan(0)
        for (const file of evidenceFiles)
          expect(existsSync(join(uiRoot, file)), `${transaction.id}: ${file}`).toBe(true)
        if (transaction.kind !== 'aggregate-draft') continue
        expect(transaction.owner?.trim(), `${page.registry}/${transaction.id} owner`).toBeTruthy()
        expect(
          transaction.files?.length,
          `${page.registry}/${transaction.id} files`,
        ).toBeGreaterThan(0)
        expect(
          transaction.controlOwners?.length,
          `${page.registry}/${transaction.id} controlOwners`,
        ).toBeGreaterThan(0)
        for (const file of transaction.files!)
          expect(page.productionFiles, `${page.registry}/${transaction.id}: ${file}`).toContain(
            file,
          )
        const aggregateSource = transaction
          .files!.map((file) => readFileSync(join(uiRoot, file), 'utf8'))
          .join('\n')
        for (const token of transaction.owner!.split('.'))
          expect(
            aggregateSource,
            `${page.registry}/${transaction.id} owner token ${token}`,
          ).toContain(token)
        for (const owner of transaction.controlOwners!) {
          const ownerFiles = transaction.files!.filter((file) => declaresControlOwner(file, owner))
          expect(
            ownerFiles,
            `${page.registry}/${transaction.id} control owner ${owner} must belong to exactly one file`,
          ).toHaveLength(1)
        }
      }
    }
  })

  test('binds every production DsDraft control file to an adopted registry page', () => {
    const production = filesUnder(uiRoot).filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    const adoptedFiles = new Set(
      adoption.pages.flatMap((page) => (page.status === 'adopted' ? page.productionFiles : [])),
    )
    const unownedDraftFiles = production
      .filter(hasDraftControl)
      .map((path) => relative(uiRoot, path))
      .filter((file) => !adoptedFiles.has(file))
    expect(unownedDraftFiles).toEqual([])
  })

  test('consumes evidence-bound allowlist entries and rejects direct or one-hop mutations', () => {
    const allowlistKeys = [
      'file',
      'line',
      'rule',
      'owner',
      'reason',
      'verification',
      'removalCondition',
    ]
    const allowed = new Map<string, AllowlistEntry>()
    for (const entry of adoption.allowlist) {
      expect(Object.keys(entry).sort()).toEqual([...allowlistKeys].sort())
      expect(existsSync(join(uiRoot, entry.file)), entry.file).toBe(true)
      expect(Number.isInteger(entry.line) && entry.line > 0).toBe(true)
      for (const key of ['owner', 'reason', 'verification', 'removalCondition'] as const)
        expect(entry[key].trim(), `${entry.file}:${entry.line} ${key}`).not.toBe('')
      const key = violationKey(entry as Violation)
      expect(allowed.has(key), `duplicate allowlist ${key}`).toBe(false)
      allowed.set(key, entry)
    }

    const production = filesUnder(uiRoot).filter(
      (path) =>
        path.endsWith('.tsx') && !path.endsWith('.test.tsx') && !path.includes('/design-system/'),
    )
    const adoptedFiles = new Set(
      adoption.pages.flatMap((page) => (page.status === 'adopted' ? page.productionFiles : [])),
    )
    const aggregateControlOwners = new Map<string, Set<string>>()
    for (const page of adoption.pages) {
      if (page.status !== 'adopted') continue
      for (const transaction of page.transactions) {
        if (transaction.kind !== 'aggregate-draft') continue
        for (const owner of transaction.controlOwners ?? []) {
          const ownerFiles = (transaction.files ?? []).filter((file) =>
            declaresControlOwner(file, owner),
          )
          expect(
            ownerFiles,
            `${page.registry}/${transaction.id} control owner ${owner} must belong to exactly one file`,
          ).toHaveLength(1)
          const file = ownerFiles[0]!
          const owners = aggregateControlOwners.get(file) ?? new Set<string>()
          owners.add(owner)
          aggregateControlOwners.set(file, owners)
        }
      }
    }
    const used = new Set<string>()
    const failures = production.flatMap((path) =>
      violations(
        path,
        adoptedFiles.has(relative(uiRoot, path)),
        aggregateControlOwners.get(relative(uiRoot, path)) ?? new Set(),
      ),
    )
    const unexpected = failures.filter((failure) => {
      const key = violationKey(failure)
      if (!allowed.has(key)) return true
      used.add(key)
      return false
    })
    expect(unexpected).toEqual([])
    expect(
      [...allowed.keys()].filter((key) => !used.has(key)),
      'stale allowlist entries',
    ).toEqual([])
  })

  test('scopes aggregate exemptions to their declaring function and file', () => {
    const source = ts.createSourceFile(
      'fixture.tsx',
      `
        const AggregateOwner = (props) => <DsTextInput onChange={() => props.onChange()} />
        const OutsideOwner = (props) => <DsTextInput onChange={() => props.onChange()} />
        const DirectOwner = (session) => <DsTextInput onChange={() => session.dispatch()} />
      `,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    expect(
      violationsInSource(
        source,
        'fixture.tsx',
        true,
        new Set(['AggregateOwner', 'DirectOwner']),
      ).map(({ line }) => line),
    ).toEqual([3, 4])
    expect(
      sourceDeclaresControlOwner(
        ts.createSourceFile(
          'comments.tsx',
          `
            // const PretendOwner = () => null
            const text = 'function PretendOwner() {}'
          `,
          ts.ScriptTarget.Latest,
          true,
          ts.ScriptKind.TSX,
        ),
        'PretendOwner',
      ),
    ).toBe(false)
  })
})
