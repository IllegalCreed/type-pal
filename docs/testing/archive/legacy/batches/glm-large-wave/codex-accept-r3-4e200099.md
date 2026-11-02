# TEST-GLM-LARGE-WAVE-4 · Codex R3 独立代码验收

Status: historical
Owner: Codex（文档治理；不代签原执行——原执行为 Codex 席位，本页只接模板）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-LARGE-WAVE-4 R3 候选（`codex/glm-large-wave-r1` HEAD `4e200099…dfee`，2026-09-29）的 Codex 独立代码验收回执：**测试/证据候选 accept；尚未集成 main，任务保持 review，官方统一质量/覆盖门未运行，不标 done**。

## Scope

- 候选：`codex/glm-large-wave-r1` HEAD `4e200099257ed5167b640eb5abadd7129859dfee`；日期 2026-09-29；对象=五批 60 目标测试/证据候选（R3 对 R2 仅改 8 个原卡工具/回执文件）。

## Execution and assertions

| step | legal input | caller | machine assertion | business oracle |
|---|---|---|---|---|
| 范围核 | 候选工作树 vs 产品源/旧测/配置/基线/F–J | git 状态 | 干净、零改 | 60 目标及五个源码 digest 独立校验=17 新增源测试/43 existing-proof 并集 |
| 统一门复跑 | 完整 lint 2666 文件；editor/reforge/migrate typecheck | pnpm | 0 error/0 warning/0 info；三包零诊断 | 新增定向 editor 50/50、reforge 7/7、migrate 9/9 |
| 判据核 | `needle-judge.selftest.mjs` 8 项断言；真实命令表单测试 | 判据自测+实针 | 8 项全过；错误 fullName→INVALID/exit2 无临时文件遗留；精确 fullName→VALID/exit0；执行数 6→6、产品 hash 不变；非唯一注入点→INVALID/exit2 | 判据精确比对绝对失败文件、完整 fullName、failed=1 |

## Results

- R2 硬门、非法强转、同扩展名与 17/43 并集核闭合；其余组件 probe 仅按回执窄范围证明父组件委派。
- 候选 `docs/check.mjs` 7 条=只读 `README.md` 未链接五回执、并集、R2 证据，由 Codex 集成时维护导航。
- 勘误：R3 证据称 selftest「9 项」实际打印 8 项；缺的非唯一注入反例由 Codex 实针补核。
- 返工提交自身 SHA 无法自写进同一提交；本回执固定完整 HEAD。

## Evidence

- 证据路径：本回执正文（quote 保全）；R2 证据在同批 `rework-r2-evidence.md`、并集 `five-batch-union.md`。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| R3 验收 | 2026-09-29 | 仅改 8 个原卡工具/回执文件 | 测试/证据候选 accept | R2 counter（8cb0af0a 复核） |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

- legacy batches/glm-large-wave 的 Codex R3 验收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

- accept（候选级）：17 新增/43 existing-proof 并集、lint/typecheck/定向全绿、判据 8 项自测+实针补核；未集成 main、官方门未跑、不标 done。

## 当时证据

- 候选 HEAD、复跑数字、判据自测与 docs check 7 条在 quote 保全。

## 当前有效性

- historical。accept 仅指当时候选；当前状态以现行 catalog 与官方门为准。

## 继任文档

- 当前结论归 docs/testing catalog 与 canonical 报告；集成收益以 main 并集实测。

## 原文保全

固定源 revision `b9af6517a6298e0fb247b97a3b653294d6b45fa2`，source SHA `7651adba552b0da8e2640017559b912511dde27e2f19d5cc3d609a45effa3047`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-LARGE-WAVE-4 · Codex R3 独立代码验收
>
> 日期：2026-09-29。候选 `codex/glm-large-wave-r1` HEAD
> `4e200099257ed5167b640eb5abadd7129859dfee`。结论：**测试/证据候选 accept；
> 尚未集成 main，任务保持 review，官方统一质量/覆盖门未运行，不标 done**。
>
> - R3 对 R2 仅改 8 个原卡工具/回执文件；候选工作树干净，产品源、旧测、
>   配置/基线、F–J 零改。60 目标及五个源码 digest 独立校验通过，
>   并集为 17 新增源测试 / 43 existing-proof。
> - Codex 复跑完整 lint：2666 文件，0 error/0 warning/0 info；editor/reforge/migrate
>   三包 typecheck 零诊断；新增定向 editor 50/50、reforge 7/7、migrate 9/9。
> - `needle-judge.selftest.mjs` 输出的 8 项断言均通过；Codex 用真实命令表单测试
>   独立验证错误 fullName→INVALID/exit2 **无临时文件遗留**，精确 fullName→VALID/exit0，
>   执行数 6→6、产品 hash 不变；非唯一注入点→INVALID/exit2，也无遗留。
>   判据现在精确比对绝对失败文件、完整 fullName 和 failed=1。
> - R2 的硬门、非法强转、同扩展名与实际 17/43 均已核闭合。其余组件 probe
>   仅按回执窄范围证明父组件委派，不提升为完整子组件/E2E 合同。
> - 候选 `docs/check.mjs` 的 7 条均是只读 `README.md` 未链接五回执、并集、
>   R2 证据；Codex 在选择性集成时维护导航。R3 证据所称 selftest“9 项”
>   实际打印 8 项；缺的非唯一注入反例由 Codex 实针补核，如上记录。
>   返工提交自身 SHA 无法自写进同一提交；本审核回执固定上述完整 HEAD。
>
> 后续：与 F–J 已接收候选去重选择性集成，统一串行 `pnpm check` → 官方 ratchet →
> 受保护 fast，正式收益以 main 并集实测。未过这些门前不标 done/不清理工作树。
>
<!-- original-source-quote:end -->
