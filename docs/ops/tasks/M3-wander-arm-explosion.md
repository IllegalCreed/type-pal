# M3 - 迁移脚本控制流去内联与体积门禁

Status: draft
Phase: phase2
Capability: M3(脚本迁移)
Coding Owner: Codex(待三签准入)
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: main

## 目标

彻底取消 `goto/call/条件跳转` 目标的递归复制：每个可达脚本体只存一次，控制流边只存 O(1) 的具名引用。迁移后全库脚本总体积不得超过源 `all.json` 一个数量级，并为后续每次迁移建立自动失败门禁。

## 用户裁决(2026-07-13)

- 本问题必须彻查，不能只修几个超大巡逻实体。
- 不能因为 `goto` 导致场景脚本膨胀。
- 所有迁移后脚本总体积相对 `data/extracted/events/all.json` 至少保持在同一数量级；本卡把它定义为 **不超过 10 倍**。

## 现状量化

统一以 UTF-8 字节计数：

| 指标 | 当前值 | 相对源 |
|---|---:|---:|
| `all.json` 磁盘 pretty | 5,470,901 B | 1.00x |
| `all.json` 规范化紧凑 JSON | 2,274,228 B | 1.00x |
| 原始指令数 | 43,503 | 1.00x |
| 迁移后脚本根规范化紧凑 JSON | 44,751,237 B | **19.68x** |
| 迁移后脚本根独立 pretty JSON | 110,156,998 B | **20.14x** |
| 迁移后递归 Command 节点 | 990,160 | 22.76x |

- 最大 8 棵循环 auto 树占 25,180,678 B 紧凑 JSON；删掉它们会暂时降到 19,570,559 B(8.61x)，但这只是碰巧过线，非循环共享 DAG 仍可被内联放大。
- 当前超过 10MB 的场景有 `s005` 25MB、`s035` 41MB、`s049` 32MB；最大单实体 auto 紧凑 JSON 约 4.25MB / 92,514 个递归命令。
- `MAX_ARM_BODY` 当前只检查顶层 `arm.length`，嵌套 `branch.then/onNo/onLose` 不计入预算，无法阻止结构树爆炸。
- `749c1ce3` 对 `s019/s176/s186` 的 34 个实体移植旧 depth-3 巡逻树只是临时止血。

## 范围

- 范围内：全局脚本库、`callScript/jumpScript` 具名控制流、runner 解析、迁移 CFG 注册表、loader/editor round-trip、脚本覆盖层、全库体积与单文件门禁、运行行为回归。
- 范围外：把原版 opcode/IP 解释器带回运行时、紧凑化所有项目 JSON、无关内容域重迁、可视化脚本库编辑 UI。
- 明确不做：继续提高/降低 `MAX_ARM_DEPTH` 来碰运气；靠 compact JSON 掩盖 AST 复制；只在 auto 回环处打补丁后宣布根治。

## 上下文锚点

- 已拍板决策 / 铁律：遵守 `docs/phase2/READ-FIRST.md`；保持单一 clean ScriptRunner，不恢复原版 opcode 兼容执行器；脚本引用使用稳定业务 id，不暴露原始 IP 给作者 UI。
- 既有设计：`docs/phase2/foundation/script-model-m3-design.md:101-116,134-140` 已明确“goto 单前驱内联、多前驱提共享 Script(callScript)”和 M3c `callScript` 共享库；当前实现漏掉了共享库部分，才退化为递归内联。
- 代码锚点：
  - `packages/migrate/src/translate-events.ts:103-108`：现有 depth/body 护栏。
  - `packages/migrate/src/translate-events.ts:295-322`：具名 goto 当前直接切换 `at` 继续内联。
  - `packages/migrate/src/translate-events.ts:377-408`：条件跳转 `inlineArm` 与路径相关 `armMemo`。
  - `packages/migrate/src/translate-events.ts:861-893`：`0x04` call 当前递归内联。
  - `packages/migrate/src/migrate-content.ts:1384-1397`：trigger/auto 共用翻译上下文。
  - `packages/content/src/script.ts:28-178`：当前 Command / ScriptStage schema 尚无脚本引用。
  - `packages/reforge/src/script-runner.ts:251-289`：runner 顺序执行与 stop 收口。
  - `packages/reforge/src/loader.ts:41-108,204-243`：项目内容加载面。
  - `packages/editor/src/core/project-io.ts:66-114`：编辑器 content round-trip 面。
  - `packages/migrate/scripts/migrate-content.mts:93-107`：现有全量写盘会覆盖整个 pal content。
  - `packages/migrate/scripts/patch-scene-stages.mts:1-15`：现有离线补丁依赖盘上手工内容，不是可重复 overlay。
- 已知坑 / 审计：`docs/phase2/foundation/n-event-script-audit.md`、`am-asset-migrate-audit.md`、`phase1-knowledge-harvest.md` E6。
- 不得重新引入：递归内联跳转目标、路径相关结果写入全局 memo、trigger/auto 语义混用、全量写盘抹掉手工演出。
- 相关测试：`translate-events.test.ts`、`migrate-content.test.ts`、`pal-project.test.ts`、`script-runner.test.ts`、`loader.test.ts`、`project-io.test.ts`。

