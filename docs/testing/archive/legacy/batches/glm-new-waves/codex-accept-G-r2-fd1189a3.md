# TEST-GLM-NEW-G-1 · Codex r2 独立代码验收

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-NEW-G-1 r2 验收（2026-09-29，HEAD fd1189a3…951d）：**代码与已证功能画面候选 accept；尚未集成 main，review 保持，官方门未运行，不标 done**。

## Scope

- r2 仅改 Wave G 新测、反控/浏览器宿主/证据并恢复共享 README；产品/旧测/配置基线未动，工作树干净。

## Execution and assertions

- **复跑**：完整 lint 2647 文件 0/0/0；Reforge typecheck 零诊断；定向 12 文件 45/45；关键相邻 battle-session/core/command-selection/render/screen-fx 五文件 175/175；三处双强转已清：Canvas 仅 Partial<...> 单次窄化为外部绘制端口替身不冒充完整浏览器绘制，声明范围内无业务 fixture 强转；两条无现行调用锚的陈旧缓存断言删除并登记未证，保留可证 shift 分支
- **判据**：反控改 /tmp 一次性配置内存 loader 注入正式生产源不写盘；Codex 审核 10 组反例自测与四枚回执（对照 exit0/注入 exit1/唯一 failed/绝对 file-fullName/无 skipped-todo/执行数/产品 hash/Git 干净）；为避免重写已提交证据 JSON 未在候选树重跑四针，统一集成前可在隔离副本复建
- **视觉**：四张 r2 截图 SHA 一致已看图（试打/F5/停止恢复）；8 条失败请求逐 URL 证为 save-state.json 404，但 9 条 console error 余 1 条无法归因——console 继续未证不宣称零错误（后续 codex-G-console-closure 已逐条归因闭合）；docs check 仅缺父 README wave-G 导航集成补；派发校验器交付后路径误报已在 main 10a5d601 修复不归责 GLM

## Results

- 后续：选择性集成+统一三门；覆盖收益按 main 并集实测。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r2 验收 | 2026-09-29 | 定向 45/45+相邻 175+lint 0/0/0+判据自测 | accept（候选级 review；console 后续闭合） | r1 counter |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-new-waves 的 Wave G r2 验收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

accept：双强转清+陈旧断言删+内存 loader 判据；favicon 噪声与余 1 条 error 当时未归因（后续闭合）。

## 当时证据

复跑数字与判据细节在 quote 保全。

## 当前有效性

historical。accept 指当时候选。

## 继任文档

当前结论归 A-J 并集集成回执与 console 补验。

## 原文保全

固定源 revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `7e47b90264ba3cc04496448cd7b15840ea6cdd4b0c90ec6c4242ca7ec356b6dd`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-NEW-G-1 · Codex r2 独立代码验收
>
> 日期：2026-09-29。候选 `codex/glm-new-g-r1` HEAD
> `fd1189a314e96863f052439cd1d33b01f1e2951d`。结论：**代码与已证功能
> 画面候选 accept；尚未集成 main，任务保持 review，官方统一质量/覆盖门未运行，
> 不标 done**。
>
> - r2 仅改 Wave G 新测、反控/浏览器宿主/证据并恢复共享 README；产品源、
>   旧测、配置/基线未动，工作树干净、diff check 干净。
> - Codex 复跑完整 lint：2647 文件，0 error/0 warning/0 info；Reforge
>   typecheck 零诊断；新增定向 12 文件、45/45 通过，关键相邻 battle-session/
>   battle-core/battle-command-selection/render/screen-fx 五文件 175/175 通过。
> - 三处双强转已清。Canvas 仅以 `Partial<...>` 单次窄化为外部绘制端口替身，
>   不冒充完整浏览器绘制能力；其声明范围内无业务 fixture 强转。
> - 两条无现行调用锚的陈旧缓存断言已删除并登记未证，保留可证的 shift
>   分支测试。反控判据改为 `/tmp` 一次性配置的内存 loader 注入，正式
>   生产源码不写盘；Codex 审核同一判据的 10 组反例自测与四枚回执：
>   对照 exit0、注入 exit1、唯一 failed、绝对 file/fullName、无 skipped/todo、
>   实际执行数、前后产品 hash 和 Git 干净均被记录。为避免重写已提交证据 JSON，
>   本次未在候选树重跑四针，统一集成前可在隔离副本复建。
> - 四张 r2 截图 SHA256 与回执一致，Codex 已看图确认试打/F5/停止恢复画面。
>   8 条失败请求逐 URL 证为 `/projects/pal/.type-pal/save-state.json` 404，
>   但 9 条 console error 中余 1 条无法归因；**console 继续未证**，不宣称
>   零错误或完整 App/E2E 验收。该项由 Codex 在统一视觉补验时处理或保持未证。
> - 候选 docs check 仅缺共享父 README 的 wave-G 导航，由 Codex 集成时补齐。
>   派发校验器的交付后路径误报已在 main `10a5d601` 修复，不归责 GLM。
>
> 后续：与其它已接收 wave 选择性集成，统一串行 `pnpm check` → 官方 ratchet →
> 受保护 fast；正式覆盖收益只按 main 并集实测。未过这些门前不标 done/
> 不清理工作树。
>
<!-- original-source-quote:end -->
