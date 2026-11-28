import { expect, test } from 'vitest'
import {
  generateExperienceCurve,
  isExperienceCurveNonDecreasing,
  resizeExperienceCurve,
} from './experience-curve.js'

test('growing increments and constant increments produce their indexed thresholds', () => {
  expect(generateExperienceCurve(15, 25, 4)).toEqual([0, 15, 55, 120])
  expect(generateExperienceCurve(10, 0, 3)).toEqual([0, 10, 20])
})

test('resizing keeps the existing prefix and only extends its final step', () => {
  const original = [0, 15, 55]
  expect(resizeExperienceCurve(original, 5)).toEqual([0, 15, 55, 95, 135])
  expect(resizeExperienceCurve(original, 2)).toEqual([0, 15])
  expect(original).toEqual([0, 15, 55])
  expect(resizeExperienceCurve([7], 3)).toEqual([7, 14, 21])
})

test('equal thresholds are allowed and a falling threshold is reported', () => {
  expect(isExperienceCurveNonDecreasing([0, 15, 15])).toBe(true)
  expect(isExperienceCurveNonDecreasing([0, 55, 15])).toBe(false)
})
