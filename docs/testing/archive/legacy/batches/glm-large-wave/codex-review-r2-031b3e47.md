# TEST-GLM-LARGE-WAVE-4 · Codex 独立审核 R2

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision b9af6517a6298e0fb247b97a3b653294d6b45fa2；本轮 R74。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- TEST-GLM-LARGE-WAVE-4 · Codex 独立审核 R2：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `b9af6517a6298e0fb247b97a3b653294d6b45fa2`，source SHA `4fe7a271c56a47196502dd6ec62e3a3903882fa416c9ec1216661ac3843c992b`；下方 quote 可逆回原始 UTF-8 字节。
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