## Draft: 设计与风险

### A. 体积审计与硬门禁

新增可独立运行的脚本体积审计，固定输出以下三个口径：

1. `normalizedRatio = migratedNormalizedScriptBytes / sourceNormalizedBytes <= 10`。
2. `prettyRatio = migratedPrettyScriptBytes / sourceAllJsonFileBytes <= 10`。
3. `nodeRatio = migratedRecursiveCommandNodes / sourceCommandCount <= 10`。

其中迁移脚本总量包括全部 scene 的 `onEnter/onTeleport/trigger/auto` 根和共享脚本库；不得漏算嵌套臂或运行时换页脚本。另加每场景实际文件 `<10MB`、每个脚本根 `<1MB` 门禁。审计必须进入仓库 `pnpm check`，不是一次性统计脚本。

### B. clean 共享脚本库

新增可选内容域 `manifest.content.scripts -> content/scripts.json`：

```ts
interface ScriptLibraryV1 {
  version: 1
  scripts: Record<string, Command[]>
}
```

- `Command` 新增 `callScript{script,self?}`(执行完返回调用点)与 `jumpScript{script,self?}`(尾转移，不返回原体)；`self` 显式承载原版 0x04 改属主及实体根脚本的执行属主，禁止靠解析 script id 猜。
- 引用 id 使用稳定具名形式，例如 `shared/L_35639@e312`；本期允许按 owner 专门化，以保持现有显式实体 id schema，最终体积仍由 10 倍门禁约束。
- scene 的 `ScriptStage[]` 继续作为持久页阶段壳，保留原有 `next: advance | number`；迁移生成的 stage body 可缩为一条 `callScript`。共享库只承载命令体，不拿内部 CFG 冒充持久 stage。
- 这是 clean AST 的具名控制流，不是原版 IP/opcode 解释器。普通手写工程不声明 `content.scripts` 时行为不变。
- loader/FSA/HTTP/编辑器序列化必须完整 round-trip 该内容域；脚本树查看器至少能解析引用并显示目标，不要求本卡新增完整共享库编辑 UI。

### C. Runner 控制流语义

- `jumpScript` 通过 runner 内部尾转移循环切换目标体，不递归压栈；循环 goto 因此保持常量内存并可持续执行。
- `callScript` 使用受控调用栈，callee 正常结束后返回；仅真实 0x04 使用。设置明确的调用深度故障诊断，但不得把合法 goto 环误算成 call 深度。
- `AbortSignal`、`paceMs`、`selfId`、`stopScript` 必须跨引用保持；call 返回时恢复 caller self，jump 时把目标 self 带入尾转移；auto 的 100ms 指令节拍不能因拆库变快或变慢。
- `jumpScript` 从任何嵌套 branch 抛出的尾转移必须穿透当前命令体，由当前脚本执行循环接管；不得落穿执行父体后续。

### D. 迁移器改为图注册，不再展开边

- 迁移上下文维护 `ScriptRegistry`，键至少包含 `label + owner`，状态为 `unseen/translating/done`。首次遇到目标时登记并翻译一次；再次遇到(含正在翻译的循环)只发引用。
- 具名 `goto`、条件跳转命中臂、确认否臂、战斗败/逃臂等尾转移统一发 `jumpScript`；跳 0 仍发 `stopScript`。
- 真实 `0x04` 发 `callScript`；不得与 goto 共用“内联后补 stop”逻辑。
- 删除 `inlineArm` 递归复制与依赖它的 `armMemo/MAX_ARM_DEPTH` 主路径。护栏改为“注册脚本数量、单脚本递归节点、真实 call 深度”诊断，不再把 goto 深度当内容规模。
- 对 43,503 条源指令构建全库可达图，报告每个 label 的前驱数、强连通分量、未解析引用和不可达脚本；所有控制流边在 JSON 中必须是常量大小引用。

### E. 可重复迁移与手工演出保护

- 在写新脚本产物前，先把 `patch-scene-stages.mts` 的有效转换和 pal 手工演出整理为纯函数/显式 overlay，并在内存迁移结果上应用；不得再依赖“先读盘上旧产物再补”。
- 覆盖清单至少钉住 `s000/s001` 的 dither、speaker、center、李大娘两段式、对白锚点，以及现有脚本补丁脚本列出的 playVideo、四技、coveredBy、隐蛊等历史定制。
- 产品同步只允许改 manifest 的 scripts 路径、`content/scripts.json` 和明确列出的脚本 JSON Pointer；实体静态字段、地图、资源、locale 等非脚本数据出现 diff 即失败。
- 全量生成必须可重复：连续运行两次第二次零 diff。

### 已知风险

