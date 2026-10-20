# TEST-GLM-LARGE-WAVE-4 · Codex 独立审核 r1

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-LARGE-WAVE-4 r1 审核（2026-09-29，候选 8cb0af0a…aecc 对照派发基点 ced193f4）：**rework，未集成 main 未运行官方门**；以下为当前候选事实不追溯改写 GLM 原始回执。

## Scope

- 独立通过项：工作树干净 46 文件未改产品源/旧测试/依赖锁/基线；verify-targets 60 源码目标及五 digest 通过；check.mjs 758 文档 4,011 链接零问题；diff --check 干净；三包 typecheck exit0；定向 editor 50/50、reforge 7/7、migrate 9/9（17 测试文件 66/66）尚不等于全包或官方覆盖率门；A/B/C 九张截图 SHA 与各回执一致抽看符合**隔离宿主**声明不证明完整 App/剧情 E2E。

## Execution and assertions

- **返工 1-2**：完整 pnpm lint 失败 15 errors/2 warnings/1 info 18 诊断（needle-judge/browser-host/四份 directed JSON/三份浏览器证据 JSON/script-chunk-store 测试）——原规则零诊断不加 ignore 降规则新鲜完整报告作回执；编辑器新增测试 22 处 as never、2 处 as unknown as（EnemyAnimPreview:56-58/117/151、SpriteUploadWizard:55/104-105、DataMode:95-100/131）与合法 typed fixture 规则直接冲突——改当前构造器/类型化端口/真实有效对象不能换一种强转或禁用类型规则；DataMode:31-48 mock UI 子组件按「端口替身只限 browser/FS/Audio/clock」重新证明或收窄声明
- **返工 3-4**：两个新测试不符冻结清单同扩展名（command-form-world.tsx 源对应 .test.ts、use-editor-project-session.ts 源对应 .test.tsx）——改名后更新 fresh JSON file/fullName/status 和反控文件锚；needle-judge:99-105/122-123 把 productHashUnchanged:false 仍判 VALID/exit0；:76-80 不拒 skip；:96-103 只按名称子串匹配不核绝对测试文件与完整 fullName——修同一严格判据给可复跑 selftest（好针与 hash 漂移/skip/混错/零执行/timeout exit2/错文件错 fullName 的 invalid 反例）再重跑五批代表针
- **返工 5**：five-batch-union:9-11 写「20 源新增/40 existing-proof」与逐组登记及实际文件 **17 源新增/43 existing-proof** 不符——纠正计数与清单各批回执补本批完整候选 SHA；原派发 README.md 是 GLM 只读范围当前候选改了其索引——请恢复验收后由 Codex 维护链接

## Results

- 返工不得扩到产品/旧测试/共享配置/正式工程/F-J 并行 wave；推送新完整 SHA 后 Codex 重新复核全部硬门和反控再决定选择性集成。

## Evidence

- 证据路径：本审核正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r1 审核 | 2026-09-29 | 五类返工（lint 18 诊/24 强转/扩展名/判据四缺陷/计数） | rework | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-large-wave 的 r1 审核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

rework 五项：lint 18 诊断、22+2 处强转与 UI 子组件 mock、两个扩展名不符、judge 判据四缺陷（hash 漂移 VALID/不拒 skip/子串匹配）、并集计数 20/40 应 17/43 与 README 越界。

## 当时证据

五类返工与独立通过项在 quote 保全。

## 当前有效性

historical。rework 由 R2/R3 递进闭合。

## 继任文档

当前结论归 TEST-GLM-LARGE-WAVE-4 完成卡。

## 原文保全

