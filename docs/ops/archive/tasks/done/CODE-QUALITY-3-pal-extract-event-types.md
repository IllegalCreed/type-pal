# CODE-QUALITY-3 - pal-extract 事件切分与标注类型边界

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
Base: `34ccffd5a`

> Q1/Q2 已归档。本卡只审 `pal-extract/src/events/slice.ts` 与 `annotate.ts` 的类型边界和纯转换责任，
> 不改原始资源、事件字节码、游戏运行时或覆盖率候选。

## 目标

收紧事件切分/标注的内部类型边界，移除不必要的 `as unknown as` 结构转换，保持 scene/global BFS、goto 改写、
annotation 字段和 recompile round-trip 行为不变。

## 范围

- 范围内：`packages/pal-extract/src/events/slice.ts`、`annotate.ts` 及同域最小回归。
- 范围外：`disasm.ts`/`recompile.ts` 算法、事件 schema、原始 `data/raw`、生成输出、game/reforge/editor、E2E 与覆盖率派发。
- 明确不做：把普通结构相似误抽成万能 helper；修改 opcode 分类、标签语义或脚本可达性；调整测试 runner/coverage include。

## 前提真值门

### 一句话工程前提

事件切分和标注是纯内存转换器：输入 `Command` 联合和当前词表/符号，输出等价的命令集合；类型收紧不能改变
BFS 可达集、shared 强制归属、goto 改写或注释字段。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | PAL 脚本入口和 goto/advance/reset 由原始事件字节码决定；提取器只解释并切分，不修改原始 bytes | `reference/sdlpal/script.c:3140-3236`；`packages/pal-extract/src/events/disasm.ts`、`recompile.ts` |
| 第一阶段 | `sliceByScene` 按 scene/event object/global entries BFS；`annotate` 只添加 `_item/_spell/_person/_enemy/_scene/_enemyTeam` 人读字段 | `packages/pal-extract/src/events/slice.ts:45-230`；`packages/pal-extract/src/events/annotate.ts:1-107`；`packages/shared/src/events.ts` |
| 本任务目标 | 用具名/联合类型和窄访问器替代结构级强转；纯输入输出与 round-trip 不变 | `packages/pal-extract/src/events/slice.test.ts`、`slice.boundaries.test.ts`、`annotate.test.ts`、`annotate.glm-runtime-resource.test.ts` |

### 反证与替代解释

- 最强替代解释：`Command` 未来会继续扩展未知对象字段，`Object.values(c as Record)` 是为了兼容未建模 opcode；若证实现行输入含未声明字符串跳转字段，应增加显式 typed visitor，而不是保留强转。
- 可证伪观察：任一现有 slice/annotate/recompile digest、scene/shared command count、annotation key 或未知命令处理结果改变。
- 已排查替代根因：本批不改运行时或 raw 数据；反控只看纯输入输出和源码不再含目标强转，不把覆盖率提升当缺陷证据。

### 用户可见偏离

- 是否主动偏离已核真值：N/A
- `before -> after`：`结构级强转访问 Command -> 具名窄访问/类型守卫，输出 JSON 语义相同`
- 用户裁决：N/A

## 上下文锚点

- `AGENTS.md:11-25,66-84`：零诊断、单 Owner、证据先于方案。
- `CLAUDE.md:25-29,31-38`：第一阶段提取行为以原始数据/SDLPal 为真值，纯转换重构不夹带玩法修改。
- `packages/pal-extract/src/events/slice.ts:45-230`：scene/global BFS、goto/raw target、shared 归属。
- `packages/pal-extract/src/events/annotate.ts:60-107`：结构化递归、规则表、当前两处强转。
- `packages/shared/src/events.ts`：现行 `Command` union 与 annotation optional 字段。
- 相关测试：slice 全部边界/运行时资源测试、annotate 全部测试、recompile round-trip。

## 验收条件

- 功能：slice scene/global reachable 数组、shared 归属和 `shared#L_` goto 改写逐字节/逐对象保持；annotate 规则和递归输出保持。
- 类型：目标生产文件无 `as unknown as`，typecheck 零诊断；不以 `any`/ignore 替代。
- 测试：pal-extract 全包、shared 相邻、完整 check、ratchet、protected fast、lint。
- 视觉：N/A。

## 当前模式推进记录

- Codex 范围/前提核验：verified（纯转换、直接 caller、反证观察已列）
- Coding Owner / 隔离树：Codex / `/Users/zhangxu/illegal/type-pal-code-quality`
- 修改白名单：`slice.ts`、`annotate.ts`、同域测试、此卡、看板/索引、必要 baseline。
- build 准入：Codex build allowed
- 独立验收：pending

## Build / Review / Done

- 实现摘要：`slice.ts` 直接以 `Object.values(Command)` 扫描字符串字段；`annotate.ts` 按 `Command` discriminant 逐类返回 typed annotation，移除结构级 `as unknown as` 与不可达 `_spell/_person/_enemy` rule 表；scene/global BFS 与现有 output contract 保持。
- 验证证据：pal-extract 定向 45/45、全包 68/415、typecheck、lint 3196 文件零诊断通过。
- Codex 独立复核：accept（完整 check、ratchet、protected fast、lint 与 pal-extract 全包均通过）
- done 准入：Codex done allowed

## 交接日志

- 2026-10-04 Codex：Q2 完成后审阅 pal-extract 事件转换层，确认 slice/annotate 各有结构级强转；当前行为合同已有纯测试与 round-trip 证据。Next: 收窄访问边界并验证纯输出不漂移。
- 2026-10-04 Codex：Q3 实现完成，移除事件切分/标注生产强转并保留不可达 annotation 字段边界；定向 45/45、pal-extract 全包 68/415、typecheck/lint 通过。Next: 统一质量门。
- 2026-10-04 Codex：完整 `pnpm check`、`pnpm lint`、`pnpm coverage:ratchet` 与 `TYPE_PAL_COVERAGE_BASE_REF=b9ba7e0fa pnpm coverage:fast` 全部通过；pal-extract 纯转换输出合同无漂移。Q3a 完成，Q3 其它 extract/game 文件保持待核。

## 下一位 Agent 提示词

无；本批由 Codex 继续实现与独立验收。
