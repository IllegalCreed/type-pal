import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeOrganization } from './organization-program.mjs'

const path = 'packages/game/src/shell/dependency-probe.test.ts'
const inspect = (source) => analyzeOrganization(process.cwd(), { [path]: source })[path].tests[0]

test('object shorthand keeps its value declaration and transitive import', () => {
  const result = inspect(`
    import { paletteInput } from './fixture.js'
    const palette = paletteInput()
    it('uses a palette', () => { draw({ palette }) })
  `)
  assert.deepEqual(
    result.declarations.map((x) => x.names),
    [['palette']],
  )
  assert.deepEqual(
    result.imports.map((x) => x.name),
    ['paletteInput'],
  )
})

test('shorthand in an applicable hook resolves the inner binding', () => {
  const result = inspect(`
    const palette = 9
    describe('inner', () => {
      const palette = 7
      beforeEach(() => { install({ palette }) })
      it('owns the inner palette', () => { assertReady() })
    })
  `)
  assert.equal(result.hooks.length, 1)
  assert.equal(result.declarations.length, 1)
  assert.match(result.declarations[0].text, /palette = 7/)
  assert.doesNotMatch(result.declarations[0].text, /palette = 9/)
})

test('identical callbacks cannot conceal a changed shorthand fixture', () => {
  const source = (blue) => `
    const palette = [20, ${blue}]
    it('renders', () => { draw({ palette }) })
  `
  const before = inspect(source(40))
  const after = inspect(source(30))
  assert.equal(before.statementSyntaxSha256, after.statementSyntaxSha256)
  assert.equal(before.declarations.length, 1)
  assert.equal(after.declarations.length, 1)
  assert.notEqual(before.declarations[0].syntaxSha256, after.declarations[0].syntaxSha256)
})
