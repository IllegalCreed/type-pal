# CURSOR-WAVE-2-1 · Codex 三轮独立接收与整卡收口

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 CURSOR-WAVE-2-1 三轮接收与整卡收口（2026-09-25，最终候选 af776bb8…5950）：W3/W4 accept；五包全部完成，整卡 done；Codex 选择性接入 main，贡献者自验不充当独立审查。

## Scope

- W3：binary-signature.test.ts 去掉 @ts-nocheck 与仿写函数（保留同长异文/偏移视图/输入不变断言），project-read-admission 新增真实锁失败释放；W4：50/49 显示值改精确 .v.textContent、删正则仿写。

## Execution and assertions

- **W3 复核**：Vite load 仅内存把生产 Uint8Array.from(bytes).buffer 改 bytes.buffer；偏移视图测试原树 passed、变异树 exit1 唯一 failed 首行 AssertionError；见证指向真实 binary-signature.ts、磁盘 SHA 前后同；editor 3 文件 48/48、typecheck 0
- **W4 复核**：内存把生产 fps >= 50 改 >= 49；同一 49/50 测试变异树 exit1 唯一 failed（AssertionError: expected null not to be null）；见证指向真实 fps-overlay.ts；game 3 文件 20/20、typecheck 0
- **收口门**：变异器与回执超简写白名单但 Codex 明示接收（仅 mkdtemp 临时文件+finally 清理不改磁盘产品）；接入后 main 两针 2 control 绿/2 业务红；根 check exit0；ratchet exit0 fast 8,110→8,120/642 无虚增；受保护单次 fast exit0 8,120/642 行 78.00%/分支 68.28% 零回退

## Results

- 整包无新产品缺陷；W1 环保存门缺口仍按文档审计单列；未跑剧情 E2E；无下一位 Cursor 提示词。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 三轮收口 | 2026-09-25 | W3/W4 真变异复跑+三门 | accept→整卡 done | 二轮 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy ops/testing-records 的 cursor-wave2 三轮收口回执；固定来源与 source SHA 见下方保全节。

## 原始结论

done：W3/W4 改真实 Vite load 内存变异（生产函数单点、唯一 failed、源 hash 不变）；三门 exit0；五包全部完成。

## 当时证据

两针复跑与白名单例外明示接收在 quote 保全。

## 当前有效性

historical。done 按当时任务范围。

## 继任文档

当前结论归 CURSOR-WAVE-2-1 任务卡。

## 原文保全

固定源 revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `9cf84ee1181a1e93757e7f21cee614c9994e909f71355e85c9f632f81bd4a5ca`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # CURSOR-WAVE-2-1 · Codex 三轮独立接收与整卡收口
>
> 2026-09-25。结论：**W3/W4 accept；W1/W2/W5 已分别接受，五包全部完成，整卡 done。** Cursor 最终候选 `af776bb8bac0be3d9dde81e7d84ac46171e45950` 由 Codex 选择性接入 main；贡献者自验不充当独立审查。本轮只补 W3/W4，不重领[首轮](cursor-wave2-review.md)和[二轮](cursor-wave2-r2-review.md)已关闭项。
>
> ## 直接证据
>
> - W3：`binary-signature.test.ts` 去掉 `@ts-nocheck` 与测试内仿写函数，仅保留同长异文、偏移视图/输入不变两条业务断言；`project-read-admission.test.ts` 新增真实锁失败释放断言。Cursor 脚本 `module-mutants.mjs` 的 Vite `load` 仅在内存把生产 `Uint8Array.from(bytes).buffer` 改为 `bytes.buffer`。Codex 独立复跑：指定偏移视图测试原树 passed、变异树 exit1 且该测试唯一 failed，首行 `AssertionError`；进入见证指向真实 `binary-signature.ts`，磁盘 SHA 前后相同。editor 定向 3 文件 48/48、typecheck 0。
> - W4：`fps-overlay.test.ts` 的 50/49 显示值改为精确 `.v.textContent`，不再以子串过关；删除测试内正则仿写阈值。Vite `load` 只在内存把生产 `fps >= 50` 改为 `>= 49`；Codex 独立复跑同一正式 49/50 测试原树 passed、变异树 exit1 且该测试唯一 failed，首行 `AssertionError: expected null not to be null`；见证指向真实 `fps-overlay.ts`，磁盘 SHA 前后相同。game 定向 3 文件 20/20、typecheck 0。
> - 变异器与回执是本包可重建的诊断资产，虽超出最初“测试文件+回执”简写白名单，Codex 明示接收：脚本仅在系统 `mkdtemp` 写临时 config/JSON/日志，默认 `finally` 精确清理，未修改磁盘产品模块；本席留证时独立检查 JSON 的 file/fullName/status/AssertionError 与唯一进入 marker，随后删除本人临时目录。候选及 main 的 `packages/ scripts/` 增量均只有测试，不含生产实现、配置、资产或排除规则。候选依赖软链接已撤，工作树干净。
> - 选择性接入后在 main 再跑两针：2 control green / 2 指定业务 AssertionError；改动文件 Biome、docs PASS。根 `pnpm check` exit0；官方 `pnpm coverage:ratchet` exit0，fast 8,110→8,120 项、生产文件仍 642，行/分支度量无虚增；受保护单次 `pnpm coverage:fast` exit0，8,120/642，行 55,045/70,571（78.00%）、分支 43,134/63,176（68.28%），相对新基线零回退。没有缩 include/exclude、调高超时、降低阈值或每补一项重跑覆盖率。
>
> 整包没有发现新的产品缺陷。W1 的脚本调用环保存门缺口仍按先前[文档审计](../../editor/editor-workflows/cursor-author-guides-review.md)单列，不因指南改准确或补测试而关闭。未运行剧情 E2E；当前五包是非视觉文档/纯逻辑测试。Grok/GLM/其它 Agent 的架构卡不借本卡签字。无下一位 Cursor 返工提示词，本卡完成。
>
<!-- original-source-quote:end -->
