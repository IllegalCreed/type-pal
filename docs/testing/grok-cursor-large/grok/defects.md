# 缺陷与未完账

本文件只记录会停组的产品缺陷，以及因此不能计入的合同。不把缺陷改写成原版真值，也不修产品。

## G01

没有停组缺陷。`loader.ts` 在 `maxEntries === 1` 且 `protect()` 返回 `undefined` 时，重新装入 scene 0 会把刚写入的 scene 5 淘汰。G01-D06 按这个公开行为断言，evicted 为 `[0]` 再变成 `[0, 5]`。

## 未跑

G02–G10 尚未交付。coverage-delta、receipt 的完整候选 SHA、全包 test、根 lint、docs check、diff check、verifier 留在末批。
