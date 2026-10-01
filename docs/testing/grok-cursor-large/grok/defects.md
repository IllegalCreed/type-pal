# 缺陷与未完账

本文件只记录会停组的产品缺陷，以及因此不能计入的合同。不把缺陷改写成原版真值，也不修产品。

## G01

没有停组缺陷。`loader.ts` 在 `maxEntries === 1` 且 `protect()` 返回 `undefined` 时，重新装入 scene 0 会把刚写入的 scene 5 淘汰。G01-D06 按这个公开行为断言，evicted 为 `[0]` 再变成 `[0, 5]`。

## G02

没有停组的产品缺陷。

宿主 blocked，不计入新合同：本机 canvas `toBlob` 不保留 alpha 恰好为 1 的像素，也不保留 alpha 0 下面的非零 R。`png.ts:43` 仍按 `A>0` 写 opaque。给不出可观察输入，所以没有为这条路径新写断言，也没有把它写成产品缺陷。

`dialog-assets.ts:114` 的外层 catch 不可达：两个 loader 在 `Promise.all` 之前已经各自 catch。登记为 unreachable，不注入抛错去打它。

本批新合同 36，不是 40。多出来的分支已经由 png、P10、tileset-blob、dialog L23、rle-decode 的旧断言覆盖，记在 `contracts.json` 的 `existingProof`。目标 400/40/40 没有改小。

## 未跑

G03–G10 尚未交付。coverage-delta、receipt 的完整候选 SHA、全包 test、根 lint、docs check、diff check、verifier 留在末批。
