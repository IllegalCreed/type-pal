# Cursor工具回归正式接入与目录路径修复

Cursor贡献候选`85f2a824`，Codex独立接收记录在`e11489dd`。用户随后要求验证并提交推送。
本轮把候选放入正式测试入口，并修正`rewriteRepositoryPaths`中较长映射只匹配文本前缀时
遮蔽有效父目录映射的缺陷。此前绿套件22/22与显式诊断1绿/1红是修复前证据。

## 修复边界

- 真实脚本调用见`scripts/docs/relocate.mjs`的`rewriteRepositoryPaths`和`applyRelocation`。
  优先尝试最长映射；若后续字符是路径名的一部分，正则在选中映射前排除此候选，
  让有效的较短父目录映射接续。
- 独立回归先红：`docs/old/deep`与`docs/old/deep-extra.md`不是目录包含关系；
  若还登记`docs/old → docs/archive/old`，应重写这个文件。
- Git SHA历史引用、不同后缀的文件路径及Markdown链接改写保留原合同。
  本轮未改`applyRelocation`的文件事务实现。

## 正式测试入口

- 文档链接定位、本地目标、任务索引、版本段、路径改写与原T05诊断进入`scripts/docs/*.test.mjs`，
  随根`pnpm test:docs-tools`和Documentation workflow执行。四条仅检查导入的烟测未转正，
  重复的父映射正控已合并。
- allowlist与导航字形进入`packages/editor/scripts/cursor-*.test.mjs`，随编辑器Vitest常规测试执行。
  T06在原`selector-prefilter.test.ts`已有充分证据，未增加同义用例。
- 原隔离候选回执保留为历史；测试文件迁入正式位置后，实验目录不再维护第二套活动用例。

## 可复核验证

| 检查 | 结果 |
|---|---|
| 独立路径回归修前 | 预期父路径与实际未改写路径不符，业务AssertionError红 |
| 独立路径回归修后 | 绿；修后原T05诊断同输入也绿 |
| 定向文档工具 | 34/34绿 |
| 定向编辑器审计工具 | 5/5绿 |
| editor typecheck / Biome / 文档静态门 | 通过 |
| 全仓`pnpm check` | exit 0；七包typecheck/test、文档工具及根Biome门通过 |
| 官方`pnpm coverage:ratchet` | exit 0；8039 fast测试、641生产文件，基线只升不降更新，提升0项、范围变化2项 |
| 官方`pnpm coverage:fast` | exit 0；8039/641，行77.45%、分支67.84%，相对新基线无回退 |

文档工具新增用例归独立文档门禁，编辑器新增5项进入官方fast统计；
本轮没有通过缩小生产源码或修改阈值获得覆盖率提升。尚未运行完整E2E。

## 权限与归属

Cursor是候选测试贡献者，Codex负责修复、集成、自验和Git收口。
本次改动限于工具函数和已核测试；剧情、功能视觉、完整E2E与其它架构批次继续按原卡推进。
