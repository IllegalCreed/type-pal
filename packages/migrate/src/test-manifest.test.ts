import { describe, expect, test } from 'vitest'
import { normalizeTestList, summarizeTestList } from './test-manifest.js'

describe('test manifest normalization', () => {
  const root = '/repo/packages/migrate'

  test('uses relative POSIX file/name identity and preserves project routing', () => {
    const entries = normalizeTestList(
      [
        {
          name: '  suite  >  case  ',
          file: `${root}/src/a.test.ts`,
          projectName: 'unit',
        },
        { name: 'other', file: `${root}/src/b.test.ts`, projectName: 'pal-lite' },
      ],
      root,
    )
    expect(entries[0]).toMatchObject({
      file: 'src/a.test.ts',
      name: 'suite > case',
      projectName: 'unit',
    })
    expect(summarizeTestList(entries)).toMatchObject({ files: 2, tests: 2 })
  })

  test('rejects duplicates and files outside the package', () => {
    expect(() =>
      normalizeTestList(
        [
          { name: 'same', file: `${root}/src/a.test.ts` },
          { name: 'same', file: `${root}/src/a.test.ts` },
        ],
        root,
      ),
    ).toThrow(/duplicate/)
    expect(() => normalizeTestList([{ name: 'outside', file: '/tmp/a.test.ts' }], root)).toThrow(
      /package root/,
    )
  })
})
