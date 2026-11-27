import ts from 'typescript'
import mainSource from '../main.ts?raw'

export { mainSource }

// Cache compilation only, keyed by the exact source and requested bindings. Each
// invocation still evaluates a fresh factory with its own environment/closures.
// Mutated source supplied by negative controls must never reuse the original body.
const mainFactories = new Map<string, (env: object) => unknown>()

/** Extract real production bodies, not copied implementations; fail loudly on missing/ambiguous names. */
export function instantiateMainBindings<T>(
  names: readonly string[],
  properties: readonly string[],
  env: object,
  source = mainSource,
): T {
  const key = JSON.stringify([source, names, properties])
  const cached = mainFactories.get(key)
  if (cached) return cached(env) as T
  const ast = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const found = new Map<string, string>()
  const save = (name: string, value: string) => {
    if (found.has(name)) throw new Error(`ambiguous main binding ${name}`)
    found.set(name, value)
  }
  function walk(node: ts.Node): void {
    if (
      (ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) &&
      node.name &&
      ts.isIdentifier(node.name) &&
      names.includes(node.name.text)
    ) {
      save(
        node.name.text,
        ts.isFunctionDeclaration(node) ? node.getText(ast) : `const ${node.getText(ast)};`,
      )
    }
    if (ts.isPropertyAssignment(node) && properties.includes(node.name.getText(ast))) {
      save(
        node.name.getText(ast),
        `const ${node.name.getText(ast)} = ${node.initializer.getText(ast)};`,
      )
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  for (const name of [...names, ...properties])
    if (!found.has(name)) throw new Error(`missing main binding ${name}`)
  const js = ts.transpileModule([...found.values()].join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  const compiled = new Function(
    'env',
    `with(env) { ${js}; return {${[...names, ...properties].join(',')}}; }`,
  )
  const factory = (context: object): unknown => compiled(context)
  mainFactories.set(key, factory)
  return factory(env) as T
}
