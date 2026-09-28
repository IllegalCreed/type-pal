# TEST-KIMI-EDITOR-WORKFLOWS-1 同口径 before/after 覆盖对照

`compare.mjs` 复用 `scripts/coverage/config.mjs` 的 editor 源 include/exclude 与
`testSelection(editor, 'fast')` 参数，跑两次本包 v8 覆盖：

- **before**：官方 fast 测试选择 **额外排除** `**/*.kimi-workflows.test.*`（本卡全部新增测试）；
- **after**：官方 fast 测试选择原样（含本卡新增测试）。

两侧产品文件相同、既有测试相同、生产分母相同、官方环境变量 `TYPE_PAL_COVERAGE_PROFILE=fast`、
均要求 exit 0。输出 `/tmp/type-pal-kimi-editor-workflows/coverage-compare.json`：20 目标小计与
editor 全包的行/分支增量。不写官方 coverage 基线，不 stash 删除旧测试。

```sh
node docs/testing/kimi-editor-workflows/coverage-compare/compare.mjs
# 只重算已跑出的两份 summary（不重跑 vitest）：
node docs/testing/kimi-editor-workflows/coverage-compare/compare.mjs --reuse
```