固定源 revision `b9af6517a6298e0fb247b97a3b653294d6b45fa2`，source SHA `cc1268e948a2bc14699315f2e2b5598771dcd5b1461b4a666bd1fbca29c30125`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-LARGE-WAVE-4 · Codex 独立审核 r1
>
> 审核日：2026-09-29。候选 `codex/glm-large-wave-r1` HEAD
> `8cb0af0ad2e5952c01e8fa95144b495df4ceaecc`；对照派发基点 `ced193f4`。
> 结论：**rework，未集成 main，未运行官方 ratchet/受保护 fast**。以下是当前候选事实，
> 不追溯改写 GLM 原始回执。
>
> ## 独立通过项
>
> - 候选工作树干净；差异为 46 文件，未改产品源、旧测试、依赖/锁或官方覆盖基线。
> - `node docs/testing/archive/legacy/batches/glm-large-wave/verify-targets.mjs`：60 个源码目标及五个 digest 通过。
>   `node scripts/docs/check.mjs --json`：758 文档、4011 链接、零问题；`git diff --check` 干净。
> - Codex 复跑 `env -u NODE_COMPILE_CACHE pnpm --filter <editor|reforge|migrate> typecheck`：三包均 exit0、无诊断。
>   新文件定向 `vitest run glm-large-wave --no-file-parallelism`：editor 50/50、reforge 7/7、migrate 9/9，
>   合计 17 测试文件、66/66 通过；尚不等于全包或官方覆盖率门。
> - A/B/C 九张截图的文件 SHA256 与各回执一致；抽看 A 音效恢复、B 脚本修改、C 对话槽位
>   符合其**隔离宿主**声明，不证明完整 App/剧情 E2E。
>
> ## 必须返工
>
> 1. 完整 `pnpm lint` **失败：15 errors / 2 warnings / 1 info，18 诊断**。
>    包括 `needle-judge.mjs`、`browser-host/`、四份 directed JSON、三份浏览器证据 JSON
>    和 `script-chunk-store.glm-large-wave.test.ts`。必须原规则零诊断，不加 ignore/降低规则；
>    新鲜完整报告作为回执，不只运行部分新增 TS 测试。
> 2. 编辑器新增测试有 **22 处 `as never`、2 处 `as unknown as`**（例如
>    `EnemyAnimPreview.glm-large-wave.test.tsx:56–58/117/151`、
>    `SpriteUploadWizard.glm-large-wave.test.tsx:55/104–105`、
>    `DataMode.glm-large-wave.test.tsx:95–100/131`）。这与卡面合法 typed fixture 规则直接冲突；
>    改为当前构造器/类型化端口/真实有效对象，不能换一种强转或禁用类型规则掩盖。
>    `DataMode.glm-large-wave.test.tsx:31–48` 等 mock 了 UI 子组件，亦须按卡面
>    “端口替身只限 browser/FS/Audio/clock”重新证明或收窄声明，不能把替身当实际消费链。
> 3. 两个新测试不符合冻结清单同扩展名规则：源码 `command-form-world.tsx` 对应测试是 `.test.ts`，
>    源码 `use-editor-project-session.ts` 对应测试是 `.test.tsx`。改名后更新 fresh JSON
>    file/fullName/status 和反控文件锚；其它新测路径逐一重核。
> 4. `needle-judge.mjs:99–105/122–123` 把 `productHashUnchanged: false` 仍判为 VALID/exit0；
>    `:76–80` 不拒绝 skip，`:96–103` 只按名称子串匹配、不核绝对测试文件与完整 fullName。
>    修为同一严格判据，并给可复跑 selftest（至少好针与 hash 漂移、skip、混错、零执行、
>    timeout/exit2、错文件/错 fullName 的 invalid 反例）；再重跑五批代表针。
> 5. `five-batch-union.md:9–11` 写“20 源新增/40 existing-proof”，与逐组登记及实际文件
>    **17 源新增/43 existing-proof**不符。纠正计数与清单；各批回执补本批完整候选 SHA。
>    原派发 `README.md` 是 GLM 只读范围，当前候选改了其索引；请恢复，验收后由 Codex 维护链接。
>
> 上述返工不得扩到产品、旧测试、共享配置、正式工程或 F–J 并行 wave。
> 返工候选推送新的完整 SHA 后，Codex 重新复核全部硬门和反控，再决定是否选择性集成。
>
<!-- original-source-quote:end -->
