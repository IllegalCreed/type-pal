# CODE-QUALITY-3b - pal-extract 原始表与消息边界

Status: done
Phase: phase1 pal-extract
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `48b623d66`
Worktree: `/Users/zhangxu/illegal/type-pal-code-quality`

> Q3a 已归档。本卡只收 pal-extract 的两个纯原始输入解析器：`io/msg.ts`、`io/sss.ts`。
> `io/word.ts` 与 `resources/palette.ts` 的宽容短输入合同由并行覆盖任务钉住，留待独立裁决；不改
> `data/raw`、提取产物、事件语义、运行时或覆盖率候选。

## 目标

让 SSS 固定结构和消息切片在输入截断、结构未对齐、偏移越界时显式失败；合法 PAL raw 与现有
GBK、SSS 输出保持不变，避免静默生成部分或伪造数据。WORD/palette 的宽容输入合同不在本批改变。

## 范围

- 范围内：两个解析器、同域边界回归、此卡/看板/索引/治理台账。
- 范围外：MKF/YJ2/RLE codec（Q1/Q2 已收或另批）、事件 disasm/recompile、资源生成物、game/reforge/editor、E2E 与覆盖率测试派发。
- 明确不做：改变合法数据的字段解释、消息数量、WORD 段偏移、palette 映射或异常输入的产品降级策略；不加 ignore/强转。

## 前提真值门

### 一句话行为 / 工程前提

这些函数消费固定结构的 SSS/M.MSG 原始数据：SSS 结构必须完整，消息 offset 必须落在消息缓冲内且按段非递减；畸形输入应有限失败，合法输入输出不变。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | SSS chunk0/1 按 `EVENTOBJECT`/`SCENE` 固定结构读取；chunk3 为 DWORD offset 表，消息按相邻 offset 切片 | `reference/sdlpal/global.h:95-121`；`reference/sdlpal/text.c:792-840` |
| 第一阶段 | `parseSss` 读取 5 个 SSS chunk，`parseMessages` 使用末尾 sentinel；WORD/palette 宽容短输入合同由并行覆盖测试保留，本卡不改 | `packages/pal-extract/src/io/sss.ts:1-190`；`io/msg.ts:1-14`；`packages/pal-extract/src/resources/misc-guards.kimi-r1.test.ts:73-99`；现有真实 raw tests |
| 当前二阶段 | N/A：本批只涉及第一阶段提取器；Reforge 消费已提取资源，不直接读取这些 raw parser | `docs/phase2/READ-FIRST.md:1-11`；`packages/reforge/src/assets.ts` |
| 本任务目标 | 对 SSS/M.MSG 固定结构和边界增加显式失败；合法 raw digest/字段与 GBK 解码保持 | 本卡新增边界测试 + 真实 raw parser tests + pal-extract 全包/完整质量门 |

### 反证与替代解释

- 最强替代解释：旧 DOS/Win95 资源可能故意携带非标准 SSS 尾部或不完整消息 offset 表，当前 floor/silent-slice 是兼容策略。
- 什么观察会推翻前提：仓库中的合法 raw 证明 chunk2/3/4 非结构对齐仍被生产 caller 有意消费，或真实消息 offset 非递减/越界；当前 raw 直接检查显示结构完整、末 offset 等于 M.MSG 长度。
- 已排查替代根因：本批不改 runtime 命令、原版语义、地图/资源映射或测试模型；只对解析器输入合同加失败 oracle。

### 用户可见偏离

- 是否主动偏离已核真值：N/A（仅畸形输入失败语义收紧）
- `before -> after`：`截断/越界 SSS/M.MSG 被静默部分解析 -> 在解析入口显式抛错；合法资源结果不变`
- 代表场景：损坏的 SSS/M.MSG 在 extract 期间停止并指出输入边界，而不是写出部分事件或越界消息。
- 用户裁决：N/A

## 上下文锚点

- `AGENTS.md:11-25,66-84`：单一 Owner、证据先于方案、零诊断与质量门。
- `CLAUDE.md:5-29,31-38`：第一阶段原始数据/提取链约束，修根因不改生成产物。
- `reference/sdlpal/global.h:95-121`、`text.c:792-865`：结构和切片一手证据。
- `packages/pal-extract/src/io/{msg,sss}.ts`：当前生产入口与静默路径；`io/word.ts`、`resources/palette.ts` 的宽容合同见并行覆盖测试。
- 已知坑：不得把 `projects/pal` 或 `data/extracted` 当修复层；不借覆盖率数量证明解析器合同。
- 相关测试：SSS/M.MSG 现有真实/边界 tests；新增反例必须调用真实 parser，保护输入视图不被修改。

## 验收条件

- 功能：SSS chunk2/3/bytecode 对齐失败；消息 offset 越界/倒序失败；合法 SSS/M.MSG 输出不变。
- 测试：SSS/M.MSG 边界回归、pal-extract 全包、typecheck、相邻 shared codec；完整 `pnpm check`、官方 ratchet、受保护 fast、`pnpm lint` 零诊断。
- 文档：任务卡、看板、治理表和任务索引同步；不改 `docs/testing/**`。
- 视觉 / E2E：N/A（纯提取器输入边界；剧情视觉延后）。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex / `/Users/zhangxu/illegal/type-pal-code-quality`；两个 parser、同域边界测试、治理文档与必要 coverage baseline。
- 前提核验：verified（直接 raw/primary-source 证据与反证点已列）。
- 范围、设计和验收条件：agree（只收 SSS/M.MSG 畸形输入边界，不改变合法输出或生成物；WORD/palette 留待独立裁决）。
- 高风险用户产品裁决：N/A（合法输入行为不变）。
- build 准入结论：Codex build allowed。

