# Wave O 疑似产品缺陷报告（停测轴，不修产品）

Owner GLM O 不修产品；以下缺陷以最小红诊断交 Codex 裁决。受影响合同轴停止建模，
不以伪测或放宽断言凑数。其余合同不受影响。

## DEFECT-O-1：mergePages 数组洞守卫失效（`Array.prototype.some` 跳过稀疏洞）

- 位置：`packages/migrate/src/migration-merge.ts:325`（`mergePages` 内）
  ```ts
  if (values.some((value) => value === undefined)) {
    ctx.conflicts.push(conflict(ctx.file, path, 'array-order', base, ours, theirs))
    return cloneNode(ours)
  }
  ```
- 复现（真实公开入口 `mergeManagedFile`，2026-09-30 于候选树）：
  base `{"pages":[{"cue":"p1"},{"cue":"p2"}]}`，ours 删除尾页 `{"pages":[{"cue":"p1"}]}`，
  theirs 在更长尾追加 `{"pages":[{"cue":"p1"},{"cue":"p2"},{"cue":"p3"}]}`。
  elementwise 循环在下标 1 产出 hole（ours 删除胜），`values = [p1, <hole>, p3]`；
  `values.some(v => v === undefined)` 对稀疏洞**不访问**（some 跳过 empty slot），
  守卫不触发，函数返回 `{"pages":[{"cue":"p1"},null,{"cue":"p3"}]}` ——
  把字面 `null` 页条目当作合并结果，而不是 fail-closed 的 array-order 冲突。
- 影响：`content/scenes/sXXX.json` 的 pages 数组在“一方删除 + 另一方更长尾追加”
  的非身份条目场景下，合并结果含 null 条目。下游 validateAuthorScenes 会拒绝 null
  （fail-loud 兜底），但迁移器自身的“数组洞 → array-order 冲突”合同失效；
  冲突计数少 1，作者会看到低质量诊断（null 页条目而非冲突定位）。
  身份化 pages（条目带 id，真实 PAL 数据形态）不走此路径。
- 修复方向（供 Codex 参考，不在本卡实施）：以 `values.length !== expectedLength`
  或 `for` 下标显式检查 hole，替代 `values.some(...)`。
- 处置：O02 的“pages 数组洞 → array-order 冲突”轴停测（测试文件内留注释锚点）；
  不写断言错误行为的伪测。未提交任何产品修改。
