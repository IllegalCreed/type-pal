/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · migration-merge 残余分支合同。
 *
 * 排重 basis（旧 fullName 不重复）：migration-merge.test.ts 覆盖三方真值表、value/add-add/
 * delete-modify 冲突、id 数组合并与 ours-only 顺序；migration-merge.boundaries.test.ts 与
 * migration-merge.glm-o.test.ts 覆盖 pages/stages/scene-index 主合并面与 sprite/stamps
 * 特殊规则。本文件只补 fast lcov 一手测量的未覆盖 edge：
 * - orderedIds 链式锚定：lastInserted.get 命中与 ?? candidate 回退双方向（:226）——
 *   base 五连 id 被 ours 全改、theirs 删除中段时，后段插入锚定到前段插入结果。
 * - mergeIdentityArray 过滤双侧删除的 id（:292 空数组臂）。
 * - mergePages：theirs 尾短于 max 的 absent 臂（:319）。
 * - base 缺失时数组按 mode 分派：'id'（:377）、'scene-index' strictOrder 调用（:378-379）、
 *   pages/stages 有身份合并（:380 真）与无身份回退 add-add（:380 假，含非 pages 模式 :380 短路与）。
 * 不覆盖（ledger）：
 * - :124 'add-add' 臂——base 缺失且单侧缺失时，118/119 的 same() 早已吸收，进 :122 必 base.present。
 * - :137-139 mergeObject 的 `: {}`/`?? {}`——mergeObject 调用点（:405/:338）已保证三侧皆对象。
 * - :184-200 primitiveIdentityMaps——mergeIdentityArray 的 primitive 形参在所有调用点
 *   （:377/379/385/389/391/394/403）恒为 false，函数构造上不可达。
 * - :242 `if (rootAnchor)` false 臂——anchor 命中意味着某个 base 前驱在 output 中，
 *   rootAnchor 扫描同一区间必然同样命中。
 * - :257 `primitive ? primitiveIdentityMaps : identityMaps` 真臂——mergeIdentityArray 的
 *   primitive 形参在所有调用点（:377/379/385/389/391/394/403）恒为 false。
 * - :292 flatMap `value?.present ? … : []` 假臂——orderedIds 的输出已经 live()
 *   （merged.present === true）过滤，进入 flatMap 的 id 恒 present。
 * - :326 中间洞 array-order——values 以 `values[index] = …` 稀疏赋值，Array.prototype.some
 *   跳过稀疏洞；显式 undefined 元素要求 present+value:undefined 节点，MigrationJson 类型
 *   不允许，typed 输入构造上不可达。
 */

import { describe, expect, test } from 'vitest'
import { jsonAbsent, jsonPresent, mergeManagedFile } from './migration-merge.js'

const item = (id: string, v: number): { id: string; v: number } => ({ id, v })

describe('KIMI-R1 mergeIdentityArray orderedIds 链式锚定', () => {
  test('ours 全改 + theirs 删中段：后段插入锚定前段插入（?? candidate 回退方向）', () => {
    const base = ['a', 'x', 'y', 'z', 'w', 'b'].map((id) => item(id, 0))
    const ours = ['a', 'x', 'y', 'z', 'w', 'b'].map((id) =>
      item(id, id === 'a' || id === 'b' ? 0 : 1),
    )
    const theirs = ['a', 'b'].map((id) => item(id, 0))
    const result = mergeManagedFile(
      'content/items.json',
      jsonPresent(base),
      jsonPresent(ours),
      jsonPresent(theirs),
    )
    // 中段 x/y/z/w delete-modify 冲突归 ours，顺序锚定回 base 相对位置
    expect(result.conflicts.map((c) => [c.path, c.type])).toEqual([
      ['/@string:x', 'delete-modify'],
      ['/@string:y', 'delete-modify'],
      ['/@string:z', 'delete-modify'],
      ['/@string:w', 'delete-modify'],
    ])
    expect(result.value.value).toEqual([
      item('a', 0),
      item('x', 1),
      item('y', 1),
      item('z', 1),
      item('w', 1),
      item('b', 0),
    ])
  })

  test('ours 交换相邻锚定 id 顺序：lastInserted.get 命中方向（锚定到前段插入结果之后）', () => {
    // base [a,x,y,b]；ours 把 y 排到 x 前并双改；theirs 删 x/y。
    // 按 ours 序先处理 y：candidate 'a' 未入 map → ?? 回退锚 a 后 → [a,y,b]，记 a→y；
    // 再处理 x：candidate 'a' 已在 map → get 命中 → 锚到 y 后 → [a,y,x,b]。
    const base = ['a', 'x', 'y', 'b'].map((id) => item(id, 0))
    const ours = ['a', 'y', 'x', 'b'].map((id) => item(id, id === 'a' || id === 'b' ? 0 : 1))
    const theirs = ['a', 'b'].map((id) => item(id, 0))
    const result = mergeManagedFile(
      'content/items.json',
      jsonPresent(base),
      jsonPresent(ours),
      jsonPresent(theirs),
    )
    expect(result.conflicts.map((c) => [c.path, c.type])).toEqual([
      ['/@string:x', 'delete-modify'],
      ['/@string:y', 'delete-modify'],
    ])
    expect(result.value.value).toEqual([item('a', 0), item('y', 1), item('x', 1), item('b', 0)])
  })

  test('双侧同删的 id 从结果过滤（merged absent → 空数组臂）', () => {
    const result = mergeManagedFile(
      'content/items.json',
      jsonPresent([item('a', 0), item('x', 0)]),
      jsonPresent([item('a', 0)]),
      jsonPresent([item('a', 0)]),
    )
    expect(result).toEqual({ value: jsonPresent([item('a', 0)]), conflicts: [] })
  })
})

