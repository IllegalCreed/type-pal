# TEST-GLM-NEW-F-1 · Codex r2 独立代码验收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-NEW-F-1 r2 验收（2026-09-29，HEAD c5ecf694…4769、返工提交 08371dc2…71de）：**代码及既有隔离视觉候选 accept；尚未集成 main，任务保持 review，官方统一质量/覆盖门未运行，不标 done**。

## Scope

- 相对首轮只改 App 新测、battle-trial-launch 新测后缀、反控判据/回执/证据与 README；产品/旧测/共享配置基线未动，工作树干净。

## Execution and assertions

- **复跑**：新增定向 10 文件 22/22（App 新测单文件不再有 hoisted vi.mock 收集错误）；相邻 4 文件 61/61；Editor typecheck 零诊断；完整 lint 2645 文件 0/0/0；battle-trial-launch 同目录新测改 .glm-next-wave.test.ts 后缀+JSX 类型化 createElement，10 新测路径与源扩展名一致
- **判据**：needle-judge --selftest 独立通过（非鉴别力注入/错名/非唯一注入点/红基线/缺文件均 INVALID 临时针零遗留）；Codex 用真实 App 测试做单点业务针：baseline/injected 各执行 1 项、精确绝对文件/完整 fullName、exit1 与产品 hash 不变全 VALID 跑后干净
- **边界**：四张功能截图 SHA 未变（R1 已看图确认取消回显与上传恢复）仍仅证明隔离宿主不升级完整 App/E2E；docs check 唯一 issue=共享父 README 未链 wave-F 由 Codex 集成时补

## Results

- 后续：选择性集成+统一串行 check→ratchet→受保护 fast；正式覆盖收益按 main 并集实测；未过门不标 done。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r2 验收 | 2026-09-29 | 定向+相邻+lint+判据自测+实针 | accept（候选级 review 保持） | r1 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-new-waves 的 Wave F r2 验收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

accept：hoist-safe mock 修正（S15 判例）+后缀/类型化修正+判据自测；三门留集成。

## 当时证据

复跑数字与判据细节在 quote 保全。

## 当前有效性

historical。accept 指当时候选。

## 继任文档

当前结论归 A-J 并集集成回执与任务卡。

## 原文保全

固定源 revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `74c0fb3b2f6604423dda283488a883fb1fad23b3d963b9453c3d0fc36bece0c2`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-NEW-F-1 · Codex r2 独立代码验收
>
> 日期：2026-09-29。分支最终 HEAD
> `c5ecf694ed4942a42ecd7e32f5f033e785d47b69`；测试/证据返工提交
> `08371dc26d05990ca412ef80390eac703eb871de`，HEAD 仅补回执登记。
> 结论：**代码及既有隔离视觉候选 accept；尚未集成 main，任务保持 review，
> 官方统一质量/覆盖门未运行，不标 done**。
>
> - 相对首轮候选只改 App 新测、battle-trial-launch 新测后缀、Wave F 反控
>   判据/回执/证据与本目录 README；产品源、旧测、共享配置/基线未动。
>   工作树干净、diff check 干净。
> - Codex 复跑新增定向 **10 文件、22/22 passed**；App 新测单文件不再有
>   hoisted `vi.mock` 收集错误。关键相邻 App leave-guard/ScriptEditor/
>   PreviewCanvas/FrameAnimationEditor 4 文件、61/61 通过；Editor typecheck
>   零诊断。完整 lint：2645 文件，0 error/0 warning/0 info。
> - `battle-trial-launch.ts` 的同目录新测已改为 `.glm-next-wave.test.ts`，
>   JSX 改类型化 `createElement`；10 个新测路径均与各源扩展名一致。
> - `needle-judge.mjs --selftest` 独立通过；非鉴别力注入、错名、非唯一
>   注入点、红基线/缺文件均判 INVALID，临时针零遗留。Codex 再用真实
>   App 测试做一枚单点业务针：baseline/injected 各实际执行 1 项，
>   精确绝对文件/完整 fullName、exit1 与产品 hash 不变全部得到 VALID，
>   跑后候选工作树干净。
> - Wave F 现有 README 索引了本 wave 回执/判据/浏览器证据；候选 docs check
>   唯一 issue 是共享父 README 尚未链接 wave-F，由 Codex 集成时补齐。
>   四张功能截图 SHA256 未变，Codex R1 已看图确认取消回显与上传恢复；
>   仍仅证明隔离宿主，不升级为完整 App/E2E 验收。
>
> 后续：与其它已接收 wave 选择性集成，统一串行 `pnpm check` → 官方 ratchet →
> 受保护 fast，正式覆盖收益仅按 main 并集实测。未过这些门前不标 done/
> 不清理工作树。
>
<!-- original-source-quote:end -->
