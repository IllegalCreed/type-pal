# TEST-GLM-NEW-I-1 · Codex r2 独立代码验收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-NEW-I-1 r2 验收（2026-09-29，HEAD 044d3fa4…6d86、内容提交 8f71e0f3…4f57，两者间仅回执维护）：**代码与现有视觉截图候选 accept；尚未集成 main，review 保持，官方门未运行，不标 done**。

## Scope

- 差异只涉 9 冻结目标同目录新测试与 wave-I/** 证据；共享 README 已恢复派发版；产品/旧测/基线未动。

## Execution and assertions

- **复跑**：完整 lint 2641 文件 0/0/0；game typecheck 零诊断；定向 9 文件 40/40；diff 干净；docs check 仅缺共享 README wave-I 导航由 Codex 集成补；回执 9 新测源/3 existing-proof；showError 新测在 fillRect 发生时记录铺满参数、fillText 发生时记录字体位置，不再用结束值冒充铺底时序
- **AVI 与反控**：AVI 改测试控制的 play deferred Promise 显式 settle+条件等待+finally 释放，无固定 setTimeout(0)（S15 判例：deferred+vi.waitFor）；两枚反控有效：C1 rng 帧窗口 1 failed/3 passed 零 skip；C2 magic-script goto 1 failed 零 skip、基线 4/4、绝对文件与完整 fullName 归属正确、magic-script.ts SHA 注入前后 ed17cafb…3220；旧 C2 filtered（含 skipped）已删除零执行陷阱仅记 invalid 示范
- **视觉**：两张菜单截图 SHA 与回执一致（R1 已看图高亮从「新的故事」移到「旧的回忆」）；浏览器 console 历史仍未采集非零错误证明未完成——由 Codex 统一视觉补验或显式标未证（后续 codex-I-console-closure 已闭合）；不冒充完整 App/E2E

## Results

- 后续：选择性集成+统一三门；正式覆盖收益按 main 并集实测。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r2 验收 | 2026-09-29 | 定向 40/40+lint 0/0/0+双反控+截图 | accept（候选级 review；console 后续闭合） | r1 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-new-waves 的 Wave I r2 验收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

accept：铺底时序事件断言+AVI deferred+双反控（含 SHA 钉定）；console 项当时未采后续补验闭合。

## 当时证据

复跑数字与反控细节在 quote 保全。

## 当前有效性

historical。accept 指当时候选。

## 继任文档

当前结论归 A-J 并集集成回执与 console 补验。

## 原文保全

固定源 revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `822b6f461bb382863d7013e655ce29381fccbf060cf459f2a68f6e38381429bd`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-NEW-I-1 · Codex r2 独立代码验收
>
> 日期：2026-09-29。分支最终 HEAD
> `044d3fa4c525521658c28b4a7a5365098c706d86`；测试/证据内容提交
> `8f71e0f3fd0d366558e7b2dda07a9c2eeb546f57`。两者之间仅 Wave I
> 回执维护，无测试/产品改动。结论：**代码与现有视觉截图候选 accept；
> 尚未集成 main，任务保持 review，官方统一质量/覆盖门未运行，不标 done**。
>
> - 差异仍只涉及 9 个冻结目标同目录新测试和 `wave-I/**` 证据；共享
>   `docs/testing/archive/legacy/batches/glm-new-waves/README.md` 已恢复派发版，产品/旧测/基线未动。
> - Codex 复跑完整 `pnpm lint`：2641 文件，0 error/0 warning/0 info；
>   game typecheck 零诊断；新增定向 9 文件、40/40 通过；diff check 干净。
>   候选 docs check 仅缺共享 README 的 wave-I 导航，由 Codex 集成时补齐。
> - 回执现为 **9 新测源/3 existing-proof**。`showError` 新测在 `fillRect`
>   发生时记录 `fillStyle=#400` 与铺满参数，在 `fillText` 发生时记录
>   `fillStyle=#f88`/字体/位置，不再用结束值冒充铺底时序。
> - AVI 测试改为测试控制的 play deferred Promise，显式 settle、条件等待
>   overlay/pause 状态、`finally` 释放；无固定 `setTimeout(0)`。
> - 两枚不同业务合同反控有效：C1 rng 帧窗口 1 failed/3 passed/零 skip；
>   C2 magic-script goto 1 failed/零 skip。C2 基线 4/4 passed，绝对文件
>   与完整 fullName 归属正确，`magic-script.ts` SHA256 注入前后均为
>   `ed17cafba112e9f2dcbe2f44f7ad7eb4d687fd5cd272271910506c0b08393220`。
>   旧 C2 filtered（含 skipped）已删除，零执行陷阱仅记 invalid 示范。
> - 两张菜单截图 SHA256 与回执一致，Codex R1 已实际看图确认高亮从
>   “新的故事”移到“旧的回忆”。**浏览器 console 历史仍未采集，非零错误证明
>   未完成**；该项由 Codex 在统一视觉补验时完成或继续显式标未证，
>   不冒充完整 App/E2E 验收。
>
> 后续：与其它已接收 wave 选择性集成，统一串行 `pnpm check` → 官方 ratchet →
> 受保护 fast；正式覆盖收益以 main 并集实测。未过这些门前不标 done/不清理工作树。
>
<!-- original-source-quote:end -->