describe('KIMI-R1 mergePages 边界', () => {
  const pages = (n: number): Array<{ text: string }> =>
    Array.from({ length: n }, (_, i) => ({ text: `p${i}` }))

  test('theirs 尾短于 max：theirs absent 臂合并为尾删', () => {
    const result = mergeManagedFile(
      'content/scenes/s1.json',
      jsonPresent({ pages: pages(3) }),
      jsonPresent({ pages: pages(2) }),
      jsonPresent({ pages: pages(1) }),
    )
    expect(result).toEqual({ value: jsonPresent({ pages: pages(1) }), conflicts: [] })
  })

  test('ours 改 theirs 尾删交错：页内 delete-modify 冲突归 ours', () => {
    // base 4 页；ours 仅改 p3；theirs 尾删 p2/p3 → idx3 delete-modify 归 ours 保留
    const oursPages = pages(4)
    oursPages[3] = { text: 'p3-改' }
    const result = mergeManagedFile(
      'content/scenes/s1.json',
      jsonPresent({ pages: pages(4) }),
      jsonPresent({ pages: oursPages }),
      jsonPresent({ pages: pages(2) }),
    )
    expect(result.conflicts).toMatchObject([{ path: '/pages/3', type: 'delete-modify' }])
    // 现状 characterization：idx2 被 same(ours,base) 吸收成稀疏洞并漏进输出（:326 的
    // some() 跳过稀疏洞、不报 array-order —— 见本文件头注 ledger）。钉住真实输出形状。
    expect(result.value.value).toEqual({
      pages: [pages(4)[0], pages(4)[1], undefined, { text: 'p3-改' }],
    })
  })
})

describe('KIMI-R1 base 缺失数组 mode 分派', () => {
  test('mode id：base 缺失时按 theirs 序 + ours-only 无锚尾追加并逐键合并', () => {
    const result = mergeManagedFile(
      'content/items.json',
      jsonAbsent(),
      jsonPresent([item('b', 1)]),
      jsonPresent([item('a', 2)]),
    )
    expect(result).toEqual({ value: jsonPresent([item('a', 2), item('b', 1)]), conflicts: [] })
  })

  test('mode scene-index：base 缺键时 strictOrder 调用（双侧新增不判顺序冲突）', () => {
    // base 有根对象但无 scenes 键 → '/scenes' 节点 base 缺失、双侧数组
    const result = mergeManagedFile(
      'content/scenes/index.json',
      jsonPresent({}),
      jsonPresent({ scenes: [{ id: 's2', name: '乙' }] }),
      jsonPresent({ scenes: [{ id: 's1', name: '甲' }] }),
    )
    expect(result).toEqual({
      value: jsonPresent({
        scenes: [
          { id: 's1', name: '甲' },
          { id: 's2', name: '乙' },
        ],
      }),
      conflicts: [],
    })
  })

  test('mode pages：base 缺键且双侧数组带身份 → identity 合并', () => {
    const result = mergeManagedFile(
      'content/scenes/s1.json',
      jsonPresent({}),
      jsonPresent({ pages: [item('p2', 1)] }),
      jsonPresent({ pages: [item('p1', 2)] }),
    )
    expect(result).toEqual({
      value: jsonPresent({ pages: [item('p1', 2), item('p2', 1)] }),
      conflicts: [],
    })
  })

  test('mode pages：base 缺键但数组无身份 → 回退 atomic add-add 冲突', () => {
    const result = mergeManagedFile(
      'content/scenes/s1.json',
      jsonPresent({}),
      jsonPresent({ pages: [{ text: 'ours' }] }),
      jsonPresent({ pages: [{ text: 'theirs' }] }),
    )
    expect(result.conflicts).toMatchObject([{ path: '/pages', type: 'add-add' }])
    expect(result.value.value).toEqual({ pages: [{ text: 'ours' }] })
  })

  test('mode atomic（非 pages/stages/id/scene-index）：base 缺键数组直接 add-add 冲突', () => {
    const result = mergeManagedFile(
      'content/items.json',
      jsonPresent({}),
      jsonPresent({ other: [1, 2] }),
      jsonPresent({ other: [3] }),
    )
    expect(result.conflicts).toMatchObject([{ path: '/other', type: 'add-add' }])
    expect(result.value.value).toEqual({ other: [1, 2] })
  })
})
