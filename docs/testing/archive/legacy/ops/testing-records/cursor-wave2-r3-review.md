# CURSOR-WAVE-2-1 · Codex 三轮独立接收与整卡收口

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision e0ddc80b28ab45394aa560855d51de65ecd568e1；本轮 R80。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- CURSOR-WAVE-2-1 · Codex 三轮独立接收与整卡收口：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `9cf84ee1181a1e93757e7f21cee614c9994e909f71355e85c9f632f81bd4a5ca`；下方 quote 可逆回原始 UTF-8 字节。
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
