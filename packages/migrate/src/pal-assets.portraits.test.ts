import { unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'
import {
  assertSources,
  json,
  portraitsPath,
  put,
  staticFixture,
} from './__tests__/pal-asset-fixtures.js'

describe('PAL portrait sparse extraction', () => {
  test('missing source does not renumber remaining portrait IDs or provenance', () => {
    const f = staticFixture()
    json(f.repo, portraitsPath, { count: 89 })
    unlinkSync(resolve(f.repo, 'data/extracted/images/portraits/01.png'))
    put(f.repo, 'data/extracted/images/portraits/89.png', f.image)
    const result = f.run()
    assertSources(result.binaries)
    const portraits = result.binaries.filter((s) => s.record.kind === 'portrait')
    expect(portraits.map((s) => s.id)).toEqual(
      Array.from({ length: 88 }, (_, i) => `portrait.pal.${String(i + 2).padStart(3, '0')}`),
    )
    expect(portraits[0]!.record).toMatchObject({
      path: 'assets/migrated/portraits/002.png',
      origin: { kind: 'legacy-migrated', ref: 'images/portraits/02.png' },
    })
    expect(result.report.portraitBytes).toBe(portraits.reduce((sum, s) => sum + s.record.bytes, 0))
  })
  test.each([undefined, 0, -1, 88.5, '88'])('rejects nonpositive/noninteger count %j', (count) => {
    const f = staticFixture()
    json(f.repo, portraitsPath, { count })
    expect(f.run).toThrow('PAL portraits manifest 期望正整数 count')
  })
  test('does not silently accept 87 successfully decoded portraits', () => {
    const f = staticFixture()
    unlinkSync(resolve(f.repo, 'data/extracted/images/portraits/88.png'))
    expect(f.run).toThrow('PAL 立绘期望 88 张，收到 87')
  })
})
