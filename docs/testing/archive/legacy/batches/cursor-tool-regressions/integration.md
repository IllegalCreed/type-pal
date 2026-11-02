# Cursor工具回归正式接入与目录路径修复

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 Cursor 工具回归正式接入与目录路径修复回执（候选 85f2a824 Codex 独立接收记录 e11489dd；用户要求验证并提交推送；本轮把候选放入正式测试入口并修正 rewriteRepositoryPaths 中较长映射只匹配文本前缀时遮蔽有效父目录映射的缺陷——此前绿套件 22/22 与显式诊断 1 绿/1 红是修复前证据）。

## Scope

- 修复边界：relocate.mjs 的 rewriteRepositoryPaths/applyRelocation 真实脚本；优先最长映射若后续字符是路径名一部分正则在选中映射前排除此候选让有效较短父目录映射接续；独立回归先红（docs/old/deep 与 docs/old/deep-extra.md 不是目录包含关系若还登记 docs/old→docs/archive/old 应重写）；Git SHA 历史引用/不同后缀路径/Markdown 链接改写保留原合同未改 applyRelocation 文件事务实现。

## Execution and assertions

- **正式入口**：文档链接定位/本地目标/任务索引/版本段/路径改写/原 T05 诊断进入 scripts/docs/*.test.mjs 随根 test:docs-tools 与 Documentation workflow；四条仅检查导入的烟测未转正重复父映射正控已合并；allowlist 与导航字形进入 packages/editor/scripts/cursor-*.test.mjs 随编辑器常规 Vitest；T06 原 selector-preflight.test.ts 已有充分证据不增同义用例；原隔离候选回执保留历史测试迁入正式位置后实验目录不再维护第二套活动用例
- **验证表**：独立路径回归修前 AssertionError 红/修后绿且原 T05 诊断同输入也绿；定向文档工具 34/34+编辑器审计 5/5；editor typecheck/Biome/文档静态门过；全仓 check exit0；ratchet exit0 8,039 fast/641 文件基线只升不降（提升 0 范围变化 2）+fast exit0 行 77.45%/分支 67.84% 无回退；文档工具新用例归独立文档门禁编辑器新增 5 项进官方 fast；未缩生产未改阈值未跑完整 E2E

## Results

- Cursor 候选测试贡献者 Codex 负责修复/集成/自验/Git 收口；改动限于工具函数和已核测试。

## Evidence

- 原回执的独立路径回归先红后绿、定向文档工具 34/34、编辑器审计 5/5，以及 check/ratchet/fast 原时点验证表；当前仅治理文档，未重新执行这些历史产品门。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 工具回归集成 | 原文时点 | 六项正式入口接入 docs 工具链；rewriteRepositoryPaths 前缀遮蔽先红后绿修复 | 集成完成（三门过） | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

本页是 Cursor 工具回归正式接入与目录路径修复回执（候选 85f2a824 Codex 独立接收记录 e11489dd；用户要求验证并提交推送；本轮把候选放入正式测试入口并修正 rewriteRepositoryPaths 中较长映射只匹配文本前缀时遮蔽有效父目录映射的缺陷——此前绿套件 22/22 与显式诊断 1 绿/1 红是修复前证据）。 本节仅描述固定原源及其候选时点。

## 原始结论

工具回归接入+rewriteRepositoryPaths 前缀遮蔽修复（先红后绿）；正式入口 docs 工具+编辑器审计；三门 fast 8,039 范围变化 2。以上是原卡时点陈述，本页未复跑。

## 当时证据

- 原回执的独立路径回归先红后绿、定向文档工具 34/34、编辑器审计 5/5，以及 check/ratchet/fast 原时点验证表；当前仅治理文档，未重新执行这些历史产品门。

原始执行、反例和后续处理按固定 quote 保留，不由本次静态治理重授。

## 当前有效性

historical。工具回归接入+rewriteRepositoryPaths 前缀遮蔽修复（先红后绿）；正式入口 docs 工具+编辑器审计；三门 fast 8,039 范围变化 2是固定原源时点的记录；本页不代表当前产品、E2E、视觉或覆盖率通过。

## 继任文档

后续状态以 TEST-CURSOR-TOOLS-1 原任务卡及其明确验收链为准；本历史页不新授信用。

## 原文保全

固定源 revision `01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab`，source SHA `db7b3a11d6673d30650d185dcf7f1ea2c3f2b407818bfa774a28b46595419621`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。

<!-- original-source-quote:start -->
> # Cursor工具回归正式接入与目录路径修复
>
> Cursor贡献候选`85f2a824`，Codex独立接收记录在`e11489dd`。用户随后要求验证并提交推送。
> 本轮把候选放入正式测试入口，并修正`rewriteRepositoryPaths`中较长映射只匹配文本前缀时
> 遮蔽有效父目录映射的缺陷。此前绿套件22/22与显式诊断1绿/1红是修复前证据。
>
> ## 修复边界
>
> - 真实脚本调用见`scripts/docs/relocate.mjs`的`rewriteRepositoryPaths`和`applyRelocation`。
>   优先尝试最长映射；若后续字符是路径名的一部分，正则在选中映射前排除此候选，
>   让有效的较短父目录映射接续。
> - 独立回归先红：`docs/old/deep`与`docs/old/deep-extra.md`不是目录包含关系；
>   若还登记`docs/old → docs/archive/old`，应重写这个文件。
> - Git SHA历史引用、不同后缀的文件路径及Markdown链接改写保留原合同。
>   本轮未改`applyRelocation`的文件事务实现。
>
> ## 正式测试入口
>
> - 文档链接定位、本地目标、任务索引、版本段、路径改写与原T05诊断进入`scripts/docs/*.test.mjs`，
>   随根`pnpm test:docs-tools`和Documentation workflow执行。四条仅检查导入的烟测未转正，
>   重复的父映射正控已合并。
> - allowlist与导航字形进入`packages/editor/scripts/cursor-*.test.mjs`，随编辑器Vitest常规测试执行。
>   T06在原`selector-prefilter.test.ts`已有充分证据，未增加同义用例。
> - 原隔离候选回执保留为历史；测试文件迁入正式位置后，实验目录不再维护第二套活动用例。
>
> ## 可复核验证
>
> | 检查 | 结果 |
> |---|---|
> | 独立路径回归修前 | 预期父路径与实际未改写路径不符，业务AssertionError红 |
> | 独立路径回归修后 | 绿；修后原T05诊断同输入也绿 |
> | 定向文档工具 | 34/34绿 |
> | 定向编辑器审计工具 | 5/5绿 |
> | editor typecheck / Biome / 文档静态门 | 通过 |
> | 全仓`pnpm check` | exit 0；七包typecheck/test、文档工具及根Biome门通过 |
> | 官方`pnpm coverage:ratchet` | exit 0；8039 fast测试、641生产文件，基线只升不降更新，提升0项、范围变化2项 |
> | 官方`pnpm coverage:fast` | exit 0；8039/641，行77.45%、分支67.84%，相对新基线无回退 |
>
> 文档工具新增用例归独立文档门禁，编辑器新增5项进入官方fast统计；
> 本轮没有通过缩小生产源码或修改阈值获得覆盖率提升。尚未运行完整E2E。
>
> ## 权限与归属
>
> Cursor是候选测试贡献者，Codex负责修复、集成、自验和Git收口。
> 本次改动限于工具函数和已核测试；剧情、功能视觉、完整E2E与其它架构批次继续按原卡推进。
>
<!-- original-source-quote:end -->