### 进入 done 前：独立验收

- 贡献者交付与自验：Codex；SSS/M.MSG targeted 34/34、pal-extract 68 files / 417 tests、全仓 `pnpm check` 与 lint 通过。
- Codex 独立复核：accept；直接读取 primary/raw、生产 callers、diff 与反控；支持并行 editor 的 official ratchet 与受保护 fast 均通过，未降低门槛。
- 用户体验/产品验收：N/A（无用户可见形态变化）。
- done 准入结论：Codex done allowed；Q3c coverage runner 调查独立保留。

## Draft: 设计与风险

### 设计结论

在各解析器入口做最小合同检查：不引入共享万能 validator，不改变正常字段读取；错误包含 parser、chunk/字段和实际尺寸，便于 CLI 定位。为每个失败轴增加单一反例，并保留真实 raw 通过测试。

### 已知风险

- 风险：历史资源方言允许非标准尾部或缺失段。
  - 缓解：只拒绝不足以安全解释的输入；先用真实 raw 直接核验，发现合法反例立即 rework/blocked。
- 风险：边界测试与并行覆盖率工作包同域。
  - 缓解：本卡只修改生产 parser 与本卡专属测试文件，不接管覆盖率候选或 `docs/testing/**`。

### 专项审查安排

- Reviewer：Codex。
- 结论：build allowed；完成后独立重读 primary source、生产 caller、diff 和所有质量门。
- 必改项：任何合法 raw digest/字段漂移、静默错误仍存在、或新增公共兼容 fallback。
- 是否建议进入 build：agree。

## Build: 实现与自测

- Coding Owner：Codex
- 修改文件：`packages/pal-extract/src/io/msg.ts`、`msg.boundaries.test.ts`、`sss.ts`、`sss.boundaries.test.ts`；本卡、看板、治理路线、任务索引与 `scripts/coverage/baseline.fast.json`。
- 实现摘要：`parseMessages` 对 offset 越界/倒序显式失败；`parseSss` 对 chunk2/3/4 的固定结构未对齐显式失败；合法 raw 路径保持原字段/GBK/bytecode 结果。WORD/palette 因并行 Kimi 合同保留宽容行为，未改。
- 运行命令：定向 SSS/M.MSG/相邻真实测试 34/34、pal-extract `check` 68 files / 417 tests、全仓 `pnpm check`（editor 605/4844、migrate 95/723、lint 3196 文件零诊断）通过；`pnpm coverage:ratchet` 通过并更新 pal-extract 266 tests / 1037/1500 statements / 429/551 branches；受保护 `TYPE_PAL_COVERAGE_BASE_REF=b9ba7e0fa pnpm coverage:fast` 串行两次及并行 editor 一次均因 editor 分支当前 24165/29058 比本地 ratchet 基线 24166/29058 少 1 而失败，未放宽门槛。
- 浏览器 / 手工检查：N/A
- 跳过的检查及原因：视觉/E2E 不适用；受保护 fast 未通过，保留为全仓现存覆盖率确定性阻塞，不标 done。

## Review: 审查与返工

- Reviewer：Codex
- 审查结论：实现范围、primary source、真实 raw 合同、相邻回归和零诊断已独立复核；覆盖率 ratchet 通过，但受保护 fast 的 editor 单分支差额未闭合。
- 必须返工项：无；后续 editor runner 时序问题归 CODE-QUALITY-3c，不回写本卡范围。
- Accept / rework：accept

## 用户验收

- 用户结论：N/A（无产品取舍）
- 后续任务：Q3c pal-extract resources/CLI 或 Q3 game 纯资源边界，保持与本卡互斥。

## 交接日志

- 2026-10-04 Codex：Q3a 归档后直接读取 raw/primary source 与四 parser，确认 SSS/M.MSG 边界缺陷候选；WORD/palette 与并行 Kimi 覆盖合同冲突，收窄白名单并保留待裁决。Next: 先写 SSS/M.MSG 原子反例，再实现最小边界检查。
- 2026-10-04 Codex：Q3b 实现完成，SSS/M.MSG 边界 34/34、pal-extract 68/417、全仓 check 与 lint 通过；ratchet 通过。受保护 fast 串行两次与 editor/game 并行一次均稳定暴露 editor 少 1 branch，任务留 review/rework，不宣称 done。Next: 先闭合 coverage 确定性门，再归档 Q3b。
- 2026-10-05 Codex：在 Q2b 后续质量门中，支持并行 editor 的 official ratchet 与 `TYPE_PAL_COVERAGE_BASE_REF=b9ba7e0fa pnpm coverage:fast` 均通过；Q3b 合法门闭合，CODE-QUALITY-3c 独立保留。Next: 归档 Q3b，进入 Q3c/Q3 其它文件。

## 下一位 Agent 提示词

无；本批由 Codex 继续实现与独立验收。
