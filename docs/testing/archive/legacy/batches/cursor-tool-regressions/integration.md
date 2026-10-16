# Cursor工具回归正式接入与目录路径修复

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab；本轮 R72。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- Cursor工具回归正式接入与目录路径修复：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `01662fc0b7f4ffd01b8d0c4abe560972b7f7a7ab`，source SHA `db7b3a11d6673d30650d185dcf7f1ea2c3f2b407818bfa774a28b46595419621`；下方 quote 可逆回原始 UTF-8 字节。
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
