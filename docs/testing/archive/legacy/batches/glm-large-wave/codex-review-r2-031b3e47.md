# TEST-GLM-LARGE-WAVE-4 · Codex 独立审核 R2

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-LARGE-WAVE-4 R2 审核（2026-09-29，候选 031b3e47…31f 对照 R1 8cb0af0a）：**仍为 rework，未合 main 未运行官方门**。

## Scope

- 已核闭合：工作树干净 31 文件差异仍在白名单内；60 产品源码 digest 全过未改产品/旧测/配置/锁/基线/F-J；完整 lint 2,666 文件 0/0/0；三包 typecheck 零诊断；定向 editor 50/50、reforge 7/7、migrate 9/9；22 处 as never 和 2 处 as unknown as 已清；两个测试后缀与源一致；DataMode 不再 mock 子组件；并集 17 新增/43 existing-proof；needle-judge.selftest 八项绿；Codex 独立跑一枚真实命令表单针 VALID；66 项新测保持通过。

## Execution and assertions

- **窄返工 1 判据清理**：needle-judge:40-42 的 invalid() 直接 process.exit(2)——注入 try 内 :131-158 调用时 :167-169 的 finally 不执行；Codex 真实故意给错 --name 判据正确报 INVALID/exit2 却留下同目录未跟踪 .needle-tmp.test.tsx；改为所有 INVALID/异常路径均清理后再退出；selftest 逐例断言临时文件不存在；failed[0].file.includes(needleBasename) 和 fullName.includes(name) 只做子串检查——按卡面改解析后精确绝对测试文件与完整 fullName 并核汇总 failed 恰 1 避免错文件/同名误判 VALID
- **窄返工 2 陈旧锚**：receipt-batch-b:5 仍写旧 .test.tsx 实际已改 .test.ts；五份回执和 rework-r2-evidence:3 只写 r1 批次 SHA 或「R2 见返工提交」没有本次完整 R2 SHA——修正精确记录并更新可复跑反控命令/自测结果；候选 docs check 7 条缺目录索引是 Codex 维护只读 README 的工作不要求 GLM 越界；R2 回执所写「6 条」按实际更正

## Results

- GLM 仅修原卡隔离工具/回执和必要新测试路径不再扩大产品或测试范围；推送 R3 完整 SHA 复跑 judge 自测和 11 枚代表针、定向、三包 typecheck、完整 lint 0/0/0、docs/diff 后交 Codex 再审。

## Evidence

- 证据路径：本审核正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| R2 审核 | 2026-09-29 | 清理路径+陈旧锚两项 | rework | R1 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-large-wave 的 R2 审核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

rework 两项：invalid() exit(2) 跳过 finally 遗留 .needle-tmp 文件+子串检查不精确；回执陈旧锚与缺 R2 SHA。

## 当时证据

两项窄返工与已闭合清单在 quote 保全。

## 当前有效性

historical。rework 由 R3 accept 闭合（4e200099）。

## 继任文档

当前结论归 TEST-GLM-LARGE-WAVE-4 完成卡。

## 原文保全

固定源 revision `b9af6517a6298e0fb247b97a3b653294d6b45fa2`，source SHA `4fe7a271c56a47196502dd6ec62e3a3903882fa416c9ec1216661ac3843c992b`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-LARGE-WAVE-4 · Codex 独立审核 R2
>
> 日期：2026-09-29。候选 `codex/glm-large-wave-r1` HEAD
> `031b3e479e18bf1add1d5b559716172cfb7c031f`；对照 R1 `8cb0af0a`。
> 结论：**仍为 rework，未合 main，未运行官方 ratchet/受保护 fast**。
>
> ## 已核闭合
>
> - 候选工作树干净，R2 31 文件差异仍在原卡测试/fixture/隔离证据白名单内；
>   60 产品源码 digest 全通过，未改产品、旧测、配置、锁、官方基线或 F–J。
> - Codex 复跑完整 `pnpm lint`：2666 文件、**0 error / 0 warning / 0 info**；
>   editor/reforge/migrate 三包 typecheck 均零诊断；定向 editor 50/50、reforge 7/7、
>   migrate 9/9；`git diff --check` 干净。
> - 22 处 `as never` 和 2 处 `as unknown as` 已清；两个测试文件后缀已与源一致；
>   DataMode 不再 mock 子组件、以真实页签/会话闭环验证。其它子组件 probe
>   仍只证明父组件 props 委派，回执须维持其窄声明。
> - 并集现为 17 个新增源测试/43 个 existing-proof；`needle-judge.selftest.mjs`
>   八项均绿。Codex 用完整 fullName 独立跑一枚真实命令表单针，得到 VALID；
>   66 项新测保持通过。
>
> ## 剩余窄返工
>
> 1. 严格反控的 **INVALID 清理路径未闭合**：`needle-judge.mjs:40–42` 的
>    `invalid()` 直接 `process.exit(2)`；在注入 `try` 内的 `:131–158` 调用它时，
>    `:167–169` 的 `finally` 不执行。Codex 用真实
>    `command-form-world.glm-large-wave.test.tsx` 故意给错 `--name`，判据正确报
>    INVALID/exit2，**却留下同目录未跟踪 `.needle-tmp.test.tsx`**；已仅删除本次
>    诊断生成的文件，候选分支恢复干净。改为所有 INVALID/异常路径均清理后再退出，
>    selftest 须逐例断言临时文件不存在。`failed[0].file.includes(needleBasename)`
>    和 `fullName.includes(name)` 也只做子串检查；按卡面改为解析后的精确绝对
>    测试文件与完整 fullName，并核汇总 failed 恰 1，避免错文件/同名误判 VALID。
> 2. R2 回执仍有陈旧锚：`receipt-batch-b.md:5` 仍写旧 `.test.tsx`，实际已改
>    `.test.ts`。五份回执和 `rework-r2-evidence.md:3` 只写 r1 批次 SHA 或
>    “R2 见返工提交”，没有本次完整 R2 SHA。修正这些精确记录，并更新可复跑
>    反控命令/自测结果。候选 docs check 的 7 条缺目录索引（五回执、并集、R2 证据）
>    是 Codex 维护只读 README 的工作，不要求 GLM 越界改它；R2 回执所写“6 条”
>    应按实际更正。
>
> GLM 仅修原卡隔离工具/回执和必要新测试路径，不再扩大产品或测试范围。
> 推送 R3 完整 SHA，复跑 judge 自测和 11 枚代表针、定向/三包 typecheck、
> 完整 lint 0/0/0、docs/diff 后交 Codex 再审。
>
<!-- original-source-quote:end -->
