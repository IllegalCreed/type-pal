/**
 * TEST-GLM-CONTENT-GUARDS-3 test-only fixture：八份残差测试共用的薄断言助手。
 * 只包断言结构，不含产品算法；合法基线构造仍由各测试内联完成。
 */
import { expect } from 'vitest'
import { deepSnapshot } from './glm-content-contract-fixtures.js'
import { expectExactError } from './guard-leaf-fixtures.js'

/**
 * R2：拒绝调用的实际入参保真——本次调用前取独立快照，执行后立即比较同一实参。
 * 同一测试内的第二、第三次拒绝调用各自重新取快照；原始不可变标量不使用本助手。
 */
export function expectRejectUnchanged<T>(run: (input: T) => void, input: T, message: string): void {
  const before = deepSnapshot(input)
  expectExactError(() => run(input), message)
  expect(input).toEqual(before)
}
