import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

// Identity/dependency analysis of the frozen and relocated test registrations. No emit/writes.
export function analyzeOrganization(root, sources, replacements = [], bridges = []) {
  const selected = bridges.filter((x) => x.ordinals && Object.hasOwn(sources, x.path))
  if (selected.length) {
    const common = bridges.filter((x) => !x.ordinals)
    const result = analyzeOrganization(root, sources, replacements, common)
    for (const bridge of selected) {
      const { ordinals, ...change } = bridge
      const rewritten = analyzeOrganization(
        root,
        { [bridge.path]: sources[bridge.path] },
        replacements,
        [...common, change],
      )
      for (const ordinal of ordinals)
        result[bridge.path].tests[ordinal] = rewritten[bridge.path].tests[ordinal]
    }
    return result
  }
  const ts = createRequire(resolve(root, 'package.json'))('typescript')
  const sha = (x) => createHash('sha256').update(x).digest('hex')
  const canonical = (text) =>
    replacements.reduce((body, [from, to]) => body.replaceAll(from, to), text)
  const printer = ts.createPrinter({ removeComments: true })
  const syntax = (node) =>
    canonical(printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()))
  const options = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    noResolve: true,
    noEmit: true,
  }
  const host = ts.createCompilerHost(options)
  const getSourceFile = host.getSourceFile.bind(host)
  const bodies = new Map(
    Object.entries(sources).map(([file, original]) => {
      let body = original
      for (const bridge of bridges.filter((x) => x.path === file)) {
        for (const change of bridge.changes) {
          assert.equal(body.split(change.from).length - 1, change.count, bridge.id)
          body = body.replaceAll(change.from, change.to)
        }
      }
      return [resolve(root, file), body]
    }),
  )
  host.getSourceFile = (file, language, ...args) =>
    bodies.has(resolve(file))
      ? ts.createSourceFile(file, bodies.get(resolve(file)), language, true)
      : getSourceFile(file, language, ...args)
  const program = ts.createProgram([...bodies.keys()], options, host),
    checker = program.getTypeChecker()
  const callNamed = (node, name) =>
    ts.isExpressionStatement(node) &&
    ts.isCallExpression(node.expression) &&
    node.expression.expression.getText(node.getSourceFile()) === name
  const registration = (node) =>
    ts.isExpressionStatement(node) &&
    ts.isCallExpression(node.expression) &&
    /^(?:test|it)(?:\.each(?:<|\())?/.test(node.expression.expression.getText(node.getSourceFile()))
  const bindingIdentifiers = (name) => {
    if (ts.isIdentifier(name)) return [name]
    assert.ok(ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name))
    return name.elements.flatMap((element) => {
      if (ts.isOmittedExpression(element)) return []
      assert.ok(ts.isBindingElement(element))
      return bindingIdentifiers(element.name)
    })
  }
  const output = {}
  for (const [file] of Object.entries(sources)) {
    const sf = program.getSourceFile(resolve(root, file))
    assert.equal(sf.parseDiagnostics.length, 0, file)
    const definitions = new Map(),
      imports = new Map(),
      hooks = [],
      tests = []
    const bind = (name, node) => {
      const symbol = checker.getSymbolAtLocation(name)
      assert.ok(symbol)
      definitions.set(symbol, node)
    }
    const scan = (block, titles = [], owners = []) => {
      for (const node of block.statements) {
        if (ts.isImportDeclaration(node)) {
          const module = node.moduleSpecifier.text,
            clause = node.importClause
          const add = (id, imported, typeOnly) =>
            imports.set(checker.getSymbolAtLocation(id), {
              name: id.text,
              module,
              imported,
              typeOnly,
            })
          if (clause?.name) add(clause.name, 'default', !!clause.isTypeOnly)
          if (clause?.namedBindings) {
            if (ts.isNamespaceImport(clause.namedBindings))
              add(clause.namedBindings.name, '*', !!clause.isTypeOnly)
            else
              for (const spec of clause.namedBindings.elements)
                add(
                  spec.name,
                  spec.propertyName?.text ?? spec.name.text,
                  !!clause.isTypeOnly || !!spec.isTypeOnly,
                )
          }
        } else if (ts.isVariableStatement(node))
          for (const declaration of node.declarationList.declarations) {
            for (const name of bindingIdentifiers(declaration.name)) bind(name, node)
          }
        else if (
          ts.isFunctionDeclaration(node) ||
          ts.isTypeAliasDeclaration(node) ||
          ts.isInterfaceDeclaration(node)
        )
          bind(node.name, node)
        else if (
          ['afterEach', 'beforeEach', 'afterAll', 'beforeAll'].some((name) => callNamed(node, name))
        )
          hooks.push({ node, owners: [...owners] })
        else if (callNamed(node, 'describe')) {
          const call = node.expression
          assert.ok(ts.isStringLiteral(call.arguments[0]))
          scan(call.arguments[1].body, [...titles, call.arguments[0].text], [...owners, node])
        } else if (registration(node)) {
          const call = node.expression
          assert.ok(ts.isStringLiteral(call.arguments[0]))
          tests.push({ node, template: call.arguments[0].text, titles, owners })
        } else assert.fail(`Unsupported statement: ${file}: ${node.getText(sf).slice(0, 80)}`)
      }
    }
    scan(sf)
    const closure = (node) => {
      const nodes = new Set(),
        usedImports = new Map()
      const visit = (child) => {
        if (ts.isIdentifier(child)) {
          // `{ palette }` has a property symbol; its borrowed value belongs to
          // the lexical declaration, which may itself depend on imports.
          const symbol =
            ts.isShorthandPropertyAssignment(child.parent) && child.parent.name === child
              ? checker.getShorthandAssignmentValueSymbol(child.parent)
              : checker.getSymbolAtLocation(child)
          if (imports.has(symbol)) {
            const imp = imports.get(symbol)
            usedImports.set(imp.name, imp)
          }
          const definition = definitions.get(symbol)
          if (definition && !nodes.has(definition)) {
            nodes.add(definition)
            ts.forEachChild(definition, visit)
          }
        }
        ts.forEachChild(child, visit)
      }
      visit(node)
      return { nodes, imports: usedImports }
    }
    output[file] = {
      tests: tests.map((test, ordinal) => {
        const dependencies = closure(test.node)
        const applicable = hooks.filter((h) =>
          h.owners.every((owner) => test.owners.includes(owner)),
        )
        // Every registered hook can affect global state, even with no shared local declaration.
        const usedHooks = applicable
        for (const h of usedHooks) {
          const extra = closure(h.node)
          for (const n of extra.nodes) dependencies.nodes.add(n)
          for (const [name, imp] of extra.imports) dependencies.imports.set(name, imp)
        }
        const declarationEntries = [...dependencies.nodes]
          .map((node) => ({
            syntaxSha256: sha(syntax(node)),
            text: node.getFullText(sf),
            start: node.getStart(sf),
            names: ts.isVariableStatement(node)
              ? node.declarationList.declarations.flatMap((d) =>
                  bindingIdentifiers(d.name).map((name) => name.text),
                )
              : [node.name.text],
          }))
          .sort((a, b) => a.start - b.start)
        return {
          ordinal,
          template: test.template,
          titles: test.titles,
          statementSyntaxSha256: sha(syntax(test.node)),
          text: test.node.getFullText(sf),
          declarations: declarationEntries,
          hooks: usedHooks.map((h) => ({
            syntaxSha256: sha(syntax(h.node)),
            text: h.node.getFullText(sf),
          })),
          imports: [...dependencies.imports.values()].sort((a, b) => a.name.localeCompare(b.name)),
        }
      }),
    }
  }
  return output
}
