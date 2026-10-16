# TEST-GLM-NEW-I-1 · Codex r2 独立代码验收

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 64bd3b936eb8fdd0943deba5e476d032a30c1830；本轮 R75。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- TEST-GLM-NEW-I-1 · Codex r2 独立代码验收：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `822b6f461bb382863d7013e655ce29381fccbf060cf459f2a68f6e38381429bd`；下方 quote 可逆回原始 UTF-8 字节。
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