- 风险：`jumpScript` 被实现成普通 await call，目标结束后落穿父体。缓解：独立尾转移信号 + runner 循环，单测钉嵌套 branch 穿透。
- 风险：owner 专门化仍产生跨 NPC 重复。缓解：先以正确性优先，10 倍总门禁约束；若仍超标，再单开 self 引用 schema，不在本卡暗加魔法字符串。
- 风险：共享库改变 auto 节拍或 stop/stage 语义。缓解：确定性 fake clock 比对引用前后命令轨迹、等待序列和 stage 结果。
- 风险：全库重迁抹掉人工演出。缓解：overlay 先落、golden 先过，之后才允许写盘；白名单外 diff 直接退出非零。

### Codex 主审立场(2026-07-13)

- 结论：**原“auto 回环检测 + 定点替换”方案 counter；本全库共享脚本方案 agree**。
- 理由：路径循环检测只能消掉循环树，无法保证非循环 DAG、多前驱 goto 和 0x04 call 不继续复制；用户的全库 10 倍上限需要控制流引用成为结构性不变量。
- 是否建议进入 build：否，schema/loader/runner/editor/migration 跨包变更，等待 Opus + GLM 复核签字。

## 验收条件

- 结构：迁移产物中 goto/call 类边只出现 `jumpScript/callScript` 引用；禁止由迁移器生成深层复制目标体。脚本库所有引用存在、无孤儿、id 稳定。
- 单测：self-loop、A-B 环、多分支 SCC、共享 DAG、多前驱 goto、嵌套 branch 尾转移、0x04 返回、call 内 goto、jump 0、auto pace/abort/self、trigger stage advance/reset。
- 规模：三个 10 倍口径全过；每场景 `<10MB`、每脚本根 `<1MB`；输出修复前后 Top 20 与 SCC/前驱报告。
- 覆盖：295 场景 schema + 引用校验全过；43,503 源指令的可达控制流无静默丢边；既有 17 条合法深臂不回退为 `unmigrated`。
- round-trip：HTTP/FSA loader、编辑器打开/保存、clone/zip、脚本预览均保留 `scripts.json`，普通无脚本库工程兼容。
- 手工演出：`s000/s001` 与历史 overlay golden 全过；写盘 diff 无白名单外变化；连续迁移两次第二次零 diff。
- 行为：6051 抽查 `s005/s019/s035/s049/s176/s186` 巡逻，连续移动/换向、不死循环占满主线程；开场和普通换场景不回归。
- 门禁：migrate/content/reforge/editor 定向测试、类型检查和仓库 `pnpm check` 全绿。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree**(2026-07-13，仅同意本全库共享脚本修订版)
- Opus: pending
- GLM: pending
- counter / 分歧处理：原 37 行“循环检测 + 全量重迁”与中间版“仅 auto 定点同步”均已作废。
- 缺签豁免: N/A
- build 准入结论: **blocked**

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Build: 实现与自测

- Coding Owner: Codex(未准入)
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 交接日志

- 2026-07-13 Opus: 记录指数展开、GitHub 100MB 拒绝、`749c1ce3` 临时止血与循环检测初案。Next: 三方设计。
- 2026-07-13 Codex: 首轮复核发现 trigger/auto、memo、浅层预算和全量覆盖问题，提出 auto 路径检测窄修。Next: 用户复核范围。
- 2026-07-13 User: 裁决必须彻查所有 goto 膨胀，迁移后脚本总体积不得超过 `all.json` 一个数量级。Next: Codex 重做全库设计。
- 2026-07-13 Codex: 量化当前脚本两个字节口径均约 20 倍；确认原 M3 设计预留的 `callScript` 共享库未实现，改为全局脚本库 + O(1) call/jump 引用 + 三重 10 倍门禁 + 可重复 overlay。Next: Opus 复核，不得 build。

## 下一位 Agent 提示词

```text
接手 M3 全库脚本控制流去内联设计复核。
任务卡: docs/ops/tasks/M3-wander-arm-explosion.md
当前状态: draft；Codex 已签全库共享脚本修订版 agree；build 仍 blocked。
你的角色: Claude Opus，架构/运行语义主审。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、script-model-m3-design.md §3/M3c、任务卡上下文锚点和 Draft A-E。
用户硬约束: 所有迁移脚本总体积不得超过 all.json 10 倍，任何 goto/call 不得通过递归复制目标体膨胀。
已确认基线: all.json 5,470,901B / 规范化 2,274,228B / 43,503 指令；当前迁移脚本规范化 44,751,237B(19.68x)、独立 pretty 110,156,998B(20.14x)、990,160 Command。
请你做: 重点复核 1) scripts.json schema 与 owner 专门化；2) callScript 返回 vs jumpScript 尾转移；3) 嵌套 branch 的 jump 穿透、auto pace/abort/stage 语义；4) ScriptRegistry 的 SCC/去内联算法；5) loader/editor round-trip 触点；6) overlay 先于全量写盘；7) 三个 10 倍门禁口径。agree 则写 Opus 签字；counter 必须给出同样能结构性保证 O(1) 控制流边和 10 倍上限的替代方案。
不要做: 不得修改实现文件，不得运行 migrate:content 全量写盘，不得推进 build。
输出要求: 更新任务卡 Opus 签字、主审结论、交接日志、下一位 Agent 提示词并提交仅文档改动；随后交 GLM 做全库覆盖/体积公式/测试矩阵复核。
```
